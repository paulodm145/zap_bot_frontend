'use client';

import { useSyncExternalStore } from 'react';
import { sessionStore } from '@/lib/auth/session-store';

const anonymousSnapshot = { accessToken: null, user: null, status: 'anonymous' as const };
const serverSnapshot = () => anonymousSnapshot;

export function useSession() {
  return useSyncExternalStore(sessionStore.subscribe, sessionStore.getSnapshot, serverSnapshot);
}
