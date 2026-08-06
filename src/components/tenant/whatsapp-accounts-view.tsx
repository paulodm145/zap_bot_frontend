'use client';

import { useMemo, useState } from 'react';
import { MessageCircle, Plus, Search } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { useDebouncedValue } from '@/hooks/common/use-debounced-value';
import { useFlows } from '@/hooks/flows/use-flows';
import {
  useCreateWhatsApp,
  useTestWhatsApp,
  useWhatsAppAccounts,
  useWhatsAppStatus,
  type WhatsAppAccount,
} from '@/hooks/tenant/use-whatsapp-accounts';
import { isApiError } from '@/lib/api/api-error';
import { CrudModal } from './crud-modal';
import styles from './tenant.module.css';

export function WhatsAppAccountsView() {
  const [search, setSearch] = useState('');
  const [skip, setSkip] = useState(0);
  const [take, setTake] = useState(20);
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState('');
  const [phone, setPhone] = useState('');
  const [waba, setWaba] = useState('');
  const [display, setDisplay] = useState('');
  const [version, setVersion] = useState('v23.0');
  const [token, setToken] = useState('');
  const [entryFlow, setEntryFlow] = useState('');
  const list = useWhatsAppAccounts(useDebouncedValue(search), skip, take);
  const publishedFlows = useFlows({ skip: 0, take: 100, status: 'PUBLICADO' });
  const create = useCreateWhatsApp();
  const test = useTestWhatsApp();
  const status = useWhatsAppStatus();
  const columns = useMemo<DataTableColumn<WhatsAppAccount>[]>(
    () => [
      {
        id: 'name',
        header: 'Conta',
        width: '29%',
        render: (account) => (
          <div className={styles.entity}>
            <span>
              <MessageCircle size={16} />
            </span>
            <div>
              <strong>{account.nome}</strong>
              <small>{account.numero_exibicao ?? account.phone_number_id}</small>
            </div>
          </div>
        ),
      },
      { id: 'phone', header: 'Phone Number ID', width: '22%', render: (account) => account.phone_number_id },
      {
        id: 'flow',
        header: 'Fluxo de entrada',
        width: '20%',
        render: (account) => account.fluxo_entrada?.nome ?? 'Sem automação',
      },
      {
        id: 'validation',
        header: 'Validação',
        width: '16%',
        render: (account) => (
          <Badge
            tone={account.status === 'VALIDADA' ? 'success' : account.status === 'INVALIDA' ? 'neutral' : 'warning'}
          >
            {account.status}
          </Badge>
        ),
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
  const error = list.error ?? test.error ?? status.error;

  function closeModal() {
    setToken('');
    setEntryFlow('');
    setOpen(false);
  }

  return (
    <AppShell
      title="Contas WhatsApp"
      subtitle="Números conectados à Cloud API."
      actions={
        <Button icon={<Plus size={17} />} onClick={() => setOpen(true)}>
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
        emptyDescription="Conecte um número da WhatsApp Cloud API para começar."
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
            <Button variant="ghost" onClick={() => test.mutate(account.public_id)}>
              Testar
            </Button>
            <Button variant="ghost" onClick={() => status.mutate({ id: account.public_id, ativo: !account.ativo })}>
              {account.ativo ? 'Desativar' : 'Ativar'}
            </Button>
          </>
        )}
      />
      {open && (
        <CrudModal
          title="Conectar número"
          subtitle="Informe os dados fornecidos no painel da Meta."
          submitLabel="Conectar conta"
          pending={create.isPending}
          error={create.error ? (isApiError(create.error) ? create.error.message : 'Falha ao conectar.') : null}
          onClose={closeModal}
          onSubmit={(event) => {
            event.preventDefault();
            create.mutate(
              {
                nome,
                phoneNumberId: phone,
                wabaId: waba,
                numeroExibicao: display,
                versaoGraphApi: version,
                accessToken: token,
                fluxoEntradaPublicId: entryFlow || undefined,
              },
              { onSuccess: closeModal },
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
            <label>
              <span>Phone Number ID</span>
              <input value={phone} onChange={(event) => setPhone(event.target.value)} required />
            </label>
            <label>
              <span>WABA ID</span>
              <input value={waba} onChange={(event) => setWaba(event.target.value)} required />
            </label>
            <label>
              <span>Número de exibição</span>
              <input value={display} onChange={(event) => setDisplay(event.target.value)} />
            </label>
            <label>
              <span>Versão Graph API</span>
              <input value={version} onChange={(event) => setVersion(event.target.value)} required />
            </label>
            <label className={styles.wide}>
              <span>Fluxo de entrada</span>
              <select value={entryFlow} onChange={(event) => setEntryFlow(event.target.value)}>
                <option value="">Somente registrar mensagens</option>
                {publishedFlows.data?.dados.map((flow) => (
                  <option key={flow.public_id} value={flow.public_id}>
                    {flow.nome} (v{flow.versao})
                  </option>
                ))}
              </select>
              <small>Somente fluxos publicados podem iniciar a automação.</small>
            </label>
            <label className={styles.wide}>
              <span>Access token</span>
              <input
                type="password"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                required
                autoComplete="off"
              />
              <small>O token não será exibido novamente.</small>
            </label>
          </div>
        </CrudModal>
      )}
    </AppShell>
  );
}
