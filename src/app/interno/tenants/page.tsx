import type { Metadata } from 'next';
import { InternalTenantsList } from '@/components/superadmin/internal-tenants-list';

export const metadata: Metadata = { title: 'Tenants' };
export default function InternalTenantsPage() {
  return <InternalTenantsList />;
}
