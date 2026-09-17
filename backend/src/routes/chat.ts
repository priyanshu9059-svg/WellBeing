import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthedRequest } from '../lib/auth.js';
import { generateChatReply, screenRisk } from '../services/wellbeing.js';

export const chatRouter = Router();

chatRouter.use(requireAuth);

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
      })),
    });
  } catch (e) {
    next(e);
  }
});

chatRouter.post('/send', async (req: AuthedRequest, res, next) => {
  try {
    const body = z.object({ message: z.string().min(1).max(4000), conversationId: z.string().optional() }).parse(req.body);
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

    const replyText = await generateChatReply(body.message);
    const assistant = await prisma.chatMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'assistant',
        text: replyText,
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
