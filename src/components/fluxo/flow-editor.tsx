'use client';

import { useCallback, useMemo, useRef, useState, type DragEvent } from 'react';
import {
  addEdge,
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  NodeToolbar,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react';
import { ChevronLeft, GitBranch, MessageSquareText, MousePointer2, Play, Plus, Redo2, Save, Send, TextCursorInput, Trash2, Undo2, Users, X } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';
import styles from './flow-editor.module.css';
import { definitionToGraph, graphToDefinition, type FlowNodeData } from '@/features/flows/flow-graph';
import { useFlowDetail } from '@/hooks/flows/use-flow-detail';
import { useSaveFlow } from '@/hooks/flows/use-save-flow';
import { usePublishFlow } from '@/hooks/flows/use-publish-flow';
import { useSimulateFlow } from '@/hooks/flows/use-simulate-flow';
import { isApiError } from '@/lib/api/api-error';
import { AuthGuard } from '@/components/auth/auth-guard';

type FlowData = FlowNodeData;
type Tool = { label: string; detail: string; icon: typeof MessageSquareText; tone: string; content: string };

const iconMap = { message: MessageSquareText, capture: TextCursorInput, condition: GitBranch, team: Users };
const edgeDefaults = { markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: '#63aa94', strokeWidth: 2 } };

function FlowNode({ id, data, selected }: NodeProps<Node<FlowData>>) {
  const Icon = iconMap[data.icon as keyof typeof iconMap] ?? MessageSquareText;
  const { deleteElements } = useReactFlow();
  return <div className={`${styles.node} ${selected ? styles.selected : ''} ${data.validationError ? styles.invalidNode : ''}`} title={data.validationError}><NodeToolbar isVisible={selected} position={Position.Right}><button type="button" className={styles.removeNode} onClick={(event) => { event.stopPropagation(); void deleteElements({ nodes: [{ id }] }); }} aria-label={`Remover bloco ${data.detail}`}><Trash2 size={14} />Remover</button></NodeToolbar><Handle type="target" position={Position.Top} /><div className={`${styles.nodeIcon} ${styles[data.kind]}`}><Icon size={17} /></div><div><small>{data.label}</small><strong>{data.detail}</strong>{data.validationError && <em>{data.validationError}</em>}</div><Handle type="source" position={Position.Bottom} /></div>;
}

const nodeTypes = { flowNode: FlowNode };
const prototypeNodes: Node<FlowData>[] = [
  { id: 'no_1', type: 'flowNode', position: { x: 310, y: 40 }, data: { label: 'Mensagem', detail: 'Boas-vindas', kind: 'message', icon: 'message', content: 'Olá! Bem-vindo à Aurora 👋\nComo podemos ajudar você hoje?' } },
  { id: 'no_2', type: 'flowNode', position: { x: 310, y: 180 }, data: { label: 'Condição', detail: 'Identificar intenção', kind: 'condition', icon: 'condition', content: 'Escolha uma opção para continuar.' } },
  { id: 'no_3', type: 'flowNode', position: { x: 90, y: 345 }, data: { label: 'Capturar resposta', detail: 'Identificar solicitação', kind: 'capture', icon: 'capture', content: 'Digite uma opção para continuar.' } },
  { id: 'no_4', type: 'flowNode', position: { x: 530, y: 345 }, data: { label: 'Direcionar setor', detail: 'Equipe comercial', kind: 'team', icon: 'team', content: 'Transferir esta conversa para o setor Comercial.' } },
];
const prototypeEdges: Edge[] = [
  { id: 'e1', source: 'no_1', target: 'no_2', ...edgeDefaults },
  { id: 'e2', source: 'no_2', target: 'no_3', label: 'Suporte', ...edgeDefaults },
  { id: 'e3', source: 'no_2', target: 'no_4', label: 'Comprar', ...edgeDefaults },
];
const tools: Tool[] = [
  { label: 'Mensagem', detail: 'Envie texto ou mídia', icon: MessageSquareText, tone: 'message', content: 'Digite a mensagem que será enviada.' },
  { label: 'Capturar resposta', detail: 'Aguarde uma resposta', icon: TextCursorInput, tone: 'capture', content: 'Digite uma resposta para continuar.' },
  { label: 'Condição', detail: 'Crie caminhos lógicos', icon: GitBranch, tone: 'condition', content: 'Configure as opções e condições de saída.' },
  { label: 'Direcionar setor', detail: 'Transfira para uma equipe', icon: Users, tone: 'team', content: 'Escolha o setor de destino.' },
];

