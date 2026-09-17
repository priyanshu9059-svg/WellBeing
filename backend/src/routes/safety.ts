import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthedRequest } from '../lib/auth.js';

export const safetyRouter = Router();
safetyRouter.use(requireAuth);

const planSchema = z.object({
  warningSigns: z.array(z.string()).default([]),
  harderSituations: z.array(z.string()).default([]),
  selfActions: z.array(z.string()).default([]),
  saferPlaces: z.array(z.string()).default([]),
  trustedPeople: z.array(z.string()).default([]),
  professionalContacts: z.array(z.string()).default([]),
  reasons: z.array(z.string()).default([]),
  reduceDanger: z.array(z.string()).default([]),
  emergencyResources: z.array(z.string()).default(['Tele-MANAS: 14416', 'Emergency services: 112']),
});

function mapPlan(p: {
  warningSignsJson: string;
  harderSituationsJson: string;
  selfActionsJson: string;
  saferPlacesJson: string;
  trustedPeopleJson: string;
  professionalContactsJson: string;
  reasonsJson: string;
  reduceDangerJson: string;
  emergencyResourcesJson: string;
}) {
  return {
    warningSigns: JSON.parse(p.warningSignsJson) as string[],
    harderSituations: JSON.parse(p.harderSituationsJson) as string[],
    selfActions: JSON.parse(p.selfActionsJson) as string[],
    saferPlaces: JSON.parse(p.saferPlacesJson) as string[],
    trustedPeople: JSON.parse(p.trustedPeopleJson) as string[],
    professionalContacts: JSON.parse(p.professionalContactsJson) as string[],
    reasons: JSON.parse(p.reasonsJson) as string[],
    reduceDanger: JSON.parse(p.reduceDangerJson) as string[],
    emergencyResources: JSON.parse(p.emergencyResourcesJson) as string[],
  };
}

safetyRouter.get('/', async (req: AuthedRequest, res, next) => {
  try {
    const plan = await prisma.safetyPlan.findUnique({ where: { userId: req.user!.id } });
    if (!plan) {
      return res.json({
        warningSigns: [],
        harderSituations: [],
        selfActions: [],
        saferPlaces: [],
        trustedPeople: [],
        professionalContacts: [],
        reasons: [],
        reduceDanger: [],
        emergencyResources: ['Tele-MANAS: 14416', 'Emergency services: 112'],
      });
    }
    res.json(mapPlan(plan));
  } catch (e) {
    next(e);
  }
});

safetyRouter.put('/', async (req: AuthedRequest, res, next) => {
  try {
    const body = planSchema.parse(req.body);
    const data = {
      warningSignsJson: JSON.stringify(body.warningSigns),
      harderSituationsJson: JSON.stringify(body.harderSituations),
      selfActionsJson: JSON.stringify(body.selfActions),
      saferPlacesJson: JSON.stringify(body.saferPlaces),
      trustedPeopleJson: JSON.stringify(body.trustedPeople),
      professionalContactsJson: JSON.stringify(body.professionalContacts),
      reasonsJson: JSON.stringify(body.reasons),
      reduceDangerJson: JSON.stringify(body.reduceDanger),
      emergencyResourcesJson: JSON.stringify(body.emergencyResources),
    };
    const plan = await prisma.safetyPlan.upsert({
      where: { userId: req.user!.id },
      create: { userId: req.user!.id, ...data },
      update: data,
    });
    res.json(mapPlan(plan));
  } catch (e) {
    next(e);
  }
});
