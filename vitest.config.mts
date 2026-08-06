import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: [
        'src/features/flows/flow-graph.ts',
        'src/lib/api/api-error.ts',
        'src/lib/api/api-client.ts',
        'src/lib/api/internal-api-client.ts',
        'src/lib/auth/session-store.ts',
        'src/lib/auth/restore-session.ts',
        'src/lib/internal-auth/internal-session-store.ts',
      ],
    },
  },
});
