'use client';

import { useId, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { nextRuleId, ordinal, ROTULO_OPERADOR } from '@/features/flows/flow-rules';
import type { FlowRule, FlowRuleOperator } from '@/features/flows/types';
import styles from './condition-rules-editor.module.css';

export type ConditionRulesEditorProps = {
  regras: FlowRule[];
  padraoId: string;
  variaveis: string[];
  blocos: Array<{ id: string; rotulo: string }>;
  operadores: FlowRuleOperator[];
  maximoRegras: number;
  disabled: boolean;
  onRulesChange: (regras: FlowRule[]) => void;
  onPadraoChange: (padraoId: string) => void;
};

export function ConditionRulesEditor({
  regras,
  padraoId,
  variaveis,
  blocos,
  operadores,
  maximoRegras,
  disabled,
  onRulesChange,
  onPadraoChange,
}: ConditionRulesEditorProps) {
  const semVariaveis = variaveis.length === 0;
  const noLimite = regras.length >= maximoRegras;
  const aspasMessageBaseId = useId();
  // Guarda o id da regra que teve aspa removida do valor, para mostrar a
  // mensagem inline só naquele campo até o usuário digitar algo sem aspas.
  const [regrasComAspaRemovida, setRegrasComAspaRemovida] = useState<Set<string>>(new Set());

  function adicionar() {
    const rule: FlowRule = {
      id: nextRuleId(regras),
      // Com uma única variável disponível, escolher por ele evita um passo óbvio.
      variavel: variaveis.length === 1 ? variaveis[0] : '',
      operador: '==',
      valor: '',
      destinoId: '',
    };
    onRulesChange([...regras, rule]);
  }

  function atualizar(index: number, patch: Partial<FlowRule>) {
    onRulesChange(regras.map((rule, position) => (position === index ? { ...rule, ...patch } : rule)));
  }

  function remover(index: number) {
    const removida = regras[index];
    onRulesChange(regras.filter((_, position) => position !== index));
    setRegrasComAspaRemovida((current) => {
      if (!current.has(removida.id)) return current;
      const next = new Set(current);
      next.delete(removida.id);
      return next;
    });
  }

  /**
   * O formato do backend é `variavel operador "valor"`: uma aspa dentro do
   * valor quebraria a expressão. O caractere é removido antes de entrar no
   * estado, mas a remoção fica sinalizada por texto — nunca só apagada em
   * silêncio — até o usuário digitar algo sem aspas.
   */
  function atualizarValor(index: number, ruleId: string, valorDigitado: string) {
    const temAspas = /["']/.test(valorDigitado);
    atualizar(index, { valor: valorDigitado.replace(/["']/g, '') });
    setRegrasComAspaRemovida((current) => {
      const jaMarcada = current.has(ruleId);
      if (temAspas === jaMarcada) return current;
      const next = new Set(current);
      if (temAspas) next.add(ruleId);
      else next.delete(ruleId);
      return next;
    });
  }

  function mover(index: number, destino: number) {
    if (destino < 0 || destino >= regras.length) return;
    const reordenadas = [...regras];
    const [rule] = reordenadas.splice(index, 1);
    reordenadas.splice(destino, 0, rule);
    onRulesChange(reordenadas);
  }

  return (
    <div className={styles.builder}>
      <div className={styles.header}>
        <span id="titulo-regras">Regras</span>
        <Button
          variant="secondary"
          size="sm"
          onClick={adicionar}
          disabled={disabled || semVariaveis || noLimite}
          icon={<Plus size={15} />}
        >
          Adicionar regra
        </Button>
      </div>
      <p className={styles.hint}>As regras são avaliadas de cima para baixo. A primeira verdadeira decide o caminho.</p>
      {semVariaveis && (
        <div className={styles.empty}>
          <strong>Nenhuma variável disponível</strong>
          <p>Adicione um bloco “Capturar resposta” antes desta condição para poder comparar a resposta do cliente.</p>
        </div>
      )}
      {noLimite && <p className={styles.limit}>Limite de {maximoRegras} regras atingido.</p>}
      <ol className={styles.rules} aria-labelledby="titulo-regras">
        {regras.map((rule, index) => (
          <li key={rule.id} className={styles.rule}>
            <div className={styles.ruleHeader}>
              <span className={styles.position}>{ordinal(index)}</span>
              <div className={styles.ruleActions}>
                <button
                  type="button"
                  onClick={() => mover(index, index - 1)}
                  disabled={disabled || index === 0}
                  aria-label={`Mover a ${ordinal(index)} regra para cima`}
                >
                  <ArrowUp size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => mover(index, index + 1)}
                  disabled={disabled || index === regras.length - 1}
                  aria-label={`Mover a ${ordinal(index)} regra para baixo`}
                >
                  <ArrowDown size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => remover(index)}
                  disabled={disabled}
                  aria-label={`Remover a ${ordinal(index)} regra`}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
            <label>
              <span>Se a variável</span>
              <select
                value={rule.variavel}
                onChange={(event) => atualizar(index, { variavel: event.target.value })}
                disabled={disabled}
              >
                <option value="">Selecione uma variável</option>
                {variaveis.map((nome) => (
                  <option key={nome} value={nome}>
                    {nome}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Comparação</span>
              <select
                value={rule.operador}
                onChange={(event) => atualizar(index, { operador: event.target.value as FlowRuleOperator })}
                disabled={disabled}
              >
                {operadores.map((operador) => (
                  <option key={operador} value={operador}>
                    {ROTULO_OPERADOR[operador]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Valor</span>
              <input
                value={rule.valor}
                onChange={(event) => atualizarValor(index, rule.id, event.target.value)}
                disabled={disabled}
                placeholder="Ex.: 1"
                aria-describedby={regrasComAspaRemovida.has(rule.id) ? `${aspasMessageBaseId}-${rule.id}` : undefined}
              />
              {regrasComAspaRemovida.has(rule.id) && (
                <p id={`${aspasMessageBaseId}-${rule.id}`} className={styles.valueWarning}>
                  Aspas não são aceitas no valor.
                </p>
              )}
            </label>
            <label>
              <span>Então vá para</span>
              <select
                value={rule.destinoId}
                onChange={(event) => atualizar(index, { destinoId: event.target.value })}
                disabled={disabled}
              >
                <option value="">Selecione um bloco</option>
                {blocos.map((bloco) => (
                  <option key={bloco.id} value={bloco.id}>
                    {bloco.rotulo}
                  </option>
                ))}
              </select>
            </label>
          </li>
        ))}
      </ol>
      <label className={styles.fallback}>
        <span>Se nenhuma regra for verdadeira, vá para</span>
        <select value={padraoId} onChange={(event) => onPadraoChange(event.target.value)} disabled={disabled}>
          <option value="">Selecione um bloco</option>
          {blocos.map((bloco) => (
            <option key={bloco.id} value={bloco.id}>
              {bloco.rotulo}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
