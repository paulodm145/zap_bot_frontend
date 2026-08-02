import type { ApiErrorBody } from './types';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;
  readonly correlationId?: string;

  constructor(status: number, body: ApiErrorBody, correlationId?: string) {
    super(body.erro.mensagem);
    this.name = 'ApiError';
    this.status = status;
    this.code = body.erro.codigo;
    this.details = body.erro.detalhes;
    this.correlationId = correlationId;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
