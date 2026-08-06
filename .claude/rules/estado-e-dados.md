# Estado e dados

- Todo dado vindo do backend é estado de servidor e pertence ao TanStack Query.
  Nunca copie resposta de API para estado local ou store.
- Estado local (`useState`) cobre apenas interface: campos de formulário,
  modais abertos, seleção, filtros ainda não aplicados.
- Cada área de hooks exporta suas query keys em um objeto (`sectorKeys`,
  `flowKeys`) e as mutations invalidam por essa chave. Não escreva chaves
  literais espalhadas pelos componentes.
- Hooks de dados ficam em `src/hooks/<área>/` e são a única fronteira entre
  componentes e `apiRequest`. Componentes não chamam `fetch` nem `apiRequest`
  diretamente.
- Repasse o `signal` do TanStack Query para `apiRequest` em queries, para que a
  requisição seja cancelada junto.
- A sessão do tenant vive em `src/lib/auth/session-store.ts`, um store manual
  consumido via `useSyncExternalStore`. A sessão interna tem o equivalente em
  `src/lib/internal-auth/`. São os únicos stores do projeto; não introduza uma
  biblioteca de estado global sem necessidade concreta.
- Atualizações em tempo real chegam pelo Socket.IO em `src/lib/realtime/` e
  devem invalidar ou atualizar o cache do Query, nunca um estado paralelo.
