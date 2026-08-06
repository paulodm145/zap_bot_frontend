import { Check, Info, Mail, Plus, Trash2 } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTableExample } from '@/components/ui/data-table-example';

const section = {
  padding: 22,
  marginBottom: 16,
  border: '1px solid var(--line)',
  borderRadius: 16,
  background: 'white',
};
const row = { display: 'flex', flexWrap: 'wrap' as const, gap: 10, alignItems: 'center' };
export default function DesignSystemPage() {
  return (
    <AppShell title="Design system" subtitle="Tokens e componentes fundamentais do produto.">
      <section style={section}>
        <h2 style={{ marginTop: 0 }}>Cores</h2>
        <div style={row}>
          {[
            ['#073b32', 'Green 950'],
            ['#0b6b57', 'Green 800'],
            ['#0e8468', 'Green 700'],
            ['#12a17d', 'Green 600'],
            ['#21c797', 'Green 500'],
            ['#dff8ef', 'Green 100'],
            ['#f0fbf7', 'Green 50'],
          ].map(([color, label]) => (
            <div key={color} style={{ width: 100 }}>
              <div style={{ height: 58, borderRadius: 10, background: color, border: '1px solid #dfe7e4' }} />
              <strong style={{ display: 'block', marginTop: 7, fontSize: 11 }}>{label}</strong>
              <small style={{ color: 'var(--muted)', fontSize: 9 }}>{color}</small>
            </div>
          ))}
        </div>
      </section>
      <section style={section}>
        <h2 style={{ marginTop: 0 }}>Botões</h2>
        <div style={row}>
          <Button icon={<Plus size={16} />}>Ação primária</Button>
          <Button variant="secondary">Secundário</Button>
          <Button variant="ghost" icon={<Info size={16} />}>
            Ação discreta
          </Button>
          <Button variant="danger" icon={<Trash2 size={16} />}>
            Excluir
          </Button>
          <Button disabled>Desabilitado</Button>
        </div>
      </section>
      <section style={section}>
        <h2 style={{ marginTop: 0 }}>Campos e estados</h2>
        <div style={{ maxWidth: 430 }}>
          <Input
            label="E-mail"
            placeholder="voce@empresa.com.br"
            hint="Use o endereço associado à sua conta."
            icon={<Mail size={17} />}
          />
        </div>
        <div style={{ ...row, marginTop: 20 }}>
          <Badge>
            <Check size={11} />
            Publicado
          </Badge>
          <Badge tone="neutral">Rascunho</Badge>
          <Badge tone="warning">Atenção</Badge>
        </div>
      </section>
      <section style={section}>
        <h2 style={{ marginTop: 0 }}>Tipografia e conteúdo</h2>
        <h1 style={{ fontSize: 32, letterSpacing: '-.04em', marginBottom: 8 }}>Construa conversas melhores</h1>
        <p style={{ maxWidth: 650, color: 'var(--muted)', lineHeight: 1.65 }}>
          Títulos são curtos e orientados à tarefa. Textos de apoio explicam o próximo passo em linguagem simples, sem
          termos técnicos desnecessários.
        </p>
      </section>
      <section style={{ marginBottom: 16 }}>
        <DataTableExample />
      </section>
    </AppShell>
  );
}
