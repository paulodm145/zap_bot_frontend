'use client';

import { useMemo, useState } from 'react';
import { Download, MoreHorizontal, Plus, Search, SlidersHorizontal } from 'lucide-react';
import { Badge } from './badge';
import { Button } from './button';
import { DataTable, type DataTableColumn, type DataTableSort } from './data-table';
import styles from './data-table-example.module.css';

type Contact = {
  id: number;
  name: string;
  phone: string;
  sector: string;
  status: 'Ativo' | 'Aguardando' | 'Encerrado';
  updatedAt: string;
};

const contacts: Contact[] = Array.from({ length: 47 }, (_, index) => ({
  id: index + 1,
  name: ['Ana Beatriz', 'Carlos Mendes', 'Fernanda Lima', 'João Oliveira', 'Mariana Souza'][index % 5],
  phone: `(11) 9${String(8723 + index).padStart(4, '0')}-${String(1200 + index).padStart(4, '0')}`,
  sector: ['Comercial', 'Financeiro', 'Suporte'][index % 3],
  status: ['Ativo', 'Aguardando', 'Encerrado'][index % 3] as Contact['status'],
  updatedAt: `${(index % 23) + 1} min atrás`,
}));

const columns: DataTableColumn<Contact>[] = [
  {
    id: 'name',
    header: 'Contato',
    accessor: 'name',
    sortable: true,
    width: '26%',
    render: (row) => (
      <div className={styles.contact}>
        <span>
          {row.name
            .split(' ')
            .map((part) => part[0])
            .slice(0, 2)
            .join('')}
        </span>
        <div>
          <strong>{row.name}</strong>
          <small>#{String(row.id).padStart(4, '0')}</small>
        </div>
      </div>
    ),
  },
  { id: 'phone', header: 'Telefone', accessor: 'phone', width: '19%', hideOnMobile: true },
  { id: 'sector', header: 'Setor', accessor: 'sector', width: '16%' },
  {
    id: 'status',
    header: 'Status',
    accessor: 'status',
    width: '16%',
    render: (row) => (
      <Badge tone={row.status === 'Ativo' ? 'success' : row.status === 'Aguardando' ? 'warning' : 'neutral'}>
        {row.status}
      </Badge>
    ),
  },
  { id: 'updatedAt', header: 'Última interação', accessor: 'updatedAt', width: '18%', hideOnMobile: true },
];

export function DataTableExample() {
  const [skip, setSkip] = useState(0);
  const [take, setTake] = useState(10);
  const [sort, setSort] = useState<DataTableSort>({ columnId: 'name', direction: 'asc' });
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const filtered = useMemo(
    () => contacts.filter((contact) => contact.name.toLowerCase().includes(query.toLowerCase())),
    [query],
  );
  const pageData = filtered.slice(skip, skip + take);

  function requestPage(next: { skip: number; take: number }) {
    setLoading(true);
    window.setTimeout(() => {
      setSkip(next.skip);
      setTake(next.take);
      setLoading(false);
    }, 350);
  }

  return (
    <DataTable
      title="Contatos"
      description="Demonstração com paginação remota simulada"
      columns={columns}
      data={pageData}
      getRowId={(row) => row.id}
      color="green"
      pagination={{ skip, take, total: filtered.length }}
      onPaginationChange={requestPage}
      sort={sort}
      onSortChange={setSort}
      loading={loading}
      toolbar={
        <>
          <label className={styles.search}>
            <Search size={15} />
            <span className="sr-only">Buscar contato</span>
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setSkip(0);
              }}
              placeholder="Buscar contato..."
            />
          </label>
          <Button variant="ghost" size="sm" icon={<SlidersHorizontal size={15} />}>
            Filtros
          </Button>
          <Button variant="secondary" size="sm" icon={<Download size={15} />}>
            Exportar
          </Button>
          <Button size="sm" icon={<Plus size={15} />}>
            Novo contato
          </Button>
        </>
      }
      rowActions={(row) => (
        <Button variant="ghost" size="icon" aria-label={`Ações de ${row.name}`} icon={<MoreHorizontal size={17} />} />
      )}
    />
  );
}
