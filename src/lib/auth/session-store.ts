export type SessionUser = {
  id: string;
  nome: string;
  email: string;
  tenantId: string;
};

export type SessionState = {
  accessToken: string | null;
  user: SessionUser | null;
  impersonation: { tenantName: string; sessionId: string; expiresInSeconds: number } | null;
  status: 'anonymous' | 'authenticated';
};

let state: SessionState = { accessToken: null, user: null, impersonation: null, status: 'anonymous' };
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export const sessionStore = {
  getSnapshot: () => state,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  authenticate(accessToken: string, user: SessionUser) {
    state = { accessToken, user, impersonation: null, status: 'authenticated' };
    emit();
  },
  impersonate(accessToken: string, user: SessionUser, impersonation: NonNullable<SessionState['impersonation']>) {
    state = { accessToken, user, impersonation, status: 'authenticated' };
    emit();
  },
  replaceToken(accessToken: string) {
    state = { ...state, accessToken, status: 'authenticated' };
    emit();
  },
  clear() {
    state = { accessToken: null, user: null, impersonation: null, status: 'anonymous' };
    emit();
  },
};
