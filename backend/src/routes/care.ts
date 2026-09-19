import { Router } from 'express';
import { z } from 'zod';
import { AppointmentStatus, QueryPriority, QueryStatus, Role } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { audit, requireAuth, requireRole, type AuthedRequest } from '../lib/auth.js';

export const careRouter = Router();

careRouter.get('/places', async (_req, res, next) => {
  try {
    const places = await prisma.carePlace.findMany({ orderBy: { distanceKm: 'asc' } });
    res.json(
      places.map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        area: p.area,
        distance: `${p.distanceKm} km`,
        distanceKm: p.distanceKm,
        rating: p.rating,
        reviews: p.reviews,
        phone: p.phone,
        hours: p.hours,
        next: p.nextAvailable,
        x: p.mapX,
        y: p.mapY,
        specialties: JSON.parse(p.specialtiesJson) as string[],
      })),
    );
  } catch (e) {
    next(e);
  }
});

careRouter.get('/appointments', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const items = await prisma.appointment.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json(
      items.map((a) => ({
        id: a.id,
        place: a.placeName,
        clinician: a.clinician,
        date: a.date,
        time: a.time,
        mode: a.mode,
        status: a.status === 'CONFIRMED' ? 'Confirmed' : a.status === 'COMPLETED' ? 'Completed' : a.status === 'CANCELLED' ? 'Cancelled' : 'Requested',
      })),
    );
  } catch (e) {
    next(e);
  }
});

careRouter.post('/appointments', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const body = z
      .object({
        placeId: z.string().optional(),
        placeName: z.string(),
        clinician: z.string().default('Available care professional'),
        date: z.string(),
        time: z.string(),
        mode: z.string(),
      })
      .parse(req.body);
    const appt = await prisma.appointment.create({
      data: {
        userId: req.user!.id,
        placeId: body.placeId,
        placeName: body.placeName,
        clinician: body.clinician,
        date: body.date,
        time: body.time,
        mode: body.mode,
        status: AppointmentStatus.CONFIRMED,
      },
    });
    res.status(201).json({
      id: appt.id,
      place: appt.placeName,
      clinician: appt.clinician,
      date: appt.date,
      time: appt.time,
      mode: appt.mode,
      status: 'Confirmed',
    });
  } catch (e) {
    next(e);
  }
});

careRouter.patch('/appointments/:id', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const body = z
      .object({ status: z.enum(['Confirmed', 'Completed', 'Cancelled', 'Requested']) })
      .parse(req.body);
    const map: Record<string, AppointmentStatus> = {
      Confirmed: AppointmentStatus.CONFIRMED,
      Completed: AppointmentStatus.COMPLETED,
      Cancelled: AppointmentStatus.CANCELLED,
      Requested: AppointmentStatus.REQUESTED,
    };
    const existing = await prisma.appointment.findFirst({
      where: {
        id: req.params.id,
        OR: [{ userId: req.user!.id }, { clinicianId: req.user!.id }],
      },
    });
    if (!existing) return res.status(404).json({ error: 'Not found.' });
    const appt = await prisma.appointment.update({
      where: { id: existing.id },
      data: { status: map[body.status] },
    });
    res.json({
      id: appt.id,
      status:
        appt.status === 'CONFIRMED'
          ? 'Confirmed'
          : appt.status === 'COMPLETED'
            ? 'Completed'
            : appt.status === 'CANCELLED'
              ? 'Cancelled'
              : 'Requested',
    });
  } catch (e) {
    next(e);
  }
});

const proRoles = [Role.COUNSELLOR, Role.PSYCHOLOGIST, Role.PSYCHIATRIST, Role.ORG_ADMIN] as const;

export const professionalRouter = Router();
professionalRouter.use(requireAuth, requireRole(...proRoles));

