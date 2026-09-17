import type { Message } from './types';

const ROTULO_ACAO_SISTEMA: Record<string, string> = {
  ASSUMIU: 'Atendente assumiu a conversa.',
  REATRIBUIU: 'Conversa reatribuída.',
  DEVOLVEU_AO_BOT: 'Conversa devolvida ao bot.',
  ENCERROU: 'Conversa encerrada.',
  DIRECIONOU_FLUXO: 'Fluxo direcionou a conversa a um setor.',
};

/**
 * `conteudo` é `unknown` no contrato (varia por `tipo`/`autor`: `{ texto }` para
 * mensagens de texto, `{ acao, motivo }` para notas do sistema). Nunca
 * renderize o objeto direto — React lança "Objects are not valid as a React
 * child" para qualquer coisa que não seja string/number/elemento.
 */
export function messageBodyText(message: Message): string {
  const conteudo = message.conteudo;
  if (message.autor === 'SISTEMA' && conteudo && typeof conteudo === 'object' && 'acao' in conteudo) {
    const acao = (conteudo as { acao?: unknown }).acao;
    const motivo = (conteudo as { motivo?: unknown }).motivo;
    const rotulo = typeof acao === 'string' ? (ROTULO_ACAO_SISTEMA[acao] ?? acao) : 'Atualização da conversa.';
    return typeof motivo === 'string' && motivo ? `${rotulo} Motivo: ${motivo}` : rotulo;
  }
  if (conteudo && typeof conteudo === 'object' && 'texto' in conteudo) {
    const texto = (conteudo as { texto?: unknown }).texto;
    if (typeof texto === 'string' && texto) return texto;
  }
  if (typeof conteudo === 'string' && conteudo) return conteudo;
  return message.tipo === 'IMAGEM' ||
    message.tipo === 'AUDIO' ||
    message.tipo === 'DOCUMENTO' ||
    message.tipo === 'VIDEO'
    ? `[${message.tipo.toLowerCase()}]`
    : 'Mensagem sem conteúdo de texto.';
}

/**
 * Rótulo de data/hora da bolha do chat, a partir de `ocorreu_at` (quando a
 * mensagem de fato aconteceu, não `created_at`, que é quando a linha foi
 * persistida — os dois podem divergir em mensagens recebidas com atraso no
 * processamento do webhook). Mostra só a hora quando é do mesmo dia que
 * `now`, e data curta + hora quando não é, para não obrigar o atendente a
 * inferir o dia numa conversa que atravessou a virada.
 */
export function messageTimestampLabel(message: Message, now: Date = new Date()): string {
  const date = new Date(message.ocorreu_at);
  if (Number.isNaN(date.getTime())) return '';
  const sameDay = date.toDateString() === now.toDateString();
  const options: Intl.DateTimeFormatOptions = sameDay
    ? { timeStyle: 'short' }
    : { dateStyle: 'short', timeStyle: 'short' };
  return new Intl.DateTimeFormat('pt-BR', options).format(date);
}
