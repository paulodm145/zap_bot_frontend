'use client';

import { useMemo, useState } from 'react';
import { MessageCircle, Plus, Power, PowerOff, QrCode, Search, Trash2, Unplug } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { useDebouncedValue } from '@/hooks/common/use-debounced-value';
import { useFlows } from '@/hooks/flows/use-flows';
import {
  useCreateWhatsApp,
  useDeleteWhatsApp,
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
  const [fluxoPublicoId, setFluxoPublicoId] = useState('');
  const [qrAccount, setQrAccount] = useState<{ id: string; qrCodeBase64?: string } | null>(null);
  const [disconnecting, setDisconnecting] = useState<WhatsAppAccount | undefined>(undefined);
  const [deleting, setDeleting] = useState<WhatsAppAccount | undefined>(undefined);
  const list = useWhatsAppAccounts(useDebouncedValue(search), skip, take);
  const publishedFlows = useFlows({ skip: 0, take: 100, status: 'PUBLICADO' });
  const create = useCreateWhatsApp();
  const reconnect = useReconnectWhatsApp();
  const disconnect = useDisconnectWhatsApp();
  const deleteAccount = useDeleteWhatsApp();
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
              <small>{account.fluxo ? `Fluxo: ${account.fluxo.nome}` : 'Sem fluxo de entrada'}</small>
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
    setFluxoPublicoId('');
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
              size="icon"
              icon={<QrCode size={16} />}
              disabled={reconnect.isPending}
              title={account.status === 'CONECTADO' ? 'Gerar novo QR code' : 'Reconectar'}
              aria-label={
                account.status === 'CONECTADO' ? `Gerar novo QR code para ${account.nome}` : `Reconectar ${account.nome}`
              }
              onClick={() => reconnect.mutate(account.public_id, { onSuccess: openQrModal })}
            />
            <Button
              variant="ghost"
              size="icon"
              icon={account.ativo ? <PowerOff size={16} /> : <Power size={16} />}
              title={account.ativo ? 'Desativar' : 'Ativar'}
              aria-label={`${account.ativo ? 'Desativar' : 'Ativar'} ${account.nome}`}
              onClick={() => status.mutate({ id: account.public_id, ativo: !account.ativo })}
            />
            <Button
              variant="ghost"
              size="icon"
              icon={<Unplug size={16} />}
              title="Desconectar"
              aria-label={`Desconectar ${account.nome}`}
              onClick={() => setDisconnecting(account)}
            />
            <Button
              variant="ghost"
              size="icon"
              icon={<Trash2 size={16} />}
              title="Excluir"
              aria-label={`Excluir ${account.nome}`}
              onClick={() => setDeleting(account)}
            />
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
              { nome, ...(fluxoPublicoId ? { fluxoPublicoId } : {}) },
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
            <label className={styles.wide}>
              <span>Fluxo de entrada (opcional)</span>
              <select value={fluxoPublicoId} onChange={(event) => setFluxoPublicoId(event.target.value)}>
                <option value="">Nenhum — mensagens aguardam atribuição manual</option>
                {publishedFlows.data?.dados.map((flow) => (
                  <option key={flow.public_id} value={flow.public_id}>
                    {flow.nome}
                  </option>
                ))}
              </select>
              <small>É o fluxo publicado que responde automaticamente às mensagens recebidas neste número.</small>
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
          confirmLabel="Desconectar"
          pending={disconnect.isPending}
          error={disconnect.error ? (isApiError(disconnect.error) ? disconnect.error.message : 'Falha ao desconectar.') : null}
          onCancel={() => setDisconnecting(undefined)}
          onConfirm={() => disconnect.mutate(disconnecting.public_id, { onSuccess: () => setDisconnecting(undefined) })}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title={`Excluir ${deleting.nome}?`}
          description="A conta e o número pareado são removidos definitivamente — não é possível desfazer. Para usar este número de novo, será preciso cadastrá-lo e parear do zero. Conversas e mensagens já trocadas continuam no histórico."
          confirmLabel="Excluir definitivamente"
          pending={deleteAccount.isPending}
          error={
            deleteAccount.error ? (isApiError(deleteAccount.error) ? deleteAccount.error.message : 'Falha ao excluir.') : null
          }
          onCancel={() => setDeleting(undefined)}
          onConfirm={() => deleteAccount.mutate(deleting.public_id, { onSuccess: () => setDeleting(undefined) })}
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
