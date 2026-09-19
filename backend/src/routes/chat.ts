import { Router } from 'express';
import express from 'express';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthedRequest } from '../lib/auth.js';
import { generateChatReply, screenRisk } from '../services/wellbeing.js';
import {
  deleteAriaSession,
  riskToUrgency,
  sendAriaMessage,
  startAriaSession,
} from '../services/aria.js';

export const chatRouter = Router();

chatRouter.use(requireAuth);

const uploadDir = path.resolve(process.cwd(), 'uploads', 'conversations');
const ARIA_GREETING =
  "Hello, I'm Aria — I'm here to listen, without judgment. How have you been feeling today?";

function messageMetadata(value: string) {
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function extensionFromMime(mime: string) {
  if (mime.includes('mp4')) return 'mp4';
  if (mime.includes('ogg')) return 'ogg';
  if (mime.includes('wav')) return 'wav';
  if (mime.includes('audio')) return 'webm';
  return 'webm';
}

function crisisActions() {
  return [
    { label: 'Call Tele-MANAS (14416)', href: 'tel:14416', tone: 'danger' as const },
    { label: 'Call emergency (112)', href: 'tel:112', tone: 'danger' as const },
    { label: 'Open safety resources', href: '/crisis', tone: 'secondary' as const },
  ];
}

async function ensureAriaSession(conversationId: string, existing?: string | null) {
  if (existing) return existing;
  const started = await startAriaSession();
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { ariaSessionId: started.sessionId, title: 'Aria · wellbeing companion' },
  });
  return started.sessionId;
}

async function buildReply(
  message: string,
  conversationId: string,
  ariaSessionId: string | null | undefined,
  language: 'English' | 'Hindi' | 'Hinglish',
  history: Array<{ role: 'user' | 'assistant'; text: string }>,
) {
  try {
    const sessionId = await ensureAriaSession(conversationId, ariaSessionId);
    const aria = await sendAriaMessage(sessionId, message);
    const urgency = riskToUrgency(aria.riskLevel);
    const softFail = /trouble reaching my thinking systems/i.test(aria.reply);
    let text = aria.reply;
    let choices: { label: string; value: string }[] = [];
    let actions =
      aria.riskLevel === 'crisis' || aria.riskLevel === 'high' ? crisisActions() : [];
    let source: 'aria' | 'openai' | 'fallback' = 'aria';

    if (softFail) {
      const fallback = await generateChatReply(message, history, language);
      text = fallback.text;
      choices = fallback.choices;
      actions = fallback.actions.length ? fallback.actions : actions;
      source = fallback.source ?? 'fallback';
    }

    return {
      text,
      choices,
      actions,
      urgency: softFail ? (urgency === 'none' ? 'support' : urgency) : urgency,
      emotion: aria.emotion,
      riskLevel: aria.riskLevel,
      confidence: aria.confidence,
      source,
      ariaSessionId: sessionId,
      crisis: aria.riskLevel === 'crisis',
    };
  } catch (err) {
    console.warn('Aria unavailable, using fallback reply:', (err as Error).message);
    const reply = await generateChatReply(message, history, language);
    return { ...reply, ariaSessionId: ariaSessionId ?? null, crisis: false };
  }
}

chatRouter.get('/conversation', async (req: AuthedRequest, res, next) => {
  try {
    let conversation = await prisma.conversation.findFirst({
      where: { userId: req.user!.id },
      orderBy: { updatedAt: 'desc' },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          userId: req.user!.id,
          title: 'Aria · wellbeing companion',
          messages: {
            create: {
              role: 'assistant',
              text: ARIA_GREETING,
            },
          },
        },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      });
    }
    res.json({
      id: conversation.id,
      title: conversation.title,
      updatedAt: conversation.updatedAt.toISOString(),
      messages: conversation.messages.map((m) => ({
        id: m.id,
        role: m.role,
        text: m.text,
        createdAt: m.createdAt.toISOString(),
        feedback: m.feedback ?? undefined,
        ...messageMetadata(m.metadataJson),
      })),
    });
  } catch (e) {
    next(e);
  }
});

chatRouter.post('/send', async (req: AuthedRequest, res, next) => {
  try {
    const body = z.object({
      message: z.string().min(1).max(4000),
      conversationId: z.string().optional(),
      language: z.enum(['English', 'Hindi', 'Hinglish']).optional(),
    }).parse(req.body);
    const risk = screenRisk(body.message);

    let conversation = body.conversationId
      ? await prisma.conversation.findFirst({ where: { id: body.conversationId, userId: req.user!.id } })
      : await prisma.conversation.findFirst({ where: { userId: req.user!.id }, orderBy: { updatedAt: 'desc' } });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: { userId: req.user!.id, title: 'Aria · wellbeing companion' },
      });
    }

    const userMsg = await prisma.chatMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        text: body.message,
        flagged: risk.flagged,
      },
    });

    const history = await prisma.chatMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'desc' },
      take: 12,
    });

    const reply = await buildReply(
      body.message,
      conversation.id,
      conversation.ariaSessionId,
      body.language ?? 'English',
      history.reverse().map((item) => ({
        role: item.role === 'assistant' ? ('assistant' as const) : ('user' as const),
        text: item.text,
      })),
    );

    const crisis = risk.flagged || reply.crisis === true;
    const assistant = await prisma.chatMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'assistant',
        text: reply.text,
        flagged: crisis,
        metadataJson: JSON.stringify({
          choices: reply.choices,
          actions: reply.actions,
          urgency: reply.urgency,
          emotion: reply.emotion,
          riskLevel: reply.riskLevel,
          confidence: reply.confidence,
          source: reply.source,
        }),
      },
    });

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        updatedAt: new Date(),
        ...(reply.ariaSessionId ? { ariaSessionId: reply.ariaSessionId } : {}),
      },
    });

    res.json({
      flagged: crisis,
      conversationId: conversation.id,
      userMessage: {
        id: userMsg.id,
        role: 'user',
        text: userMsg.text,
        createdAt: userMsg.createdAt.toISOString(),
      },
      assistantMessage: {
        id: assistant.id,
        role: 'assistant',
        text: assistant.text,
        createdAt: assistant.createdAt.toISOString(),
        ...messageMetadata(assistant.metadataJson),
      },
    });
  } catch (e) {
    next(e);
  }
});

