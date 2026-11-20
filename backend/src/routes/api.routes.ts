import { Router } from 'express';
import multer from 'multer';
import {
  googleAuth,
  getMe,
  getSenderAccounts,
} from '../controllers/auth.controller.js';
import {
  scheduleEmail,
  getScheduledEmails,
  getSentEmails,
  getEmailById,
  toggleStar,
  parseCsvLeads,
} from '../controllers/email.controller.js';
import {
  getSlackAuthUrl,
  handleSlackCallback,
  connectSlackWebhook,
  getSlackStatus,
  disconnectSlack,
  testSlackAlert,
} from '../controllers/slack.controller.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Auth Routes
router.post('/auth/google', googleAuth);
router.get('/auth/me', getMe);
router.get('/auth/senders', getSenderAccounts);

// Email Routes
router.post('/emails/schedule', scheduleEmail);
router.get('/emails/scheduled', getScheduledEmails);
router.get('/emails/sent', getSentEmails);
router.get('/emails/:id', getEmailById);
router.post('/emails/:id/star', toggleStar);
router.post('/emails/upload-leads', upload.single('file'), parseCsvLeads);

// Slack Integration Routes
router.get('/slack/auth-url', getSlackAuthUrl);
router.get('/slack/oauth/callback', handleSlackCallback);
router.post('/slack/webhook', connectSlackWebhook);
router.get('/slack/status', getSlackStatus);
router.delete('/slack/disconnect', disconnectSlack);
router.post('/slack/test', testSlackAlert);

export default router;
