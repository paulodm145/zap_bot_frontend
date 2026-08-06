import { describe, expect, it } from 'vitest';
import { ApiError, apiErrorFromResponse, isApiError } from './api-error';

describe('ApiError', () => {
  it('preserves the stable backend error contract and correlation id', () => {
    const error = new ApiError(
      422,
      { erro: { codigo: 'VALIDACAO', mensagem: 'Dados inválidos', detalhes: { campo: 'nome' } } },
      'correlation-1',
    );
    expect(isApiError(error)).toBe(true);
    expect(error).toMatchObject({
      status: 422,
      code: 'VALIDACAO',
      message: 'Dados inválidos',
      details: { campo: 'nome' },
      correlationId: 'correlation-1',
    });
  });

  it('does not classify arbitrary errors as API errors', () => {
    expect(isApiError(new Error('offline'))).toBe(false);
  });
});

// Ambas as áreas precisam do mesmo tratamento de 429; a interna descartava
// silenciosamente o Retry-After e não conseguia respeitar o limite de taxa.
describe('apiErrorFromResponse', () => {
  it('reads correlation id and retry delay from the response headers', () => {
    const response = new Response(null, {
      status: 429,
      headers: { 'Retry-After': '30', 'X-Correlation-Id': 'abc-1' },
    });
    const error = apiErrorFromResponse(response, { erro: { codigo: 'LIMITE_TENTATIVAS', mensagem: 'Aguarde' } });
    expect(error).toMatchObject({ status: 429, code: 'LIMITE_TENTATIVAS', retryAfterSeconds: 30, correlationId: 'abc-1' });
  });

  it('ignores a Retry-After that is not a plain number of seconds', () => {
    const response = new Response(null, { status: 429, headers: { 'Retry-After': 'Wed, 21 Oct 2026 07:28:00 GMT' } });
    const error = apiErrorFromResponse(response, { erro: { codigo: 'LIMITE_TENTATIVAS', mensagem: 'Aguarde' } });
    expect(error.retryAfterSeconds).toBeUndefined();
  });
});
