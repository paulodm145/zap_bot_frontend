'use client';

import { useSyncExternalStore } from 'react';
import { internalSessionStore } from '@/lib/internal-auth/internal-session-store';

const anonymous = { accessToken: null, stateToken: null, requiresConfiguration: false, status: 'anonymous' as const };
export function useInternalSession() {
  return useSyncExternalStore(internalSessionStore.subscribe, internalSessionStore.getSnapshot, () => anonymous);
}
