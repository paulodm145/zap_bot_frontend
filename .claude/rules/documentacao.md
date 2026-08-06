# Documentação

- `docs/` é espelho literal de `docs/` do repositório `backend_zap_bot`. Trate
  como referência somente leitura: não edite ali para descrever comportamento
  deste frontend.
- Vários arquivos de `docs/` têm escopo exclusivo de backend
  (`DIAGNOSTICO-INICIAL.md`, `CONTRIBUICAO.md`, `revisao-qa.md`,
  `ARQUITETURA-BACKEND.md`). Não os use para concluir nada sobre este
  repositório.
- Para consumir um endpoint, comece por `docs/api/<funcionalidade>.md` e
  `docs/api/CLIENTE-FRONTEND.md`; para tempo real, `docs/eventos/websocket.md`.
  O OpenAPI do backend é a fonte executável dos schemas.
- Quando o backend mudar contrato, atualize o espelho a partir do repositório de
  origem, não editando o arquivo local isoladamente.
- Documentação própria do frontend fica na raiz: `ARQUITETURA-frontend.md`,
  `ARQUITETURA-whatsapp-flow-builder.md`, `DESIGN_SYSTEM.md`,
  `PRD-whatsapp-flow-builder.md` e `tarefas.md`.
- Ao mudar um primitivo de interface, token ou padrão de tela, atualize
  `DESIGN_SYSTEM.md` no mesmo trabalho.
- Todo script novo em `package.json` deve ser documentado no `CLAUDE.md`, com
  finalidade e exemplo executável.
- Não altere uma decisão registrada silenciosamente: explique o conflito e
  atualize a documentação junto com o código.
