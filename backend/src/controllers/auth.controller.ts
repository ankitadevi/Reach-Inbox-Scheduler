import { Request, Response } from 'express';
import { prisma } from '../config/db.js';
import { OAuth2Client } from 'google-auth-library';
import { mailerService } from '../services/mailer.service.js';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const googleAuth = async (req: Request, res: Response) => {
  try {
    const { credential, email, name, picture, googleId } = req.body;

    let userEmail = email;
    let userName = name;
    let userAvatar = picture;
    let userGoogleId = googleId;

    // If Google ID token was provided, verify it
    if (credential) {
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken: credential,
          audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        if (payload) {
          userEmail = payload.email || userEmail;
          userName = payload.name || userName;
          userAvatar = payload.picture || userAvatar;
          userGoogleId = payload.sub || userGoogleId;
        }
      } catch (tokenErr: any) {
        console.warn('[Auth] ID token verification skipped or failed:', tokenErr.message);
      }
    }

    if (!userEmail) {
      return res.status(400).json({ error: 'Email is required for authentication' });
    }

    // Upsert user in database
    const user = await prisma.user.upsert({
      where: { email: userEmail },
      update: {
        name: userName || undefined,
        avatar: userAvatar || undefined,
        googleId: userGoogleId || undefined,
      },
      create: {
        email: userEmail,
        name: userName || 'ReachInbox User',
        avatar: userAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
        googleId: userGoogleId || undefined,
      },
      include: {
        slack: true,
      },
    });

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        slackConnected: !!user.slack?.isActive,
      },
    });
  } catch (error: any) {
    console.error('[Auth] Login error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const getMe = async (req: Request, res: Response) => {
  try {
    const userId = (req.query.userId as string) || (req.headers['x-user-id'] as string);

    let user;
    if (userId) {
      user = await prisma.user.findUnique({
        where: { id: userId },
        include: { slack: true },
      });
    }

    if (!user) {
      // Return or create default demo user (Oliver Brown as in Figma)
      user = await prisma.user.upsert({
        where: { email: 'oliver.brown@domain.io' },
        update: {},
        create: {
          email: 'oliver.brown@domain.io',
          name: 'Oliver Brown',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
        },
        include: { slack: true },
      });
    }

    return res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      slackConnected: !!user.slack?.isActive,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const getSenderAccounts = async (_req: Request, res: Response) => {
  const senders = mailerService.getSenderAccounts();
  return res.json({ senders });
};
