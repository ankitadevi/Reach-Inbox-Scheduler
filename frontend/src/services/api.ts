import axios from 'axios';
import { Email, ScheduleEmailPayload } from '../types/email.js';
import { User, SlackStatus } from '../types/user.js';

const API_BASE = 'http://localhost:5000/api';

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const api = {
  // Auth
  async loginGoogle(data: { credential?: string; email?: string; name?: string; picture?: string; googleId?: string }): Promise<{ user: User }> {
    const res = await apiClient.post('/auth/google', data);
    return res.data;
  },

  async getMe(userId?: string): Promise<User> {
    const res = await apiClient.get('/auth/me', {
      params: userId ? { userId } : {},
    });
    return res.data;
  },

  async getSenders(): Promise<string[]> {
    const res = await apiClient.get('/auth/senders');
    return res.data.senders;
  },

  // Emails
  async getScheduledEmails(userId: string, search = ''): Promise<{ emails: Email[]; total: number }> {
    const res = await apiClient.get('/emails/scheduled', {
      params: { userId, search },
    });
    return res.data;
  },

  async getSentEmails(userId: string, search = ''): Promise<{ emails: Email[]; total: number }> {
    const res = await apiClient.get('/emails/sent', {
      params: { userId, search },
    });
    return res.data;
  },

  async getEmailById(id: string): Promise<Email> {
    const res = await apiClient.get(`/emails/${id}`);
    return res.data.email;
  },

  async scheduleEmail(payload: ScheduleEmailPayload): Promise<{ success: boolean; count: number; emails: Email[] }> {
    const res = await apiClient.post('/emails/schedule', payload);
    return res.data;
  },

  async toggleStar(id: string): Promise<{ success: boolean; starred: boolean }> {
    const res = await apiClient.post(`/emails/${id}/star`);
    return res.data;
  },

  async uploadLeads(file: File): Promise<{ success: boolean; totalFound: number; emails: string[] }> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post('/emails/upload-leads', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },

  // Slack
  async getSlackAuthUrl(userId: string): Promise<string> {
    const res = await apiClient.get('/slack/auth-url', { params: { userId } });
    return res.data.url;
  },

  async getSlackStatus(userId: string): Promise<SlackStatus> {
    const res = await apiClient.get('/slack/status', { params: { userId } });
    return res.data;
  },

  async connectSlackWebhook(userId: string, webhookUrl: string, channel = 'general'): Promise<any> {
    const res = await apiClient.post('/slack/webhook', { userId, webhookUrl, channel });
    return res.data;
  },

  async disconnectSlack(userId: string): Promise<any> {
    const res = await apiClient.delete('/slack/disconnect', { data: { userId } });
    return res.data;
  },

  async testSlackAlert(userId: string, senderEmail: string, hourlyLimit: number): Promise<any> {
    const res = await apiClient.post('/slack/test', { userId, senderEmail, hourlyLimit });
    return res.data;
  },
};
