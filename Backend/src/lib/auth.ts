import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from './prisma.js';
import type { Role, User } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'wellbeing-dev-secret-change-in-production';

export type AuthUser = Pick<User, 'id' | 'email' | 'displayName' | 'role' | 'anonymous'>;

export type AuthedRequest = Request & { user?: AuthUser };

export function signToken(user: AuthUser): string {
  return jwt.sign(
    { sub: user.id, role: user.role, anonymous: user.anonymous },
    JWT_SECRET,
    { expiresIn: '30d' },
  );
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET) as { sub: string };
    prisma.user
      .findUnique({ where: { id: payload.sub } })
      .then((user) => {
        if (!user) return res.status(401).json({ error: 'Invalid session.' });
        req.user = {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          role: user.role,
          anonymous: user.anonymous,
        };
        next();
      })
      .catch(next);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

export function optionalAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next();
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET) as { sub: string };
    prisma.user
      .findUnique({ where: { id: payload.sub } })
      .then((user) => {
        if (user) {
          req.user = {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            role: user.role,
            anonymous: user.anonymous,
          };
        }
        next();
      })
      .catch(() => next());
  } catch {
    next();
  }
}

export function requireRole(...roles: Role[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions.' });
    }
    next();
  };
}

export async function audit(userId: string | null | undefined, action: string, detail: unknown = {}) {
  await prisma.auditLog.create({
    data: {
      userId: userId ?? null,
      action,
      detailJson: JSON.stringify(detail),
    },
  });
}
