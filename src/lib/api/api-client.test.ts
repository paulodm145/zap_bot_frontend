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

describe('apiRequest authentication security', () => {
  afterEach(() => { sessionStore.clear(); vi.unstubAllGlobals(); });

  it('does not send refresh cookies on ordinary API requests', async () => {
    sessionStore.authenticate('access-token', { id: 'user-1', nome: 'User', email: 'user@test.dev', tenantId: 'tenant-1' });
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ dados: [] }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await apiRequest('/fluxos');

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3000/api/v1/fluxos', expect.objectContaining({
      credentials: 'omit',
      headers: expect.objectContaining({ Authorization: 'Bearer access-token' }),
    }));
  });

  it('shares one refresh request and retries each request only once', async () => {
    sessionStore.authenticate('expired-token', { id: 'user-1', nome: 'User', email: 'user@test.dev', tenantId: 'tenant-1' });
    const fetchMock = vi.fn(async (url: string, options?: RequestInit) => {
      if (url.endsWith('/auth/refresh')) return new Response(JSON.stringify({ accessToken: 'fresh-token' }), { status: 200 });
      const authorization = options?.headers as Record<string, string> | undefined;
      return authorization?.Authorization === 'Bearer fresh-token'
        ? new Response(JSON.stringify({ ok: true }), { status: 200 })
        : new Response(JSON.stringify({ erro: { codigo: 'NAO_AUTENTICADO', mensagem: 'Expirada' } }), { status: 401 });
    });
    vi.stubGlobal('fetch', fetchMock);

    await Promise.all([apiRequest('/me'), apiRequest('/fluxos')]);

    expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/auth/refresh'))).toHaveLength(1);
  });

  it('exposes retry delay from a rate-limited response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ erro: { codigo: 'LIMITE_TENTATIVAS', mensagem: 'Aguarde' } }), {
      status: 429,
      headers: { 'Retry-After': '30' },
    })));

    await expect(apiRequest('/auth/login', { method: 'POST', auth: false })).rejects.toMatchObject({
      status: 429,
      code: 'LIMITE_TENTATIVAS',
      retryAfterSeconds: 30,
    });
  });
});
