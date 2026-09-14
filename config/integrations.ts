export const integrations = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? '',
  mode: 'frontend-prototype',
  externalRequestsEnabled: false,
} as const;
