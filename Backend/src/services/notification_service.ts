/**
 * Email / SMS notification service (ported from kumkum_email_changes intent).
 * - NOTIFICATION_MODE=log (default): persist + console log, no external send
 * - NOTIFICATION_MODE=live: send via Resend (email) when RESEND_API_KEY is set
 */

import { Resend } from 'resend';
import { prisma } from '../lib/prisma.js';

export type NotificationDelivery = {
  id: string;
  status: string;
  channel: string;
  notificationType: string;
  to: string;
  providerMessageId?: string | null;
  message: string;
};

type SendEmailInput = {
  userId: string;
  to: string;
  subject: string;
  body: string;
  notificationType: string;
  appointmentId?: string | null;
};

function mode() {
  return (process.env.NOTIFICATION_MODE || 'log').toLowerCase();
}

function fromAddress() {
  return (process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev').trim();
}

async function deliverEmail(input: SendEmailInput): Promise<NotificationDelivery> {
  const live = mode() === 'live';
  const apiKey = process.env.RESEND_API_KEY?.trim();

  const row = await prisma.notification.create({
    data: {
      userId: input.userId,
      appointmentId: input.appointmentId || null,
      channel: 'email',
      notificationType: input.notificationType,
      to: input.to,
      subject: input.subject,
      body: input.body,
      status: live && apiKey ? 'queued' : 'logged',
    },
  });

  if (!live || !apiKey) {
    console.log(
      `[notification:email:${input.notificationType}] to=${input.to} subject=${input.subject} body=${input.body}`,
    );
    return {
      id: row.id,
      status: row.status,
      channel: 'email',
      notificationType: input.notificationType,
      to: input.to,
      message: live
        ? 'NOTIFICATION_MODE=live but RESEND_API_KEY is missing — email logged only.'
        : 'Email logged on server (set NOTIFICATION_MODE=live and RESEND_API_KEY to send).',
    };
  }

  try {
    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from: fromAddress(),
      to: input.to,
      subject: input.subject,
      text: input.body,
    });

    if (result.error) {
      const updated = await prisma.notification.update({
        where: { id: row.id },
        data: {
          status: 'failed',
          errorMessage: result.error.message?.slice(0, 500) || 'Resend error',
        },
      });
      return {
        id: updated.id,
        status: updated.status,
        channel: 'email',
        notificationType: input.notificationType,
        to: input.to,
        message: `Email send failed: ${result.error.message}`,
      };
    }

    const updated = await prisma.notification.update({
      where: { id: row.id },
      data: {
        status: 'sent',
        providerMessageId: result.data?.id || null,
      },
    });
    return {
      id: updated.id,
      status: updated.status,
      channel: 'email',
      notificationType: input.notificationType,
      to: input.to,
      providerMessageId: updated.providerMessageId,
      message: 'Email sent via Resend.',
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown email error';
    const updated = await prisma.notification.update({
      where: { id: row.id },
      data: { status: 'failed', errorMessage: message.slice(0, 500) },
    });
    return {
      id: updated.id,
      status: updated.status,
      channel: 'email',
      notificationType: input.notificationType,
      to: input.to,
      message: `Email send failed: ${message}`,
    };
  }
}

