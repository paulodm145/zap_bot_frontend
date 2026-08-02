import Link from 'next/link';
import { ArrowDownRight, ArrowRight, ArrowUpRight, Bot, Clock3, MessageCircle, MoreHorizontal, Plus, Users, Workflow } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import styles from './dashboard.module.css';

const stats = [
  { label: 'Conversas no mês', value: '1.284', change: '+12,5%', up: true, icon: MessageCircle },
  { label: 'Em atendimento', value: '24', change: '+4 hoje', up: true, icon: Users },
  { label: 'Taxa de automação', value: '78%', change: '+5,2%', up: true, icon: Bot },
  { label: 'Tempo médio', value: '3m 42s', change: '-18s', up: false, icon: Clock3 },
];
const flows = [
  { name: 'Atendimento principal', detail: 'Atualizado há 12 min', status: 'Publicado', conversations: '842' },
  { name: 'Segunda via de boleto', detail: 'Atualizado ontem', status: 'Publicado', conversations: '286' },
  { name: 'Qualificação comercial', detail: 'Atualizado há 3 dias', status: 'Rascunho', conversations: '—' },
];

export function Dashboard() {
  return <AppShell title="Olá, Paulo!" subtitle="Aqui está o resumo da sua operação hoje." actions={<Link href="/fluxos/novo"><Button icon={<Plus size={17} />}>Novo fluxo</Button></Link>}>
    <section className={styles.stats} aria-label="Indicadores">{stats.map(({ label, value, change, up, icon: Icon }) => <article className={styles.stat} key={label}><div className={styles.statTop}><span><Icon size={19} /></span><small>últimos 30 dias</small></div><p>{label}</p><div className={styles.statValue}><strong>{value}</strong><em className={up ? styles.positive : styles.good}>{up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{change}</em></div></article>)}</section>
    <div className={styles.grid}>
      <section className={styles.card}><header><div><h2>Volume de conversas</h2><p>Mensagens recebidas nos últimos 7 dias</p></div><select aria-label="Período"><option>7 dias</option><option>30 dias</option></select></header><div className={styles.chart} aria-label="Gráfico ilustrativo"><div className={styles.yLabels}><span>300</span><span>200</span><span>100</span><span>0</span></div><div className={styles.bars}>{[42,62,48,78,67,91,72].map((height, index) => <div key={index}><i style={{ height: `${height}%` }} /><span>{['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'][index]}</span></div>)}</div></div></section>
      <aside className={styles.card}><header><div><h2>Atendimento agora</h2><p>Atualizado em tempo real</p></div><span className={styles.live}>● AO VIVO</span></header><div className={styles.queue}><div><span className={styles.greenDot} /><p><strong>8</strong> aguardando na fila</p></div><div><span className={styles.blueDot} /><p><strong>16</strong> em atendimento</p></div><div><span className={styles.grayDot} /><p><strong>7</strong> atendentes online</p></div></div><Button variant="secondary">Abrir painel de atendimento</Button></aside>
    </div>
    <section className={`${styles.card} ${styles.flows}`}><header><div><h2>Fluxos recentes</h2><p>Acompanhe o desempenho das suas automações</p></div><Link href="/fluxos">Ver todos <ArrowRight size={14} /></Link></header><div className={styles.flowList}>{flows.map((flow) => <div className={styles.flowRow} key={flow.name}><span className={styles.flowIcon}><Workflow size={18} /></span><div className={styles.flowName}><strong>{flow.name}</strong><small>{flow.detail}</small></div><Badge tone={flow.status === 'Publicado' ? 'success' : 'neutral'}>{flow.status}</Badge><span className={styles.conversations}><strong>{flow.conversations}</strong><small>conversas</small></span><button aria-label={`Ações de ${flow.name}`}><MoreHorizontal size={19} /></button></div>)}</div></section>
  </AppShell>;
}
