'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/auth/use-session';
import { restoreSession } from '@/lib/auth/restore-session';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const session = useSession();
  const router = useRouter();
  const [requiresRestoration] = useState(session.status === 'anonymous');
  const [checking, setChecking] = useState(requiresRestoration);

  useEffect(() => {
    if (!requiresRestoration) return;
    let active = true;
    void restoreSession()
      .then(() => {
        if (active) setChecking(false);
      })
      .catch(() => {
        if (active) {
          setChecking(false);
          router.replace('/login');
        }
      });
    return () => {
      active = false;
    };
  }, [requiresRestoration, router]);

  useEffect(() => {
    if (!checking && session.status === 'anonymous') router.replace('/login');
  }, [checking, router, session.status]);

  if (checking || session.status !== 'authenticated') {
    return (
      <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: 'var(--muted)', fontSize: 13 }}>
        Verificando sessão...
      </main>
    );
  }
  return children;
}
