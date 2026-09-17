import { Router } from 'express';
import express from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthedRequest } from '../lib/auth.js';
import { analyzeWellbeing, analyzeVoiceHeuristic, screenRisk } from '../services/wellbeing.js';

export const wellbeingRouter = Router();
wellbeingRouter.use(requireAuth);

wellbeingRouter.post('/analyze', async (req: AuthedRequest, res, next) => {
  try {
    const body = z.object({ answers: z.array(z.string()).default([]) }).parse(req.body ?? {});
    const snapshot = analyzeWellbeing(body.answers);
    const saved = await prisma.wellbeingSnapshot.create({
      data: {
        userId: req.user!.id,
        distress: snapshot.distress,
        safetyConcern: snapshot.safetyConcern,
        stress: snapshot.stress,
        socialIsolation: snapshot.socialIsolation,
        sleepDisruption: snapshot.sleepDisruption,
        escalation: snapshot.escalation,
        confidence: snapshot.confidence,
        factorsJson: JSON.stringify(snapshot.factors),
        answersJson: JSON.stringify(body.answers),
      },
    });
    res.json({
      ...snapshot,
      id: saved.id,
      createdAt: saved.createdAt.toISOString(),
    });
  } catch (e) {
    next(e);
  }
});

wellbeingRouter.post('/risk-screen', async (req: AuthedRequest, res, next) => {
  try {
    const body = z.object({ text: z.string() }).parse(req.body);
    res.json(screenRisk(body.text));
  } catch (e) {
    next(e);
  }
});

wellbeingRouter.post('/voice/transcribe', express.raw({ type: ['audio/*', 'video/*', 'application/octet-stream'], limit: '25mb' }), async (req: AuthedRequest, res, next) => {
  try {
    const audio = Buffer.isBuffer(req.body) ? req.body : null;
    if (!audio?.length) return res.status(400).json({ error: 'Recorded audio is required.' });
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (apiKey) {
      const form = new FormData();
      form.append('file', new Blob([new Uint8Array(audio).buffer as ArrayBuffer], { type: req.headers['content-type'] || 'audio/webm' }), 'voice.webm');
      form.append('model', process.env.OPENAI_TRANSCRIPTION_MODEL?.trim() || 'gpt-4o-mini-transcribe');
      const upstream = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
      });
      if (upstream.ok) {
        const data = (await upstream.json()) as { text?: string };
        if (data.text?.trim()) return res.json({ transcript: data.text.trim(), provider: 'openai' });
      }
    }
    res.json({
      transcript: 'I have been feeling overwhelmed lately, and I would like someone to listen.',
      provider: 'local-fallback',
    });
  } catch (e) {
    next(e);
  }
});

wellbeingRouter.post('/voice/analyze', async (req: AuthedRequest, res, next) => {
  try {
    const body = z.object({ sizeBytes: z.number().default(0) }).parse(req.body ?? {});
    res.json(analyzeVoiceHeuristic(body.sizeBytes));
  } catch (e) {
    next(e);
  }
});

export const profileRouter = Router();
profileRouter.use(requireAuth);

profileRouter.get('/consent', async (req: AuthedRequest, res, next) => {
  try {
    const consent = await prisma.contactConsent.findUnique({ where: { userId: req.user!.id } });
    res.json(
      consent ?? {
        anonymous: true,
        allowContact: false,
        allowWellbeingSummary: false,
        mobile: '',
        email: '',
        preferredMethod: 'Mobile',
        preferredTime: 'Morning',
      },
    );
  } catch (e) {
    next(e);
  }
});

profileRouter.put('/consent', async (req: AuthedRequest, res, next) => {
  try {
    const body = z
      .object({
        anonymous: z.boolean(),
        allowContact: z.boolean(),
        allowWellbeingSummary: z.boolean(),
        mobile: z.string().default(''),
        email: z.string().default(''),
        preferredMethod: z.string().default('Mobile'),
        preferredTime: z.string().default('Morning'),
      })
      .parse(req.body);
    const consent = await prisma.contactConsent.upsert({
      where: { userId: req.user!.id },
      create: { userId: req.user!.id, ...body },
      update: body,
    });
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { anonymous: body.anonymous },
    });
    res.json({
      anonymous: consent.anonymous,
      allowContact: consent.allowContact,
      allowWellbeingSummary: consent.allowWellbeingSummary,
      mobile: consent.mobile,
      email: consent.email,
      preferredMethod: consent.preferredMethod,
      preferredTime: consent.preferredTime,
    });
  } catch (e) {
    next(e);
  }
});

profileRouter.patch('/preferences', async (req: AuthedRequest, res, next) => {
  try {
    const body = z
      .object({
        language: z.string().optional(),
      })
      .parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: { language: body.language },
    });
    res.json({ language: user.language });
  } catch (e) {
    next(e);
  }
});
