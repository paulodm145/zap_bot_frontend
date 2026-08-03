export type TenantStatus = 'AGUARDANDO_PAGAMENTO' | 'PROVISIONANDO' | 'ATIVO' | 'SUSPENSO' | 'CANCELADO' | 'FALHA_PROVISIONAMENTO';
export type TenantProvisioningStep = 'REGISTRO_CENTRAL_CRIADO' | 'BANCO_CRIADO' | 'MIGRATIONS_APLICADAS' | 'CONCLUIDO';

export type InternalTenantSummary = {
  public_id: string;
  nome: string;
  status: TenantStatus;
  etapa_provisionamento?: TenantProvisioningStep | null;
  plano?: { public_id?: string; nome?: string } | null;
  plano_nome?: string | null;
  created_at: string;
  updated_at: string;
};

export type InternalTenantListParams = {
  skip: number;
  take: number;
  search?: string;
  status?: TenantStatus;
  planId?: string;
  orderBy?: 'nome' | 'status' | 'created_at' | 'updated_at';
  order?: 'asc' | 'desc';
};
