import { afterEach, describe, expect, it, vi } from 'vitest';
import { sessionStore } from '@/lib/auth/session-store';
import { apiRequest } from './api-client';

describe('apiRequest during impersonation', () => {
  afterEach(() => { sessionStore.clear(); vi.unstubAllGlobals(); });

  it('does not send cookies or refresh an expired temporary session', async () => {
    sessionStore.impersonate('temporary-token', { id: 'user-1', nome: 'Admin', email: 'admin@test.dev', tenantId: 'tenant-1' }, { tenantName: 'Empresa', sessionId: 'session-1', expiresInSeconds: 900 });
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ erro: { codigo: 'NAO_AUTORIZADO', mensagem: 'Expirada' } }), { status: 401, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiRequest('/fluxos')).rejects.toMatchObject({ status: 401, code: 'NAO_AUTORIZADO' });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3000/api/v1/fluxos', expect.objectContaining({ credentials: 'omit', headers: expect.objectContaining({ Authorization: 'Bearer temporary-token' }) }));
    expect(sessionStore.getSnapshot().status).toBe('anonymous');
  });
});
