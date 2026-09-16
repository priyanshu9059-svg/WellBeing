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
}) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    anonymous: user.anonymous,
    language: user.language,
  };
}

authRouter.post('/anonymous', async (req, res, next) => {
  try {
    const body = z
      .object({
        anonymousKey: z.string().min(8).optional(),
        language: z.string().optional(),
      })
      .parse(req.body ?? {});

    let user =
      body.anonymousKey
        ? await prisma.user.findUnique({ where: { anonymousKey: body.anonymousKey } })
        : null;

    if (!user) {
      user = await prisma.user.create({
        data: {
          anonymous: true,
          anonymousKey: body.anonymousKey || crypto.randomUUID(),
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
        role: z.enum(['COUNSELLOR', 'PSYCHOLOGIST', 'PSYCHIATRIST']).default('COUNSELLOR'),
        licenceNumber: z.string().min(3),
      })
      .parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (existing) return res.status(409).json({ error: 'Email already registered.' });

    const user = await prisma.user.create({
      data: {
        email: body.email.toLowerCase(),
        passwordHash: await bcrypt.hash(body.password, 10),
        displayName: body.displayName,
        role: body.role as Role,
        anonymous: false,
        licenceNumber: body.licenceNumber,
      },
    });
    await audit(user.id, 'auth.signup', { role: user.role });
    const token = signToken(user);
    res.status(201).json({ token, user: publicUser(user) });
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
