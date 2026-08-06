import { ApiError } from './api-error';
import type { ApiErrorBody } from './types';
import { sessionStore } from '@/lib/auth/session-store';

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1').replace(/\/$/, '');
let refreshRequest: Promise<string> | null = null;

type ApiOptions = RequestInit & {
  auth?: boolean;
  retryAuth?: boolean;
};

async function readError(response: Response): Promise<ApiErrorBody> {
  try {
    return (await response.json()) as ApiErrorBody;
  } catch {
    return { erro: { codigo: 'ERRO_HTTP', mensagem: `A requisição falhou com status ${response.status}` } };
  }
}

function apiError(response: Response, body: ApiErrorBody) {
  const retryAfter = response.headers.get('Retry-After');
  const retryAfterSeconds = retryAfter && /^\d+$/.test(retryAfter) ? Number(retryAfter) : undefined;
  return new ApiError(response.status, body, response.headers.get('X-Correlation-Id') ?? undefined, retryAfterSeconds);
}

export async function refreshAccessToken() {
  if (!refreshRequest) {
    refreshRequest = fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    })
      .then(async (response) => {
        if (!response.ok) throw apiError(response, await readError(response));
        const body = (await response.json()) as { accessToken: string };
        sessionStore.replaceToken(body.accessToken);
        return body.accessToken;
      })
      .catch((error: unknown) => {
        sessionStore.clear();
        throw error;
      })
      .finally(() => {
        refreshRequest = null;
      });
  }
  return refreshRequest;
}

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { auth = true, retryAuth = true, headers, credentials, ...requestOptions } = options;
  const session = sessionStore.getSnapshot();
  const token = session.accessToken;
  const impersonated = Boolean(session.impersonation);
  const response = await fetch(`${API_URL}${path.startsWith('/') ? path : `/${path}`}`, {
    ...requestOptions,
    credentials: impersonated ? 'omit' : (credentials ?? 'omit'),
    headers: {
      Accept: 'application/json',
      ...(requestOptions.body ? { 'Content-Type': 'application/json' } : {}),
      ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  if (response.status === 401 && auth && retryAuth && !impersonated) {
    await refreshAccessToken();
    return apiRequest<T>(path, { ...options, retryAuth: false });
  }

  if (!response.ok) {
    if (response.status === 401 && auth) sessionStore.clear();
    throw apiError(response, await readError(response));
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
