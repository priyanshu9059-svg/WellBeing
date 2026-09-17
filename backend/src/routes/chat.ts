import { Router } from 'express';
import express from 'express';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthedRequest } from '../lib/auth.js';
import { generateChatReply, screenRisk } from '../services/wellbeing.js';

export const chatRouter = Router();

chatRouter.use(requireAuth);

const uploadDir = path.resolve(process.cwd(), 'uploads', 'conversations');

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
          messages: {
            create: {
              role: 'assistant',
              text: 'I’m here with you. You can share as much or as little as feels comfortable. What is on your mind?',
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
      conversation = await prisma.conversation.create({ data: { userId: req.user!.id } });
    }

    const userMsg = await prisma.chatMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        text: body.message,
        flagged: risk.flagged,
      },
    });

    if (risk.flagged) {
      await prisma.conversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } });
      return res.json({
        flagged: true,
        userMessage: {
          id: userMsg.id,
          role: 'user',
          text: userMsg.text,
          createdAt: userMsg.createdAt.toISOString(),
        },
        assistantMessage: null,
      });
    }

    const history = await prisma.chatMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'desc' },
      take: 12,
    });
    const reply = await generateChatReply(
      body.message,
      history.reverse().map((item) => ({ role: item.role === 'assistant' ? 'assistant' as const : 'user' as const, text: item.text })),
      body.language ?? 'English',
    );
    const assistant = await prisma.chatMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'assistant',
        text: reply.text,
        metadataJson: JSON.stringify({ choices: reply.choices, actions: reply.actions, urgency: reply.urgency }),
      },
    });
    await prisma.conversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } });

    res.json({
      flagged: false,
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
    await prisma.conversation.deleteMany({ where: { userId: req.user!.id } });
    const conversation = await prisma.conversation.create({
      data: {
        userId: req.user!.id,
        messages: {
          create: {
            role: 'assistant',
            text: 'I’m here with you. You can share as much or as little as feels comfortable. What is on your mind?',
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
