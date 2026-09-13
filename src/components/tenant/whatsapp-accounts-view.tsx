'use client';

import { useMemo, useState } from 'react';
import { MessageCircle, Plus, Search } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { useDebouncedValue } from '@/hooks/common/use-debounced-value';
import {
  useCreateWhatsApp,
  useDisconnectWhatsApp,
  useReconnectWhatsApp,
  useWhatsAppAccount,
  useWhatsAppAccounts,
  useWhatsAppStatus,
  type WhatsAppAccount,
  type WhatsAppQrResult,
} from '@/hooks/tenant/use-whatsapp-accounts';
import { whatsappStatusLabel, whatsappStatusTone } from '@/features/tenant/whatsapp';
import { isApiError } from '@/lib/api/api-error';
import { CrudModal } from './crud-modal';
import styles from './tenant.module.css';

export function WhatsAppAccountsView() {
  const [search, setSearch] = useState('');
  const [skip, setSkip] = useState(0);
  const [take, setTake] = useState(20);
  const [createOpen, setCreateOpen] = useState(false);
  const [nome, setNome] = useState('');
  const [qrAccount, setQrAccount] = useState<{ id: string; qrCodeBase64?: string } | null>(null);
  const [disconnecting, setDisconnecting] = useState<WhatsAppAccount | undefined>(undefined);
  const list = useWhatsAppAccounts(useDebouncedValue(search), skip, take);
  const create = useCreateWhatsApp();
  const reconnect = useReconnectWhatsApp();
  const disconnect = useDisconnectWhatsApp();
  const status = useWhatsAppStatus();

  function openQrModal(result: WhatsAppQrResult) {
    setQrAccount({ id: result.conta.public_id, qrCodeBase64: result.qrCodeBase64 });
  }

  const columns = useMemo<DataTableColumn<WhatsAppAccount>[]>(
    () => [
      {
        id: 'name',
        header: 'Conta',
        width: '30%',
        render: (account) => (
          <div className={styles.entity}>
            <span>
              <MessageCircle size={16} />
            </span>
            <div>
              <strong>{account.nome}</strong>
              <small>{account.numero_exibicao ?? 'Ainda não pareado'}</small>
            </div>
          </div>
        ),
      },
      {
        id: 'status',
        header: 'Conexão',
        width: '20%',
        render: (account) => <Badge tone={whatsappStatusTone(account.status)}>{whatsappStatusLabel(account.status)}</Badge>,
      },
      {
        id: 'sync',
        header: 'Última sincronização',
        width: '25%',
        render: (account) =>
          account.ultima_sincronizacao_at ? new Date(account.ultima_sincronizacao_at).toLocaleString('pt-BR') : '—',
      },
      {
        id: 'active',
        header: 'Situação',
        width: '13%',
        render: (account) => (
          <Badge tone={account.ativo ? 'success' : 'neutral'}>{account.ativo ? 'Ativa' : 'Inativa'}</Badge>
        ),
      },
    ],
    [],
  );
  const error = list.error ?? disconnect.error ?? status.error;

  function closeCreateModal() {
    setNome('');
    setCreateOpen(false);
  }

  return (
    <AppShell
      title="Contas WhatsApp"
      subtitle="Números pareados via Evolution API."
      actions={
        <Button icon={<Plus size={17} />} onClick={() => setCreateOpen(true)}>
          Conectar número
        </Button>
      }
    >
      {error && <div className={styles.error}>{isApiError(error) ? error.message : 'Não foi possível concluir.'}</div>}
      <DataTable
        columns={columns}
        data={list.data?.dados ?? []}
        getRowId={(account) => account.public_id}
        pagination={{ skip: list.data?.skip ?? skip, take: list.data?.take ?? take, total: list.data?.total ?? 0 }}
        onPaginationChange={(page) => {
          setSkip(page.skip);
          setTake(page.take);
        }}
        loading={list.isLoading || list.isFetching}
        emptyTitle="Nenhuma conta conectada"
        emptyDescription="Conecte um número via QR code para começar."
        toolbar={
          <label className={styles.search}>
            <Search size={15} />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setSkip(0);
              }}
              placeholder="Buscar conta..."
            />
          </label>
        }
        rowActions={(account) => (
          <>
            <Button
              variant="ghost"
              disabled={reconnect.isPending}
              onClick={() => reconnect.mutate(account.public_id, { onSuccess: openQrModal })}
            >
              {account.status === 'CONECTADO' ? 'Novo QR code' : 'Reconectar'}
            </Button>
            <Button variant="ghost" onClick={() => status.mutate({ id: account.public_id, ativo: !account.ativo })}>
              {account.ativo ? 'Desativar' : 'Ativar'}
            </Button>
            <Button variant="ghost" onClick={() => setDisconnecting(account)}>
              Desconectar
            </Button>
          </>
        )}
      />
      {createOpen && (
        <CrudModal
          title="Conectar número"
          subtitle="Dê um nome interno para a conta. O QR code é gerado na sequência."
          submitLabel="Gerar QR code"
          pending={create.isPending}
          error={create.error ? (isApiError(create.error) ? create.error.message : 'Falha ao conectar.') : null}
          onClose={closeCreateModal}
          onSubmit={(event) => {
            event.preventDefault();
            create.mutate(
              { nome },
              {
                onSuccess: (result) => {
                  closeCreateModal();
                  openQrModal(result);
                },
              },
            );
          }}
        >
          <div className={styles.form}>
            <label className={styles.wide}>
              <span>Nome interno</span>
              <input
                value={nome}
                onChange={(event) => setNome(event.target.value)}
                required
                placeholder="Ex.: Número principal"
              />
            </label>
          </div>
        </CrudModal>
      )}
      {qrAccount && (
        <WhatsAppQrModal
          accountId={qrAccount.id}
          initialQrCodeBase64={qrAccount.qrCodeBase64}
          onClose={() => setQrAccount(null)}
        />
      )}
      {disconnecting && (
        <ConfirmDialog
          title={`Desconectar ${disconnecting.nome}?`}
          description="A sessão pareada é encerrada. A conta continua cadastrada e pode ser reconectada depois com um novo QR code."
          pending={disconnect.isPending}
          error={disconnect.error ? (isApiError(disconnect.error) ? disconnect.error.message : 'Falha ao desconectar.') : null}
          onCancel={() => setDisconnecting(undefined)}
          onConfirm={() => disconnect.mutate(disconnecting.public_id, { onSuccess: () => setDisconnecting(undefined) })}
        />
      )}
    </AppShell>
  );
}

