import type { ApiErrorBody } from './types';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;
  readonly correlationId?: string;
  readonly retryAfterSeconds?: number;

  constructor(status: number, body: ApiErrorBody, correlationId?: string, retryAfterSeconds?: number) {
    super(body.erro.mensagem);
    this.name = 'ApiError';
    this.status = status;
    this.code = body.erro.codigo;
    this.details = body.erro.detalhes;
    this.correlationId = correlationId;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/**
 * Monta o `ApiError` a partir da resposta HTTP. Fica aqui, e não nos clientes,
 * porque a área do tenant e a interna precisam do mesmo tratamento de
 * `Retry-After` sem compartilhar cliente nem sessão.
 */
export function apiErrorFromResponse(response: Response, body: ApiErrorBody): ApiError {
  const retryAfter = response.headers.get('Retry-After');
  // O cabeçalho também aceita data HTTP; só o formato em segundos é útil aqui.
  const retryAfterSeconds = retryAfter && /^\d+$/.test(retryAfter) ? Number(retryAfter) : undefined;
  return new ApiError(
    response.status,
    body,
    response.headers.get('X-Correlation-Id') ?? undefined,
    retryAfterSeconds,
  );
}
