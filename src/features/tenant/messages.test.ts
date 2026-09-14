import { describe, expect, it } from 'vitest';
import { messageBodyText } from './messages';
import type { Message } from './types';

function message(overrides: Partial<Message>): Message {
  return {
    public_id: 'm1',
    direcao: 'ENTRADA',
    tipo: 'TEXTO',
    autor: 'CONTATO',
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

// Reproduz o crash relatado: React lança "Objects are not valid as a React
// child" quando `conteudo` (um objeto JSON qualquer) é renderizado direto.
describe('messageBodyText', () => {
  it('extrai o texto de uma mensagem de contato/bot/atendente', () => {
    expect(messageBodyText(message({ conteudo: { texto: 'Olá!' } }))).toBe('Olá!');
  });

  it('descreve uma nota de sistema pela ação, sem expor o objeto bruto', () => {
    expect(
      messageBodyText(
        message({ tipo: 'SISTEMA', direcao: 'INTERNA', autor: 'SISTEMA', conteudo: { acao: 'DIRECIONOU_FLUXO', motivo: null } }),
      ),
    ).toBe('Fluxo direcionou a conversa a um setor.');
  });

  it('inclui o motivo da nota de sistema quando presente', () => {
    expect(
      messageBodyText(
        message({
          tipo: 'SISTEMA',
          direcao: 'INTERNA',
          autor: 'SISTEMA',
          conteudo: { acao: 'REATRIBUIU', motivo: 'Cliente pediu financeiro' },
        }),
      ),
    ).toBe('Conversa reatribuída. Motivo: Cliente pediu financeiro');
  });

  it('usa a própria ação como rótulo quando ainda não é conhecida', () => {
    expect(messageBodyText(message({ tipo: 'SISTEMA', autor: 'SISTEMA', conteudo: { acao: 'NOVA_ACAO' } }))).toBe(
      'NOVA_ACAO',
    );
  });

  it('cai num aviso legível quando o conteúdo não tem texto reconhecível', () => {
    expect(messageBodyText(message({ conteudo: {} }))).toBe('Mensagem sem conteúdo de texto.');
    expect(messageBodyText(message({ conteudo: undefined }))).toBe('Mensagem sem conteúdo de texto.');
  });

  it('identifica mensagens de mídia sem conteúdo de texto', () => {
    expect(messageBodyText(message({ tipo: 'IMAGEM', conteudo: {} }))).toBe('[imagem]');
  });
});
