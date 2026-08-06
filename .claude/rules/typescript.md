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
  vírgulas e ao redor de operadores, corpo de função quebrado em linhas. Parte
  do código legado está comprimida em linhas únicas; não replique esse estilo e
  não reformate arquivos alheios à sua alteração.
- Não existe Prettier configurado. A formatação é responsabilidade de quem
  escreve.
- Antes de concluir, rode `npm run lint`, `npm run typecheck` e `npm test`.
