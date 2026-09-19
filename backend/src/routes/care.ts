import { Router } from 'express';
import { z } from 'zod';
import { AppointmentStatus, QueryPriority, QueryStatus, Role } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { audit, requireAuth, requireRole, type AuthedRequest } from '../lib/auth.js';
import { notificationService } from '../services/notification_service.js';

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
        clinicianId: z.string().optional(),
        clinicianEmail: z.string().optional(),
        date: z.string(),
        time: z.string(),
        mode: z.string(),
      })
      .parse(req.body);

    let placeId: string | undefined;
    if (body.placeId) {
      const place = await prisma.carePlace.findUnique({ where: { id: body.placeId } });
      if (place) placeId = place.id;
    }

    let clinicianId: string | undefined = body.clinicianId ?? undefined;
    let clinician = body.clinician ?? 'Available care professional';
    if (!clinicianId && (body.clinician || body.clinicianEmail)) {
      const match = await prisma.user.findFirst({
        where: {
          role: { in: [...proRoles] },
          ...(body.clinician ? { displayName: body.clinician } : {}),
          ...(body.clinicianEmail ? { email: body.clinicianEmail } : {}),
        },
      });
      if (match) {
        clinicianId = match.id;
        clinician = match.displayName ?? clinician;
      }
    }

    const appt = await prisma.appointment.create({
      data: {
        userId: req.user!.id,
        placeId,
        placeName: body.placeName,
        clinician,
        clinicianId,
        date: body.date,
        time: body.time,
        mode: body.mode,
        status: AppointmentStatus.CONFIRMED,
      },
    });

    // Database-First: Send notifications AFTER appointment creation succeeds
    const notificationStatus = await notificationService.notifyAppointmentCreated(appt.id);

    res.status(201).json({
      id: appt.id,
      place: appt.placeName,
      clinician: appt.clinician,
      date: appt.date,
      time: appt.time,
      mode: appt.mode,
      status: 'Confirmed',
      notificationStatus,
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
    const targetId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const existing = await prisma.appointment.findFirst({
      where: {
        id: targetId,
        OR: [{ userId: req.user!.id }, { clinicianId: req.user!.id }],
      },
    });
    if (!existing) return res.status(404).json({ error: 'Not found.' });
    const appt = await prisma.appointment.update({
      where: { id: existing.id },
      data: { status: map[body.status] },
    });

    // Trigger notification on appointment status update
    const notificationStatus = await notificationService.notifyAppointmentUpdated(
      appt.id,
      existing.status,
      map[body.status]
    );

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
      notificationStatus,
    });
  } catch (e) {
    next(e);
  }
});

const proRoles = [Role.COUNSELLOR, Role.PSYCHOLOGIST, Role.PSYCHIATRIST, Role.ORG_ADMIN] as const;

professionalRouter.get('/notifications', async (req: AuthedRequest, res, next) => {
  try {
    const rows = await prisma.notification.findMany({
      where: { userId: req.user!.id, channel: 'EMAIL' },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        to: true,
        notificationType: true,
        subject: true,
        body: true,
        status: true,
        providerMessageId: true,
        createdAt: true,
      },
    });
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

export const professionalRouter = Router();
professionalRouter.use(requireAuth, requireRole(...proRoles));

professionalRouter.get('/dashboard', async (req: AuthedRequest, res, next) => {
  try {
    const patientUsers = await prisma.user.findMany({
      where: {
        role: Role.USER,
        OR: [
          { contactConsent: { is: { allowWellbeingSummary: true } } },
          { contactConsent: { is: { allowContact: true } } },
          { counsellorRequests: { some: {} } },
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
      const score = chatScore ?? snap?.confidence ?? (moods[0] ?? 40);
      const level =
        riskLevel === 'crisis' || riskLevel === 'high'
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

      const emotionLabel = chatMeta.emotion
        ? chatMeta.emotion.charAt(0).toUpperCase() + chatMeta.emotion.slice(1)
        : null;
      const riskLabel = riskLevel
        ? riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)
        : null;
      const signal = emotionLabel && riskLabel
        ? `Aria chat · ${emotionLabel} · ${riskLabel} risk`
        : snap?.factorsJson
          ? (JSON.parse(snap.factorsJson) as string[]).join(', ') || 'Needs review'
          : 'Follow-up check-in';

      const lastChatAt = latestAssistant?.createdAt ?? user.conversations[0]?.updatedAt;
      const c = user.contactConsent;
      return {
        id: user.id,
        name: user.displayName || `Anonymous ${user.id.slice(-4)}`,
        score,
        level,
        signal,
        emotion: chatMeta.emotion ?? null,
        riskLevel: riskLevel ?? null,
        confidence: chatMeta.confidence ?? null,
        last: (lastChatAt ?? user.updatedAt).toISOString(),
        consent: [
          c?.allowWellbeingSummary ? 'Care summary' : null,
          c?.allowContact ? 'contact' : null,
        ]
          .filter(Boolean)
          .join(' + ') || 'Not shared',
        mood: moods.length ? moods.reverse() : [40, 45, 42, 50, score],
        profile: {
          location: user.location || '',
          abhaId: user.abhaId || '',
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
    const queryId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const body = z.object({ reply: z.string().min(1) }).parse(req.body);
    const query = await prisma.patientQuery.update({
      where: { id: queryId },
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
    const queryId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const query = await prisma.patientQuery.update({
      where: { id: queryId },
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
