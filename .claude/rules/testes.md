# Testes

- Vitest com `environment: 'node'`, configurado em `vitest.config.mts`. Testes
  ficam ao lado do código como `*.test.ts`.
- Não há Testing Library nem jsdom instalados. Testar componente React exige
  adicionar essas dependências e ajustar o ambiente — decisão explícita, não
  efeito colateral de uma tarefa.
- Enquanto isso, mantenha a lógica testável fora do React: `src/features/` para
  transformações de domínio e `src/lib/` para cliente HTTP, erros e sessão.
- Mocke a fronteira de rede (`fetch`), nunca detalhes de implementação interna.
- A cobertura hoje é medida apenas nos arquivos listados em `coverage.include`
  do `vitest.config.mts`. Ao criar um módulo de lógica pura relevante,
  acrescente-o à lista junto com seus testes.
- Não existe limiar de cobertura configurado; comportamento novo deve vir com
  teste de regressão focado.
- Priorize: transformações do editor de fluxos, renovação de token e sessão,
  tratamento de erros da API e atualização de cache em tempo real.
