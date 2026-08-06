# Instruções para Claude Code

@AGENTS.md

Use `AGENTS.md` como manual operacional principal deste repositório.

## Aviso sobre o AGENTS.md

`AGENTS.md` foi escrito quando o repositório ainda continha apenas documentos de
planejamento. Ele descreve o plano original, não o código atual. Onde houver
conflito, o estado real registrado abaixo prevalece.

Divergências conhecidas: o `package.json` existe; não há Zustand, Zod, Tailwind,
`src/services/`, `src/stores/`, `src/schemas/` nem o script
`npm run gerar-client-api`.

Não presuma que exemplos dos documentos já foram implementados: inspecione o
estado real do repositório antes de analisar, planejar ou alterar.

## Estado real do repositório

Frontend Next.js 16 (App Router) da plataforma SaaS multi-tenant de automação de
atendimento no WhatsApp. Consome o backend do repositório irmão
`backend_zap_bot`.

- React 19, TypeScript 6 em modo `strict`, `moduleResolution: bundler`.
- Estilos em CSS Modules com tokens declarados em `src/app/globals.css`.
- Estado de servidor em TanStack Query 5; sessão em store manual próprio.
- `socket.io-client` para chat em tempo real.
- `@xyflow/react` para o editor visual de fluxos.
- `lucide-react` para ícones.
- Vitest 4 com `environment: 'node'`.
- Alias `@/*` para `./src/*`.

## Estrutura

```text
src/app/          rotas do App Router; área do tenant e área interna em /interno
src/components/   ui/ layout/ auth/ tenant/ superadmin/ fluxo/ dashboard/
src/features/     tipos de domínio e lógica pura por área
src/hooks/        auth/ tenant/ flows/ superadmin/ common/
src/lib/          api/ auth/ internal-auth/ realtime/
```

Existem duas sessões independentes: a do tenant (`src/lib/auth/`,
`src/lib/api/api-client.ts`) e a do superadmin interno
(`src/lib/internal-auth/`, `src/lib/api/internal-api-client.ts`). Não misture as
duas.

## Comandos

```bash
npm run dev            # servidor de desenvolvimento
npm run build          # build de produção
npm run start          # servir o build
npm run lint           # ESLint (eslint-config-next)
npm run typecheck      # tsc --noEmit
npm test               # Vitest
npm run test:coverage  # Vitest com cobertura v8
```

Não existem scripts de formatação nem de geração de cliente de API. Ao concluir
uma alteração, rode `npm run lint`, `npm run typecheck` e `npm test`.

Variável de ambiente: `NEXT_PUBLIC_API_URL` (veja `.env.example`).

## Documentação

`docs/` é um espelho literal de `docs/` do repositório `backend_zap_bot`. Trate
como contrato de referência somente leitura: descreve endpoints, eventos e
schemas do backend, e vários arquivos ali têm escopo exclusivamente de backend
(`DIAGNOSTICO-INICIAL.md`, `CONTRIBUICAO.md`, `revisao-qa.md`). Não conclua nada
sobre este repositório a partir deles.

Documentos próprios do frontend, na raiz:

- `PRD-whatsapp-flow-builder.md` — escopo de produto.
- `ARQUITETURA-frontend.md` e `ARQUITETURA-whatsapp-flow-builder.md` — decisões
  técnicas.
- `DESIGN_SYSTEM.md` — tokens, componentes e padrões de interface.
- `tarefas.md` — checklist da fundação visual.

## Regras por área

As regras em `.claude/rules/` complementam estas instruções e valem para todo
trabalho neste repositório.

Ao finalizar uma alteração, resuma os arquivos modificados, os comandos
executados e as pendências ou riscos conhecidos.
