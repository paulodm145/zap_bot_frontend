import type { Metadata } from 'next';
import { InternalTenantDetailView } from '@/components/superadmin/internal-tenant-detail';

export const metadata: Metadata = { title: 'Detalhe do tenant' };
export default async function InternalTenantDetailPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  return <InternalTenantDetailView tenantId={tenantId} />;
}
