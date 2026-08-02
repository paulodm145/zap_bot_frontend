'use client';

import { useId, type CSSProperties, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Inbox } from 'lucide-react';
import styles from './data-table.module.css';

export type DataTableColor = 'green' | 'blue' | 'neutral';
export type SortDirection = 'asc' | 'desc';

export type DataTableColumn<T> = {
  id: string;
  header: ReactNode;
  accessor?: keyof T;
  render?: (row: T) => ReactNode;
  width?: number | string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  hideOnMobile?: boolean;
};

export type DataTablePagination = {
  page: number;
  pageSize: number;
  total: number;
};

export type DataTableSort = {
  columnId: string;
  direction: SortDirection;
};

export type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  data: T[];
  getRowId: (row: T) => string | number;
  title?: string;
  description?: string;
  toolbar?: ReactNode;
  color?: DataTableColor;
  pagination: DataTablePagination;
  onPaginationChange: (pagination: Pick<DataTablePagination, 'page' | 'pageSize'>) => void;
  pageSizeOptions?: number[];
  sort?: DataTableSort;
  onSortChange?: (sort: DataTableSort) => void;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  rowActions?: (row: T) => ReactNode;
  actionsHeader?: string;
  className?: string;
};

function getPages(current: number, total: number) {
  const pages = new Set([1, total, current - 1, current, current + 1]);
  return [...pages].filter((page) => page > 0 && page <= total).sort((a, b) => a - b);
}

export function DataTable<T>({
  columns,
  data,
  getRowId,
  title,
  description,
  toolbar,
  color = 'green',
  pagination,
  onPaginationChange,
  pageSizeOptions = [10, 20, 50, 100],
  sort,
  onSortChange,
  loading = false,
  emptyTitle = 'Nenhum registro encontrado',
  emptyDescription = 'Os registros aparecerão aqui quando estiverem disponíveis.',
  rowActions,
  actionsHeader = 'Ações',
  className = '',
}: DataTableProps<T>) {
  const pageSizeId = useId();
  const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.pageSize));
  const safePage = Math.min(Math.max(1, pagination.page), totalPages);
  const firstItem = pagination.total === 0 ? 0 : (safePage - 1) * pagination.pageSize + 1;
  const lastItem = Math.min(safePage * pagination.pageSize, pagination.total);
  const pages = getPages(safePage, totalPages);

  function changePage(page: number) {
    if (page !== safePage && page >= 1 && page <= totalPages) {
      onPaginationChange({ page, pageSize: pagination.pageSize });
    }
  }

  function changeSort(column: DataTableColumn<T>) {
    if (!column.sortable || !onSortChange) return;
    const direction = sort?.columnId === column.id && sort.direction === 'asc' ? 'desc' : 'asc';
    onSortChange({ columnId: column.id, direction });
  }

  return (
    <section className={`${styles.root} ${styles[color]} ${className}`} aria-busy={loading}>
      {(title || description || toolbar) && <header className={styles.toolbar}>
        <div className={styles.heading}>{title && <h2>{title}</h2>}{description && <p>{description}</p>}</div>
        {toolbar && <div className={styles.toolbarActions}>{toolbar}</div>}
      </header>}

      <div className={styles.scroller}>
        <table>
          <thead><tr>{columns.map((column) => {
            const activeSort = sort?.columnId === column.id;
            const SortIcon = activeSort ? (sort.direction === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
            const style = { '--column-width': typeof column.width === 'number' ? `${column.width}px` : column.width } as CSSProperties;
            return <th key={column.id} className={`${styles[column.align ?? 'left']} ${column.hideOnMobile ? styles.hideOnMobile : ''}`} style={style} aria-sort={activeSort ? (sort.direction === 'asc' ? 'ascending' : 'descending') : undefined}>
              {column.sortable ? <button type="button" onClick={() => changeSort(column)}>{column.header}<SortIcon size={13} /></button> : column.header}
            </th>;
          })}{rowActions && <th className={styles.actionsColumn}>{actionsHeader}</th>}</tr></thead>
          <tbody>
            {loading ? Array.from({ length: Math.min(pagination.pageSize, 6) }, (_, rowIndex) => <tr key={`skeleton-${rowIndex}`} className={styles.skeletonRow}>{columns.map((column) => <td key={column.id}><span /></td>)}{rowActions && <td><span /></td>}</tr>) : data.map((row) => <tr key={getRowId(row)}>{columns.map((column) => <td key={column.id} className={`${styles[column.align ?? 'left']} ${column.hideOnMobile ? styles.hideOnMobile : ''}`}>{column.render ? column.render(row) : column.accessor ? String(row[column.accessor] ?? '') : null}</td>)}{rowActions && <td className={styles.rowActions}>{rowActions(row)}</td>}</tr>)}
          </tbody>
        </table>
        {!loading && data.length === 0 && <div className={styles.empty}><span><Inbox size={24} /></span><strong>{emptyTitle}</strong><p>{emptyDescription}</p></div>}
      </div>

      <footer className={styles.footer}>
        <div className={styles.resultCount}>Exibindo <strong>{firstItem}–{lastItem}</strong> de <strong>{pagination.total}</strong></div>
        <div className={styles.pageSize}><label htmlFor={pageSizeId}>Itens por página</label><select id={pageSizeId} value={pagination.pageSize} onChange={(event) => onPaginationChange({ page: 1, pageSize: Number(event.target.value) })}>{pageSizeOptions.map((size) => <option key={size} value={size}>{size}</option>)}</select></div>
        <nav className={styles.pagination} aria-label="Paginação da tabela">
          <button type="button" onClick={() => changePage(1)} disabled={safePage === 1} aria-label="Primeira página"><ChevronsLeft size={16} /></button>
          <button type="button" onClick={() => changePage(safePage - 1)} disabled={safePage === 1} aria-label="Página anterior"><ChevronLeft size={16} /></button>
          {pages.map((page, index) => <span key={page} className={styles.pageSlot}>{index > 0 && page - pages[index - 1] > 1 && <i>…</i>}<button type="button" className={page === safePage ? styles.current : ''} onClick={() => changePage(page)} aria-current={page === safePage ? 'page' : undefined}>{page}</button></span>)}
          <button type="button" onClick={() => changePage(safePage + 1)} disabled={safePage === totalPages} aria-label="Próxima página"><ChevronRight size={16} /></button>
          <button type="button" onClick={() => changePage(totalPages)} disabled={safePage === totalPages} aria-label="Última página"><ChevronsRight size={16} /></button>
        </nav>
      </footer>
    </section>
  );
}
