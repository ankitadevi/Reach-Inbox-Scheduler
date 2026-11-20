import { Queue, QueueEvents } from 'bullmq';
import { redisConnection } from '../config/redis.js';

export const EMAIL_QUEUE_NAME = 'email-queue';

export interface EmailJobData {
  emailId: string;
}

export const emailQueue = new Queue<EmailJobData>(EMAIL_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: false,
    removeOnFail: false,
  },
});

export const emailQueueEvents = new QueueEvents(EMAIL_QUEUE_NAME, {
  connection: redisConnection,
});

emailQueueEvents.on('completed', ({ jobId }) => {
  console.log(`[Queue] Job ${jobId} completed successfully.`);
});

emailQueueEvents.on('failed', ({ jobId, failedReason }) => {
  console.error(`[Queue] Job ${jobId} failed: ${failedReason}`);
});

export const scheduleEmailJob = async (email: {
  id: string;
  scheduledAt: Date;
}) => {
  const now = Date.now();
  const targetTime = new Date(email.scheduledAt).getTime();
  const delay = Math.max(0, targetTime - now);

  const job = await emailQueue.add(
    'send-email',
    { emailId: email.id },
    {
      delay,
      jobId: `email-${email.id}`,
    }
  );

  console.log(`[Queue] Scheduled email job ${job.id} with delay ${delay}ms (${Math.round(delay / 1000)}s)`);
  return job;
};
