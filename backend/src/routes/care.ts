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

const proRoles = [Role.COUNSELLOR, Role.PSYCHOLOGIST, Role.PSYCHIATRIST] as const;

export const professionalRouter = Router();
professionalRouter.use(requireAuth, requireRole(...proRoles));

professionalRouter.get('/dashboard', async (req: AuthedRequest, res, next) => {
  try {
    const consented = await prisma.contactConsent.findMany({
      where: { allowWellbeingSummary: true },
      include: {
        user: {
          include: {
            moodEntries: { orderBy: { date: 'desc' }, take: 5 },
            wellbeingSnapshots: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
        },
      },
      take: 20,
    });

    const patients = consented.map((c) => {
      const moods = c.user.moodEntries.map((m) => Math.round((m.mood / 5) * 100));
      const snap = c.user.wellbeingSnapshots[0];
      const score = snap?.confidence ?? (moods[0] ?? 40);
      const level =
        score >= 75 ? 'High' : score >= 55 ? 'Elevated' : score >= 35 ? 'Moderate' : 'Low';
      return {
        id: c.user.id,
        name: c.user.displayName || `Anonymous ${c.user.id.slice(-4)}`,
        score,
        level,
        signal: snap?.factorsJson
          ? (JSON.parse(snap.factorsJson) as string[]).join(', ') || 'Needs review'
          : 'Follow-up check-in',
        last: c.updatedAt.toISOString(),
        consent: [
          c.allowWellbeingSummary ? 'Care summary' : null,
          c.allowContact ? 'contact' : null,
        ]
          .filter(Boolean)
          .join(' + '),
        mood: moods.length ? moods.reverse() : [40, 45, 42, 50, score],
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
