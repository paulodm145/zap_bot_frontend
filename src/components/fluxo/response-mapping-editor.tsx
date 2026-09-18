'use client';

import { useId, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { nextMappingId, PADRAO_CAMINHO, PADRAO_VARIAVEL } from '@/features/flows/flow-mappings';
import type { FlowResponseMapping } from '@/features/flows/types';
// Reaproveita o CSS do construtor de regras de condição: mesmo formato de
// cartão, campo e botão de ação, só que sem operador nem destino.
import styles from './condition-rules-editor.module.css';

export type ResponseMappingEditorProps = {
  mapeamentos: FlowResponseMapping[];
  maximoItens: number;
  disabled: boolean;
  onChange: (mapeamentos: FlowResponseMapping[]) => void;
};

export function ResponseMappingEditor({ mapeamentos, maximoItens, disabled, onChange }: ResponseMappingEditorProps) {
  const noLimite = mapeamentos.length >= maximoItens;
  const avisoBaseId = useId();
  // Chave do item que tem um formato inválido, só pra mostrar o aviso ali —
  // sem bloquear a digitação, igual ao construtor de regras de condição.
  const [comAviso, setComAviso] = useState<Set<string>>(new Set());

  function adicionar() {
    onChange([...mapeamentos, { id: nextMappingId(mapeamentos), variavel: '', caminho: '' }]);
  }

  function atualizar(index: number, patch: Partial<FlowResponseMapping>) {
    onChange(mapeamentos.map((mapping, position) => (position === index ? { ...mapping, ...patch } : mapping)));
  }

  function remover(index: number) {
    const removido = mapeamentos[index];
    onChange(mapeamentos.filter((_, position) => position !== index));
    setComAviso((current) => {
      if (!removido || !current.has(removido.id)) return current;
      const next = new Set(current);
      next.delete(removido.id);
      return next;
    });
  }

  function marcarAviso(id: string, invalido: boolean) {
    setComAviso((current) => {
      const jaMarcado = current.has(id);
      if (invalido === jaMarcado) return current;
      const next = new Set(current);
      if (invalido) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  return (
    <div className={styles.builder}>
      <div className={styles.header}>
        <span id="titulo-mapeamentos">Campos da resposta</span>
        <Button
          variant="secondary"
          size="sm"
          onClick={adicionar}
          disabled={disabled || noLimite}
          icon={<Plus size={15} />}
        >
          Adicionar campo
        </Button>
      </div>
      <p className={styles.hint}>
        Cada linha guarda um valor da resposta numa variável, pra usar em blocos depois deste.
      </p>
      {mapeamentos.length === 0 && (
        <div className={styles.empty}>
          <strong>Nenhum campo mapeado</strong>
          <p>Sem isso, o bloco só segue por sucesso ou falha, sem guardar nada da resposta.</p>
        </div>
      )}
      {noLimite && <p className={styles.limit}>Limite de {maximoItens} campos atingido.</p>}
      <ol className={styles.rules} aria-labelledby="titulo-mapeamentos">
        {mapeamentos.map((mapping, index) => {
          const variavelInvalida = mapping.variavel !== '' && !PADRAO_VARIAVEL.test(mapping.variavel);
          const caminhoInvalido = mapping.caminho !== '' && !PADRAO_CAMINHO.test(mapping.caminho);
          return (
            <li key={mapping.id} className={styles.rule}>
              <div className={styles.ruleHeader}>
                <span className={styles.position}>{index + 1}</span>
                <div className={styles.ruleActions}>
                  <button
                    type="button"
                    onClick={() => remover(index)}
                    disabled={disabled}
                    aria-label={`Remover o campo ${String(index + 1)}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <label>
                <span>Guardar em</span>
                <input
                  value={mapping.variavel}
                  onChange={(event) => {
                    atualizar(index, { variavel: event.target.value });
                    marcarAviso(mapping.id, event.target.value !== '' && !PADRAO_VARIAVEL.test(event.target.value));
                  }}
                  disabled={disabled}
                  placeholder="Ex.: pedido.status"
                  aria-describedby={
                    comAviso.has(mapping.id) && variavelInvalida ? `${avisoBaseId}-${mapping.id}-var` : undefined
                  }
                />
              </label>
              {comAviso.has(mapping.id) && variavelInvalida && (
                <p id={`${avisoBaseId}-${mapping.id}-var`} className={styles.valueWarning}>
                  Use letras, números, ponto ou sublinhado, começando com letra ou sublinhado.
                </p>
              )}
              <label>
                <span>Caminho na resposta</span>
                <input
                  value={mapping.caminho}
                  onChange={(event) => {
                    atualizar(index, { caminho: event.target.value });
                    marcarAviso(mapping.id, event.target.value !== '' && !PADRAO_CAMINHO.test(event.target.value));
                  }}
                  disabled={disabled}
                  placeholder="Ex.: $.dados.status"
                />
              </label>
              {comAviso.has(mapping.id) && caminhoInvalido && (
                <p className={styles.valueWarning}>
                  Comece com $. e use chaves ou índices, como $.dados.itens[0].status.
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
