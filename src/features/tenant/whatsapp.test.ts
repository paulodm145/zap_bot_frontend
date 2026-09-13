import { describe, expect, it } from 'vitest';
import { whatsappStatusLabel, whatsappStatusTone } from './whatsapp';

describe('whatsappStatusTone', () => {
  it('mapeia CONECTADO para success', () => {
    expect(whatsappStatusTone('CONECTADO')).toBe('success');
  });
  it('mapeia CONECTANDO para warning', () => {
    expect(whatsappStatusTone('CONECTANDO')).toBe('warning');
  });
  it('mapeia DESCONECTADO para neutral', () => {
    expect(whatsappStatusTone('DESCONECTADO')).toBe('neutral');
  });
});

describe('whatsappStatusLabel', () => {
  it('descreve cada estado em português', () => {
    expect(whatsappStatusLabel('CONECTADO')).toBe('Conectado');
    expect(whatsappStatusLabel('CONECTANDO')).toBe('Aguardando QR code');
    expect(whatsappStatusLabel('DESCONECTADO')).toBe('Desconectado');
  });
});
