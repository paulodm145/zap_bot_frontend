# Estilos e design system

- Estilos ficam em CSS Modules ao lado do componente (`componente.module.css`).
  Não use estilo inline para o que é regra visual nem introduza Tailwind.
- Use os tokens de `src/app/globals.css`: `--green-*`, `--ink`, `--muted`,
  `--line`, `--surface`, `--canvas`, `--warning`, `--danger`, `--radius-*` e
  `--shadow-*`. Não escreva cores, raios ou sombras literais.
- Token novo se justifica quando o valor se repete; caso contrário, componha a
  partir dos existentes.
- `DESIGN_SYSTEM.md` é a referência de direção visual, variantes de `Button`,
  uso de `Badge`, `DataTable` e padrões de tela. Mantenha-o coerente ao mudar um
  primitivo.
- Uma ação primária por contexto, com verbo objetivo.
- Acessibilidade é requisito, não acabamento: contraste mínimo WCAG AA, foco
  visível, `aria-label` em controles apenas iconográficos, label associado em
  todo campo, alvo de toque em torno de 40 px.
- Nunca comunique estado apenas por cor.
- Respeite `prefers-reduced-motion`; o bloqueio global já está em `globals.css`
  e animações novas não devem contorná-lo.
- Telas autenticadas usam `AppShell`; o editor de fluxos é experiência própria
  em tela cheia.
