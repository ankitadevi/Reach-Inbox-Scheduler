export interface Email {
  id: string;
  userId: string;
  senderEmail: string;
  recipientEmail: string;
  subject: string;
  body: string;
  status: 'SCHEDULED' | 'PROCESSING' | 'SENT' | 'FAILED';
  scheduledAt: string;
  sentAt?: string | null;
  delayBetweenEmails: number;
  hourlyLimit: number;
  jobId?: string | null;
  etherealPreviewUrl?: string | null;
  errorMessage?: string | null;
  starred: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleEmailPayload {
  userId: string;
  senderEmail: string;
  recipientEmails: string[];
  subject: string;
  body: string;
  scheduledAt?: string;
  delayBetweenEmails: number;
  hourlyLimit: number;
}
