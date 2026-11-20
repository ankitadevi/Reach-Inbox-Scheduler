import axios from 'axios';
import { prisma } from '../config/db.js';
import dotenv from 'dotenv';

dotenv.config();

export class SlackService {
  private clientId = process.env.SLACK_CLIENT_ID || '';
  private clientSecret = process.env.SLACK_CLIENT_SECRET || '';
  private redirectUri = process.env.SLACK_REDIRECT_URI || 'http://localhost:5000/api/slack/oauth/callback';

  public getAuthUrl(userId: string): string {
    const scopes = ['incoming-webhook', 'chat:write'].join(',');
    const state = Buffer.from(JSON.stringify({ userId })).toString('base64');
    return `https://slack.com/oauth/v2/authorize?client_id=${this.clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(
      this.redirectUri
    )}&state=${state}`;
  }

  public async handleOAuthCallback(code: string, state: string) {
    try {
      let userId: string;
      try {
        const decoded = JSON.parse(Buffer.from(state, 'base64').toString());
        userId = decoded.userId;
      } catch {
        throw new Error('Invalid state parameter in Slack OAuth callback');
      }

      const response = await axios.post(
        'https://slack.com/api/oauth.v2.access',
        new URLSearchParams({
          code,
          client_id: this.clientId,
          client_secret: this.clientSecret,
          redirect_uri: this.redirectUri,
        }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
      );

      const data = response.data;
      if (!data.ok) {
        throw new Error(`Slack OAuth error: ${data.error}`);
      }

      const webhookUrl = data.incoming_webhook?.url;
      const channel = data.incoming_webhook?.channel;
      const teamName = data.team?.name;
      const accessToken = data.access_token;

      const integration = await prisma.slackIntegration.upsert({
        where: { userId },
        update: {
          webhookUrl,
          channel,
          teamName,
          accessToken,
          isActive: true,
          updatedAt: new Date(),
        },
        create: {
          userId,
          webhookUrl,
          channel,
          teamName,
          accessToken,
          isActive: true,
        },
      });

      console.log(`[Slack] Successfully connected Slack for user ${userId} to channel ${channel}`);
      return integration;
    } catch (error: any) {
      console.error('[Slack] OAuth callback processing failed:', error.message);
      throw error;
    }
  }

  public async connectWebhook(userId: string, webhookUrl: string, channelName = 'general') {
    const integration = await prisma.slackIntegration.upsert({
      where: { userId },
      update: {
        webhookUrl,
        channel: channelName,
        teamName: 'Custom Webhook',
        isActive: true,
        updatedAt: new Date(),
      },
      create: {
        userId,
        webhookUrl,
        channel: channelName,
        teamName: 'Custom Webhook',
        isActive: true,
      },
    });

    console.log(`[Slack] Webhook connected for user ${userId}`);
    return integration;
  }

  public async disconnect(userId: string) {
    await prisma.slackIntegration.deleteMany({
      where: { userId },
    });
    console.log(`[Slack] Disconnected Slack for user ${userId}`);
  }

  public async getStatus(userId: string) {
    const integration = await prisma.slackIntegration.findUnique({
      where: { userId },
    });
    return {
      connected: !!integration && integration.isActive,
      channel: integration?.channel || null,
      teamName: integration?.teamName || null,
      connectedAt: integration?.connectedAt || null,
    };
  }

  public async notifyRateLimitHit(
    userId: string,
    senderEmail: string,
    hourlyLimit: number,
    rescheduledTime: Date
  ): Promise<boolean> {
    try {
      const integration = await prisma.slackIntegration.findUnique({
        where: { userId },
      });

      if (!integration || !integration.isActive || !integration.webhookUrl) {
        console.log(`[Slack] Rate limit hit for sender ${senderEmail}, but user ${userId} has not connected Slack. Skipping notification.`);
        return false;
      }

      const formattedRescheduledTime = rescheduledTime.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      const messagePayload = {
        text: `🚨 ReachInbox Rate Limit Alert: Sender \`${senderEmail}\` reached hourly limit of ${hourlyLimit} emails.`,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '🚨 Sender Hourly Limit Reached',
              emoji: true,
            },
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Sender Account:*\n\`${senderEmail}\``,
              },
              {
                type: 'mrkdwn',
                text: `*Hourly Limit:*\n${hourlyLimit} emails/hr`,
              },
            ],
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `⚠️ Rate limit protection engaged. Pending emails have been safely deferred without dropping and are rescheduled to resume at *${formattedRescheduledTime}*.`,
            },
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `ReachInbox Email Job Scheduler • ${new Date().toISOString()}`,
              },
            ],
          },
        ],
      };

      await axios.post(integration.webhookUrl, messagePayload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000,
      });

      console.log(`[Slack] Live alert dispatched to Slack channel '${integration.channel}' for sender ${senderEmail}`);
      return true;
    } catch (error: any) {
      console.error(`[Slack] Failed to send rate-limit alert to Slack:`, error.message);
      return false;
    }
  }
}

export const slackService = new SlackService();
