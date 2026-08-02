import Link from 'next/link';
import { Plus, Workflow } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';

export default function FlowsPage() {
  return <AppShell title="Meus fluxos" subtitle="Crie e organize suas automações." actions={<Link href="/fluxos/novo"><Button icon={<Plus size={17} />}>Novo fluxo</Button></Link>}><div style={{ minHeight: 360, display: 'grid', placeItems: 'center', textAlign: 'center', border: '1px dashed #bdd0ca', borderRadius: 18, background: 'white' }}><div><Workflow size={38} color="var(--green-600)" /><h2>Seus fluxos vivem aqui</h2><p style={{ color: 'var(--muted)', fontSize: 13 }}>Abra o protótipo do editor para começar.</p><Link href="/fluxos/novo"><Button>Abrir editor visual</Button></Link></div></div></AppShell>;
}
