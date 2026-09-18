import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  await prisma.analyticsEvent.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.patientQuery.deleteMany();
  await prisma.counsellorRequest.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.carePlace.deleteMany();
  await prisma.wellbeingSnapshot.deleteMany();
  await prisma.contactConsent.deleteMany();
  await prisma.safetyPlan.deleteMany();
  await prisma.journalEntry.deleteMany();
  await prisma.moodEntry.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.organizationMember.deleteMany();
  await prisma.orgAggregate.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('prototype', 10);

  const counsellor = await prisma.user.create({
    data: {
      email: 'counsellor@wellbeing.care',
      passwordHash,
      displayName: 'Dr. Aditi Sharma',
      role: Role.COUNSELLOR,
      anonymous: false,
      licenceNumber: 'MH-CARE-001',
    },
  });

  // Keep legacy professional email working too
  await prisma.user.create({
    data: {
      email: 'demo@wellbeing.care',
      passwordHash,
      displayName: 'Dr. Aditi Sharma',
      role: Role.COUNSELLOR,
      anonymous: false,
      licenceNumber: 'MH-CARE-001B',
    },
  });

  await prisma.user.create({
    data: {
      email: 'psych@wellbeing.care',
      passwordHash,
      displayName: 'Dr. Kabir Menon',
      role: Role.PSYCHOLOGIST,
      anonymous: false,
      licenceNumber: 'PSY-8821',
    },
  });

  const campus = await prisma.organization.create({
    data: {
      name: 'Campus Care Demo',
      code: 'CAMPUS-DEMO',
      aggregates: {
        create: [
          { label: 'Exam stress', value: 42, groupSize: 128 },
          { label: 'Sleep concerns', value: 31, groupSize: 128 },
          { label: 'Loneliness', value: 24, groupSize: 128 },
          { label: 'Family pressure', value: 18, groupSize: 128 },
        ],
      },
    },
  });

  await prisma.organization.create({
    data: {
      name: 'Team Care Demo',
      code: 'TEAM-CARE',
      aggregates: {
        create: [
          { label: 'Workload', value: 38, groupSize: 64 },
          { label: 'Burnout risk', value: 29, groupSize: 64 },
          { label: 'Sleep concerns', value: 22, groupSize: 64 },
        ],
      },
    },
  });

  const places = await Promise.all([
    prisma.carePlace.create({
      data: {
        name: 'Serenity Mind Clinic',
        type: 'Therapy',
        area: 'Indiranagar',
        distanceKm: 1.2,
        rating: '4.8',
        reviews: 126,
        phone: '+91 80 4567 2100',
        hours: 'Open · until 8:00 PM',
        nextAvailable: 'Today, 5:30 PM',
        mapX: 31,
        mapY: 37,
        specialtiesJson: JSON.stringify(['Anxiety', 'Trauma', 'Young adults']),
      },
    }),
    prisma.carePlace.create({
      data: {
        name: 'Nurture Psychology Centre',
        type: 'Counselling',
        area: 'Domlur',
        distanceKm: 2.1,
        rating: '4.7',
        reviews: 89,
        phone: '+91 80 4123 8800',
        hours: 'Open · until 7:30 PM',
        nextAvailable: 'Tomorrow, 11:00 AM',
        mapX: 57,
        mapY: 58,
        specialtiesJson: JSON.stringify(['Relationships', 'Stress', 'Grief']),
      },
    }),
    prisma.carePlace.create({
      data: {
        name: 'Mindful Psychiatry & Wellness',
        type: 'Psychiatry',
        area: 'HAL 2nd Stage',
        distanceKm: 2.8,
        rating: '4.6',
        reviews: 74,
        phone: '+91 80 4098 1122',
        hours: 'Open · until 6:00 PM',
        nextAvailable: 'Wed, 3:00 PM',
        mapX: 69,
        mapY: 28,
        specialtiesJson: JSON.stringify(['Psychiatry', 'Sleep', 'Mood']),
      },
    }),
    prisma.carePlace.create({
      data: {
        name: 'Indiranagar Police Station',
        type: 'Police',
        area: 'Indiranagar',
        distanceKm: 1.7,
        rating: '—',
        reviews: 0,
        phone: '112',
        hours: 'Open 24 hours',
        nextAvailable: 'Walk-in support',
        mapX: 42,
        mapY: 73,
        specialtiesJson: JSON.stringify(['Emergency help', 'Safety support']),
      },
    }),
  ]);

  const patient = await prisma.user.create({
    data: {
      email: 'user@wellbeing.care',
      passwordHash,
      displayName: 'Demo User',
      role: Role.USER,
      anonymous: false,
      location: 'Indiranagar, Bengaluru',
      abhaId: '12-3456-7890-1234',
      phone: '+91 98765 43210',
      gender: 'Prefer not to say',
      age: 22,
      profileSkipped: false,
      profileUpdatedAt: new Date(),
      contactConsent: {
        create: {
          anonymous: false,
          allowContact: true,
          allowWellbeingSummary: true,
          preferredMethod: 'Mobile',
          preferredTime: 'Morning',
          mobile: '+91 98765 43210',
          email: 'user@wellbeing.care',
        },
      },
      moodEntries: {
        create: [
          { mood: 2, intensity: 7, note: 'Heavy day', tagsJson: JSON.stringify(['Sleep', 'Study']) },
          { mood: 3, intensity: 5, note: 'Okay', tagsJson: JSON.stringify(['Work']) },
          { mood: 4, intensity: 4, note: 'Better', tagsJson: JSON.stringify(['Family']) },
        ],
      },
    },
  });

  await prisma.organizationMember.create({
    data: { organizationId: campus.id, userId: patient.id, ageBand: '18–24' },
  });

  await prisma.patientQuery.createMany({
    data: [
      {
        patientId: patient.id,
        text: 'Can someone help me plan what to say to my family?',
        priority: 'URGENT',
      },
      {
        patientId: patient.id,
        text: 'Is my appointment available as a video consultation?',
        priority: 'NORMAL',
      },
    ],
  });

  await prisma.appointment.create({
    data: {
      userId: patient.id,
      clinicianId: counsellor.id,
      placeId: places[1].id,
      placeName: places[1].name,
      clinician: counsellor.displayName ?? 'Counsellor',
      date: '18 Sep 2026',
      time: '11:00 AM',
      mode: 'Video consultation',
      status: 'CONFIRMED',
    },
  });

  console.log('Seed complete.');
  console.log('Demo user:        user@wellbeing.care / prototype');
  console.log('Demo counsellor:  counsellor@wellbeing.care / prototype');
  console.log('Legacy counsellor: demo@wellbeing.care / prototype');
  console.log('Org codes: CAMPUS-DEMO, TEAM-CARE');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