function FlowEditorContent({ flowId, flowName, initialNodes, initialEdges }: { flowId?: string; flowName: string; initialNodes: Node<FlowData>[]; initialEdges: Edge[] }) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<FlowData>>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialEdges);
  const [selectedId, setSelectedId] = useState<string | null>(initialNodes[0]?.id ?? null);
  const [saved, setSaved] = useState(false);
  const nextId = useRef(10);
  const saveFlow = useSaveFlow(flowId);
  const publishFlow = usePublishFlow(flowId);
  const simulation = useSimulateFlow(flowId);
  const [simulationOpen, setSimulationOpen] = useState(false);
  const [simulationMessage, setSimulationMessage] = useState('');
  const canvasRef = useRef<HTMLElement>(null);
  const { screenToFlowPosition } = useReactFlow();
  const selected = useMemo(() => nodes.find((node) => node.id === selectedId) ?? null, [nodes, selectedId]);

  const save = useCallback(async () => {
    try {
      if (flowId) await saveFlow.mutateAsync({ name: flowName, definition: graphToDefinition(nodes, edges) });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
    } catch { /* erro exibido no cabeçalho */ }
  }, [edges, flowId, flowName, nodes, saveFlow]);
  const connect = useCallback((connection: Connection) => setEdges((current) => addEdge({ ...connection, ...edgeDefaults }, current)), [setEdges]);

  function createNode(tool: Tool, position: { x: number; y: number }) {
    const id = `no_${nextId.current++}`;
    const node: Node<FlowData> = { id, type: 'flowNode', position, data: { label: tool.label, detail: `Novo bloco de ${tool.label.toLowerCase()}`, kind: tool.tone, icon: tool.tone, content: tool.content } };
    setNodes((current) => [...current, node]);
    setSelectedId(id);
  }

  function addAtCenter(tool: Tool) {
    const bounds = canvasRef.current?.getBoundingClientRect();
    const screenPosition = bounds ? { x: bounds.left + bounds.width / 2 - 112, y: bounds.top + bounds.height / 2 - 33 } : { x: 400, y: 300 };
    createNode(tool, screenToFlowPosition(screenPosition));
  }

  function startDrag(event: DragEvent<HTMLButtonElement>, tool: Tool) {
    event.dataTransfer.setData('application/zapbot-flow', JSON.stringify({ label: tool.label, tone: tool.tone }));
    event.dataTransfer.effectAllowed = 'copy';
  }

  function drop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    const raw = event.dataTransfer.getData('application/zapbot-flow');
    if (!raw) return;
    const dragged = JSON.parse(raw) as Pick<Tool, 'label' | 'tone'>;
    const tool = tools.find((item) => item.label === dragged.label && item.tone === dragged.tone);
    if (tool) createNode(tool, screenToFlowPosition({ x: event.clientX - 112, y: event.clientY - 33 }));
  }

  function updateSelected(field: 'detail' | 'content', value: string) {
    if (!selectedId) return;
    setNodes((current) => current.map((node) => node.id === selectedId ? { ...node, data: { ...node.data, [field]: value } } : node));
  }

  function deleteSelected() {
    if (!selectedId) return;
    setNodes((current) => current.filter((node) => node.id !== selectedId));
    setEdges((current) => current.filter((edge) => edge.source !== selectedId && edge.target !== selectedId));
    setSelectedId(null);
  }

  async function publish() {
    setNodes((current) => current.map((node) => ({ ...node, data: { ...node.data, validationError: undefined } })));
    try { await publishFlow.mutateAsync(); } catch (error) {
      if (isApiError(error) && error.status === 422) {
        const details = error.details as { erros?: Array<{ noId?: string; mensagem: string }> } | undefined;
        const errors = details?.erros ?? [];
        setNodes((current) => current.map((node) => ({ ...node, data: { ...node.data, validationError: errors.find((item) => item.noId === node.id)?.mensagem } })));
      }
    }
  }

  async function simulate(message?: string) {
    try {
      await simulation.mutateAsync({ message, state: simulation.data?.estado });
      setSimulationMessage('');
      setSimulationOpen(true);
    } catch { setSimulationOpen(true); }
  }

  return <main className={styles.editor}>
    <header className={styles.header}><div className={styles.brand}><Logo compact /><Link href="/fluxos"><ChevronLeft size={18} />Meus fluxos</Link></div><div className={styles.title}><strong>{flowName}</strong><Badge tone="neutral">Rascunho</Badge><small>{saveFlow.error ? (isApiError(saveFlow.error) ? saveFlow.error.message : 'Falha ao salvar') : saved ? 'Alterações salvas' : `${nodes.length} blocos · ${edges.length} conexões`}</small></div><div className={styles.headerActions}><Button variant="ghost" size="icon" disabled aria-label="Desfazer (em breve)" icon={<Undo2 size={17} />} /><Button variant="ghost" size="icon" disabled aria-label="Refazer (em breve)" icon={<Redo2 size={17} />} /><Button variant="secondary" onClick={() => void simulate()} disabled={!flowId || simulation.isPending} icon={<Play size={16} />}>{simulation.isPending ? 'Simulando...' : 'Testar'}</Button><Button variant="secondary" onClick={() => void publish()} disabled={!flowId || publishFlow.isPending}>Publicar</Button><Button onClick={() => void save()} disabled={saveFlow.isPending} icon={<Save size={16} />}>{saveFlow.isPending ? 'Salvando...' : 'Salvar'}</Button></div></header>
    <aside className={styles.library}><div className={styles.libraryTitle}><h2>Blocos</h2><button aria-label="Recolher biblioteca"><ChevronLeft size={17} /></button></div><p>Arraste para o canvas ou clique para adicionar</p><div className={styles.toolList}>{tools.map((tool) => { const Icon = tool.icon; return <button key={tool.label} draggable onDragStart={(event) => startDrag(event, tool)} onClick={() => addAtCenter(tool)} title={`Adicionar ${tool.label}`}><span className={styles[tool.tone]}><Icon size={18} /></span><div><strong>{tool.label}</strong><small>{tool.detail}</small></div><Plus size={15} /></button>; })}</div><div className={styles.tip}><MousePointer2 size={18} /><div><strong>Dica rápida</strong><p>Arraste pelas alças verdes para conectar dois blocos.</p></div></div></aside>
    <section ref={canvasRef} className={styles.canvas} aria-label="Editor visual de fluxo" onDrop={drop} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; }}><ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={connect} fitView minZoom={0.4} maxZoom={1.5} deleteKeyCode={['Backspace', 'Delete']} onNodeClick={(_, node) => setSelectedId(node.id)} onPaneClick={() => setSelectedId(null)} onNodesDelete={(deleted) => { const ids = new Set(deleted.map((node) => node.id)); setEdges((current) => current.filter((edge) => !ids.has(edge.source) && !ids.has(edge.target))); if (selectedId && ids.has(selectedId)) setSelectedId(null); }} defaultEdgeOptions={edgeDefaults} connectionLineStyle={{ stroke: '#12a17d', strokeWidth: 2 }}><Background color="#cbd8d3" gap={22} size={1} /><Controls showInteractive={false} /><MiniMap nodeColor="#0e8468" maskColor="rgb(245 248 247 / 75%)" /></ReactFlow></section>
    <aside className={`${styles.properties} ${selected ? styles.visible : ''}`}>{selected ? <><div className={styles.propertiesTitle}><div><span>PROPRIEDADES DO BLOCO</span><h2>{selected.data.label}</h2></div><button onClick={() => setSelectedId(null)} aria-label="Fechar propriedades"><X size={18} /></button></div>{selected.data.validationError && <div className={styles.nodeError} role="alert">{selected.data.validationError}</div>}<label><span>Nome do bloco</span><input value={selected.data.detail} onChange={(event) => updateSelected('detail', event.target.value)} /></label><label><span>Conteúdo / instrução</span><textarea value={selected.data.content} onChange={(event) => updateSelected('content', event.target.value)} rows={5} /></label><div className={styles.variables}><span>Inserir variável</span><button onClick={() => updateSelected('content', `${selected.data.content} {nome_contato}`)}>{'{nome_contato}'}</button><button onClick={() => updateSelected('content', `${selected.data.content} {saudacao}`)}>{'{saudacao}'}</button></div><div className={styles.preview}><span>PRÉVIA DO CONTEÚDO</span><div><p>{selected.data.content || 'Digite um conteúdo para visualizar.'}</p><small>10:42 ✓✓</small></div></div><div className={styles.propertyActions}><Button variant="danger" onClick={deleteSelected}>Excluir bloco</Button><Button onClick={() => void save()} icon={<Send size={15} />}>Aplicar</Button></div></> : <div className={styles.noSelection}><MousePointer2 size={25} /><strong>Selecione um bloco</strong><p>Clique em um bloco para editar suas propriedades.</p></div>}</aside>
    {simulationOpen && <section className={styles.simulationPanel}><header><div><span>SIMULAÇÃO</span><strong>Conversa de teste</strong></div><button onClick={() => setSimulationOpen(false)} aria-label="Fechar simulação"><X size={18} /></button></header><div className={styles.simulationMessages}>{simulation.error && <p className={styles.simulationError}>{isApiError(simulation.error) ? simulation.error.message : 'Não foi possível simular o fluxo.'}</p>}{simulation.data?.saidas.map((output, index) => <p key={index}><small>{output.tipo}</small>{output.texto ?? output.mensagem ?? (output.setorId ? `Direcionado para ${output.setorId}` : 'Etapa processada')}</p>)}</div><form onSubmit={(event) => { event.preventDefault(); void simulate(simulationMessage); }}><input value={simulationMessage} onChange={(event) => setSimulationMessage(event.target.value)} placeholder="Digite uma resposta..." /><Button type="submit" size="icon" disabled={!simulationMessage || simulation.isPending} icon={<Send size={15} />} /></form></section>}
  </main>;
}

function AuthenticatedFlowEditor({ flowId }: { flowId?: string }) {
  const detail = useFlowDetail(flowId);
  if (flowId && detail.isLoading) return <main className={styles.editorState}>Carregando fluxo...</main>;
  if (flowId && detail.error) return <main className={styles.editorState}><strong>Não foi possível abrir o fluxo.</strong><p>{isApiError(detail.error) ? detail.error.message : 'Verifique sua conexão e tente novamente.'}</p><Link href="/fluxos">Voltar para meus fluxos</Link></main>;
  const graph = detail.data ? definitionToGraph(detail.data.definicao) : { nodes: prototypeNodes, edges: prototypeEdges };
  return <ReactFlowProvider><FlowEditorContent key={detail.data?.updated_at ?? 'prototype'} flowId={flowId} flowName={detail.data?.nome ?? 'Atendimento principal'} initialNodes={graph.nodes} initialEdges={graph.edges} /></ReactFlowProvider>;
}

export function FlowEditor({ flowId }: { flowId?: string }) {
  return <AuthGuard><AuthenticatedFlowEditor flowId={flowId} /></AuthGuard>;
}
