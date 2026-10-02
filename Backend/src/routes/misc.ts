import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthedRequest } from '../lib/auth.js';

export const notificationRouter = Router();
notificationRouter.use(requireAuth);

notificationRouter.post('/send', async (req: AuthedRequest, res, next) => {
  try {
    const body = z
      .object({
        channel: z.enum(['sms', 'email']),
        to: z.string().min(3),
        subject: z.string().default('Wellbeing Support'),
        body: z.string().min(1),
      })
      .parse(req.body);

    const mode = process.env.NOTIFICATION_MODE || 'log';
    const status = mode === 'log' ? 'logged' : 'queued';

    const notification = await prisma.notification.create({
      data: {
        userId: req.user!.id,
        channel: body.channel,
        to: body.to,
        subject: body.subject,
        body: body.body,
        status,
      },
    });

    if (mode === 'log') {
      console.log(`[notification:${body.channel}] to=${body.to} subject=${body.subject} body=${body.body}`);
    }

    res.status(201).json({
      id: notification.id,
      status: notification.status,
      message:
        mode === 'log'
          ? 'Notification logged on server (SMS/email provider not configured).'
          : 'Notification queued for delivery.',
    });
  } catch (e) {
    next(e);
  }
});

export const analyticsRouter = Router();

analyticsRouter.post('/track', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const body = z
      .object({
        event: z.string().min(1),
        meta: z.record(z.string(), z.unknown()).optional(),
      })
      .parse(req.body);
    await prisma.analyticsEvent.create({
      data: {
        userId: req.user!.id,
        event: body.event,
        metaJson: JSON.stringify(body.meta ?? {}),
      },
    });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

export const emergencyRouter = Router();

emergencyRouter.get('/resources', (_req, res) => {
  res.json({
    teleManas: { name: 'Tele-MANAS', number: '14416', href: 'tel:14416' },
    emergency: { name: 'Emergency services', number: '112', href: 'tel:112' },
    note: 'Links open the device dialer only after an explicit user click. No automatic dispatch.',
  });
});

emergencyRouter.post('/connect', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    await prisma.analyticsEvent.create({
      data: {
        userId: req.user!.id,
        event: 'emergency.connect_intent',
        metaJson: JSON.stringify({ at: new Date().toISOString() }),
      },
    });
    res.json({
      dispatched: false,
      message: 'Use the provided phone links to call verified services. Automatic emergency dispatch is not enabled.',
      resources: {
        teleManas: 'tel:14416',
        emergency: 'tel:112',
      },
    });
  } catch (e) {
    next(e);
  }
});
