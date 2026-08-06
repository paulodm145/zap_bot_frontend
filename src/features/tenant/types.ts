export type Role = 'ADMIN_TENANT' | 'GESTOR' | 'ATENDENTE';
export type Page<T> = { dados: T[]; total: number; skip: number; take: number };
export type Me = {
  public_id: string;
  nome: string;
  email: string;
  papel: Role;
  ativo: boolean;
  permissoes: string[];
  setores: Array<{ public_id: string; nome: string }>;
  tenant: { public_id: string; nome: string };
};
export type Sector = {
  public_id: string;
  nome: string;
  descricao?: string | null;
  ativo: boolean;
  created_at?: string;
};
export type TenantUser = {
  public_id: string;
  nome: string;
  email: string;
  papel: Role;
  ativo: boolean;
  setores?: Sector[];
};
export type Conversation = {
  public_id: string;
  status: 'BOT' | 'AGUARDANDO_ATENDENTE' | 'COM_ATENDENTE' | 'ENCERRADA';
  contato: { nome?: string | null; telefone: string };
  setor?: { public_id: string; nome: string } | null;
  atendente?: { public_id: string; nome: string } | null;
  ultima_mensagem?: string | null;
  updated_at: string;
};
export type Message = {
  public_id: string;
  direcao: 'ENTRADA' | 'SAIDA';
  tipo: string;
  texto?: string | null;
  conteudo?: string | null;
  status?: string;
  created_at: string;
};