export const notificationService = {
  async sendEmail(input: SendEmailInput) {
    if (!input.to?.trim()) {
      return {
        id: '',
        status: 'skipped',
        channel: 'email',
        notificationType: input.notificationType,
        to: '',
        message: 'No email address on file.',
      } satisfies NotificationDelivery;
    }
    return deliverEmail(input);
  },

  async notifySignIn(userId: string): Promise<NotificationDelivery | null> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.email) return null;
    const name = user.displayName || 'there';
    return deliverEmail({
      userId,
      to: user.email,
      notificationType: 'SIGN_IN',
      subject: 'WellBeing sign-in notice',
      body: `Hi ${name},\n\nYour WellBeing account was signed in just now.\n\nIf this was not you, reset your password and contact support.\n\n— WellBeing Support`,
    });
  },

  async notifySignup(userId: string): Promise<NotificationDelivery | null> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.email) return null;
    const name = user.displayName || 'there';
    return deliverEmail({
      userId,
      to: user.email,
      notificationType: 'SIGN_UP',
      subject: 'Welcome to WellBeing',
      body: `Hi ${name},\n\nYour WellBeing account is ready. You can check in, talk with Aria, and share consented signals with a counsellor when you choose.\n\nFor urgent safety needs in India, call 112 or Tele-MANAS 14416. For atrocity-related support, call NHAA 14566.\n\n— WellBeing Support`,
    });
  },

  async notifyAppointmentCreated(appointmentId: string): Promise<NotificationDelivery | null> {
    const appt = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { user: true },
    });
    if (!appt?.user?.email) return null;
    const name = appt.user.displayName || 'there';
    return deliverEmail({
      userId: appt.userId,
      appointmentId: appt.id,
      to: appt.user.email,
      notificationType: 'APPOINTMENT_CREATED',
      subject: `Care appointment confirmed · ${appt.date} ${appt.time}`,
      body: `Hi ${name},\n\nYour care appointment is confirmed.\n\nPlace: ${appt.placeName}\nClinician: ${appt.clinician}\nDate: ${appt.date}\nTime: ${appt.time}\nMode: ${appt.mode}\n\nYou can review this under History / Care messages in the WellBeing app.\n\n— WellBeing Support`,
    });
  },

  async notifyAppointmentUpdated(
    appointmentId: string,
    previousStatus: string,
    nextStatus: string,
  ): Promise<NotificationDelivery | null> {
    const appt = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { user: true },
    });
    if (!appt?.user?.email) return null;
    const name = appt.user.displayName || 'there';
    return deliverEmail({
      userId: appt.userId,
      appointmentId: appt.id,
      to: appt.user.email,
      notificationType: 'APPOINTMENT_UPDATED',
      subject: `Care appointment update · ${nextStatus}`,
      body: `Hi ${name},\n\nYour appointment status changed from ${previousStatus} to ${nextStatus}.\n\nPlace: ${appt.placeName}\nDate: ${appt.date}\nTime: ${appt.time}\nMode: ${appt.mode}\n\n— WellBeing Support`,
    });
  },

  async notifyCareMessage(opts: {
    patientId: string;
    to: string;
    clinicianName: string;
    message: string;
  }): Promise<NotificationDelivery> {
    return deliverEmail({
      userId: opts.patientId,
      to: opts.to,
      notificationType: 'CARE_MESSAGE',
      subject: 'Message from your Wellbeing counsellor',
      body: `${opts.clinicianName} wrote:\n\n${opts.message}\n\nOpen Care messages in the WellBeing app to review.\n\n— WellBeing Support`,
    });
  },

  async notifyScheduledCall(opts: {
    patientId: string;
    to: string;
    patientName?: string | null;
    date: string;
    time: string;
    mode: string;
    clinicianName: string;
    note?: string;
    appointmentId?: string | null;
  }): Promise<NotificationDelivery> {
    const name = opts.patientName?.trim() || 'there';
    return deliverEmail({
      userId: opts.patientId,
      to: opts.to,
      appointmentId: opts.appointmentId || null,
      notificationType: 'CALL_SCHEDULED',
      subject: `Care call scheduled · ${opts.date} ${opts.time}`,
      body: `Hi ${name},\n\n${opts.clinicianName} scheduled a ${opts.mode.toLowerCase()} with you.\n\nDate: ${opts.date}\nTime: ${opts.time}\nMode: ${opts.mode}\n${opts.note ? `Note: ${opts.note}\n` : ''}\nYou can review this under Care messages and History in the WellBeing app.\n\n— WellBeing Support`,
    });
  },

  async notifyScheduledCallClinician(opts: {
    clinicianId: string;
    to: string;
    clinicianName?: string | null;
    patientName: string;
    date: string;
    time: string;
    mode: string;
    note?: string;
    appointmentId?: string | null;
  }): Promise<NotificationDelivery> {
    const name = opts.clinicianName?.trim() || 'Counsellor';
    return deliverEmail({
      userId: opts.clinicianId,
      to: opts.to,
      appointmentId: opts.appointmentId || null,
      notificationType: 'CALL_SCHEDULED_CLINICIAN',
      subject: `Meet scheduled with ${opts.patientName} · ${opts.date} ${opts.time}`,
      body: `Hi ${name},\n\nYour ${opts.mode.toLowerCase()} with ${opts.patientName} is scheduled.\n\nDate: ${opts.date}\nTime: ${opts.time}\nMode: ${opts.mode}\n${opts.note ? `Note: ${opts.note}\n` : ''}\nIt also appears on your professional dashboard.\n\n— WellBeing Support`,
    });
  },
};
