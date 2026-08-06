import { describe, expect, it } from 'vitest';
import { ApiError, isApiError } from './api-error';

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
