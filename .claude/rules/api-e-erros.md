# API e erros

- Toda chamada ao backend do tenant passa por `apiRequest` em
  `src/lib/api/api-client.ts`. A área interna usa `internal-api-client.ts`.
  Nenhum `fetch` solto no restante do código.
- Caminhos passados a `apiRequest` são relativos ao prefixo já configurado em
  `NEXT_PUBLIC_API_URL` (`/api/v1`): use `/setores`, não a URL completa.
- O envelope de erro do backend é sempre
  `{ erro: { codigo, mensagem, detalhes? } }`. Falhas viram `ApiError`, com
  `status`, `code`, `correlationId` e `retryAfterSeconds`. Identifique com
  `isApiError` antes de ler campos.
- Exiba `erro.mensagem` ao usuário e trate decisões pelo `codigo`, não pelo
  texto.
- O refresh token vive apenas no cookie HttpOnly. Um 401 dispara um único
  refresh compartilhado e uma única repetição da requisição; se o refresh
  falhar, a sessão é limpa. Não adicione outra camada de retry por cima.
- Durante impersonação, cookies não são enviados e o 401 não tenta refresh.
  Preserve esse comportamento ao alterar o cliente.
- Respeite os limites de taxa do backend: em 429 com `LIMITE_TENTATIVAS`,
  desabilite a ação pelo intervalo informado em vez de reenviar.
- Listas paginadas do backend chegam como `{ dados, total, skip, take }`.
