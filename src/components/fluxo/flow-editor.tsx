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
import {
  ChevronLeft,
  GitBranch,
  MessageSquareText,
  MousePointer2,
  Play,
  Plus,
  Redo2,
  Save,
  Send,
  TextCursorInput,
  Trash2,
  Undo2,
  Users,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';
import styles from './flow-editor.module.css';
import { definitionToGraph, graphToDefinition, validateGraph, type FlowNodeData } from '@/features/flows/flow-graph';
import { useCreateFlow } from '@/hooks/flows/use-create-flow';
import { useFlowDetail } from '@/hooks/flows/use-flow-detail';
import { useSaveFlow } from '@/hooks/flows/use-save-flow';
import { usePublishFlow } from '@/hooks/flows/use-publish-flow';
import { useSimulateFlow, type SimulationOutput } from '@/hooks/flows/use-simulate-flow';
import { isApiError } from '@/lib/api/api-error';
import { AuthGuard } from '@/components/auth/auth-guard';
import { useMe } from '@/hooks/tenant/use-me';
import { useSectors } from '@/hooks/tenant/use-sectors';
import {
  useFlowBlockCatalog,
  type FlowBlockCatalogItem,
  type FlowBlockType,
} from '@/hooks/flows/use-flow-block-catalog';

type FlowData = FlowNodeData;
type Tool = {
  type: FlowBlockType;
  label: string;
  detail: string;
  icon: typeof MessageSquareText;
  tone: string;
  content: string;
};

const iconMap = { message: MessageSquareText, capture: TextCursorInput, condition: GitBranch, team: Users };
const edgeDefaults = { markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: '#63aa94', strokeWidth: 2 } };

function FlowNode({ id, data, selected }: NodeProps<Node<FlowData>>) {
  const Icon = iconMap[data.icon as keyof typeof iconMap] ?? MessageSquareText;
  const { deleteElements } = useReactFlow();
  return (
    <div
      className={`${styles.node} ${selected ? styles.selected : ''} ${data.validationError ? styles.invalidNode : ''}`}
      title={data.validationError}
    >
      <NodeToolbar isVisible={selected} position={Position.Right}>
        <button
          type="button"
          className={styles.removeNode}
          onClick={(event) => {
            event.stopPropagation();
            void deleteElements({ nodes: [{ id }] });
          }}
          aria-label={`Remover bloco ${data.detail}`}
        >
          <Trash2 size={14} />
          Remover
        </button>
      </NodeToolbar>
      <Handle type="target" position={Position.Top} />
      <div className={`${styles.nodeIcon} ${styles[data.kind]}`}>
        <Icon size={17} />
      </div>
      <div>
        <small>{data.label}</small>
        <strong>{data.detail}</strong>
        {data.validationError && <em>{data.validationError}</em>}
      </div>
      {data.kind !== 'team' && <Handle type="source" position={Position.Bottom} />}
    </div>
  );
}

const nodeTypes = { flowNode: FlowNode };
const prototypeNodes: Node<FlowData>[] = [
  {
    id: 'no_1',
    type: 'flowNode',
    position: { x: 310, y: 40 },
    data: {
      label: 'Mensagem',
      detail: 'Boas-vindas',
      kind: 'message',
      icon: 'message',
      content: 'Olá! Bem-vindo à Aurora 👋\nComo podemos ajudar você hoje?',
    },
  },
  {
    id: 'no_2',
    type: 'flowNode',
    position: { x: 310, y: 180 },
    data: {
      label: 'Condição',
      detail: 'Identificar intenção',
      kind: 'condition',
      icon: 'condition',
      content: 'Escolha uma opção para continuar.',
    },
  },
  {
    id: 'no_3',
    type: 'flowNode',
    position: { x: 90, y: 345 },
    data: {
      label: 'Capturar resposta',
      detail: 'Identificar solicitação',
      kind: 'capture',
      icon: 'capture',
      content: 'Digite uma opção para continuar.',
      variable: 'cliente.opcao',
    },
  },
  {
    id: 'no_4',
    type: 'flowNode',
    position: { x: 530, y: 345 },
    data: {
      label: 'Direcionar setor',
      detail: 'Escolha um setor',
      kind: 'team',
      icon: 'team',
      content: '',
      sectorId: '',
    },
  },
];
const prototypeEdges: Edge[] = [
  { id: 'e1', source: 'no_1', target: 'no_2', ...edgeDefaults },
  // O motor interpreta a regra; rótulo livre quebra a execução da condição.
  { id: 'e2', source: 'no_2', target: 'no_3', label: 'cliente.opcao == "1"', ...edgeDefaults },
  { id: 'e3', source: 'no_2', target: 'no_4', label: 'Padrão', ...edgeDefaults },
];
const visualByType: Record<FlowBlockType, { icon: typeof MessageSquareText; tone: string }> = {
  mensagem: { icon: MessageSquareText, tone: 'message' },
  captura_resposta: { icon: TextCursorInput, tone: 'capture' },
  condicao: { icon: GitBranch, tone: 'condition' },
  direcionar_setor: { icon: Users, tone: 'team' },
};

