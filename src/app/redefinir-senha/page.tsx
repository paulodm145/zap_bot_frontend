import { Suspense } from 'react';
import type { Metadata } from 'next';
import { AuthShell } from '@/components/auth/auth-shell';
import { PasswordResetForm } from '@/components/auth/password-reset-form';

export const metadata: Metadata = { title: 'Redefinir senha' };
export default function PasswordResetPage() {
  return (
    <AuthShell>
      <Suspense fallback={<p>Carregando...</p>}>
        <PasswordResetForm />
      </Suspense>
    </AuthShell>
  );
}
