import { ApiError } from './api-error';
import type { ApiErrorBody } from './types';
import { internalSessionStore } from '@/lib/internal-auth/internal-session-store';

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1').replace(/\/$/, '');

async function readError(response: Response): Promise<ApiErrorBody> {
  try { return await response.json() as ApiErrorBody; } catch { return { erro: { codigo: 'ERRO_HTTP', mensagem: `A requisição falhou com status ${response.status}` } }; }
}

export async function internalApiRequest<T>(path: string, options: RequestInit = {}, authenticated = true): Promise<T> {
  const token = internalSessionStore.getSnapshot().accessToken;
  const response = await fetch(`${API_URL}${path.startsWith('/') ? path : `/${path}`}`, {
    ...options,
    credentials: 'omit',
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(authenticated && token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!response.ok) {
    if (response.status === 401 && authenticated) internalSessionStore.clear();
    throw new ApiError(response.status, await readError(response), response.headers.get('X-Correlation-Id') ?? undefined);
  }
  if (response.status === 204) return undefined as T;
  return await response.json() as T;
}
