import { Request, Response } from 'express';
import { prisma } from '../config/db.js';
import { scheduleEmailJob } from '../queues/email.queue.js';
import { elasticService } from '../services/elastic.service.js';

export const scheduleEmail = async (req: Request, res: Response) => {
  try {
    const {
      userId,
      senderEmail,
      recipientEmails,
      recipientEmail,
      subject,
      body,
      scheduledAt,
      delayBetweenEmails = 2,
      hourlyLimit = 200,
    } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    if (!senderEmail || !subject || !body) {
      return res.status(400).json({ error: 'senderEmail, subject, and body are required' });
    }

    // Standardize recipients list (supports single recipientEmail or recipientEmails array)
    let recipients: string[] = [];
    if (Array.isArray(recipientEmails) && recipientEmails.length > 0) {
      recipients = recipientEmails.map((r: string) => r.trim()).filter(Boolean);
    } else if (recipientEmail) {
      recipients = [recipientEmail.trim()];
    }

    if (recipients.length === 0) {
      return res.status(400).json({ error: 'At least one recipient email is required' });
    }

    const baseScheduledTime = scheduledAt ? new Date(scheduledAt) : new Date();
    const delaySec = Math.max(0, parseInt(delayBetweenEmails, 10) || 2);
    const limitPerHour = Math.max(1, parseInt(hourlyLimit, 10) || 200);

    const createdEmails = [];

    // Schedule each email with staggering if multiple leads
    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];
      const targetTime = new Date(baseScheduledTime.getTime() + i * delaySec * 1000);

      const email = await prisma.email.create({
        data: {
          userId,
          senderEmail,
          recipientEmail: recipient,
          subject,
          body,
          scheduledAt: targetTime,
          delayBetweenEmails: delaySec,
          hourlyLimit: limitPerHour,
          status: 'SCHEDULED',
        },
      });

      // 1. Add to BullMQ delayed queue (No cron!)
      const job = await scheduleEmailJob({
        id: email.id,
        scheduledAt: targetTime,
      });

      // Update email with job ID
      await prisma.email.update({
        where: { id: email.id },
        data: { jobId: job.id as string },
      });

      // 2. Index into Elasticsearch
      await elasticService.indexEmail({
        id: email.id,
        userId: email.userId,
        senderEmail: email.senderEmail,
        recipientEmail: email.recipientEmail,
        subject: email.subject,
        body: email.body,
        status: email.status,
        scheduledAt: email.scheduledAt,
        sentAt: email.sentAt,
        createdAt: email.createdAt,
      });

      createdEmails.push(email);
    }

    return res.status(201).json({
      success: true,
      message: `Successfully scheduled ${createdEmails.length} email(s)`,
      count: createdEmails.length,
      emails: createdEmails,
    });
  } catch (error: any) {
    console.error('[Email Controller] scheduleEmail error:', error);
    return res.status(500).json({ error: error.message || 'Failed to schedule emails' });
  }
};

export const getScheduledEmails = async (req: Request, res: Response) => {
  try {
    const userId = (req.query.userId as string) || (req.headers['x-user-id'] as string);
    const search = (req.query.search as string) || '';

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    if (search.trim()) {
      const results = await elasticService.searchEmails(userId, search.trim(), 'SCHEDULED');
      return res.json({ emails: results, total: results.length });
    }

    const emails = await prisma.email.findMany({
      where: {
        userId,
        status: { in: ['SCHEDULED', 'PROCESSING'] },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    const totalCount = await prisma.email.count({
      where: {
        userId,
        status: { in: ['SCHEDULED', 'PROCESSING'] },
      },
    });

    return res.json({ emails, total: totalCount });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const getSentEmails = async (req: Request, res: Response) => {
  try {
    const userId = (req.query.userId as string) || (req.headers['x-user-id'] as string);
    const search = (req.query.search as string) || '';

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    if (search.trim()) {
      const results = await elasticService.searchEmails(userId, search.trim(), 'SENT');
      return res.json({ emails: results, total: results.length });
    }

    const emails = await prisma.email.findMany({
      where: {
        userId,
        status: { in: ['SENT', 'FAILED'] },
      },
      orderBy: { sentAt: 'desc' },
    });

    const totalCount = await prisma.email.count({
      where: {
        userId,
        status: { in: ['SENT', 'FAILED'] },
      },
    });

    return res.json({ emails, total: totalCount });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const getEmailById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const email = await prisma.email.findUnique({
      where: { id },
    });

    if (!email) {
      return res.status(404).json({ error: 'Email not found' });
    }

    return res.json({ email });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const toggleStar = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const email = await prisma.email.findUnique({ where: { id } });

    if (!email) {
      return res.status(404).json({ error: 'Email not found' });
    }

    const updated = await prisma.email.update({
      where: { id },
      data: { starred: !email.starred },
    });

    return res.json({ success: true, starred: updated.starred });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const parseCsvLeads = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload a CSV or TXT lead file' });
    }

    const fileContent = req.file.buffer.toString('utf-8');
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    const matches = fileContent.match(emailRegex) || [];

    // Deduplicate and filter out empty
    const uniqueEmails = Array.from(new Set(matches.map((e) => e.toLowerCase())));

    return res.json({
      success: true,
      filename: req.file.originalname,
      totalFound: uniqueEmails.length,
      emails: uniqueEmails,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to parse file' });
  }
};
