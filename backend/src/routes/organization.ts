import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthedRequest } from '../lib/auth.js';

export const orgRouter = Router();

orgRouter.post('/validate', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const body = z.object({ code: z.string().min(2), ageBand: z.string().min(1) }).parse(req.body);
    const org = await prisma.organization.findUnique({
      where: { code: body.code.trim().toUpperCase() },
    });
    if (!org) return res.json({ valid: false });

    await prisma.organizationMember.upsert({
      where: {
        organizationId_userId: { organizationId: org.id, userId: req.user!.id },
      },
      create: {
        organizationId: org.id,
        userId: req.user!.id,
        ageBand: body.ageBand,
      },
      update: { ageBand: body.ageBand },
    });

    res.json({
      valid: true,
      organization: { id: org.id, name: org.name, code: org.code, minGroupSize: org.minGroupSize },
      ageBand: body.ageBand,
      anonymous: true,
    });
  } catch (e) {
    next(e);
  }
});

orgRouter.get('/:code/aggregates', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const org = await prisma.organization.findUnique({
      where: { code: String(req.params.code).toUpperCase() },
      include: { aggregates: true, _count: { select: { members: true } } },
    });
    if (!org) return res.status(404).json({ error: 'Organization not found.' });
    if (org._count.members < org.minGroupSize) {
      return res.json({
        hidden: true,
        reason: 'Not enough data to show this group safely.',
        minGroupSize: org.minGroupSize,
        groupSize: org._count.members,
      });
    }
    res.json({
      hidden: false,
      name: org.name,
      groupSize: org._count.members,
      aggregates: org.aggregates.map((a) => ({
        label: a.label,
        value: a.value,
        groupSize: a.groupSize,
      })),
    });
  } catch (e) {
    next(e);
  }
});
