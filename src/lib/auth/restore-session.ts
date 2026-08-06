import type { Me } from '@/features/tenant/types';
import { apiRequest, refreshAccessToken } from '@/lib/api/api-client';
import { sessionStore } from './session-store';

let restoreRequest: Promise<void> | null = null;

export function restoreSession() {
  if (!restoreRequest) {
    restoreRequest = (async () => {
      const accessToken = await refreshAccessToken();
      const me = await apiRequest<Me>('/me', { retryAuth: false });
      sessionStore.authenticate(accessToken, {
        id: me.public_id,
        nome: me.nome,
        email: me.email,
        tenantId: me.tenant.public_id,
      });
    })()
      .catch((error: unknown) => {
        sessionStore.clear();
        throw error;
      })
      .finally(() => {
        restoreRequest = null;
      });
  }
  return restoreRequest;
}
