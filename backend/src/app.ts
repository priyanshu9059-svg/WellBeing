import express from 'express';
import cors from 'cors';
import { ZodError } from 'zod';
import { authRouter } from './routes/auth.js';
import { chatRouter } from './routes/chat.js';
import { checkInRouter } from './routes/checkins.js';
import { moodRouter } from './routes/mood.js';
import { journalRouter } from './routes/journal.js';
import { safetyRouter } from './routes/safety.js';
import { profileRouter, wellbeingRouter } from './routes/wellbeing.js';
import { orgRouter } from './routes/organization.js';
import { careRouter, counsellorRouter, professionalRouter } from './routes/care.js';
import { analyticsRouter, emergencyRouter, notificationRouter } from './routes/misc.js';

export function createApp() {
  const app = express();
  const origin = process.env.CORS_ORIGIN || 'http://localhost:3000';

  app.use(
    cors({
      origin: origin.split(',').map((s) => s.trim()),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '2mb' }));

  app.get('/', (_req, res) => {
    res.json({
      ok: true,
      service: 'wellbeing-backend',
      message: 'API only — open the app at http://localhost:3000',
      health: '/api/health',
    });
  });

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'wellbeing-backend',
      time: new Date().toISOString(),
    });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/chat', chatRouter);
  app.use('/api/checkins', checkInRouter);
  app.use('/api/mood', moodRouter);
  app.use('/api/journal', journalRouter);
  app.use('/api/safety-plan', safetyRouter);
  app.use('/api/profile', profileRouter);
  app.use('/api/wellbeing', wellbeingRouter);
  app.use('/api/organizations', orgRouter);
  app.use('/api/care', careRouter);
  app.use('/api/professional', professionalRouter);
  app.use('/api/counsellor', counsellorRouter);
  app.use('/api/notifications', notificationRouter);
  app.use('/api/analytics', analyticsRouter);
  app.use('/api/emergency', emergencyRouter);

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err instanceof ZodError) {
      return res.status(400).json({ error: 'Invalid request.', details: err.flatten() });
    }
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  });

  return app;
}
