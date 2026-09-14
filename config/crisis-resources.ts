// Developer note: all regional resources must be officially verified before production.
export const crisisResources = {
  region: 'India',
  teleManas: { name: 'Tele-MANAS', number: '14416', href: 'tel:14416' },
  emergency: { name: 'Emergency services', number: '112', href: 'tel:112' },
} as const;

export const HIGH_RISK_PHRASES = [
  'kill myself', 'end my life', 'suicide', 'want to die', 'hurt myself', 'not safe',
];
