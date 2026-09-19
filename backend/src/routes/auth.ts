import jwt from 'jsonwebtoken';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { audit, requireAuth, signToken, type AuthedRequest } from '../lib/auth.js';

export const authRouter = Router();

function publicUser(user: {
  id: string;
  email: string | null;
  displayName: string | null;
  role: Role;
  anonymous: boolean;
  language: string;
  anonymousKey?: string | null;
}) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    anonymous: user.anonymous,
    language: user.language,
    anonymousId: user.anonymous
      ? `ANON-${(user.anonymousKey || user.id).slice(-8).toUpperCase()}`
      : null,
  };
}

function peekUserId(req: { headers: { authorization?: string } }): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  try {
    const secret = process.env.JWT_SECRET || 'change-me-in-production';
    const payload = jwt.verify(header.slice(7), secret) as { sub?: string };
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

authRouter.post('/anonymous', async (req, res, next) => {
  try {
    const body = z
      .object({
        anonymousKey: z.string().min(8).optional(),
        language: z.string().optional(),
      })
      .parse(req.body ?? {});

    let requestedKey = body.anonymousKey;
    let user = requestedKey
      ? await prisma.user.findUnique({ where: { anonymousKey: requestedKey } })
      : null;

    // Signed-up accounts keep their old anonymousKey — start a fresh anon identity instead
    if (user?.email && user.passwordHash) {
      user = null;
      requestedKey = crypto.randomUUID();
    }

    if (!user) {
      const key = requestedKey || crypto.randomUUID();
      user = await prisma.user.create({
        data: {
          anonymous: true,
          anonymousKey: key,
          language: body.language || 'English',
          displayName: `Anonymous ${Math.floor(1000 + Math.random() * 9000)}`,
        },
      });
      await audit(user.id, 'auth.anonymous_created');
    }

    const token = signToken(user);
    res.json({ token, user: publicUser(user), anonymousKey: user.anonymousKey });
  } catch (e) {
    next(e);
  }
});

authRouter.post('/signup', async (req, res, next) => {
  try {
    const body = z
      .object({
        email: z.string().email(),
        password: z.string().min(8),
        displayName: z.string().min(2),
        role: z.enum(['USER', 'COUNSELLOR', 'PSYCHOLOGIST', 'PSYCHIATRIST']).default('USER'),
        licenceNumber: z.string().optional().default(''),
        anonymousKey: z.string().min(8).optional(),
      })
      .parse(req.body);

    if (body.role !== 'USER' && !body.licenceNumber?.trim()) {
      return res.status(400).json({ error: 'Licence number is required for professional accounts.' });
    }

    const existing = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (existing) return res.status(409).json({ error: 'Email already registered.' });

    const passwordHash = await bcrypt.hash(body.password, 10);
    let user;
    let upgraded = false;

    // Upgrade the current anonymous session in place so chat/check-ins stay on this person
    if (body.role === 'USER') {
      const currentId = peekUserId(req);
      const current = currentId
        ? await prisma.user.findUnique({ where: { id: currentId } })
        : body.anonymousKey
          ? await prisma.user.findUnique({ where: { anonymousKey: body.anonymousKey } })
          : null;

      if (current && current.role === Role.USER && !current.email && !current.passwordHash) {
        user = await prisma.user.update({
          where: { id: current.id },
          data: {
            email: body.email.toLowerCase(),
            passwordHash,
            displayName: body.displayName,
            anonymous: false,
            role: Role.USER,
          },
        });
        upgraded = true;
        // Keep check-ins/history; start a fresh AI chat for the registered profile
        await prisma.conversation.deleteMany({ where: { userId: user.id } });
        await prisma.conversation.create({
          data: {
            userId: user.id,
            title: 'Aria · wellbeing companion',
            messages: {
              create: {
                role: 'assistant',
                text: "Hello, I'm Aria — I'm here to listen, without judgment. How have you been feeling today?",
              },
            },
          },
        });
        await prisma.contactConsent.upsert({
          where: { userId: user.id },
          create: {
            userId: user.id,
            anonymous: false,
            allowContact: true,
            allowWellbeingSummary: true,
            mobile: '',
            email: body.email.toLowerCase(),
            preferredMethod: 'Email',
            preferredTime: 'Morning',
          },
          update: {
            anonymous: false,
            allowContact: true,
            allowWellbeingSummary: true,
            email: body.email.toLowerCase(),
          },
        });
        await audit(user.id, 'auth.signup_upgraded', { role: user.role });
      }
    }

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: body.email.toLowerCase(),
          passwordHash,
          displayName: body.displayName,
          role: body.role as Role,
          anonymous: false,
          licenceNumber: body.licenceNumber,
        },
      });
      if (body.role === 'USER') {
        await prisma.contactConsent.create({
          data: {
            userId: user.id,
            anonymous: false,
            allowContact: true,
            allowWellbeingSummary: true,
            mobile: '',
            email: body.email.toLowerCase(),
            preferredMethod: 'Email',
            preferredTime: 'Morning',
          },
        });
        await prisma.conversation.create({
          data: {
            userId: user.id,
            title: 'Aria · wellbeing companion',
            messages: {
              create: {
                role: 'assistant',
                text: "Hello, I'm Aria — I'm here to listen, without judgment. How have you been feeling today?",
              },
            },
          },
        });
      }
      await audit(user.id, 'auth.signup', { role: user.role });
    }

    const token = signToken(user);
    res.status(201).json({
      token,
      user: publicUser(user),
      needsProfile: body.role === 'USER',
      upgraded,
    });
  } catch (e) {
    next(e);
  }
});

authRouter.post('/signin', async (req, res, next) => {
  try {
    const body = z
      .object({
        email: z.string().email(),
        password: z.string().min(1),
      })
      .parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (!user?.passwordHash) return res.status(401).json({ error: 'Invalid email or password.' });
    const ok = await bcrypt.compare(body.password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid email or password.' });

    await audit(user.id, 'auth.signin');
    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (e) {
    next(e);
  }
});

authRouter.get('/me', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({ user: publicUser(user) });
  } catch (e) {
    next(e);
  }
});