professionalRouter.get('/dashboard', async (req: AuthedRequest, res, next) => {
  try {
    const patientUsers = await prisma.user.findMany({
      where: {
        role: Role.USER,
        OR: [
          { anonymous: false, email: { not: null } },
          { contactConsent: { is: { allowWellbeingSummary: true } } },
          { contactConsent: { is: { allowContact: true } } },
          { counsellorRequests: { some: {} } },
          { checkIns: { some: {} } },
          { location: { not: '' } },
          { abhaId: { not: '' } },
          { phone: { not: '' } },
          { gender: { not: '' } },
          { age: { not: null } },
        ],
      },
      include: {
        contactConsent: true,
        moodEntries: { orderBy: { date: 'desc' }, take: 5 },
        wellbeingSnapshots: { orderBy: { createdAt: 'desc' }, take: 1 },
        checkIns: { orderBy: { createdAt: 'desc' }, take: 5 },
        conversations: {
          orderBy: { updatedAt: 'desc' },
          take: 1,
          include: {
            messages: {
              where: { role: 'assistant' },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 40,
    });

    const patients = patientUsers.map((user) => {
      const moods = user.moodEntries.map((m) => Math.round((m.mood / 5) * 100));
      const snap = user.wellbeingSnapshots[0];
      const latestCheckIn = user.checkIns[0];
      const latestAssistant = user.conversations[0]?.messages[0];
      let chatMeta: {
        emotion?: string;
        riskLevel?: string;
        confidence?: number;
        source?: string;
      } = {};
      if (latestAssistant?.metadataJson) {
        try {
          chatMeta = JSON.parse(latestAssistant.metadataJson) as typeof chatMeta;
        } catch {
          chatMeta = {};
        }
      }

      const priority = latestCheckIn?.priority;
      const checkScore =
        priority === 'Critical'
          ? 92
          : priority === 'High'
            ? 78
            : priority === 'Moderate'
              ? 58
              : priority === 'Mild'
                ? 38
                : priority === 'Low'
                  ? 22
                  : latestCheckIn?.distress ?? null;

      const riskLevel = chatMeta.riskLevel as 'low' | 'moderate' | 'high' | 'crisis' | undefined;
      const chatScore =
        riskLevel === 'crisis'
          ? 92
          : riskLevel === 'high'
            ? 78
            : riskLevel === 'moderate'
              ? 55
              : riskLevel === 'low'
                ? 28
                : null;
      const score = checkScore ?? chatScore ?? snap?.confidence ?? (moods[0] ?? 40);
      const level =
        priority === 'Critical' || priority === 'High'
          ? 'High'
          : priority === 'Moderate'
            ? 'Elevated'
            : riskLevel === 'crisis' || riskLevel === 'high'
              ? 'High'
              : riskLevel === 'moderate'
                ? 'Elevated'
                : score >= 75
                  ? 'High'
                  : score >= 55
                    ? 'Elevated'
                    : score >= 35
                      ? 'Moderate'
                      : 'Low';

      const themeLabel = latestCheckIn?.theme?.replace(/_/g, ' ') ?? null;
      const signal = latestCheckIn
        ? `Check-in · ${themeLabel} · ${latestCheckIn.priority ?? 'scored'} · distress ${latestCheckIn.distress ?? '—'}`
        : chatMeta.emotion && riskLevel
          ? `Aria chat · ${chatMeta.emotion} · ${riskLevel} risk`
          : snap?.factorsJson
            ? (JSON.parse(snap.factorsJson) as string[]).join(', ') || 'Needs review'
            : 'Follow-up check-in';

      const lastAt =
        latestCheckIn?.createdAt ??
        latestAssistant?.createdAt ??
        user.conversations[0]?.updatedAt ??
        user.updatedAt;
      const c = user.contactConsent;
      return {
        id: user.id,
        name: user.displayName || `Anonymous ${user.id.slice(-4)}`,
        score,
        level,
        signal,
        emotion: latestCheckIn?.emotionLabel ?? chatMeta.emotion ?? null,
        riskLevel: latestCheckIn?.priority ?? riskLevel ?? null,
        confidence: latestCheckIn?.sentimentScore ?? chatMeta.confidence ?? null,
        last: lastAt.toISOString(),
        consent: [
          !user.anonymous && user.email ? 'Registered account' : null,
          c?.allowWellbeingSummary ? 'Care summary' : null,
          c?.allowContact ? 'contact' : null,
        ]
          .filter(Boolean)
          .join(' + ') || 'Not shared',
        mood: moods.length ? moods.reverse() : [40, 45, 42, 50, score],
        checkIns: user.checkIns.map((ci) => ({
          id: ci.id,
          theme: ci.theme,
          text: ci.text.slice(0, 280),
          priority: ci.priority,
          distress: ci.distress,
          safetyRisk: ci.safetyRisk,
          escalationRisk: ci.escalationRisk,
          sentimentLabel: ci.sentimentLabel,
          stressScore: ci.stressScore,
          emotionLabel: ci.emotionLabel,
          hasVoice: Boolean(ci.voicePath),
          createdAt: ci.createdAt.toISOString(),
        })),
        profile: {
          location: user.location || '',
          abhaId: user.abhaId || '',
          abhaVerified: user.abhaVerified,
          abhaProfile: (() => {
            try {
              const p = JSON.parse(user.abhaProfileJson || '{}') as Record<string, unknown>;
              return Object.keys(p).length ? p : null;
            } catch {
              return null;
            }
          })(),
          phone: user.phone || c?.mobile || '',
          gender: user.gender || '',
          age: user.age,
          email: user.email || c?.email || '',
          skipped: user.profileSkipped,
          updatedAt: user.profileUpdatedAt?.toISOString() ?? null,
        },
      };
    });

    const queries = await prisma.patientQuery.findMany({
      where: { status: QueryStatus.OPEN },
      include: { patient: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const appointments = await prisma.appointment.findMany({
      where: {
        OR: [{ clinicianId: req.user!.id }, { status: AppointmentStatus.REQUESTED }],
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    res.json({
      professional: {
        id: req.user!.id,
        displayName: req.user!.displayName,
        role: req.user!.role,
      },
      metrics: {
        queue: patients.length,
        callsToday: appointments.filter((a) => a.status === AppointmentStatus.CONFIRMED).length,
        openQueries: queries.length,
        responseMinutes: 9,
      },
      patients,
      queries: queries.map((q) => ({
        id: q.id,
        patient: q.patient.displayName || 'Anonymous',
        text: q.text,
        age: q.createdAt.toISOString(),
        priority: q.priority === QueryPriority.URGENT ? 'Urgent' : 'Normal',
        status: q.status,
      })),
      appointments: appointments.map((a) => ({
        id: a.id,
        place: a.placeName,
        clinician: a.clinician,
        date: a.date,
        time: a.time,
        mode: a.mode,
        status: a.status,
        patientId: a.userId,
      })),
    });
  } catch (e) {
    next(e);
  }
});

professionalRouter.post('/queries/:id/reply', async (req: AuthedRequest, res, next) => {
  try {
    const body = z.object({ reply: z.string().min(1) }).parse(req.body);
    const query = await prisma.patientQuery.update({
      where: { id: req.params.id },
      data: {
        reply: body.reply,
        status: QueryStatus.RESOLVED,
        responderId: req.user!.id,
      },
    });
    await audit(req.user!.id, 'professional.query_reply', { queryId: query.id });
    res.json(query);
  } catch (e) {
    next(e);
  }
});

professionalRouter.post('/queries/:id/resolve', async (req: AuthedRequest, res, next) => {
  try {
    const query = await prisma.patientQuery.update({
      where: { id: req.params.id },
      data: { status: QueryStatus.RESOLVED, responderId: req.user!.id },
    });
    await audit(req.user!.id, 'professional.query_resolve', { queryId: query.id });
    res.json(query);
  } catch (e) {
    next(e);
  }
});

professionalRouter.patch('/availability', async (req: AuthedRequest, res, next) => {
  try {
    const body = z
      .object({ available: z.boolean().optional(), acceptPriority: z.boolean().optional() })
      .parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: body,
    });
    await audit(req.user!.id, 'professional.availability', body);
    res.json({ available: user.available, acceptPriority: user.acceptPriority });
  } catch (e) {
    next(e);
  }
});

export const counsellorRouter = Router();
counsellorRouter.use(requireAuth);

counsellorRouter.post('/request', async (req: AuthedRequest, res, next) => {
  try {
    const body = z
      .object({
        note: z.string().default(''),
        allowSummary: z.boolean().default(false),
      })
      .parse(req.body ?? {});
    const available = await prisma.user.findFirst({
      where: {
        role: { in: [...proRoles] },
        available: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
    const request = await prisma.counsellorRequest.create({
      data: {
        userId: req.user!.id,
        counsellorId: available?.id,
        note: body.note,
        allowSummary: body.allowSummary,
        status: available ? 'assigned' : 'pending',
      },
    });
    await audit(req.user!.id, 'counsellor.request', { requestId: request.id });
    res.status(201).json({
      id: request.id,
      status: request.status,
      counsellorId: request.counsellorId,
      message: available
        ? 'A counsellor has been assigned to your request.'
        : 'Your request is queued. A counsellor will pick it up when available.',
    });
  } catch (e) {
    next(e);
  }
});
