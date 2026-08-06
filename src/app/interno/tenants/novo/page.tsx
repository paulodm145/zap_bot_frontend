import type { Metadata } from 'next';
import { InternalTenantCreate } from '@/components/superadmin/internal-tenant-create';

export const metadata: Metadata = { title: 'Novo tenant' };
export default function InternalTenantCreatePage() {
  return <InternalTenantCreate />;
}
