import type { Metadata } from 'next';
import { InternalHealthView } from '@/components/superadmin/internal-health-view';

export const metadata: Metadata = { title: 'Saúde da plataforma' };
export default function InternalHealthPage() {
  return <InternalHealthView />;
}
