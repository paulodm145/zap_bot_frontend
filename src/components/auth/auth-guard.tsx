'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/auth/use-session';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const session = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session.status === 'anonymous') router.replace('/login');
  }, [router, session.status]);

  if (session.status !== 'authenticated') {
    return <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: 'var(--muted)', fontSize: 13 }}>Verificando sessão...</main>;
  }
  return children;
}
