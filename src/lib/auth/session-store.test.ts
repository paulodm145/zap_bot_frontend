import { afterEach, describe, expect, it } from 'vitest';
import { sessionStore } from './session-store';

const user = { id: 'user-1', nome: 'Admin', email: 'admin@tenant.test', tenantId: 'tenant-1' };

describe('sessionStore impersonation', () => {
  afterEach(() => sessionStore.clear());

  it('keeps temporary impersonation metadata only in memory', () => {
    sessionStore.impersonate('temporary-token', user, {
      tenantName: 'Empresa',
      sessionId: 'session-1',
      expiresInSeconds: 900,
    });
    expect(sessionStore.getSnapshot()).toMatchObject({
      accessToken: 'temporary-token',
      user,
      status: 'authenticated',
      impersonation: { tenantName: 'Empresa', sessionId: 'session-1', expiresInSeconds: 900 },
    });
    sessionStore.clear();
    expect(sessionStore.getSnapshot()).toEqual({
      accessToken: null,
      user: null,
      impersonation: null,
      status: 'anonymous',
    });
  });
});
