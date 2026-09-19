import { Router } from 'express';
import express from 'express';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole, type AuthedRequest } from '../lib/auth.js';
import { CHECKIN_THEMES, mlAnalyzeText, mlAnalyzeVoice, type MlPack } from '../services/ml.js';

export const checkInRouter = Router();
checkInRouter.use(requireAuth);

const uploadDir = path.resolve(process.cwd(), 'uploads', 'checkins');
const themeIds = CHECKIN_THEMES.map((t) => t.id);

function dto(row: {
  id: string;
  theme: string;
  text: string;
  transcript: string;
  modality: string;
  voicePath: string | null;
  voiceMimeType: string | null;
  voiceSizeBytes: number | null;
  distress: number | null;
  safetyRisk: number | null;
  escalationRisk: number | null;
  priority: string | null;
  sentimentLabel: string | null;
  sentimentScore: number | null;
  stressScore: number | null;
  emotionLabel: string | null;
  factorsJson: string;
  mlJson: string;
  createdAt: Date;
  userId?: string;
}) {
  let factors: string[] = [];
  try {
    factors = JSON.parse(row.factorsJson || '[]') as string[];
  } catch {
    factors = [];
  }
  return {
    id: row.id,
    theme: row.theme,
    themeLabel: CHECKIN_THEMES.find((t) => t.id === row.theme)?.label ?? row.theme,
    text: row.text,
    transcript: row.transcript,
    modality: row.modality,
    hasVoice: Boolean(row.voicePath),
    voiceSizeBytes: row.voiceSizeBytes ?? undefined,
    distress: row.distress,
    safetyRisk: row.safetyRisk,
    escalationRisk: row.escalationRisk,
    priority: row.priority,
    sentimentLabel: row.sentimentLabel,
    sentimentScore: row.sentimentScore,
    stressScore: row.stressScore,
    emotionLabel: row.emotionLabel,
    factors,
    createdAt: row.createdAt.toISOString(),
    userId: row.userId,
  };
}

function applyMl(ml: MlPack) {
  return {
    distress: ml.distress ?? null,
    safetyRisk: ml.safety_risk ?? null,
    escalationRisk: ml.escalation_risk ?? null,
    priority: ml.priority ?? null,
    sentimentLabel: ml.sentiment_label ?? null,
    sentimentScore: ml.sentiment_score ?? null,
    stressScore: ml.stress_score ?? null,
    emotionLabel: ml.emotion_label ?? null,
    factorsJson: JSON.stringify(ml.factors ?? []),
    mlJson: JSON.stringify(ml),
  };
}

checkInRouter.get('/themes', (_req, res) => {
  res.json(CHECKIN_THEMES);
});

checkInRouter.get('/timeline', async (req: AuthedRequest, res, next) => {
  try {
    const [checkIns, appointments] = await Promise.all([
      prisma.checkIn.findMany({
        where: { userId: req.user!.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.appointment.findMany({
        where: { userId: req.user!.id },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
    ]);

    const items = [
      ...checkIns.map((c) => ({
        kind: 'checkin' as const,
        at: c.createdAt.toISOString(),
        checkIn: dto(c),
      })),
      ...appointments.map((a) => ({
        kind: 'appointment' as const,
        at: a.createdAt.toISOString(),
        appointment: {
          id: a.id,
          place: a.placeName,
          clinician: a.clinician,
          date: a.date,
          time: a.time,
          mode: a.mode,
          status: a.status,
        },
      })),
    ].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));

    res.json({ items });
  } catch (e) {
    next(e);
  }
});

checkInRouter.get('/', async (req: AuthedRequest, res, next) => {
  try {
    const rows = await prisma.checkIn.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(rows.map(dto));
  } catch (e) {
    next(e);
  }
});

checkInRouter.post('/', async (req: AuthedRequest, res, next) => {
  try {
    const body = z
      .object({
        theme: z.string().refine((v) => themeIds.includes(v), 'Invalid theme'),
        text: z.string().max(8000).default(''),
        language: z.string().max(16).optional(),
      })
      .parse(req.body);

    if (!body.text.trim()) {
      return res.status(400).json({ error: 'Please share a short note about how you are feeling.' });
    }

    let ml: MlPack;
    try {
      ml = await mlAnalyzeText({
        text: body.text,
        language: body.language || 'en',
        theme: body.theme,
      });
    } catch (err) {
      console.warn('ML text analyze failed:', (err as Error).message);
      return res.status(503).json({ error: 'Assessment service unavailable. Try again shortly.' });
    }

    const row = await prisma.checkIn.create({
      data: {
        userId: req.user!.id,
        theme: body.theme,
        text: body.text.trim(),
        modality: 'TEXT',
        ...applyMl(ml),
      },
    });

    res.status(201).json(dto(row));
  } catch (e) {
    next(e);
  }
});

checkInRouter.post(
  '/:id/voice',
  express.raw({ type: ['audio/*', 'application/octet-stream'], limit: '12mb' }),
  async (req: AuthedRequest, res, next) => {
    try {
      if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
        return res.status(400).json({ error: 'WAV audio is required.' });
      }
      const row = await prisma.checkIn.findFirst({
        where: { id: String(req.params.id), userId: req.user!.id },
      });
      if (!row) return res.status(404).json({ error: 'Check-in not found.' });

      await mkdir(uploadDir, { recursive: true });
      const filename = `${req.user!.id}-${row.id}.wav`;
      const filePath = path.join(uploadDir, filename);
      const { writeFile } = await import('node:fs/promises');
      await writeFile(filePath, req.body);

      let ml: MlPack;
      try {
        ml = await mlAnalyzeVoice({
          wav: req.body,
          filename,
          text: row.text,
          transcript: row.transcript || row.text,
          theme: row.theme,
          language: 'en',
        });
      } catch (err) {
        console.warn('ML voice analyze failed:', (err as Error).message);
        return res.status(503).json({ error: 'Voice assessment failed. Check WAV format (16-bit PCM).' });
      }

      const updated = await prisma.checkIn.update({
        where: { id: row.id },
        data: {
          voicePath: filePath,
          voiceMimeType: 'audio/wav',
          voiceSizeBytes: req.body.length,
          modality: row.text.trim() ? 'MIXED' : 'VOICE',
          ...applyMl(ml),
        },
      });

      res.json(dto(updated));
    } catch (e) {
      next(e);
    }
  },
);

checkInRouter.get('/:id/voice', async (req: AuthedRequest, res, next) => {
  try {
    const isPro = [Role.COUNSELLOR, Role.PSYCHOLOGIST, Role.PSYCHIATRIST, Role.ORG_ADMIN].includes(
      req.user!.role as (typeof Role)[keyof typeof Role],
    );
    const row = await prisma.checkIn.findFirst({
      where: isPro
        ? { id: String(req.params.id) }
        : { id: String(req.params.id), userId: req.user!.id },
      include: isPro
        ? { user: { include: { contactConsent: true } } }
        : undefined,
    });
    if (!row?.voicePath) return res.status(404).json({ error: 'Recording not found.' });
    if (isPro) {
      const consent = (row as { user?: { contactConsent?: { allowWellbeingSummary?: boolean } } }).user
        ?.contactConsent;
      if (!consent?.allowWellbeingSummary) {
        return res.status(403).json({ error: 'Voice not shared under current consent.' });
      }
    }
    const resolved = path.resolve(row.voicePath);
    if (!resolved.startsWith(uploadDir)) return res.status(404).json({ error: 'Recording not found.' });
    const buf = await readFile(resolved);
    res.type(row.voiceMimeType || 'audio/wav').send(buf);
  } catch (e) {
    next(e);
  }
});
