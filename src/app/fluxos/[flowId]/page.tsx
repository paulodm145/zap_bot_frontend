import type { Metadata } from 'next';
import { FlowEditor } from '@/components/fluxo/flow-editor';

export const metadata: Metadata = { title: 'Editar fluxo' };
export default async function FlowDetailPage({ params }: { params: Promise<{ flowId: string }> }) {
  const { flowId } = await params;
  return <FlowEditor flowId={flowId} />;
}
