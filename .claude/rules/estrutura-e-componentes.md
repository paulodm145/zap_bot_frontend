# Estrutura e componentes

- Arquivos em kebab-case, componentes React em PascalCase, hooks com prefixo
  `use`.
- `src/components/ui/` contém primitivos do design system: recebem tudo por
  props, não chamam API, não leem sessão e não conhecem rotas.
- Componentes de feature ficam em `src/components/<área>/` e podem usar hooks de
  dados. `tenant/` e `superadmin/` são áreas separadas e não compartilham
  componentes com regra de negócio.
- `src/app/` contém apenas rotas: cada `page.tsx` monta o componente de feature
  correspondente e não concentra lógica.
- Marque `'use client'` somente onde há interatividade, estado ou efeito.
- Lógica pura e transformações de domínio vão para `src/features/`, onde podem
  ser testadas sem React — como já ocorre em `src/features/flows/flow-graph.ts`.
- Um arquivo que cresce demais é sinal de responsabilidade acumulada: extraia
  antes de continuar somando.
- Ao criar um componente novo, verifique primeiro se um primitivo em
  `src/components/ui/` já resolve.
