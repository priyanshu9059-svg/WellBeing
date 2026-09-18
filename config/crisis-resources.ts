// Developer note: all regional resources must be officially verified before production.
export const crisisResources = {
  region: 'India',
  teleManas: { name: 'Tele-MANAS', number: '14416', href: 'tel:14416' },
  emergency: { name: 'Emergency services', number: '112', href: 'tel:112' },
  ambulance: { name: 'Ambulance', number: '108', href: 'tel:108' },
  additional: [
    { name: 'Police', number: '100', href: 'tel:100' },
    { name: 'Fire services', number: '101', href: 'tel:101' },
    { name: 'Women helpline', number: '181', href: 'tel:181' },
    { name: 'Child helpline', number: '1098', href: 'tel:1098' },
    { name: 'Cybercrime helpline', number: '1930', href: 'tel:1930' },
    { name: 'Senior citizens helpline', number: '14567', href: 'tel:14567' },
  ],
} as const;

export const HIGH_RISK_PHRASES = [
  'kill myself', 'end my life', 'suicide', 'want to die', 'hurt myself',
];

export const PHYSICAL_URGENT_PHRASES = [
  'call the police', 'call police', 'police', 'emergency', 'being attacked', 'assault',
  'domestic violence', 'in danger', 'not safe', "can't breathe", 'cannot breathe',
  'severe bleeding', 'bleeding badly', 'overdose', 'fire',
];