function WhatsAppQrModal({
  accountId,
  initialQrCodeBase64,
  onClose,
}: {
  accountId: string;
  initialQrCodeBase64?: string;
  onClose: () => void;
}) {
  const [qrCodeBase64, setQrCodeBase64] = useState(initialQrCodeBase64);
  const detail = useWhatsAppAccount(accountId);
  const reconnect = useReconnectWhatsApp();
  const account = detail.data;
  const connected = account?.status === 'CONECTADO';

  return (
    <CrudModal
      title={connected ? 'Número conectado' : 'Escaneie o QR code'}
      subtitle={
        connected
          ? 'O WhatsApp já está pronto para uso.'
          : 'Abra o WhatsApp no celular, acesse Aparelhos conectados e escaneie o código abaixo.'
      }
      submitLabel={connected ? 'Concluir' : 'Gerar novo código'}
      pending={reconnect.isPending}
      error={
        reconnect.error ? (isApiError(reconnect.error) ? reconnect.error.message : 'Falha ao gerar novo código.') : null
      }
      onClose={onClose}
      onSubmit={(event) => {
        event.preventDefault();
        if (connected) {
          onClose();
          return;
        }
        reconnect.mutate(accountId, { onSuccess: (result) => setQrCodeBase64(result.qrCodeBase64) });
      }}
    >
      <div className={styles.qrWrap}>
        {connected ? (
          <div className={styles.success}>Conectado como {account.numero_exibicao ?? 'número pareado'}.</div>
        ) : qrCodeBase64 ? (
          // eslint-disable-next-line @next/next/no-img-element -- data URI, sem otimização de imagem aplicável
          <img src={qrCodeBase64} alt="QR code para parear o WhatsApp" className={styles.qrImage} />
        ) : (
          <p>Gerando QR code...</p>
        )}
        {!connected && account && <Badge tone={whatsappStatusTone(account.status)}>{whatsappStatusLabel(account.status)}</Badge>}
      </div>
    </CrudModal>
  );
}
