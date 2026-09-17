import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthedRequest } from '../lib/auth.js';

export const moodRouter = Router();
moodRouter.use(requireAuth);

function mapMood(e: {
  id: string;
  date: Date;
  mood: number;
  intensity: number;
  note: string;
  tagsJson: string;
}) {
  return {
    id: e.id,
    date: e.date.toISOString(),
    mood: e.mood,
    intensity: e.intensity,
    note: e.note,
    tags: JSON.parse(e.tagsJson) as string[],
  };
}

moodRouter.get('/', async (req: AuthedRequest, res, next) => {
  try {
    const entries = await prisma.moodEntry.findMany({
      where: { userId: req.user!.id },
      orderBy: { date: 'desc' },
    });
    res.json(entries.map(mapMood));
  } catch (e) {
    next(e);
  }
});

moodRouter.post('/', async (req: AuthedRequest, res, next) => {
  try {
    const body = z
      .object({
        mood: z.number().int().min(1).max(5),
        intensity: z.number().int().min(1).max(10),
        note: z.string().default(''),
        tags: z.array(z.string()).default([]),
        date: z.string().optional(),
      })
      .parse(req.body);
    const entry = await prisma.moodEntry.create({
      data: {
        userId: req.user!.id,
        mood: body.mood,
        intensity: body.intensity,
        note: body.note,
        tagsJson: JSON.stringify(body.tags),
        date: body.date ? new Date(body.date) : new Date(),
      },
    });
    res.status(201).json(mapMood(entry));
  } catch (e) {
    next(e);
  }
});

moodRouter.delete('/:id', async (req: AuthedRequest, res, next) => {
  try {
    const existing = await prisma.moodEntry.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!existing) return res.status(404).json({ error: 'Not found.' });
    await prisma.moodEntry.delete({ where: { id: existing.id } });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});
