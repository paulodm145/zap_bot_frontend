export type InternalSessionState = {
  accessToken: string | null;
  stateToken: string | null;
  requiresConfiguration: boolean;
  status: 'anonymous' | 'second_factor' | 'authenticated';
};

let state: InternalSessionState = { accessToken: null, stateToken: null, requiresConfiguration: false, status: 'anonymous' };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

export const internalSessionStore = {
  getSnapshot: () => state,
  subscribe(listener: () => void) { listeners.add(listener); return () => listeners.delete(listener); },
  startSecondFactor(stateToken: string, requiresConfiguration: boolean) {
    state = { accessToken: null, stateToken, requiresConfiguration, status: 'second_factor' };
    emit();
  },
  authenticate(accessToken: string) {
    state = { accessToken, stateToken: null, requiresConfiguration: false, status: 'authenticated' };
    emit();
  },
  clear() {
    state = { accessToken: null, stateToken: null, requiresConfiguration: false, status: 'anonymous' };
    emit();
  },
};