function catalogItemToTool(item: FlowBlockCatalogItem): Tool {
  const visual = visualByType[item.tipo];
  const data = (item.configuracaoInicial.dados ?? {}) as Record<string, unknown>;
  return {
    type: item.tipo,
    label: item.nome,
    detail: item.descricao,
    ...visual,
    content: String(data.texto ?? data.mensagem ?? ''),
  };
}

function FlowEditorContent({
  flowId,
  flowName,
  published,
  initialNodes,
  initialEdges,
}: {
  flowId?: string;
  flowName: string;
  /** O simulador roda sobre a versão publicada; sem ela o backend responde 404. */
  published: boolean;
  initialNodes: Node<FlowData>[];
  initialEdges: Edge[];
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<FlowData>>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialEdges);
  const [selectedId, setSelectedId] = useState<string | null>(initialNodes[0]?.id ?? null);
  const [saved, setSaved] = useState(false);
  const nextId = useRef(10);
  const saveFlow = useSaveFlow(flowId);
  const createFlow = useCreateFlow();
  const publishFlow = usePublishFlow(flowId);
  const simulation = useSimulateFlow(flowId);
  const catalog = useFlowBlockCatalog();
  const sectors = useSectors('', 0, 100, true);
  const me = useMe();
  const canManage = me.data?.papel !== 'ATENDENTE';
  const [simulationOpen, setSimulationOpen] = useState(false);
  const [simulationMessage, setSimulationMessage] = useState('');
  const [transcript, setTranscript] = useState<SimulationOutput[]>([]);
  const [simulationState, setSimulationState] = useState<Record<string, unknown>>();
  const awaitingInput = transcript[transcript.length - 1]?.tipo === 'captura';
  const simulationFinished = simulationState?.concluido === true;
  const canvasRef = useRef<HTMLElement>(null);
  const { screenToFlowPosition } = useReactFlow();
  const selected = useMemo(() => nodes.find((node) => node.id === selectedId) ?? null, [nodes, selectedId]);
  const tools = useMemo(() => catalog.data?.blocos.map(catalogItemToTool) ?? [], [catalog.data]);

  /**
   * Marca os blocos incompletos e devolve se o grafo pode ser enviado. Também
   * limpa marcações antigas, para o erro não sobreviver à correção.
   */
  const markInvalidBlocks = useCallback(() => {
    const issues = validateGraph(nodes, edges);
    setNodes((current) =>
      current.map((node) => ({
        ...node,
        data: { ...node.data, validationError: issues.find((issue) => issue.nodeId === node.id)?.message },
      })),
    );
    const first = issues[0];
    if (first) setSelectedId(first.nodeId);
    return issues.length === 0;
  }, [edges, nodes, setNodes]);

  const save = useCallback(async () => {
    if (!canManage || !markInvalidBlocks()) return;
    const definition = graphToDefinition(nodes, edges);
    try {
      // Sem flowId o fluxo ainda não existe: criar é a única forma de não
      // descartar o que foi montado em /fluxos/novo.
      if (flowId) await saveFlow.mutateAsync({ name: flowName, definition });
      else await createFlow.mutateAsync({ name: flowName, definition });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
    } catch {
      /* erro exibido no cabeçalho */
    }
  }, [canManage, createFlow, edges, flowId, flowName, markInvalidBlocks, nodes, saveFlow]);
  const connect = useCallback(
    (connection: Connection) => {
      if (nodes.find((node) => node.id === connection.source)?.data.kind === 'team') return;
      setEdges((current) => addEdge({ ...connection, ...edgeDefaults }, current));
    },
    [nodes, setEdges],
  );

  function createNode(tool: Tool, position: { x: number; y: number }) {
    const id = `no_${nextId.current++}`;
    const node: Node<FlowData> = {
      id,
      type: 'flowNode',
      position,
      data: {
        label: tool.label,
        detail: `Novo bloco de ${tool.label.toLowerCase()}`,
        kind: tool.tone,
        icon: tool.tone,
        content: tool.content,
        ...(tool.type === 'direcionar_setor' ? { sectorId: '' } : {}),
      },
    };
    setNodes((current) => [...current, node]);
    setSelectedId(id);
  }

  function addAtCenter(tool: Tool) {
    const bounds = canvasRef.current?.getBoundingClientRect();
    const screenPosition = bounds
      ? { x: bounds.left + bounds.width / 2 - 112, y: bounds.top + bounds.height / 2 - 33 }
      : { x: 400, y: 300 };
    createNode(tool, screenToFlowPosition(screenPosition));
  }

  function startDrag(event: DragEvent<HTMLButtonElement>, tool: Tool) {
    event.dataTransfer.setData('application/zapbot-flow', tool.type);
    event.dataTransfer.effectAllowed = 'copy';
  }

  function drop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    const raw = event.dataTransfer.getData('application/zapbot-flow');
    if (!raw) return;
    const tool = tools.find((item) => item.type === raw);
    if (tool) createNode(tool, screenToFlowPosition({ x: event.clientX - 112, y: event.clientY - 33 }));
  }

  function updateSelected(field: 'detail' | 'content' | 'sectorId' | 'variable', value: string) {
    if (!selectedId) return;
    setNodes((current) =>
      current.map((node) => (node.id === selectedId ? { ...node, data: { ...node.data, [field]: value } } : node)),
    );
  }

  function deleteSelected() {
    if (!selectedId) return;
    setNodes((current) => current.filter((node) => node.id !== selectedId));
    setEdges((current) => current.filter((edge) => edge.source !== selectedId && edge.target !== selectedId));
    setSelectedId(null);
  }

  async function publish() {
    if (!canManage || !markInvalidBlocks()) return;
    try {
      await publishFlow.mutateAsync();
    } catch (error) {
      if (isApiError(error) && error.status === 422) {
        const details = error.details as { erros?: Array<{ noId?: string; mensagem: string }> } | undefined;
        const errors = details?.erros ?? [];
        setNodes((current) =>
          current.map((node) => ({
            ...node,
            data: { ...node.data, validationError: errors.find((item) => item.noId === node.id)?.mensagem },
          })),
        );
      }
    }
  }

  /**
   * `restart` descarta o estado anterior e recomeça do nó inicial. Sem isso,
   * clicar em "Testar" retomava a execução antiga em vez de iniciar outra.
   * As saídas são acumuladas para que a conversa de teste tenha histórico.
   */
  async function simulate(message?: string, restart = false) {
    setSimulationOpen(true);
    try {
      const response = await simulation.mutateAsync({ message, state: restart ? undefined : simulationState });
      setTranscript((current) => (restart ? response.saidas : [...current, ...response.saidas]));
      setSimulationState(response.estado);
      setSimulationMessage('');
    } catch {
      /* erro exibido no painel */
    }
  }

  return (
    <main className={styles.editor}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <Logo compact />
          <Link href="/fluxos">
            <ChevronLeft size={18} />
            Meus fluxos
          </Link>
        </div>
        <div className={styles.title}>
          <strong>{flowName}</strong>
          <Badge tone="neutral">Rascunho</Badge>
          <small>
            {saveFlow.error
              ? isApiError(saveFlow.error)
                ? saveFlow.error.message
                : 'Falha ao salvar'
              : saved
                ? 'Alterações salvas'
                : `${nodes.length} blocos · ${edges.length} conexões`}
          </small>
        </div>
        <div className={styles.headerActions}>
          <Button variant="ghost" size="icon" disabled aria-label="Desfazer (em breve)" icon={<Undo2 size={17} />} />
          <Button variant="ghost" size="icon" disabled aria-label="Refazer (em breve)" icon={<Redo2 size={17} />} />
          <Button
            variant="secondary"
            onClick={() => void simulate(undefined, true)}
            disabled={!flowId || !published || simulation.isPending}
            title={published ? 'Simular a última versão publicada' : 'Publique o fluxo para poder simular'}
            icon={<Play size={16} />}
          >
            {simulation.isPending ? 'Simulando...' : 'Testar'}
          </Button>
          <Button variant="secondary" onClick={() => void publish()} disabled={!flowId || publishFlow.isPending}>
            Publicar
          </Button>
          <Button onClick={() => void save()} disabled={saveFlow.isPending} icon={<Save size={16} />}>
            {saveFlow.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </header>
      <aside className={styles.library}>
        <div className={styles.libraryTitle}>
          <h2>Blocos</h2>
          <button aria-label="Recolher biblioteca">
            <ChevronLeft size={17} />
          </button>
        </div>
        <p>Arraste para o canvas ou clique para adicionar</p>
        {catalog.isLoading && <p>Carregando catálogo...</p>}
        {catalog.error && (
          <div className={styles.nodeError}>Não foi possível carregar os blocos aceitos pelo backend.</div>
        )}
        <div className={styles.toolList}>
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.type}
                draggable
                onDragStart={(event) => startDrag(event, tool)}
                onClick={() => addAtCenter(tool)}
                title={`Adicionar ${tool.label}`}
              >
                <span className={styles[tool.tone]}>
                  <Icon size={18} />
                </span>
                <div>
                  <strong>{tool.label}</strong>
                  <small>{tool.detail}</small>
                </div>
                <Plus size={15} />
              </button>
            );
          })}
        </div>
        <div className={styles.tip}>
          <MousePointer2 size={18} />
          <div>
            <strong>Como montar</strong>
            <p>
              Mensagem envia texto; Captura salva uma resposta; Condição escolhe um caminho; Direcionar setor encerra o
              bot e envia à fila humana.
            </p>
          </div>
        </div>
      </aside>
      <section
        ref={canvasRef}
        className={styles.canvas}
        aria-label="Editor visual de fluxo"
        onDrop={drop}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = 'copy';
        }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={connect}
          fitView
          minZoom={0.4}
          maxZoom={1.5}
          deleteKeyCode={['Backspace', 'Delete']}
          onNodeClick={(_, node) => setSelectedId(node.id)}
          onPaneClick={() => setSelectedId(null)}
          onNodesDelete={(deleted) => {
            const ids = new Set(deleted.map((node) => node.id));
            setEdges((current) => current.filter((edge) => !ids.has(edge.source) && !ids.has(edge.target)));
            if (selectedId && ids.has(selectedId)) setSelectedId(null);
          }}
          defaultEdgeOptions={edgeDefaults}
          connectionLineStyle={{ stroke: '#12a17d', strokeWidth: 2 }}
        >
          <Background color="#cbd8d3" gap={22} size={1} />
          <Controls showInteractive={false} />
          <MiniMap nodeColor="#0e8468" maskColor="rgb(245 248 247 / 75%)" />
        </ReactFlow>
      </section>
      <aside className={`${styles.properties} ${selected ? styles.visible : ''}`}>
        {selected ? (
          <>
            <div className={styles.propertiesTitle}>
              <div>
                <span>PROPRIEDADES DO BLOCO</span>
                <h2>{selected.data.label}</h2>
              </div>
              <button onClick={() => setSelectedId(null)} aria-label="Fechar propriedades">
                <X size={18} />
              </button>
            </div>
            {selected.data.validationError && (
              <div className={styles.nodeError} role="alert">
                {selected.data.validationError}
              </div>
            )}
            <label>
              <span>Nome do bloco</span>
              <input value={selected.data.detail} onChange={(event) => updateSelected('detail', event.target.value)} />
            </label>
            {selected.data.kind === 'team' ? (
              <>
                <label>
                  <span>Setor de destino</span>
                  <select
                    value={selected.data.sectorId ?? ''}
                    onChange={(event) => {
                      const sector = sectors.data?.dados.find((item) => item.public_id === event.target.value);
                      updateSelected('sectorId', event.target.value);
                      if (sector) updateSelected('detail', sector.nome);
                    }}
                    disabled={sectors.isLoading}
                  >
                    <option value="">Selecione um setor ativo</option>
                    {sectors.data?.dados.map((sector) => (
                      <option key={sector.public_id} value={sector.public_id}>
                        {sector.nome}
                      </option>
                    ))}
                  </select>
                </label>
                <div className={styles.blockHelp}>
                  <strong>Como funciona</strong>
                  <p>
                    Este bloco encerra a automação e coloca a conversa na fila do setor escolhido. Ele não possui
                    conexão de saída.
                  </p>
                  {sectors.error && <p role="alert">Não foi possível carregar os setores.</p>}
                </div>
              </>
            ) : (
              <>
                {selected.data.kind === 'capture' && (
                  <label>
                    <span>Variável que guardará a resposta</span>
                    <input
                      value={selected.data.variable ?? ''}
                      onChange={(event) => updateSelected('variable', event.target.value)}
                      placeholder="Ex.: cliente.opcao"
                    />
                    <small>Letras, números, ponto e sublinhado; comece com letra ou sublinhado.</small>
                  </label>
                )}
                <label>
                  <span>Conteúdo / instrução</span>
                  <textarea
                    value={selected.data.content}
                    onChange={(event) => updateSelected('content', event.target.value)}
                    rows={5}
                  />
                </label>
                <div className={styles.variables}>
                  <span>Inserir variável</span>
                  <button onClick={() => updateSelected('content', `${selected.data.content} {nome_contato}`)}>
                    {'{nome_contato}'}
                  </button>
                  <button onClick={() => updateSelected('content', `${selected.data.content} {saudacao}`)}>
                    {'{saudacao}'}
                  </button>
                </div>
                <div className={styles.preview}>
                  <span>PRÉVIA DO CONTEÚDO</span>
                  <div>
                    <p>{selected.data.content || 'Digite um conteúdo para visualizar.'}</p>
                    <small>10:42 ✓✓</small>
                  </div>
                </div>
              </>
            )}
            <div className={styles.propertyActions}>
              <Button variant="danger" onClick={deleteSelected}>
                Excluir bloco
              </Button>
              <Button onClick={() => void save()} icon={<Send size={15} />}>
                Aplicar
              </Button>
            </div>
          </>
        ) : (
          <div className={styles.noSelection}>
            <MousePointer2 size={25} />
            <strong>Selecione um bloco</strong>
            <p>Clique em um bloco para editar suas propriedades.</p>
          </div>
        )}
      </aside>
      {simulationOpen && (
        <section className={styles.simulationPanel}>
          <header>
            <div>
              <span>SIMULAÇÃO</span>
              <strong>Conversa de teste</strong>
            </div>
            <button onClick={() => setSimulationOpen(false)} aria-label="Fechar simulação">
              <X size={18} />
            </button>
          </header>
          <div className={styles.simulationMessages}>
            {simulation.error && (
              <p className={styles.simulationError} role="alert">
                {isApiError(simulation.error) && simulation.error.status === 404
                  ? 'A simulação roda sobre a última versão publicada. Publique o fluxo e teste novamente.'
                  : isApiError(simulation.error)
                    ? simulation.error.message
                    : 'Não foi possível simular o fluxo.'}
              </p>
            )}
            {transcript.map((output, index) => (
              <p key={index}>
                <small>{output.tipo}</small>
                {output.texto ??
                  output.mensagem ??
                  (output.setorId ? `Direcionado para ${output.setorId}` : 'Etapa processada')}
              </p>
            ))}
            {simulationFinished && <p className={styles.simulationEnd}>Fluxo concluído.</p>}
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void simulate(simulationMessage);
            }}
          >
            <input
              value={simulationMessage}
              onChange={(event) => setSimulationMessage(event.target.value)}
              placeholder={awaitingInput ? 'Digite uma resposta...' : 'O fluxo não está aguardando resposta'}
              disabled={!awaitingInput || simulationFinished}
              aria-label="Resposta para a simulação"
            />
            <Button
              type="submit"
              size="icon"
              aria-label="Enviar resposta para a simulação"
              disabled={!simulationMessage || simulation.isPending || !awaitingInput || simulationFinished}
              icon={<Send size={15} />}
            />
          </form>
        </section>
      )}
    </main>
  );
}

