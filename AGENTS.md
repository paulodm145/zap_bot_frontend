# Repository Guidelines

## Project Structure & Module Organization

This repository currently contains planning documents: `PRD-whatsapp-flow-builder.md` defines product scope, while `ARQUITETURA-frontend.md` and `ARQUITETURA-whatsapp-flow-builder.md` record technical decisions. Keep these documents aligned when requirements change.

The planned Next.js App Router application belongs under `src/`: routes in `src/app/`, reusable primitives in `src/components/ui/`, feature components in `src/components/fluxo/` and `src/components/atendimento/`, hooks in `src/hooks/`, Zustand stores in `src/stores/`, Zod schemas in `src/schemas/`, and API/WebSocket code in `src/services/`. Place static assets in `public/`. Keep tests beside the code as `*.test.ts(x)` or in a top-level `tests/` directory for cross-feature and end-to-end scenarios.

## Build, Test, and Development Commands

No executable application or `package.json` exists yet. When scaffolding is added, expose standard npm scripts and document them here. Expected commands are:

- `npm run dev` — start the local Next.js development server.
- `npm run build` — create and validate the production build.
- `npm test` — run the Vitest suite.
- `npm run lint` — run the configured static checks.
- `npm run gerar-client-api` — regenerate the typed client from the backend OpenAPI contract; do not edit generated files manually.

## Coding Style & Naming Conventions

Use strict TypeScript and do not introduce `any`. Prefer two-space indentation. Name React components in PascalCase, hooks with a `use` prefix, and source files in kebab-case (for example, `use-editor-de-fluxo.ts`). Keep server state in TanStack Query and UI-only state in Zustand; never duplicate API data in a store. UI primitives must receive data through props and must not call APIs. Use Tailwind tokens instead of scattered magic values.

## Testing Guidelines

Use Vitest and Testing Library for component interactions and hook behavior. Mock network boundaries, not implementation details. Prioritize editor transformations, autosave, authentication refresh, and real-time cache updates. Add Playwright coverage later for the critical login-to-published-flow journey. No coverage threshold is established yet; new behavior should include focused regression tests.

## Commit & Pull Request Guidelines

The repository has no commit history from which to infer a convention. Use short, imperative subjects, optionally with Conventional Commit prefixes such as `feat:`, `fix:`, or `docs:`. Pull requests should explain scope and validation, link relevant issues, note architecture changes, and include screenshots or recordings for visible UI changes. Never commit `.env` files, access tokens, tenant credentials, or generated secrets.
