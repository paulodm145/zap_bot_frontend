import type { Metadata } from 'next';
import { FlowEditor } from '@/components/fluxo/flow-editor';

export const metadata: Metadata = { title: 'Editor de fluxo' };
export default function NewFlowPage() { return <FlowEditor />; }
