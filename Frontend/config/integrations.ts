import { isApiEnabled } from '@/lib/api';

export const integrations = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? '',
  get mode() {
    return isApiEnabled() ? ('full-stack' as const) : ('frontend-prototype' as const);
  },
  get externalRequestsEnabled() {
    return isApiEnabled();
  },
};