chatRouter.post('/feedback', async (req: AuthedRequest, res, next) => {
  try {
    const body = z
      .object({ messageId: z.string(), feedback: z.enum(['helpful', 'not-helpful']) })
      .parse(req.body);
    const message = await prisma.chatMessage.findFirst({
      where: { id: body.messageId, conversation: { userId: req.user!.id } },
    });
    if (!message) return res.status(404).json({ error: 'Message not found.' });
    const updated = await prisma.chatMessage.update({
      where: { id: message.id },
      data: { feedback: body.feedback },
    });
    res.json({ id: updated.id, feedback: updated.feedback });
  } catch (e) {
    next(e);
  }
});

chatRouter.post('/recordings', express.raw({ type: ['video/*', 'audio/*', 'application/octet-stream'], limit: '80mb' }), async (req: AuthedRequest, res, next) => {
  try {
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) return res.status(400).json({ error: 'Recording file is required.' });
    const mimeType = req.headers['content-type'] || 'application/octet-stream';
    await mkdir(uploadDir, { recursive: true });
    const id = crypto.randomUUID();
    const filename = `${req.user!.id}-${id}.${extensionFromMime(mimeType)}`;
    const filePath = path.join(uploadDir, filename);
    await writeFile(filePath, req.body);
    const audit = await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'conversation.recording.created',
        detailJson: JSON.stringify({
          filename,
          path: filePath,
          mimeType,
          sizeBytes: req.body.length,
          placeholder: 'Conversation recording archive. No facial, age, recognition, or emotion diagnosis performed.',
        }),
      },
    });
    res.status(201).json({ id: audit.id, filename, sizeBytes: req.body.length, createdAt: audit.createdAt.toISOString() });
  } catch (e) {
    next(e);
  }
});

chatRouter.get('/recordings', async (req: AuthedRequest, res, next) => {
  try {
    const recordings = await prisma.auditLog.findMany({
      where: { userId: req.user!.id, action: 'conversation.recording.created' },
      orderBy: { createdAt: 'desc' },
    });
    res.json(recordings.map((recording) => {
      const detail = JSON.parse(recording.detailJson || '{}') as { filename?: string; sizeBytes?: number; mimeType?: string };
      return {
        id: recording.id,
        filename: detail.filename ?? 'conversation-recording.webm',
        sizeBytes: detail.sizeBytes ?? 0,
        mimeType: detail.mimeType ?? 'video/webm',
        createdAt: recording.createdAt.toISOString(),
      };
    }));
  } catch (e) {
    next(e);
  }
});

chatRouter.get('/recordings/:id/file', async (req: AuthedRequest, res, next) => {
  try {
    const recording = await prisma.auditLog.findFirst({
      where: { id: String(req.params.id), userId: req.user!.id, action: 'conversation.recording.created' },
    });
    if (!recording) return res.status(404).json({ error: 'Recording not found.' });
    const detail = JSON.parse(recording.detailJson || '{}') as { path?: string; mimeType?: string };
    if (!detail.path || !path.resolve(detail.path).startsWith(uploadDir)) return res.status(404).json({ error: 'Recording not found.' });
    res.type(detail.mimeType || 'video/webm').sendFile(path.resolve(detail.path), (error) => {
      if (error && !res.headersSent) next(error);
    });
  } catch (e) {
    next(e);
  }
});

chatRouter.delete('/recordings/:id', async (req: AuthedRequest, res, next) => {
  try {
    const recording = await prisma.auditLog.findFirst({
      where: { id: String(req.params.id), userId: req.user!.id, action: 'conversation.recording.created' },
    });
    if (!recording) return res.status(404).json({ error: 'Recording not found.' });
    const detail = JSON.parse(recording.detailJson || '{}') as { path?: string };
    if (detail.path && path.resolve(detail.path).startsWith(uploadDir)) {
      await rm(detail.path, { force: true });
    }
    await prisma.auditLog.delete({ where: { id: recording.id } });
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

chatRouter.delete('/conversation', async (req: AuthedRequest, res, next) => {
  try {
    const existing = await prisma.conversation.findMany({
      where: { userId: req.user!.id },
      select: { ariaSessionId: true },
    });
    await Promise.all(
      existing
        .map((c) => c.ariaSessionId)
        .filter((id): id is string => Boolean(id))
        .map((id) => deleteAriaSession(id)),
    );
    await prisma.conversation.deleteMany({ where: { userId: req.user!.id } });
    const conversation = await prisma.conversation.create({
      data: {
        userId: req.user!.id,
        title: 'Aria · wellbeing companion',
        messages: {
          create: {
            role: 'assistant',
            text: ARIA_GREETING,
          },
        },
      },
      include: { messages: true },
    });
    res.json({
      id: conversation.id,
      messages: conversation.messages.map((m) => ({
        id: m.id,
        role: m.role,
        text: m.text,
        createdAt: m.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    next(e);
  }
});
