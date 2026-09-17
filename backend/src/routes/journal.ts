import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthedRequest } from '../lib/auth.js';

export const journalRouter = Router();
journalRouter.use(requireAuth);

function mapJournal(e: {
  id: string;
  title: string;
  body: string;
  mood: string;
  tagsJson: string;
  date: Date;
  pinned: boolean;
}) {
  return {
    id: e.id,
    title: e.title,
    body: e.body,
    mood: e.mood,
    tags: JSON.parse(e.tagsJson) as string[],
    date: e.date.toISOString(),
    pinned: e.pinned,
  };
}

journalRouter.get('/', async (req: AuthedRequest, res, next) => {
  try {
    const entries = await prisma.journalEntry.findMany({
      where: { userId: req.user!.id },
      orderBy: [{ pinned: 'desc' }, { date: 'desc' }],
    });
    res.json(entries.map(mapJournal));
  } catch (e) {
    next(e);
  }
});

journalRouter.post('/', async (req: AuthedRequest, res, next) => {
  try {
    const body = z
      .object({
        title: z.string().default('Untitled reflection'),
        body: z.string().min(1),
        mood: z.string().default('Reflective'),
        tags: z.array(z.string()).default([]),
        pinned: z.boolean().optional(),
      })
      .parse(req.body);
    const entry = await prisma.journalEntry.create({
      data: {
        userId: req.user!.id,
        title: body.title || 'Untitled reflection',
        body: body.body,
        mood: body.mood,
        tagsJson: JSON.stringify(body.tags),
        pinned: body.pinned ?? false,
      },
    });
    res.status(201).json(mapJournal(entry));
  } catch (e) {
    next(e);
  }
});

journalRouter.put('/:id', async (req: AuthedRequest, res, next) => {
  try {
    const body = z
      .object({
        title: z.string().optional(),
        body: z.string().optional(),
        mood: z.string().optional(),
        tags: z.array(z.string()).optional(),
        pinned: z.boolean().optional(),
      })
      .parse(req.body);
    const existing = await prisma.journalEntry.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!existing) return res.status(404).json({ error: 'Not found.' });
    const entry = await prisma.journalEntry.update({
      where: { id: existing.id },
      data: {
        title: body.title ?? existing.title,
        body: body.body ?? existing.body,
        mood: body.mood ?? existing.mood,
        tagsJson: body.tags ? JSON.stringify(body.tags) : existing.tagsJson,
        pinned: body.pinned ?? existing.pinned,
      },
    });
    res.json(mapJournal(entry));
  } catch (e) {
    next(e);
  }
});

journalRouter.delete('/:id', async (req: AuthedRequest, res, next) => {
  try {
    const existing = await prisma.journalEntry.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!existing) return res.status(404).json({ error: 'Not found.' });
    await prisma.journalEntry.delete({ where: { id: existing.id } });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});