function AuthenticatedFlowEditor({ flowId }: { flowId?: string }) {
  const detail = useFlowDetail(flowId);
  if (flowId && detail.isLoading) return <main className={styles.editorState}>Carregando fluxo...</main>;
  if (flowId && detail.error)
    return (
      <main className={styles.editorState}>
        <strong>Não foi possível abrir o fluxo.</strong>
        <p>{isApiError(detail.error) ? detail.error.message : 'Verifique sua conexão e tente novamente.'}</p>
        <Link href="/fluxos">Voltar para meus fluxos</Link>
      </main>
    );
  const graph = detail.data
    ? definitionToGraph(detail.data.definicao)
    : { nodes: prototypeNodes, edges: prototypeEdges };
  return (
    <ReactFlowProvider>
      <FlowEditorContent
        key={detail.data?.updated_at ?? 'prototype'}
        flowId={flowId}
        flowName={detail.data?.nome ?? 'Atendimento principal'}
        published={Boolean(detail.data?.publicado_at)}
        initialNodes={graph.nodes}
        initialEdges={graph.edges}
      />
    </ReactFlowProvider>
  );
}

export function FlowEditor({ flowId }: { flowId?: string }) {
  return (
    <AuthGuard>
      <AuthenticatedFlowEditor flowId={flowId} />
    </AuthGuard>
  );
}
