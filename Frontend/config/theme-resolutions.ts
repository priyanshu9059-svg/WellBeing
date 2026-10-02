/**
 * Theme-linked resolution paths for atrocity-victim / case-lifecycle distress.
 * Helplines and portals should be re-verified before production launch.
 */

export type ThemeHelpline = {
  name: string;
  number: string;
  href: string;
  note?: string;
};

export type ThemePortal = {
  name: string;
  href: string;
  blurb: string;
};

export type ThemeResolution = {
  id: string;
  label: string;
  focus: string;
  whatHelps: string[];
  helplines: ThemeHelpline[];
  portals: ThemePortal[];
  localAction: { label: string; href: string };
};

export const THEME_RESOLUTIONS: Record<string, ThemeResolution> = {
  threats_intimidation: {
    id: 'threats_intimidation',
    label: 'Threats / intimidation',
    focus:
      'When threats follow a complaint, protection and documentation matter as much as emotional support.',
    whatHelps: [
      'Record dates, callers, and witnesses of intimidation',
      'Inform the investigating officer / protection cell promptly',
      'Stay with trusted people when risk feels high',
    ],
    helplines: [
      { name: 'Emergency / Police', number: '112', href: 'tel:112', note: 'Immediate danger' },
      { name: 'NHAA atrocity support', number: '14566', href: 'tel:14566', note: 'Atrocity-victim focused helpline' },
      { name: 'Women helpline', number: '181', href: 'tel:181' },
    ],
    portals: [
      {
        name: 'National Commission for Scheduled Castes',
        href: 'https://ncsc.nic.in/',
        blurb: 'Complaints, monitoring, and rights guidance for SC communities.',
      },
      {
        name: 'National Commission for Scheduled Tribes',
        href: 'https://ncst.nic.in/',
        blurb: 'ST atrocity and rights grievance pathways.',
      },
      {
        name: 'NALSA free legal aid',
        href: 'https://nalsa.gov.in/',
        blurb: 'State legal services for protection orders and representation.',
      },
    ],
    localAction: { label: 'Find nearby police / trauma NGOs', href: '/consultancy' },
  },
  court_legal_stress: {
    id: 'court_legal_stress',
    label: 'Court / legal stress',
    focus: 'Hearing pressure, adjournments, and legal uncertainty often drive spikes in distress.',
    whatHelps: [
      'Ask legal aid about next hearing prep and escorts',
      'Keep one folder for notices, FIR, and orders',
      'Plan rest and transport the day before court',
    ],
    helplines: [
      { name: 'NALSA legal aid helpline', number: '15100', href: 'tel:15100' },
      { name: 'NHAA atrocity support', number: '14566', href: 'tel:14566' },
      { name: 'Tele-MANAS', number: '14416', href: 'tel:14416', note: 'Mental health support around hearings' },
    ],
    portals: [
      {
        name: 'eCourts services',
        href: 'https://ecourts.gov.in/',
        blurb: 'Case status, cause lists, and hearing information.',
      },
      {
        name: 'NALSA',
        href: 'https://nalsa.gov.in/',
        blurb: 'Locate District Legal Services Authority support.',
      },
      {
        name: 'Department of Justice',
        href: 'https://doj.gov.in/',
        blurb: 'Citizen legal services and access-to-justice programmes.',
      },
    ],
    localAction: { label: 'Open Care messages / counsellor', href: '/messages' },
  },
  investigation_delays: {
    id: 'investigation_delays',
    label: 'Investigation or trial delays',
    focus: 'Long waits after filing often increase isolation, fear, and loss of trust in the process.',
    whatHelps: [
      'Request written status updates through counsel or DLSA',
      'Track FIR / charge-sheet milestones in one place',
      'Use check-ins to flag rising distress between milestones',
    ],
    helplines: [
      { name: 'NALSA legal aid helpline', number: '15100', href: 'tel:15100' },
      { name: 'NHAA atrocity support', number: '14566', href: 'tel:14566' },
      { name: 'Tele-MANAS', number: '14416', href: 'tel:14416' },
    ],
    portals: [
      {
        name: 'eCourts / case status',
        href: 'https://ecourts.gov.in/',
        blurb: 'Follow case progress and next listed dates.',
      },
      {
        name: 'NCSC grievance pathways',
        href: 'https://ncsc.nic.in/',
        blurb: 'Escalate delayed SC atrocity investigations where eligible.',
      },
      {
        name: 'NCST',
        href: 'https://ncst.nic.in/',
        blurb: 'ST-related investigation monitoring routes.',
      },
    ],
    localAction: { label: 'Submit another wellbeing check-in', href: '/check-in' },
  },
  social_ostracism: {
    id: 'social_ostracism',
    label: 'Social ostracism / isolation',
    focus: 'Community exclusion after an atrocity case can deepen loneliness and risk.',
    whatHelps: [
      'Reconnect with one trusted person or support group',
      'Ask counsellor about peer / NGO accompaniment',
      'Document exclusion that affects work, school, or housing',
    ],
    helplines: [
      { name: 'Tele-MANAS', number: '14416', href: 'tel:14416' },
      { name: 'NHAA atrocity support', number: '14566', href: 'tel:14566' },
      { name: 'Women helpline', number: '181', href: 'tel:181' },
    ],
    portals: [
      {
        name: 'Ministry of Social Justice & Empowerment',
        href: 'https://socialjustice.gov.in/',
        blurb: 'Schemes and rehabilitation-linked social support.',
      },
      {
        name: 'NALSA',
        href: 'https://nalsa.gov.in/',
        blurb: 'Legal remedies when ostracism intersects with rights violations.',
      },
    ],
    localAction: { label: 'Talk with Aria companion', href: '/wellbeing' },
  },
  economic_hardship: {
    id: 'economic_hardship',
    label: 'Economic hardship',
    focus: 'Lost wages, travel for hearings, and delayed compensation amplify distress.',
    whatHelps: [
      'Ask counsel about interim compensation / relief',
      'List urgent expenses for DLSA or district relief review',
      'Keep receipts related to case travel and medical care',
    ],
    helplines: [
      { name: 'NHAA atrocity support', number: '14566', href: 'tel:14566' },
      { name: 'NALSA legal aid helpline', number: '15100', href: 'tel:15100' },
      { name: 'Tele-MANAS', number: '14416', href: 'tel:14416' },
    ],
    portals: [
      {
        name: 'National Legal Services Authority',
        href: 'https://nalsa.gov.in/',
        blurb: 'Legal aid connected to compensation and relief applications.',
      },
      {
        name: 'Social Justice schemes portal',
        href: 'https://socialjustice.gov.in/',
        blurb: 'Central / state support schemes for eligible communities.',
      },
      {
        name: 'MyScheme',
        href: 'https://www.myscheme.gov.in/',
        blurb: 'Discover welfare schemes you may qualify for.',
      },
    ],
    localAction: { label: 'Find nearby care / NGOs', href: '/consultancy' },
  },
  rehabilitation_housing: {
    id: 'rehabilitation_housing',
    label: 'Rehabilitation / housing',
    focus: 'Displacement, unsafe housing, and unfinished rehabilitation plans need practical pathways.',
    whatHelps: [
      'Ask district administration / protection cell about temporary shelter',
      'Document eviction threats or unsafe living conditions',
      'Coordinate rehab follow-up with legal aid',
    ],
    helplines: [
      { name: 'Emergency services', number: '112', href: 'tel:112', note: 'If housing is immediately unsafe' },
      { name: 'NHAA atrocity support', number: '14566', href: 'tel:14566' },
      { name: 'Women helpline', number: '181', href: 'tel:181' },
    ],
    portals: [
      {
        name: 'Ministry of Social Justice & Empowerment',
        href: 'https://socialjustice.gov.in/',
        blurb: 'Rehabilitation and relief scheme information.',
      },
      {
        name: 'NALSA',
        href: 'https://nalsa.gov.in/',
        blurb: 'Legal support for housing / rehabilitation entitlements.',
      },
    ],
    localAction: { label: 'Map nearby shelters / clinics', href: '/consultancy' },
  },
  sleep_daily: {
    id: 'sleep_daily',
    label: 'Sleep / daily functioning',
    focus: 'Case stress often shows up as sleeplessness, exhaustion, and trouble with daily routines.',
    whatHelps: [
      'Keep a short sleep/wake note for counsellor review',
      'Use grounding before bed after court or police visits',
      'Flag worsening sleep in your next check-in',
    ],
    helplines: [
      { name: 'Tele-MANAS', number: '14416', href: 'tel:14416' },
      { name: 'NHAA atrocity support', number: '14566', href: 'tel:14566' },
    ],
    portals: [
      {
        name: 'Tele-MANAS information',
        href: 'https://telemanas.mohfw.gov.in/',
        blurb: '24×7 mental health support across India.',
      },
    ],
    localAction: { label: 'Open guided exercises', href: '/exercises' },
  },
  family_safety: {
    id: 'family_safety',
    label: 'Family safety',
    focus: 'Threats to children or relatives need urgent protection planning alongside wellbeing care.',
    whatHelps: [
      'Call emergency services if anyone is in immediate danger',
      'Inform IO / protection officers about family targeting',
      'Identify a safe house or trusted relative in advance',
    ],
    helplines: [
      { name: 'Emergency services', number: '112', href: 'tel:112' },
      { name: 'Child helpline', number: '1098', href: 'tel:1098' },
      { name: 'Women helpline', number: '181', href: 'tel:181' },
      { name: 'NHAA atrocity support', number: '14566', href: 'tel:14566' },
    ],
    portals: [
      {
        name: 'NCPCR',
        href: 'https://ncpcr.gov.in/',
        blurb: 'Child protection complaints and guidance.',
      },
      {
        name: 'NCW',
        href: 'https://ncw.nic.in/',
        blurb: 'Women’s safety and rights support channels.',
      },
    ],
    localAction: { label: 'Open safety plan', href: '/safety-plan' },
  },
  counselling_support: {
    id: 'counselling_support',
    label: 'Counselling / psychological support',
    focus: 'Ongoing counselling helps when legal and social stress keeps returning between hearings.',
    whatHelps: [
      'Share consented check-in scores with a counsellor',
      'Book a follow-up call after high-distress days',
      'Use Tele-MANAS when you need someone tonight',
    ],
    helplines: [
      { name: 'Tele-MANAS', number: '14416', href: 'tel:14416' },
      { name: 'NHAA atrocity support', number: '14566', href: 'tel:14566' },
      { name: 'iCall', number: '9152987821', href: 'tel:9152987821', note: 'Psychosocial counselling (verify hours)' },
    ],
    portals: [
      {
        name: 'Tele-MANAS',
        href: 'https://telemanas.mohfw.gov.in/',
        blurb: 'Government mental health helpline network.',
      },
      {
        name: 'Find nearby clinicians',
        href: '/consultancy',
        blurb: 'Locate mental health clinics and trauma NGOs near you.',
      },
    ],
    localAction: { label: 'Message / schedule counsellor', href: '/messages' },
  },
  general_wellbeing: {
    id: 'general_wellbeing',
    label: 'General wellbeing',
    focus: 'Even without a single crisis theme, longitudinal check-ins help catch rising distress early.',
    whatHelps: [
      'Check in after major case events (FIR, hearing, threat)',
      'Keep one trusted contact informed',
      'Use themed help when a specific pressure appears',
    ],
    helplines: [
      { name: 'Tele-MANAS', number: '14416', href: 'tel:14416' },
      { name: 'NHAA atrocity support', number: '14566', href: 'tel:14566' },
      { name: 'Emergency services', number: '112', href: 'tel:112' },
    ],
    portals: [
      {
        name: 'NALSA',
        href: 'https://nalsa.gov.in/',
        blurb: 'Legal aid if wellbeing issues connect to an active case.',
      },
      {
        name: 'Tele-MANAS',
        href: 'https://telemanas.mohfw.gov.in/',
        blurb: 'Talk to a trained counsellor any time.',
      },
    ],
    localAction: { label: 'Continue with Aria', href: '/wellbeing' },
  },
};

export function getThemeResolution(themeId: string): ThemeResolution {
  return THEME_RESOLUTIONS[themeId] || THEME_RESOLUTIONS.general_wellbeing;
}

export const ATROCITY_DIRECT_HELPLINES: ThemeHelpline[] = [
  { name: 'NHAA atrocity support', number: '14566', href: 'tel:14566', note: 'Direct support for atrocity-related distress' },
  { name: 'NALSA legal aid', number: '15100', href: 'tel:15100', note: 'Free legal services' },
  { name: 'Tele-MANAS', number: '14416', href: 'tel:14416', note: 'Mental health' },
  { name: 'Emergency', number: '112', href: 'tel:112', note: 'Immediate danger' },
  { name: 'Women helpline', number: '181', href: 'tel:181' },
  { name: 'Child helpline', number: '1098', href: 'tel:1098' },
  { name: 'Cybercrime', number: '1930', href: 'tel:1930' },
];
