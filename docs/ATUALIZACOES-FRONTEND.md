# Guia de integração do frontend

Este documento consolida as mudanças recentes do backend e as decisões que
afetam as telas, o cliente HTTP e o cliente Socket.IO. O OpenAPI em
/api/v1/openapi.json continua sendo a fonte executável de schemas; os
documentos em docs/api/ explicam as jornadas.

## Cliente HTTP e sessão

Todas as rotas, exceto o webhook, usam o prefixo /api/v1. Envie
Authorization: Bearer <accessToken> nas rotas protegidas. Para login,
renovação e logout use credentials: include, pois o refresh token fica somente
no cookie HttpOnly.

Fluxo recomendado:

1. POST /api/v1/auth/login com { email, senha }.
2. Guarde o accessToken apenas no mecanismo de sessão aprovado pelo produto.
3. Ao receber 401, chame uma única vez POST /api/v1/auth/refresh sem body.
4. Substitua o access token e repita a requisição original uma única vez.
5. Se o refresh retornar 401, limpe a sessão e redirecione para o login.
6. No logout, chame POST /api/v1/auth/logout com credentials: include; a
   autenticação é feita pelo cookie e a resposta 204 deve limpar o estado local.

Limites atuais: login aceita 10 tentativas por IP/e-mail em 15 minutos,
refresh 60 por IP, recuperação de senha 5 por IP/e-mail e redefinição 10 por
IP/token. O excesso retorna 429 com LIMITE_TENTATIVAS; desabilite o botão
durante o intervalo informado pelos headers de rate limit.

O envelope de erro é sempre:

```json
{
  "erro": {
    "codigo": "CODIGO_ESTAVEL",
    "mensagem": "Mensagem segura para a interface",
    "detalhes": {}
  }
}
```

Mapeie 401 para renovação/login, 403 para acesso negado, 409 para conflito
que exige recarregar dados, 422 para validação de formulário e 429 para
bloqueio temporário. Não exiba detalhes técnicos sem filtragem.

## Permissões do tenant

O papel vem no access token (ADMIN_TENANT, GESTOR ou ATENDENTE).

- ADMIN_TENANT: configurações, contas WhatsApp, usuários, setores, fluxos e
  atendimento.
- GESTOR: usuários operacionais, setores, fluxos e atendimento.
- ATENDENTE: consulta os próprios setores/conversas e executa atendimento; não
  altera usuários, setores, contas WhatsApp ou fluxos.

O backend continua sendo a autoridade: esconda ações sem permissão, mas trate
um 403 ACESSO_NEGADO mesmo que a interface tenha exibido uma ação.

## Fluxos e entrada do WhatsApp

Criação, edição, publicação e exclusão de fluxo exigem gestão. Listagem,
detalhe e simulação podem ser usadas por qualquer usuário autenticado.

Na tela de contas WhatsApp, o administrador pode escolher
fluxoEntradaPublicId ao criar ou editar uma conta. O valor deve ser o
public_id de um fluxo publicado. Sem esse campo, mensagens recebidas são
persistidas no histórico, mas não iniciam automação.

Após publicar um fluxo:

- refaça o detalhe e a listagem;
- mostre possui_alteracoes_nao_publicadas e versao;
- não permita publicar novamente quando a API retornar 409 CONFLITO.

O simulador retorna saidas e estado; devolva o estado integralmente na próxima
chamada. Os tipos suportados são mensagem, captura e direcionamento. Nós de IA
e integração HTTP ainda não devem aparecer no editor.

## Webhook e mensagens WhatsApp

O webhook da Meta deve ser configurado em POST /api/v1/webhook/whatsapp. O
frontend não chama essa rota. Mensagens de imagem, áudio, documento, sticker,
localização e outros tipos são aceitas estruturalmente e contabilizadas em
ignoradas; elas não devem ser mostradas como erro de integração.

O resultado do webhook possui:

```json
{ "recebidas": 1, "duplicadas": 0, "ignoradas": 0 }
```

Eventos de status podem acrescentar statusRecebidos. Um phone_number_id sem
tenant ativo também resulta em 200 e ignoradas, não em retry visual para o
usuário.

Para envio manual use POST /api/v1/conversas/{conversaId}/mensagens. A
resposta 202 significa mensagem persistida e enfileirada; 200 com
duplicada: true significa que a chave de idempotência já foi usada. Reutilize
a mesma chaveIdempotencia em retries de rede e atualize a bolha pelo public_id.

O compositor deve ser desabilitado quando a conversa não estiver
COM_ATENDENTE, quando o usuário não for o responsável, quando a janela de 24
horas estiver expirada ou quando a conta não estiver VALIDADA e ativa.

## Histórico, fila e paginação

GET /api/v1/conversas aceita status, setorId, atendenteId, contaId e visao
(TODAS, FILA, MINHAS). Todos os filtros são cumulativos. Para um atendente, o
backend ainda restringe o resultado aos setores vinculados.

Depois de assumir, reatribuir ou encerrar uma conversa, refaça as listas FILA
e MINHAS. Um 409 CONFLITO no claim significa que outro atendente venceu a
corrida; remova o item da fila e recarregue.

Mensagens são carregadas por cursor:

1. GET /conversas/{id}/mensagens?take=50;
2. use proximoCursor para buscar mensagens anteriores;
3. deduplicate por public_id, nunca por timestamp.

## Socket.IO

Conecte com auth: { token: accessToken }, withCredentials: true e path
/socket.io. Em connect_error com NAO_AUTENTICADO, use o mesmo fluxo de refresh
do HTTP e tente reconectar uma vez.

O servidor revalida a sessão periodicamente e pode emitir sessao:expirada com
CREDENCIAL_INVALIDA. Ao receber esse evento, encerre o socket, limpe a sessão
após tentativa única de refresh e reconecte somente se o refresh tiver sucesso.

Socket.IO é apenas canal de atualização. Após conectar ou reconectar, sempre
refaça as consultas REST de fila, minhas conversas e a primeira página da
timeline. Use os eventos para atualização incremental e valide que o tenantId
do evento corresponde ao usuário atual.

## Checklist de implementação

- [ ] Interceptor HTTP com refresh único e prevenção de loop.
- [ ] Cookies enviados somente com credentials: include.
- [ ] Tratamento visual de 401, 403, 409, 422 e 429.
- [ ] Ações administrativas condicionadas ao papel.
- [ ] Seleção de fluxo de entrada na conta WhatsApp.
- [ ] Idempotência no compositor e deduplicação por public_id.
- [ ] Reconciliação REST após reconexão Socket.IO.
- [ ] Estado vazio, carregamento, sucesso e erro para cada jornada.
