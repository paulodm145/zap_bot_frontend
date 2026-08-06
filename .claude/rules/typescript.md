# TypeScript e qualidade

- Mantenha `strict` ativo. Não desabilite checagens para fazer código passar.
- Não use `any`; use `unknown` com narrowing, ou tipos derivados do domínio.
- Tipos de domínio ficam em `src/features/<área>/types.ts`; tipos de transporte
  da API ficam em `src/lib/api/types.ts`.
- Prefira `const`, imutabilidade e funções pequenas com uma responsabilidade.
- Use `type` para modelos de dados e evite `interface` sem necessidade de merge.
- Use pt-BR nos nomes de domínio que espelham o backend (`nome`, `descricao`,
  `busca`, `dados`) e mantenha o restante do código em inglês, como já está.
- Escreva código formatado e legível: uma instrução por linha, espaço após
  vírgulas e ao redor de operadores, corpo de função quebrado em linhas.
- Não existe Prettier instalado nem script de formatação. O `src/` foi
  normalizado uma vez com Prettier 3.9.6 e este é o estilo a manter:

  ```bash
  npx prettier@3.9.6 --single-quote --trailing-comma all --print-width 120 --write <arquivos>
  ```

- Formate apenas os arquivos da sua alteração; não reformate arquivos alheios,
  para não misturar estilo com mudança de comportamento.
- Antes de concluir, rode `npm run lint`, `npm run typecheck` e `npm test`.
