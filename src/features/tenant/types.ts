export type Role = 'ADMIN_TENANT' | 'GESTOR' | 'ATENDENTE';
export type Page<T> = { dados: T[]; total: number; skip: number; take: number };
export type Me = { public_id: string; nome: string; email: string; papel: Role; ativo: boolean; permissoes: string[]; setores: Array<{ public_id: string; nome: string }>; tenant: { public_id: string; nome: string } };
export type Sector = { public_id: string; nome: string; descricao?: string | null; ativo: boolean; created_at?: string };
export type TenantUser = { public_id: string; nome: string; email: string; papel: Role; ativo: boolean; setores?: Sector[] };
