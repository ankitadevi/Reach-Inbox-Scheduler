import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis.js';
import { EMAIL_QUEUE_NAME, EmailJobData, emailQueue } from './email.queue.js';
import { prisma } from '../config/db.js';
import { mailerService } from '../services/mailer.service.js';
import { slackService } from '../services/slack.service.js';
import { elasticService } from '../services/elastic.service.js';
import dotenv from 'dotenv';

dotenv.config();

const workerConcurrency = parseInt(process.env.WORKER_CONCURRENCY || '5', 10);
const minSendDelaySeconds = parseInt(process.env.MIN_SEND_DELAY_SECONDS || '2', 10);
const defaultHourlyLimit = parseInt(process.env.DEFAULT_HOURLY_LIMIT || '200', 10);

const getHourWindowKey = (date: Date): string => {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(
    date.getUTCDate()
  ).padStart(2, '0')}T${String(date.getUTCHours()).padStart(2, '0')}`;
};

export const startEmailWorker = () => {
  console.log(`[Worker] Initializing BullMQ Worker with concurrency = ${workerConcurrency}...`);

  const worker = new Worker<EmailJobData>(
    EMAIL_QUEUE_NAME,
    async (job: Job<EmailJobData>) => {
      const { emailId } = job.data;
      console.log(`[Worker] Processing email job ${job.id} for emailId: ${emailId}`);

      const email = await prisma.email.findUnique({
        where: { id: emailId },
      });

      if (!email) {
        console.warn(`[Worker] Email record ${emailId} not found in database. Skipping job.`);
        return;
      }

      // Idempotency check: if already sent, do not re-send
      if (email.status === 'SENT') {
        console.log(`[Worker] Email ${emailId} is already marked as SENT. Skipping.`);
        return;
      }

      const hourlyLimit = email.hourlyLimit > 0 ? email.hourlyLimit : defaultHourlyLimit;
      const now = new Date();
      const hourWindow = getHourWindowKey(now);
      const rateLimitKey = `ratelimit:sender:${email.senderEmail}:${hourWindow}`;

      // 1. Atomic Rate Limit Check via Redis
      const currentHourlyCount = await redisConnection.incr(rateLimitKey);
      if (currentHourlyCount === 1) {
        await redisConnection.expire(rateLimitKey, 7200); // 2 hours TTL
      }

      if (currentHourlyCount > hourlyLimit) {
        // Exceeded hourly limit! Do NOT drop the job. Reschedule to next hour window.
        console.warn(
          `[Worker] Rate limit reached for sender ${email.senderEmail} (${currentHourlyCount}/${hourlyLimit} in window ${hourWindow}). Rescheduling job.`
        );

        // Next UTC hour + 2 seconds jitter
        const nextHour = new Date(now);
        nextHour.setUTCHours(nextHour.getUTCHours() + 1, 0, 2, 0);
        const delayMs = Math.max(1000, nextHour.getTime() - now.getTime());

        // Update DB record
        await prisma.email.update({
          where: { id: emailId },
          data: {
            scheduledAt: nextHour,
            status: 'SCHEDULED',
          },
        });

        // Add delayed job to BullMQ for the next window
        await emailQueue.add(
          'send-email',
          { emailId },
          {
            delay: delayMs,
            jobId: `email-${emailId}-rescheduled-${nextHour.getTime()}`,
          }
        );

        // 2. Trigger Slack Alert (Only once per hour window per sender)
        const slackAlertKey = `slack_alert:${email.senderEmail}:${hourWindow}`;
        const canAlert = await redisConnection.set(slackAlertKey, 'sent', 'EX', 7200, 'NX');
        if (canAlert) {
          await slackService.notifyRateLimitHit(
            email.userId,
            email.senderEmail,
            hourlyLimit,
            nextHour
          );
        }

        return;
      }

      // 3. Minimum Delay / Throttling between emails for the sender
      const delayRequiredSec = Math.max(minSendDelaySeconds, email.delayBetweenEmails);
      const delayRequiredMs = delayRequiredSec * 1000;
      const lastSendKey = `lastsend:sender:${email.senderEmail}`;

      const lastSendStr = await redisConnection.get(lastSendKey);
      if (lastSendStr) {
        const lastSendTime = parseInt(lastSendStr, 10);
        const elapsed = Date.now() - lastSendTime;
        if (elapsed < delayRequiredMs) {
          const waitMs = delayRequiredMs - elapsed;
          console.log(`[Worker] Throttling sender ${email.senderEmail}. Waiting ${waitMs}ms before sending.`);
          await new Promise((resolve) => setTimeout(resolve, waitMs));
        }
      }

      // Mark email as PROCESSING
      await prisma.email.update({
        where: { id: emailId },
        data: {
          status: 'PROCESSING',
          attempts: { increment: 1 },
        },
      });

      try {
        // 4. Send Email via Ethereal SMTP
        const result = await mailerService.sendEmail({
          from: email.senderEmail,
          to: email.recipientEmail,
          subject: email.subject,
          body: email.body,
        });

        const sentTime = new Date();

        // Update last send timestamp in Redis
        await redisConnection.set(lastSendKey, sentTime.getTime().toString(), 'EX', 86400);

        // 5. Update Database Record
        const updated = await prisma.email.update({
          where: { id: emailId },
          data: {
            status: 'SENT',
            sentAt: sentTime,
            etherealPreviewUrl: result.previewUrl ? result.previewUrl.toString() : null,
          },
        });

        // 6. Update Elasticsearch
        await elasticService.updateEmailStatus(
          emailId,
          'SENT',
          sentTime
        );

        console.log(`[Worker] Successfully sent email ${emailId} to ${email.recipientEmail}`);
      } catch (sendError: any) {
        console.error(`[Worker] Failed sending email ${emailId}:`, sendError.message);

        const currentAttempts = email.attempts + 1;
        const willRetry = currentAttempts < 3;

        await prisma.email.update({
          where: { id: emailId },
          data: {
            status: willRetry ? 'SCHEDULED' : 'FAILED',
            errorMessage: sendError.message,
          },
        });

        throw sendError; // BullMQ catches and triggers backoff retry if attempts remain
      }
    },
    {
      connection: redisConnection,
      concurrency: workerConcurrency,
    }
  );

  worker.on('active', (job) => {
    console.log(`[Worker] Active: Job ${job.id}`);
  });

  worker.on('completed', (job) => {
    console.log(`[Worker] Completed: Job ${job.id}`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[Worker] Failed: Job ${job?.id} with error: ${err.message}`);
  });

  return worker;
};

// On server startup: Reconcile any SCHEDULED emails that may have been missed during downtime
export const reconcileMissedJobsOnStartup = async () => {
  try {
    console.log('[Worker] Checking for pending/missed scheduled emails in DB...');
    const pendingEmails = await prisma.email.findMany({
      where: {
        status: { in: ['SCHEDULED', 'PROCESSING'] },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    console.log(`[Worker] Found ${pendingEmails.length} pending email(s) to verify in queue.`);

    for (const email of pendingEmails) {
      const now = Date.now();
      const targetTime = new Date(email.scheduledAt).getTime();
      const delay = Math.max(0, targetTime - now);

      await emailQueue.add(
        'send-email',
        { emailId: email.id },
        {
          delay,
          jobId: `email-${email.id}`,
        }
      );
    }
    console.log('[Worker] Reconciliation complete.');
  } catch (error: any) {
    console.error('[Worker] Error during job reconciliation:', error.message);
  }
};
