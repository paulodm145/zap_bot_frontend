# ZapBot — Frontend

Painel web (Next.js/App Router) da plataforma SaaS multi-tenant de automação
de atendimento no WhatsApp: editor visual de fluxos, atendimento humano por
setores e administração de tenants. Consome a API do repositório
[`backend_zap_bot`](../backend_zap_bot) — este projeto não roda sozinho, ele
só exibe e edita dados que vêm de lá.

Documentos de referência:

- [PRD](PRD-whatsapp-flow-builder.md)
- [Arquitetura do frontend](ARQUITETURA-frontend.md)
- [Arquitetura do editor de fluxos](ARQUITETURA-whatsapp-flow-builder.md)
- [Sistema de design](DESIGN_SYSTEM.md)

> **Só quer ver o projeto rodando?** Suba primeiro o backend seguindo o
> [Ambiente local com containers](../backend_zap_bot/README.md#ambiente-local-com-containers)
> do `backend_zap_bot` — ele já sobe Postgres, Redis, a API e cria um tenant
> de demonstração com login pronto. Depois volte aqui e siga a seção
> [Execução](#execução) abaixo com as credenciais criadas lá.

## Requisitos

- Node.js 20 ou superior (mesma exigência do backend);
- npm compatível com a versão instalada do Node.js;
- o backend (`backend_zap_bot`) rodando e acessível — veja o aviso acima.

```bash
node --version
npm --version
```

## Instalação

```bash
npm ci
```

## Configuração

```bash
cp .env.example .env
```

Única variável necessária:

| Variável              | Finalidade                                     | Padrão                          |
| --------------------- | ----------------------------------------------- | -------------------------------- |
| `NEXT_PUBLIC_API_URL` | URL base da API do backend (REST e WebSocket)   | `http://localhost:3000/api/v1`   |

O valor padrão já aponta para o backend rodando via Docker Compose na porta
`3000` (ver [Ambiente local com containers](../backend_zap_bot/README.md#ambiente-local-com-containers)),
então normalmente não é preciso alterar nada — só criar o `.env` a partir do
exemplo mesmo.

## Execução

O backend só aceita requisições de `http://localhost:3001` por padrão
(`ORIGENS_PERMITIDAS`/`FRONTEND_URL` no `.env` dele). Rode o frontend
exatamente nessa porta:

```bash
PORT=3001 npm run dev
```

Abra `http://localhost:3001`. Duas áreas de login:

- `http://localhost:3001/login` — login de tenant. Use o administrador do
  tenant de demonstração criado no backend (por padrão,
  `admin@tenant.local` com a senha definida em `DEMO_TENANT_ADMIN_SENHA`).
- `http://localhost:3001/interno/login` — painel interno de `super_admin`.
  Use o administrador criado com `npm run admin:criar` no backend. Se o
  backend estiver com `TOTP_INTERNO_OBRIGATORIO=false` (recomendado só para
  avaliação local), o login não pede segundo fator.

### Roteiro sugerido de avaliação

1. Entre em `/login` com o administrador do tenant de demonstração.
2. Em **Meus fluxos**, crie um fluxo, publique e simule uma conversa.
3. Em **WhatsApp**, cadastre um número (gera QR code via Evolution API) e
   associe o fluxo publicado como fluxo de entrada.
4. Em **Atendimento**, acompanhe as abas Fila / Minhas / Sem atendimento /
   Encerradas; teste **Reatribuir** (visível para admin/gestor) movendo uma
   conversa para um setor.
5. Em **Setores** e **Usuários**, confira o CRUD administrativo.
6. Em `/interno/login`, entre como `super_admin` e explore a listagem e o
   detalhe de tenants no painel interno.

## Build e produção

```bash
npm run build
npm start
```

## Scripts

Todos os scripts são executados com `npm run <nome>`.

| Script          | Finalidade                                              |
| --------------- | -------------------------------------------------------- |
| `dev`           | Inicia o servidor Next.js em modo desenvolvimento.        |
| `build`         | Gera e valida o build de produção.                        |
| `start`         | Executa o build de produção gerado por `build`.           |
| `lint`          | Roda o ESLint.                                             |
| `typecheck`     | Roda o TypeScript em modo checagem, sem emitir arquivos.   |
| `test`          | Roda a suíte de testes com Vitest.                         |
| `test:coverage` | Roda os testes com relatório de cobertura.                 |

Antes de abrir um pull request:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Estrutura

```text
src/
  app/            rotas do App Router
  components/     componentes de UI e de feature (ui/, tenant/, fluxo/, superadmin/, layout/)
  hooks/          hooks de dados (TanStack Query) e de sessão
  features/       tipos e lógica de domínio por área (tenant, flows, superadmin)
  lib/            cliente HTTP, autenticação, tempo real (Socket.IO)
```

## Estado atual

Painel funcional cobrindo autenticação (tenant e painel interno), editor de
fluxos, contas WhatsApp, atendimento em tempo real, setores e usuários. Consulte
[`docs/`](docs/) para o detalhamento por funcionalidade e o progresso registrado
nos arquivos `TAREFAS-*.md`.
