import { Router } from 'express';
import path from 'node:path';
import { z } from 'zod';
import { AppointmentStatus, QueryPriority, QueryStatus, Role } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { audit, requireAuth, requireRole, type AuthedRequest } from '../lib/auth.js';
import { notificationService } from '../services/notification_service.js';

const conversationUploadDir = path.resolve(process.env.UPLOAD_DIR || path.resolve(process.cwd(), 'uploads'), 'conversations');

function formatScheduleDate(raw: string): string {
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T12:00:00` : raw;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatScheduleTime(raw: string): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(raw.trim());
  if (!m) return raw;
  let h = Number(m[1]);
  const mins = m[2];
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${mins} ${ampm}`;
}

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

careRouter.get('/messages', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const items = await prisma.careMessage.findMany({
      where: { patientId: req.user!.id },
      include: { clinician: { select: { displayName: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const unreadIds = items.filter((m) => !m.readAt).map((m) => m.id);
    if (unreadIds.length) {
      await prisma.careMessage.updateMany({
        where: { id: { in: unreadIds }, patientId: req.user!.id },
        data: { readAt: new Date() },
      });
    }
    res.json(
      items.map((m) => ({
        id: m.id,
        body: m.body,
        kind: m.kind,
        meta: (() => {
          try {
            return JSON.parse(m.metaJson || '{}') as Record<string, unknown>;
          } catch {
            return {};
          }
        })(),
        clinicianName: m.clinician.displayName || 'Your counsellor',
        createdAt: m.createdAt.toISOString(),
        readAt: m.readAt?.toISOString() ?? null,
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
    const placeId =
      body.placeId && !body.placeId.startsWith('osm-') && !body.placeId.startsWith('google-')
        ? (
            await prisma.carePlace.findUnique({
              where: { id: body.placeId },
              select: { id: true },
            })
          )?.id ?? null
        : null;

    const appt = await prisma.appointment.create({
      data: {
        userId: req.user!.id,
        placeId,
        placeName: body.placeName,
        clinician: body.clinician,
        date: body.date,
        time: body.time,
        mode: body.mode,
        status: AppointmentStatus.CONFIRMED,
      },
    });
    let notificationStatus = null;
    try {
      notificationStatus = await notificationService.notifyAppointmentCreated(appt.id);
    } catch (err) {
      console.warn('Appointment email failed:', (err as Error).message);
    }
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
    const existing = await prisma.appointment.findFirst({
      where: {
        id: String(req.params.id),
        OR: [{ userId: req.user!.id }, { clinicianId: req.user!.id }],
      },
    });
    if (!existing) return res.status(404).json({ error: 'Not found.' });
    const appt = await prisma.appointment.update({
      where: { id: existing.id },
      data: { status: map[body.status] },
    });
    const notificationStatus = await notificationService.notifyAppointmentUpdated(
      appt.id,
      existing.status,
      map[body.status],
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

export const professionalRouter = Router();
professionalRouter.use(requireAuth, requireRole(...proRoles));

professionalRouter.get('/notifications', async (req: AuthedRequest, res, next) => {
  try {
    const rows = await prisma.notification.findMany({
      where: { channel: 'email' },
      orderBy: { createdAt: 'desc' },
      take: 40,
      select: {
        id: true,
        to: true,
        notificationType: true,
        subject: true,
        body: true,
        status: true,
        providerMessageId: true,
        errorMessage: true,
        createdAt: true,
        user: { select: { id: true, displayName: true, email: true } },
      },
    });
    res.json(
      rows.map((row) => ({
        id: row.id,
        to: row.to,
        notificationType: row.notificationType,
        subject: row.subject,
        body: row.body,
        status: row.status,
        providerMessageId: row.providerMessageId,
        errorMessage: row.errorMessage,
        createdAt: row.createdAt.toISOString(),
        patientName: row.user.displayName || row.user.email || 'User',
        patientId: row.user.id,
      })),
    );
  } catch (e) {
    next(e);
  }
});

professionalRouter.get('/dashboard', async (req: AuthedRequest, res, next) => {
  try {
    const patientUsers = await prisma.user.findMany({
      where: {
        role: Role.USER,
        OR: [
          { anonymous: false, email: { not: null } },
          { anonymous: true },
          { contactConsent: { is: { allowWellbeingSummary: true } } },
          { contactConsent: { is: { allowContact: true } } },
          { counsellorRequests: { some: {} } },
          { checkIns: { some: {} } },
          { auditLogs: { some: { action: 'conversation.recording.created' } } },
          { conversations: { some: { messages: { some: {} } } } },
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
        auditLogs: {
          where: { action: 'conversation.recording.created' },
          orderBy: { createdAt: 'desc' },
          take: 8,
        },
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
        user.auditLogs[0]?.createdAt ??
        latestAssistant?.createdAt ??
        user.conversations[0]?.updatedAt ??
        user.updatedAt;
      const c = user.contactConsent;
      const shareMedia = Boolean(c?.allowWellbeingSummary) || user.anonymous;
      const videoRecordings = shareMedia
        ? user.auditLogs.map((recording) => {
            let detail: { filename?: string; sizeBytes?: number; mimeType?: string } = {};
            try {
              detail = JSON.parse(recording.detailJson || '{}') as typeof detail;
            } catch {
              detail = {};
            }
            return {
              id: recording.id,
              filename: detail.filename ?? 'conversation-recording.webm',
              sizeBytes: detail.sizeBytes ?? 0,
              mimeType: detail.mimeType ?? 'video/webm',
              createdAt: recording.createdAt.toISOString(),
            };
          })
        : [];
      const signalWithVideo =
        !latestCheckIn && videoRecordings.length
          ? `Wellbeing video · ${videoRecordings.length} recording${videoRecordings.length === 1 ? '' : 's'} shared`
          : signal;
      return {
        id: user.id,
        name: user.displayName || `Anonymous ${user.id.slice(-4)}`,
        anonymous: user.anonymous,
        score,
        level,
        signal: signalWithVideo,
        emotion: latestCheckIn?.emotionLabel ?? chatMeta.emotion ?? null,
        riskLevel: latestCheckIn?.priority ?? riskLevel ?? null,
        confidence: latestCheckIn?.sentimentScore ?? chatMeta.confidence ?? null,
        last: lastAt.toISOString(),
        consent: [
          user.anonymous ? 'Anonymous session' : null,
          !user.anonymous && user.email ? 'Registered account' : null,
          c?.allowWellbeingSummary || user.anonymous ? 'Care summary' : null,
          c?.allowContact ? 'contact' : null,
        ]
          .filter(Boolean)
          .join(' + ') || 'Not shared',
        mood: moods.length ? moods.reverse() : [40, 45, 42, 50, score],
        checkIns: user.checkIns.map((ci) => {
          let factors: string[] = [];
          let emotions: Record<string, number> = {};
          let recommendations: string[] = [];
          let signals: Record<string, boolean> = {};
          let method: string | null = null;
          let fallback = false;
          try {
            factors = JSON.parse(ci.factorsJson || '[]') as string[];
          } catch {
            factors = [];
          }
          try {
            const ml = JSON.parse(ci.mlJson || '{}') as {
              emotions?: Record<string, number>;
              recommendations?: string[];
              signals?: Record<string, boolean>;
              method?: string;
              fallback?: boolean;
            };
            emotions = ml.emotions || {};
            recommendations = ml.recommendations || [];
            signals = ml.signals || {};
            method = ml.method ?? null;
            fallback = Boolean(ml.fallback);
          } catch {
            /* ignore malformed ml json */
          }
          return {
            id: ci.id,
            theme: ci.theme,
            text: ci.text.slice(0, 280),
            priority: ci.priority,
            distress: ci.distress,
            safetyRisk: ci.safetyRisk,
            escalationRisk: ci.escalationRisk,
            sentimentLabel: ci.sentimentLabel,
            sentimentScore: ci.sentimentScore,
            stressScore: ci.stressScore,
            emotionLabel: ci.emotionLabel,
            hasVoice: Boolean(ci.voicePath),
            factors,
            emotions,
            recommendations,
            signals,
            method,
            fallback,
            createdAt: ci.createdAt.toISOString(),
          };
        }),
        videoRecordings,
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
      where: { id: String(req.params.id) },
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
      where: { id: String(req.params.id) },
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

professionalRouter.get('/patients/:id/recordings/:recordingId/file', async (req: AuthedRequest, res, next) => {
  try {
    const patient = await prisma.user.findFirst({
      where: { id: String(req.params.id), role: Role.USER },
      include: { contactConsent: true },
    });
    if (!patient) return res.status(404).json({ error: 'Patient not found.' });
    if (!patient.contactConsent?.allowWellbeingSummary && !patient.anonymous) {
      return res.status(403).json({ error: 'Video not shared under current consent.' });
    }

    const recording = await prisma.auditLog.findFirst({
      where: {
        id: String(req.params.recordingId),
        userId: patient.id,
        action: 'conversation.recording.created',
      },
    });
    if (!recording) return res.status(404).json({ error: 'Recording not found.' });

    let detail: { path?: string; mimeType?: string } = {};
    try {
      detail = JSON.parse(recording.detailJson || '{}') as typeof detail;
    } catch {
      detail = {};
    }
    if (!detail.path) return res.status(404).json({ error: 'Recording not found.' });
    const resolved = path.resolve(detail.path);
    if (!resolved.startsWith(conversationUploadDir)) {
      return res.status(404).json({ error: 'Recording not found.' });
    }

    res.type(detail.mimeType || 'video/webm').sendFile(resolved, (error) => {
      if (error && !res.headersSent) next(error);
    });
  } catch (e) {
    next(e);
  }
});

professionalRouter.post('/patients/:id/messages', async (req: AuthedRequest, res, next) => {
  try {
    const body = z.object({ message: z.string().min(1).max(4000) }).parse(req.body ?? {});
    const patient = await prisma.user.findFirst({
      where: { id: String(req.params.id), role: Role.USER },
    });
    if (!patient) return res.status(404).json({ error: 'Patient not found.' });

    const message = await prisma.careMessage.create({
      data: {
        patientId: patient.id,
        clinicianId: req.user!.id,
        body: body.message.trim(),
        kind: 'message',
      },
    });

    let emailStatus: string | null = null;
    let emailMessage: string | null = null;
    if (patient.email) {
      try {
        const note = await notificationService.notifyCareMessage({
          patientId: patient.id,
          to: patient.email,
          clinicianName: req.user!.displayName || 'Your counsellor',
          message: body.message.trim(),
        });
        emailStatus = note.status;
        emailMessage = note.message;
        await audit(req.user!.id, 'notification.email', {
          notificationId: note.id,
          to: patient.email,
          status: note.status,
          type: 'CARE_MESSAGE',
        });
      } catch (err) {
        console.warn('Care message email failed:', (err as Error).message);
        emailStatus = 'failed';
        emailMessage = (err as Error).message;
      }
    }

    await audit(req.user!.id, 'professional.patient_message', { patientId: patient.id, messageId: message.id });
    res.status(201).json({
      id: message.id,
      emailStatus,
      emailTo: patient.email,
      message:
        patient.email
          ? emailStatus === 'sent'
            ? 'Message saved and email sent to the patient.'
            : emailStatus === 'logged'
              ? `Message saved. ${emailMessage || 'Email logged on server (set NOTIFICATION_MODE=live + RESEND_API_KEY to send).'}`
              : `Message saved. Email status: ${emailStatus}.`
          : 'Message saved for the patient. No email on file.',
    });
  } catch (e) {
    next(e);
  }
});

professionalRouter.post('/patients/:id/schedule', async (req: AuthedRequest, res, next) => {
  try {
    const body = z
      .object({
        date: z.string().min(4),
        time: z.string().min(1),
        mode: z.enum(['Phone', 'Video meet']),
        note: z.string().max(1000).optional(),
      })
      .parse(req.body ?? {});

    const patient = await prisma.user.findFirst({
      where: { id: String(req.params.id), role: Role.USER },
    });
    if (!patient) return res.status(404).json({ error: 'Patient not found.' });

    const clinicianName = req.user!.displayName || 'Your counsellor';
    const displayDate = formatScheduleDate(body.date);
    const displayTime = formatScheduleTime(body.time);
    const placeName = `Scheduled ${body.mode.toLowerCase()} with ${clinicianName}`;
    const appt = await prisma.appointment.create({
      data: {
        userId: patient.id,
        clinicianId: req.user!.id,
        placeName,
        clinician: clinicianName,
        date: displayDate,
        time: displayTime,
        mode: body.mode,
        status: AppointmentStatus.CONFIRMED,
      },
    });

    const noteText = body.note?.trim() || undefined;
    const text = [
      `${clinicianName} scheduled a ${body.mode.toLowerCase()} with you.`,
      `Date: ${displayDate}`,
      `Time: ${displayTime}`,
      noteText ? `Note: ${noteText}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    const careMessage = await prisma.careMessage.create({
      data: {
        patientId: patient.id,
        clinicianId: req.user!.id,
        body: text,
        kind: 'schedule',
        metaJson: JSON.stringify({
          appointmentId: appt.id,
          date: displayDate,
          time: displayTime,
          mode: body.mode,
        }),
      },
    });

    let emailStatus: string | null = null;
    let emailMessage: string | null = null;
    let clinicianEmailStatus: string | null = null;

    if (patient.email) {
      try {
        const note = await notificationService.notifyScheduledCall({
          patientId: patient.id,
          to: patient.email,
          patientName: patient.displayName,
          date: displayDate,
          time: displayTime,
          mode: body.mode,
          clinicianName,
          note: noteText,
          appointmentId: appt.id,
        });
        emailStatus = note.status;
        emailMessage = note.message;
        await audit(req.user!.id, 'notification.email', {
          notificationId: note.id,
          to: patient.email,
          status: note.status,
          type: 'CALL_SCHEDULED',
        });
      } catch (err) {
        console.warn('Schedule patient email failed:', (err as Error).message);
        emailStatus = 'failed';
        emailMessage = (err as Error).message;
      }
    }

    if (req.user!.email) {
      try {
        const clinicianNote = await notificationService.notifyScheduledCallClinician({
          clinicianId: req.user!.id,
          to: req.user!.email,
          clinicianName,
          patientName: patient.displayName || patient.email || 'Patient',
          date: displayDate,
          time: displayTime,
          mode: body.mode,
          note: noteText,
          appointmentId: appt.id,
        });
        clinicianEmailStatus = clinicianNote.status;
        await audit(req.user!.id, 'notification.email', {
          notificationId: clinicianNote.id,
          to: req.user!.email,
          status: clinicianNote.status,
          type: 'CALL_SCHEDULED_CLINICIAN',
        });
      } catch (err) {
        console.warn('Schedule clinician email failed:', (err as Error).message);
        clinicianEmailStatus = 'failed';
      }
    }

    await audit(req.user!.id, 'professional.schedule_call', {
      patientId: patient.id,
      appointmentId: appt.id,
      messageId: careMessage.id,
    });

    const patientEmailLine = patient.email
      ? emailStatus === 'sent'
        ? 'Email sent to the patient.'
        : emailStatus === 'logged'
          ? emailMessage || 'Patient email logged on server.'
          : `Patient email status: ${emailStatus}.`
      : 'No patient email on file.';
    const clinicianEmailLine =
      clinicianEmailStatus === 'sent'
        ? ' Confirmation emailed to you.'
        : clinicianEmailStatus === 'logged'
          ? ' Confirmation logged for you.'
          : '';

    res.status(201).json({
      appointment: {
        id: appt.id,
        place: appt.placeName,
        clinician: appt.clinician,
        date: appt.date,
        time: appt.time,
        mode: appt.mode,
        status: 'Confirmed',
        patientId: patient.id,
      },
      messageId: careMessage.id,
      emailStatus,
      emailTo: patient.email,
      clinicianEmailStatus,
      message: `Call scheduled. ${patientEmailLine}${clinicianEmailLine}`,
    });
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
