'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useInternalSession } from '@/hooks/superadmin/use-internal-session';

export function InternalGuard({ children }: { children: React.ReactNode }) {
  const session = useInternalSession();
  const router = useRouter();
  useEffect(() => { if (session.status !== 'authenticated') router.replace('/interno/login'); }, [router, session.status]);
  if (session.status !== 'authenticated') return <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: 'var(--muted)', fontSize: 13 }}>Verificando sessão interna...</main>;
  return children;
}
