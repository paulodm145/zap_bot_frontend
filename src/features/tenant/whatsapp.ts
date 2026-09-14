import type { WhatsAppAccountStatus } from './types';

export function whatsappStatusTone(status: WhatsAppAccountStatus): 'success' | 'warning' | 'neutral' {
  if (status === 'CONECTADO') return 'success';
  if (status === 'CONECTANDO') return 'warning';
  return 'neutral';
}

export function whatsappStatusLabel(status: WhatsAppAccountStatus): string {
  if (status === 'CONECTADO') return 'Conectado';
  if (status === 'CONECTANDO') return 'Aguardando QR code';
  return 'Desconectado';
}
