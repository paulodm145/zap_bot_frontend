import { afterEach, describe, expect, it, vi } from 'vitest';
import { restoreSession } from './restore-session';
import { sessionStore } from './session-store';

const me = {
  public_id: 'user-1',
  nome: 'Ana',
  email: 'ana@zapbot.dev',
  papel: 'ADMIN_TENANT',
  tenant: { public_id: 'tenant-1', nome: 'Aurora' },
};

function respond(url: string) {
  if (url.endsWith('/auth/refresh')) return new Response(JSON.stringify({ accessToken: 'fresh' }), { status: 200 });
  if (url.endsWith('/me')) return new Response(JSON.stringify(me), { status: 200 });
  return new Response('{}', { status: 404 });
}

afterEach(() => {
  sessionStore.clear();
  vi.unstubAllGlobals();
});

describe('restoreSession', () => {
  it('rebuilds the session from the refresh cookie and the profile', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => Promise.resolve(respond(url))),
    );

    await restoreSession();

    expect(sessionStore.getSnapshot()).toMatchObject({
      status: 'authenticated',
      accessToken: 'fresh',
      user: { id: 'user-1', nome: 'Ana', email: 'ana@zapbot.dev', tenantId: 'tenant-1' },
    });
  });

  it('sends the cookie only on the refresh call', async () => {
    const fetchMock = vi.fn((url: string) => Promise.resolve(respond(url)));
    vi.stubGlobal('fetch', fetchMock);

    await restoreSession();

    const [[, refreshOptions], [, profileOptions]] = fetchMock.mock.calls as unknown as Array<[string, RequestInit]>;
    expect(refreshOptions.credentials).toBe('include');
    expect(profileOptions.credentials).toBe('omit');
  });

  it('shares a single restoration between concurrent callers', async () => {
    const fetchMock = vi.fn((url: string) => Promise.resolve(respond(url)));
    vi.stubGlobal('fetch', fetchMock);

    await Promise.all([restoreSession(), restoreSession(), restoreSession()]);

    expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/auth/refresh'))).toHaveLength(1);
  });

  it('clears the session when the refresh cookie is no longer valid', async () => {
    sessionStore.authenticate('stale', { id: 'user-1', nome: 'Ana', email: 'ana@zapbot.dev', tenantId: 'tenant-1' });
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ erro: { codigo: 'NAO_AUTENTICADO', mensagem: 'Sessão expirada' } }), {
            status: 401,
          }),
        ),
      ),
    );

    await expect(restoreSession()).rejects.toMatchObject({ status: 401 });
    expect(sessionStore.getSnapshot().status).toBe('anonymous');
  });

  it('allows a new attempt after a failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('{}', { status: 401 }))),
    );
    await expect(restoreSession()).rejects.toBeDefined();

    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => Promise.resolve(respond(url))),
    );
    await restoreSession();

    expect(sessionStore.getSnapshot().status).toBe('authenticated');
  });
});
