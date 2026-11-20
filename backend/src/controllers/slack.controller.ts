import { Request, Response } from 'express';
import { slackService } from '../services/slack.service.js';

export const getSlackAuthUrl = async (req: Request, res: Response) => {
  try {
    const userId = (req.query.userId as string) || 'default-user';
    const url = slackService.getAuthUrl(userId);
    return res.json({ url });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const handleSlackCallback = async (req: Request, res: Response) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}?slack_error=${error}`);
    }

    if (!code || !state) {
      return res.status(400).json({ error: 'Missing code or state parameters' });
    }

    await slackService.handleOAuthCallback(code as string, state as string);
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}?slack_connected=true`);
  } catch (error: any) {
    console.error('[Slack Controller] Callback error:', error);
    return res.redirect(
      `${process.env.FRONTEND_URL || 'http://localhost:3000'}?slack_error=${encodeURIComponent(error.message)}`
    );
  }
};

export const connectSlackWebhook = async (req: Request, res: Response) => {
  try {
    const { userId, webhookUrl, channel } = req.body;

    if (!userId || !webhookUrl) {
      return res.status(400).json({ error: 'userId and webhookUrl are required' });
    }

    const integration = await slackService.connectWebhook(userId, webhookUrl, channel);
    return res.json({ success: true, integration });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const getSlackStatus = async (req: Request, res: Response) => {
  try {
    const userId = (req.query.userId as string) || (req.headers['x-user-id'] as string);
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const status = await slackService.getStatus(userId);
    return res.json(status);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const disconnectSlack = async (req: Request, res: Response) => {
  try {
    const userId = (req.query.userId as string) || req.body.userId;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    await slackService.disconnect(userId);
    return res.json({ success: true, message: 'Slack disconnected' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const testSlackAlert = async (req: Request, res: Response) => {
  try {
    const { userId, senderEmail = 'oliver.brown@domain.io', hourlyLimit = 5 } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const rescheduledTime = new Date(Date.now() + 3600000);
    const success = await slackService.notifyRateLimitHit(
      userId,
      senderEmail,
      hourlyLimit,
      rescheduledTime
    );

    if (success) {
      return res.json({ success: true, message: 'Test rate limit alert sent to Slack successfully!' });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Could not send alert. Please verify Slack is connected or webhook URL is valid.',
      });
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};
