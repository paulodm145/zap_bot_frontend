import { afterEach, describe, expect, it, vi } from 'vitest';
import { internalSessionStore } from '@/lib/internal-auth/internal-session-store';
import { internalApiRequest } from './internal-api-client';

describe('internalApiRequest', () => {
  afterEach(() => {
    internalSessionStore.clear();
    vi.unstubAllGlobals();
  });

  it('sends the isolated internal token without browser credentials', async () => {
    internalSessionStore.authenticate('internal-token');
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'ok' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(internalApiRequest<{ status: string }>('/interno/saude')).resolves.toEqual({ status: 'ok' });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3000/api/v1/interno/saude', expect.objectContaining({
      credentials: 'omit',
      headers: expect.objectContaining({ Authorization: 'Bearer internal-token' }),
    }));
  });

  it('clears the internal session on 401 without retrying', async () => {
    internalSessionStore.authenticate('expired-token');
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      erro: { codigo: 'NAO_AUTORIZADO', mensagem: 'Sessão expirada' },
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', 'X-Correlation-Id': 'request-1' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(internalApiRequest('/interno/saude')).rejects.toMatchObject({ status: 401, code: 'NAO_AUTORIZADO', correlationId: 'request-1' });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(internalSessionStore.getSnapshot().status).toBe('anonymous');
  });
});
