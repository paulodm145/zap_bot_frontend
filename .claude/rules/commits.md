# Commits semânticos

- Use Conventional Commits:
  `<tipo>(<escopo-opcional>): <descrição curta no imperativo>`.
- Tipos usuais: `feat`, `fix`, `refactor`, `docs`, `test`, `build`, `ci`,
  `chore`, `perf`, `style` e `revert`.
- O escopo espelha a área tocada: `auth`, `tenant`, `flows`, `superadmin`, `ui`,
  `api`.
- Use `!` e rodapé `BREAKING CHANGE:` para mudanças incompatíveis.
- Um commit representa uma unidade lógica e não mistura mudanças não
  relacionadas.
- Evite mensagens vagas como `ajustes`, `alterações` e `wip`.
- Exemplo: `feat(users): adiciona edição e alternância de status`.
