# Revisão de QA — backend ZapBot

Revisão técnica do estado atual do repositório (branch `main`, commit `25f1537`),
com foco em **segurança**, **performance**, **qualidade de código** e **pontos de
falha em que a aplicação pode quebrar em produção**.

Nenhum código foi alterado durante esta revisão.

## Como usar este documento

Cada item é uma tarefa atômica com identificador estável (`SEG-1`, `FAL-2`, ...).
Para cada tarefa você encontra:

- **Arquivo e linha** onde está o problema hoje;
- **Sintoma** — o que acontece na prática;
- **Correção sugerida** — com exemplo de código a aplicar;
- **Critério de aceite** — como provar que foi corrigido.

Ordem de execução recomendada: `FAL-1` → `FAL-2` → `SEG-1` → `SEG-2` → `FAL-3` →
`FAL-4` → `FAL-5` → demais itens por prioridade.

> **Antes de implementar `SEG-3`**: existe divergência entre código e
> `docs/api/fluxos.md`. Confirme a decisão com o usuário antes de alterar
> (regra de `AGENTS.md` sobre divergências diagnosticadas).

## Estado das verificações automáticas

| Verificação     | Comando             | Resultado                                        |
| --------------- | ------------------- | ------------------------------------------------ |
| Lint            | `npm run lint`      | ✅ passou, sem avisos                            |
| Tipos           | `npm run typecheck` | ✅ passou                                        |
| Testes          | `npm run test`      | ⚠️ não executado (exige Postgres + Redis locais) |
| Segredos no git | `git ls-files`      | ✅ apenas `.env.example` versionado              |

Pontos positivos observados: `strict` completo com `noUncheckedIndexedAccess` e
`exactOptionalPropertyTypes`, ausência de `any`/`eslint-disable`/`TODO`, uso
consistente de Zod nas bordas, AES-256-GCM com versionamento de payload,
comparação HMAC do webhook com `timingSafeEqual`, e rotação de refresh token com
detecção de reuso por família.

---

## Índice de tarefas

### Falhas que quebram a aplicação

- [x] **FAL-1** — Webhook rejeita mensagens não-texto e derruba a integração com a Meta
- [x] **FAL-2** — Cache LRU desconecta cliente Prisma de tenant em uso
- [x] **FAL-3** — `phone_number_id` desconhecido devolve 404 e provoca retry infinito da Meta
- [x] **FAL-4** — Mensagem de saída fica presa em `PENDENTE` para sempre após crash
- [x] **FAL-5** — Corrida na chave de idempotência de mensagem gera 500
- [x] **FAL-6** — Provisionamento roda `npm exec prisma` dentro do request HTTP
- [x] **FAL-7** — Envio de e-mail sem timeout trava o worker
- [x] **FAL-8** — Motor de fluxo não está ligado às mensagens recebidas

### Segurança

- [x] **SEG-1** — Sem rate limit em `login`, `refresh` e `redefinir-senha`
- [x] **SEG-2** — Hash dummy inválido permite enumerar e-mails por timing
- [x] **SEG-3** — Rotas de fluxos sem autorização por papel
- [x] **SEG-4** — Socket.io não revalida o token durante a sessão
- [x] **SEG-5** — `estadoToken` do TOTP é reutilizável por 5 minutos
- [x] **SEG-6** — `hub.verify_token` comparado sem `timingSafeEqual`
- [x] **SEG-7** — Cookie de refresh com `secure` fixo quebra ambiente local

### Performance

- [x] **PER-1** — Consulta ao banco central em toda requisição autenticada
- [x] **PER-2** — Buscas com `contains` sem índice adequado (varredura sequencial)
- [x] **PER-3** — `SCAN MATCH` no Redis a cada desconexão de socket
- [x] **PER-4** — Conexão Redis única compartilhada por filas, workers e presença
- [x] **PER-5** — `_count` por linha na listagem de contatos

### Qualidade de código

- [x] **QUA-1** — Controllers instanciam services e repositories
- [x] **QUA-2** — Erro interno mascarado como `404 NAO_ENCONTRADO`
- [x] **QUA-3** — `app.ts` concentra composição e repete blocos idênticos
- [x] **QUA-4** — Hash dummy do bcrypt duplicado em dois arquivos
- [x] **QUA-5** — `TotpService` não valida o tamanho da chave
- [x] **QUA-6** — Condicional duplicada em `MensagemAtendimentoService`
- [x] **QUA-7** — Validação de ciclos recursiva no grafo de fluxo

### Testes

- [x] **TES-1** — Sem teste para evicção e concorrência do gerenciador de conexões
- [x] **TES-2** — Sem teste para webhook com mensagem não-texto
- [x] **TES-3** — Sem teste para o processador de mensagem de saída
- [x] **TES-4** — Sem teste de autorização nas rotas de fluxos

---

# Falhas que quebram a aplicação

## FAL-1 — Webhook rejeita mensagens não-texto e derruba a integração com a Meta

**Prioridade:** Crítica
**Arquivo:** `src/dtos/webhook-whatsapp.dto.ts:11-27`

### Sintoma

O schema aceita **exclusivamente** `type: 'text'`:

```ts
const mensagemTextoWhatsappSchema = z.object({
  type: z.literal('text'),
  text: z.object({ body: z.string() }),
});
// ...
messages: z.array(mensagemTextoWhatsappSchema).optional(),
```

Assim que um contato enviar imagem, áudio, documento, sticker, localização,
contato, reação ou resposta de botão, `validar(webhookWhatsappSchema)` falha e
o middleware devolve `422`. A Meta interpreta qualquer resposta diferente de
`2xx` como falha de entrega: reenvia o evento com backoff e, após falhas
repetidas, **desabilita a assinatura do webhook**. Um único envio de figurinha
por um cliente derruba o recebimento de mensagens do tenant inteiro.

O mesmo vale para `field: z.literal('messages')` (linha 47) — a Meta envia
outros `field` na mesma assinatura.

### Correção sugerida

Aceitar toda mensagem estruturalmente válida, tratar apenas o que se sabe
processar e ignorar o resto com `200`.

Em `src/dtos/webhook-whatsapp.dto.ts`:

```ts
const mensagemBaseWhatsappSchema = z.object({
  id: z.string().min(1),
  from: z.string().min(1),
  timestamp: z.string().regex(/^\d+$/),
});

const mensagemTextoWhatsappSchema = mensagemBaseWhatsappSchema.extend({
  type: z.literal('text'),
  text: z.object({ body: z.string() }),
});

// Qualquer outro tipo é aceito e ignorado no processamento.
const mensagemNaoSuportadaWhatsappSchema = mensagemBaseWhatsappSchema
  .extend({ type: z.string().min(1) })
  .loose();

const mensagemWhatsappSchema = z.union([
  mensagemTextoWhatsappSchema,
  mensagemNaoSuportadaWhatsappSchema,
]);

const valorWebhookWhatsappSchema = z.object({
  messaging_product: z.literal('whatsapp'),
  metadata: z.object({
    display_phone_number: z.string().optional(),
    phone_number_id: z.string().min(1),
  }),
  messages: z.array(mensagemWhatsappSchema).optional(),
  statuses: z.array(statusWhatsappSchema).optional(),
});

export const webhookWhatsappSchema = z
  .object({
    object: z.literal('whatsapp_business_account'),
    entry: z
      .array(
        z.object({
          id: z.string().min(1),
          changes: z.array(
            z.object({
              // não restrinja a 'messages': a Meta envia outros campos
              field: z.string().min(1),
              value: valorWebhookWhatsappSchema,
            }),
          ),
        }),
      )
      .min(1),
  })
  .openapi('WebhookWhatsappEntrada');
```

Em `src/services/webhook-whatsapp.service.ts`, dentro do laço de mensagens
(linha 71), descarte explicitamente o que não é texto e contabilize:

```ts
for (const mensagem of mensagens) {
  if (mensagem.type !== 'text') {
    ignoradas += 1;
    logger.info(
      { tenantId: roteamento.tenant.public_id, tipo: mensagem.type },
      'Tipo de mensagem ainda não suportado; evento descartado',
    );
    continue;
  }
  // ... fluxo atual de idempotência + enfileiramento
}
```

Devolva `ignoradas` no `ResultadoWebhookWhatsapp` e documente o campo em
`docs/api/mensagens-whatsapp.md`.

### Critério de aceite

- Teste em `tests/webhook-whatsapp.test.ts` que envia `type: 'image'` com
  assinatura válida e espera `200` com `{ ignoradas: 1, recebidas: 0 }`.
- Teste que envia `field: 'message_template_status_update'` e espera `200`.
- Teste existente de mensagem de texto continua passando.

---

## FAL-2 — Cache LRU desconecta cliente Prisma de tenant em uso

**Prioridade:** Crítica
**Arquivo:** `src/database/gerenciador-conexoes-tenant.ts:54-70`

### Sintoma

```ts
private async abrir(tenantId: number, stringConexao: string): Promise<PrismaClient> {
  if (this.clientes.size >= this.limite) {
    const tenantMaisAntigo = this.clientes.keys().next().value;
    if (tenantMaisAntigo !== undefined) {
      const removido = this.clientes.get(tenantMaisAntigo);
      this.clientes.delete(tenantMaisAntigo);
      await removido?.$disconnect();   // <-- pode estar em uso agora
```

O `$disconnect()` é chamado sem qualquer noção de uso corrente. Quem já obteve
a referência continua com um cliente morto:

1. **Requisição HTTP em voo** — `resolucao-tenant.middleware.ts:36` guarda o
   cliente em `requisicao.contextoTenant.prisma`. Se o 21º tenant chegar entre
   a resolução e a query, a requisição falha com erro de conexão fechada → `500`.
2. **Worker BullMQ** — `processador-mensagem-recebida.service.ts:21` e
   `processador-mensagem-saida.service.ts:21` guardam a mesma referência ao longo
   do job. O job falha e entra em retry sem motivo real.
3. **Socket.io** — `chat.gateway.ts:91` guarda o cliente em `socket.data` para
   **toda a vida da conexão**. Uma vez evictado, aquele atendente fica com um
   cliente permanentemente quebrado até reconectar. Esse é o caso mais grave:
   não há retry.

Com `TENANT_CLIENTES_CACHE_MAXIMO` padrão de 20, qualquer instalação com mais de
20 tenants ativos entra nesse cenário rotineiramente.

### Correção sugerida

Contar referências em uso e adiar a desconexão. Duas mudanças:

**1. Nunca desconectar cliente com uso em aberto** — em
`src/database/gerenciador-conexoes-tenant.ts`:

```ts
interface EntradaCliente {
  cliente: PrismaClient;
  emUso: number;
  descartado: boolean;
}

export class GerenciadorConexoesTenantLru implements GerenciadorConexoesTenant {
  private readonly clientes = new Map<number, EntradaCliente>();

  public async obter(tenantId: number, stringConexao: string): Promise<PrismaClient> {
    const entrada = await this.obterEntrada(tenantId, stringConexao);
    entrada.emUso += 1;
    return entrada.cliente;
  }

  /** Deve ser chamado quando o consumidor termina de usar o cliente. */
  public liberar(tenantId: number): void {
    const entrada = this.clientes.get(tenantId);
    if (!entrada) return;
    entrada.emUso = Math.max(0, entrada.emUso - 1);
    if (entrada.descartado && entrada.emUso === 0) {
      void entrada.cliente.$disconnect();
    }
  }

  private async descartarMaisAntigo(): Promise<void> {
    for (const [tenantId, entrada] of this.clientes) {
      if (entrada.emUso > 0) continue; // pula os que estão em uso
      this.clientes.delete(tenantId);
      await entrada.cliente.$disconnect();
      logger.debug({ tenantId }, 'Cliente de tenant removido do cache');
      return;
    }
    // Todos estão em uso: marca o mais antigo para descarte adiado.
    const [tenantId, entrada] = [...this.clientes.entries()][0] ?? [];
    if (tenantId !== undefined && entrada) {
      entrada.descartado = true;
      this.clientes.delete(tenantId);
      logger.warn(
        { tenantId, limite: this.limite },
        'Cache de tenants cheio com todos os clientes em uso; descarte adiado',
      );
    }
  }
}
```

**2. Liberar a referência ao fim de cada consumo:**

- Em `src/middlewares/resolucao-tenant.middleware.ts`, registre a liberação no
  fim da resposta:

  ```ts
  requisicao.contextoTenant = { id: tenant.id, publicId: tenant.public_id, prisma };
  resposta.once('close', () => {
    conexoes.liberar(tenant.id);
  });
  proximo();
  ```

- Nos processadores (`processador-mensagem-recebida`, `processador-mensagem-saida`,
  `status-whatsapp`), envolva o corpo em `try/finally` chamando
  `this.conexoes.liberar(tenant.id)`.

- Em `chat.gateway.ts`, **não guarde o cliente em `socket.data`**. Guarde apenas
  `tenantIdInterno` e resolva o cliente sob demanda em cada handler:

  ```ts
  private async comPrisma<T>(
    identidade: IdentidadeSocket,
    acao: (prisma: PrismaClient) => Promise<T>,
  ): Promise<T> {
    const prisma = await this.conexoes.obter(identidade.tenantIdInterno, identidade.stringConexao);
    try {
      return await acao(prisma);
    } finally {
      this.conexoes.liberar(identidade.tenantIdInterno);
    }
  }
  ```

**3. Alerta de saturação** — logue `warn` quando o descarte for adiado, para que
o operador saiba que precisa aumentar `TENANT_CLIENTES_CACHE_MAXIMO`.

### Critério de aceite

- Teste em `tests/database/` com `limite: 1`: obtém cliente do tenant A, obtém
  cliente do tenant B sem liberar A, e comprova que uma query no cliente A ainda
  funciona.
- Teste que, após `liberar`, o cliente descartado é efetivamente desconectado.
- Teste de socket que permanece conectado enquanto outros tenants entram e saem
  do cache e continua respondendo a `conversa:entrar`.

---

## FAL-3 — `phone_number_id` desconhecido devolve 404 e provoca retry da Meta

**Prioridade:** Alta
**Arquivo:** `src/services/webhook-whatsapp.service.ts:56-60`

### Sintoma

```ts
const roteamento = await this.roteamentos.buscarTenantAtivo(phoneNumberId);
if (roteamento?.tenant.status !== 'ATIVO' || roteamento.tenant.deletado_at !== null) {
  throw new NaoEncontradoError('Conta WhatsApp ativa não encontrada');
}
```

Cenários reais que caem aqui: número removido do tenant, tenant suspenso por
inadimplência, ou evento de teste da própria Meta. O resultado é `404`, que a
Meta trata como falha permanente de entrega e reenfileira indefinidamente.

Agravante: o `throw` acontece **no meio do laço**. Se o payload trouxer duas
`entry`, mensagens da primeira já foram enfileiradas e reservadas no Redis; no
reenvio elas contam como duplicadas, mas as da segunda `entry` só serão
processadas se o roteamento voltar a existir.

### Correção sugerida

Nunca falhar o webhook por roteamento ausente. Registrar e seguir:

```ts
for (const alteracao of item.changes) {
  const mensagens = alteracao.value.messages ?? [];
  const statuses = alteracao.value.statuses ?? [];
  if (mensagens.length === 0 && statuses.length === 0) continue;

  const phoneNumberId = alteracao.value.metadata.phone_number_id;
  const roteamento = await this.roteamentos.buscarTenantAtivo(phoneNumberId);
  if (roteamento?.tenant.status !== 'ATIVO' || roteamento.tenant.deletado_at !== null) {
    ignoradas += mensagens.length + statuses.length;
    logger.warn({ phoneNumberId }, 'Webhook recebido para conta sem tenant ativo; descartado');
    continue; // segue para as demais alterações
  }
  // ...
}
```

Mantenha `NaoEncontradoError` apenas onde o cliente é o frontend, não a Meta.

### Critério de aceite

- Teste que envia webhook assinado com `phone_number_id` inexistente e espera
  `200` com `{ recebidas: 0, ignoradas: 1 }`, sem job enfileirado.
- Teste com duas `entry` onde só a segunda tem roteamento válido: a mensagem
  válida é enfileirada e a resposta é `200`.
- `docs/api/mensagens-whatsapp.md` atualizado com o novo contrato de resposta.

---

## FAL-4 — Mensagem de saída fica presa em `PENDENTE` para sempre após crash

**Prioridade:** Alta
**Arquivo:** `src/services/processador-mensagem-saida.service.ts:28-30` e
`src/repositories/mensagem-atendimento.repository.ts:87-99`

### Sintoma

```ts
if (mensagem.status_entrega !== 'PENDENTE') return 'JA_PROCESSADA';
const tentativa = await repositorio.marcarTentativa(mensagem.public_id);
if (tentativa.count === 0) return 'JA_PROCESSADA';
```

`marcarTentativa` grava `enviada_at` e exige `enviada_at: null` no `where`:

```ts
public marcarTentativa(publicId: string) {
  return this.prisma.mensagem.updateMany({
    where: { public_id: publicId, status_entrega: 'PENDENTE', enviada_at: null },
    data: { enviada_at: new Date() },
  });
}
```

Se o processo morrer (deploy, OOM, SIGKILL) entre `marcarTentativa` e
`marcarEnviada`/`liberarTentativa`, a mensagem fica com `status_entrega =
'PENDENTE'` e `enviada_at` preenchido. No retry do BullMQ, `marcarTentativa`
retorna `count = 0` e o processador responde `'JA_PROCESSADA'` — a mensagem
**nunca é enviada e nunca é marcada como falha**. O atendente vê a mensagem
eternamente "enviando" no chat.

### Correção sugerida

Transformar o _lock_ em algo com expiração, permitindo retomada:

```ts
/** Reserva a mensagem para envio; libera reservas expiradas de execuções mortas. */
public marcarTentativa(publicId: string, expiracaoMs = 120_000) {
  const limite = new Date(Date.now() - expiracaoMs);
  return this.prisma.mensagem.updateMany({
    where: {
      public_id: publicId,
      status_entrega: 'PENDENTE',
      OR: [{ enviada_at: null }, { enviada_at: { lt: limite } }],
    },
    data: { enviada_at: new Date() },
  });
}
```

Adicione também uma varredura de saneamento (job repetível BullMQ ou script em
`scripts/`) que marque como `FALHA` mensagens `PENDENTE` com `enviada_at`
anterior ao número máximo de tentativas, para não acumular registro fantasma.

O índice `@@index([status_entrega, updated_at])` em `prisma/tenant/schema.prisma:361`
já cobre a varredura.

### Critério de aceite

- Teste que simula crash: chama `marcarTentativa`, não conclui, e comprova que
  uma nova chamada após a janela de expiração retorna `count = 1`.
- Teste que, dentro da janela, uma segunda chamada retorna `count = 0`
  (não há envio duplicado concorrente).

---

## FAL-5 — Corrida na chave de idempotência de mensagem gera 500

**Prioridade:** Alta
**Arquivo:** `src/repositories/mensagem-atendimento.repository.ts:46-57`

### Sintoma

```ts
const existente = await this.prisma.mensagem.findUnique({
  where: { chave_idempotencia: entrada.chaveIdempotencia },
  select: { public_id: true, status_entrega: true },
});
if (existente) return { ...existente, duplicada: true };
// ... janela de corrida ...
const mensagem = await this.prisma.mensagem.create({ ... });
```

É um clássico _check-then-act_. `chave_idempotencia` é `@unique`
(`prisma/tenant/schema.prisma:337`). Dois cliques rápidos do atendente, ou o
retry automático do frontend após timeout de rede, produzem duas requisições
concorrentes: uma cria, a outra recebe `P2002` não tratado, que cai no
`tratarErro` como erro genérico e devolve `500 ERRO_INTERNO`. O contrato de
idempotência que a rota promete falha exatamente no caso para o qual existe.

### Correção sugerida

```ts
public async criarPendente(
  conversaId: number,
  atendenteId: number,
  entrada: EnviarMensagemAtendimentoEntrada,
  correlationId: string,
) {
  const existente = await this.buscarPorChaveIdempotencia(entrada.chaveIdempotencia);
  if (existente) return { ...existente, duplicada: true };

  const resposta = entrada.respostaMensagemId
    ? await this.prisma.mensagem.findFirst({
        where: { public_id: entrada.respostaMensagemId, conversa_id: conversaId },
        select: { id: true },
      })
    : null;

  try {
    const mensagem = await this.prisma.mensagem.create({
      data: { /* ... igual ao atual ... */ },
      select: { public_id: true, status_entrega: true },
    });
    return { ...mensagem, duplicada: false };
  } catch (erro: unknown) {
    if (!this.erroDuplicidade(erro)) throw erro;
    // Outra requisição venceu a corrida: devolve o registro dela.
    const concorrente = await this.buscarPorChaveIdempotencia(entrada.chaveIdempotencia);
    if (!concorrente) throw erro;
    return { ...concorrente, duplicada: true };
  }
}

private buscarPorChaveIdempotencia(chave: string) {
  return this.prisma.mensagem.findUnique({
    where: { chave_idempotencia: chave },
    select: { public_id: true, status_entrega: true },
  });
}

private erroDuplicidade(erro: unknown): boolean {
  return typeof erro === 'object' && erro !== null && 'code' in erro && erro.code === 'P2002';
}
```

O helper `erroDuplicidade` já existe em
`src/repositories/historico.repository.ts:94`. Extraia-o para
`src/helpers/erro-prisma.helper.ts` e reutilize nos dois repositories.

### Critério de aceite

- Teste que dispara duas chamadas concorrentes de `criarPendente` com a mesma
  `chaveIdempotencia` e verifica: uma retorna `duplicada: false`, a outra
  `duplicada: true`, ambas com o mesmo `public_id`, e apenas um job enfileirado.

---

## FAL-6 — Provisionamento roda `npm exec prisma` dentro do request HTTP

**Prioridade:** Média
**Arquivo:** `src/services/provisionador-banco-tenant.service.ts:57-81`

### Sintoma

```ts
const processo = spawn(
  'npm',
  ['exec', 'prisma', '--', 'migrate', 'deploy', '--config', 'prisma.tenant.config.ts'],
  { cwd: process.cwd(), env: { ...process.env, TENANT_DATABASE_URL: stringConexao }, ... },
);
```

Chamado por `POST /api/v1/interno/tenants` de forma síncrona. Três problemas:

1. **Timeout** — `servidor.requestTimeout` é 30 s (`src/servidor.ts:164`).
   `CREATE DATABASE` + `migrate deploy` + criação do perfil admin passa disso
   com frequência. O cliente recebe timeout enquanto o provisionamento continua
   rodando em segundo plano, sem retorno.
2. **Dependência de ambiente** — depende de `npm` no `PATH`, do `cwd` correto e
   de `prisma.tenant.config.ts` presente na imagem. O `Dockerfile` copia os
   arquivos de config, mas isso deixa o runtime acoplado ao layout de
   desenvolvimento e quebra silenciosamente se algum deles sair da imagem.
3. **Bloqueio de event loop por processo filho** — cada provisionamento
   concorrente sobe um processo Node completo.

### Correção sugerida

Mover o provisionamento para uma fila BullMQ dedicada e responder `202`:

1. Criar `NOMES_FILAS.provisionamentoTenant` em `src/config/filas.ts`.
2. `TenantsInternosController.provisionar` cria o registro central
   (`criarProvisionamento`, que já é idempotente por `provisionamento_chave`),
   enfileira o job e responde `202` com o `public_id` e `etapa_provisionamento`.
3. O worker executa as etapas atuais de `ProvisionamentoTenantService.provisionar`
   — a máquina de etapas (`REGISTRO_CENTRAL_CRIADO` → `BANCO_CRIADO` →
   `MIGRATIONS_APLICADAS` → `CONCLUIDO`) já é retomável, então o job é seguro
   para retry.
4. O frontend acompanha por `GET /api/v1/interno/tenants/:tenantId`.

Independente disso, adicione um timeout ao processo filho, que hoje pode ficar
pendurado indefinidamente:

```ts
public aplicarMigrations(stringConexao: string, timeoutMs = 120_000): Promise<void> {
  return new Promise((resolver, rejeitar) => {
    const processo = spawn(/* ... */);
    const limite = setTimeout(() => {
      processo.kill('SIGKILL');
      rejeitar(new Error('Timeout ao aplicar migrations do tenant'));
    }, timeoutMs);
    limite.unref();
    // ...
    processo.once('exit', (codigo) => {
      clearTimeout(limite);
      // ...
    });
  });
}
```

### Critério de aceite

- `POST /api/v1/interno/tenants` responde em menos de 1 s com `202`.
- Job de provisionamento reexecutado do zero é idempotente (não recria banco nem
  duplica administrador).
- Teste que o `spawn` travado é encerrado pelo timeout e rejeita a promessa.
- `docs/api/tenants.md` atualizado com o fluxo assíncrono e o novo status code.

---

## FAL-7 — Envio de e-mail sem timeout trava o worker

**Prioridade:** Média
**Arquivo:** `src/services/enviador-email.service.ts:31-45` e `47-67`

### Sintoma

```ts
const resposta = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {/* ... */},
  body: JSON.stringify({/* ... */}),
}); // sem signal, sem timeout
```

`BrasilApiService` e `WhatsappGraphApiService` usam `AbortSignal.timeout(...)`,
mas o enviador de e-mail não. Um `fetch` sem timeout pode ficar pendurado
indefinidamente. Com `concurrency: 5` no worker de e-mails
(`src/servidor.ts:88-96`), cinco chamadas travadas param toda a fila de e-mails
transacionais — inclusive a recuperação de senha. O mesmo vale para o transporte
SMTP, criado sem `connectionTimeout`/`greetingTimeout`/`socketTimeout`.

Além disso, `EnviadorEmailResend` descarta o corpo da resposta de erro, o que
dificulta o diagnóstico:

```ts
if (!resposta.ok) throw new Error('Falha ao enviar e-mail de recuperação');
```

### Correção sugerida

```ts
export class EnviadorEmailResend implements EnviadorEmail {
  public constructor(
    private readonly apiKey: string,
    private readonly remetente: string,
    private readonly timeoutMs = 15_000,
  ) {}

  public async enviar(mensagem: MensagemEmail): Promise<void> {
    const resposta = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({/* ... */}),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!resposta.ok) {
      // status ajuda o BullMQ a decidir se o retry faz sentido
      throw new Error(`Resend respondeu com status ${String(resposta.status)}`);
    }
  }
}
```

E no SMTP:

```ts
this.transporte = nodemailer.createTransport({
  host: configuracao.host,
  port: configuracao.porta,
  secure: configuracao.seguro,
  connectionTimeout: 10_000,
  greetingTimeout: 10_000,
  socketTimeout: 20_000,
  ...(configuracao.usuario && configuracao.senha
    ? { auth: { user: configuracao.usuario, pass: configuracao.senha } }
    : {}),
});
```

Não registre em log o corpo da resposta sem filtrar — ele pode conter o
destinatário.

### Critério de aceite

- Teste com `fetch` simulado que nunca resolve: `enviar` rejeita dentro do
  timeout configurado.
- Teste que status `422` do Resend produz erro com o código no `message`.

---

## FAL-8 — Motor de fluxo não está ligado às mensagens recebidas

**Prioridade:** Média (gap funcional, não regressão)
**Arquivos:** `src/services/execucao-fluxo.service.ts`,
`src/services/processador-mensagem-recebida.service.ts:15-45`

### Sintoma

`ExecucaoFluxoService` só aparece em `tests/services/execucao-fluxo.service.test.ts`.
Nenhum ponto de produção o instancia. `ProcessadorMensagemRecebidaService`
persiste a mensagem, publica no barramento de chat e termina — o bot nunca
responde, nunca captura variáveis e nunca direciona para setor automaticamente.

Consequências em cadeia:

- `EstadoFluxoRedisRepository` nunca é escrito em produção;
- `Conversa.estado_fluxo` fica sempre nulo, então
  `DirecionamentoAtendimentoService.encerrar` com `devolverAoBot: true`
  (`src/services/direcionamento-atendimento.service.ts:106`) sempre lança
  `'Conversa não possui snapshot de fluxo para retornar ao bot'`;
- conversas criadas com `status: 'BOT'`
  (`src/repositories/historico.repository.ts:54`) nunca saem desse estado
  sozinhas.

### Correção sugerida

Injetar a execução do fluxo no processador de mensagens recebidas, após a
persistência bem-sucedida:

```ts
export class ProcessadorMensagemRecebidaService {
  public constructor(
    private readonly tenants: TenantCentralRepository,
    private readonly criptografia: CriptografiaService,
    private readonly conexoes: GerenciadorConexoesTenant,
    private readonly criarExecucaoFluxo?: (prisma: PrismaClient) => ExecucaoFluxoService,
  ) {}

  public async processar(job: JobMensagemRecebida): Promise<'CRIADA' | 'DUPLICADA'> {
    // ... persistência atual ...
    if (resultado === 'CRIADA' && mensagem && this.criarExecucaoFluxo) {
      await this.criarExecucaoFluxo(prisma).executarConversa({
        tenantId: job.tenantId,
        conversaId: mensagem.conversa.public_id,
        fluxoId: fluxoPadraoPublicId,
        mensagem: job.texto,
      });
    }
    return resultado;
  }
}
```

Antes de implementar é preciso decidir **como o fluxo padrão do tenant é
escolhido** (hoje não há campo de "fluxo de entrada" em `Fluxo`). Trate isso
como tarefa própria em `docs/TAREFAS-ESTRUTURA-BASE.md` antes de escrever
código. Falhas na execução do fluxo não devem reverter a persistência da
mensagem — capture e logue separadamente.

### Critério de aceite

- Tarefa atômica registrada em `docs/TAREFAS-ESTRUTURA-BASE.md` com a decisão de
  seleção do fluxo de entrada.
- Teste de integração: mensagem recebida em conversa `BOT` gera saída do motor e
  grava estado no Redis com a chave namespaced por tenant.
- Falha do motor não impede que a mensagem persista nem que o evento
  `conversa:mensagem_recebida` seja publicado.

---

# Segurança

## SEG-1 — Sem rate limit em `login`, `refresh` e `redefinir-senha`

**Prioridade:** Alta
**Arquivos:** `src/app.ts:207-210`, `src/rotas/autenticacao.rotas.ts:17-19` e `44-48`

### Sintoma

Existe limitação em dois pontos apenas:

- `/api/v1/interno/auth` — 10 req / 15 min (`src/app.ts:313-322`);
- `/api/v1/auth/esqueci-senha` — 5 req / 15 min por IP + e-mail
  (`src/rotas/autenticacao.rotas.ts:21-37`).

Ficam **sem qualquer limite**:

| Rota                                | Risco                                                |
| ----------------------------------- | ---------------------------------------------------- |
| `POST /api/v1/auth/login`           | força bruta de senha ilimitada em toda a base        |
| `POST /api/v1/auth/refresh`         | sondagem de refresh tokens; cada tentativa faz query |
| `POST /api/v1/auth/redefinir-senha` | força bruta de token de recuperação                  |

O login é o alvo mais exposto: bcrypt com custo 12 leva ~300 ms por tentativa,
então um atacante com concorrência moderada também consegue **exaurir o pool de
CPU** da API — vira negação de serviço além de força bruta.

O contador de `tentativas >= 5` em
`src/repositories/recuperacao-senha.repository.ts:30` limita ataques a **um
token específico**, mas não impede varredura de tokens diferentes.

### Correção sugerida

Em `src/rotas/autenticacao.rotas.ts`, aplicar limites distintos por rota:

```ts
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { MuitasRequisicoesError } from '../erros/erro-aplicacao.js';

function limitePorIpEIdentidade(limite: number, campo: 'email' | 'token') {
  return rateLimit({
    windowMs: 15 * 60_000,
    limit: limite,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator: (requisicao) => {
      const corpo = requisicao.body as unknown;
      const identidade =
        typeof corpo === 'object' &&
        corpo !== null &&
        campo in corpo &&
        typeof (corpo as Record<string, unknown>)[campo] === 'string'
          ? String((corpo as Record<string, unknown>)[campo]).slice(0, 128)
          : 'sem-identidade';
      return `${ipKeyGenerator(requisicao.ip ?? '')}:${campo}:${identidade}`;
    },
    handler: (_req, _res, proximo) => {
      proximo(new MuitasRequisicoesError());
    },
  });
}

rotas.post(
  '/login',
  limitePorIpEIdentidade(10, 'email'),
  validar(loginSchema),
  tratarAsync(controller.login),
);
rotas.post('/refresh', limitePorIp(60), tratarAsync(controller.refresh));
rotas.post(
  '/redefinir-senha',
  limitePorIpEIdentidade(10, 'token'),
  validar(redefinirSenhaSchema),
  tratarAsync(recuperacao.redefinir),
);
```

Padronize o `handler` também no limitador de `esqueci-senha`, que hoje devolve o
`429` padrão do `express-rate-limit` em vez do envelope de erro do projeto.

**Atenção:** a chave de IP só é confiável se `trust proxy` estiver configurado
corretamente para o proxy reverso de produção. Adicione em `src/app.ts`:

```ts
// Ajuste o número de saltos conforme a topologia real (nginx, ALB, Cloudflare).
aplicacao.set('trust proxy', 1);
```

Sem isso, todos os clientes atrás do proxy compartilham a mesma chave e um único
usuário legítimo consome o limite de todos.

### Critério de aceite

- Teste que a 11ª tentativa de login com o mesmo e-mail no intervalo devolve
  `429` com `{ erro: { codigo: 'LIMITE_TENTATIVAS' } }`.
- Teste que e-mails diferentes do mesmo IP não compartilham o contador de forma
  a bloquear usuário legítimo antes do limite de IP.
- `docs/api/autenticacao.md` e `docs/api/recuperacao-senha.md` documentam o
  `429` e os limites.

---

## SEG-2 — Hash dummy inválido permite enumerar e-mails por timing

**Prioridade:** Alta
**Arquivos:** `src/services/autenticacao.service.ts:38-40`,
`src/services/exclusao-tenant.service.ts:79-81`

### Sintoma

```ts
const hashComparacao =
  usuario?.senha_hash ?? '$2b$12$000000000000000000000uGFr4A5Zs4P2RQmC8YlQXrZ8Pq9a';
const senhaValida = await this.senhas.comparar(entrada.senha, hashComparacao);
```

A intenção — gastar o mesmo tempo com e sem usuário — está correta, mas o hash
literal é **malformado**: tem 56 caracteres, e um hash bcrypt válido tem 60
(`$2b$12$` + 22 de salt + 31 de digest). O `bcryptjs` detecta o formato inválido
e retorna `false` imediatamente, sem executar as rodadas.

Medição feita neste repositório:

```
resultado false   ms dummy   0.88
resultado false   ms real  314.45
```

**357x de diferença.** Qualquer cliente consegue separar e-mails cadastrados de
não cadastrados só medindo a latência do `POST /api/v1/auth/login`, mesmo com a
resposta `401 CREDENCIAIS_INVALIDAS` sendo idêntica nos dois casos. Combinado com
`SEG-1` (sem rate limit), isso permite varrer uma lista de e-mails e descobrir
quem tem conta na plataforma.

O mesmo hash malformado está duplicado em
`ExclusaoTenantService.reautenticar`, onde revela se um `public_id` de operador
interno existe.

### Correção sugerida

Gerar o hash dummy uma vez, no boot, a partir de um valor aleatório — assim ele
é sempre válido, tem o mesmo custo do hash real e não é um segredo versionado.

Criar `src/helpers/hash-dummy.helper.ts`:

```ts
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';

/**
 * Hash válido descartável usado para igualar o custo da comparação quando o
 * usuário não existe, evitando enumeração de contas por tempo de resposta.
 */
export const HASH_DUMMY_COMPARACAO: string = bcrypt.hashSync(randomBytes(32).toString('hex'), 12);
```

E usar nos dois pontos:

```ts
import { HASH_DUMMY_COMPARACAO } from '../helpers/hash-dummy.helper.js';

const hashComparacao = usuario?.senha_hash ?? HASH_DUMMY_COMPARACAO;
```

O custo é um `bcrypt.hashSync` no boot (~300 ms, uma vez).

Verifique também que os demais caminhos de saída do `login` não vazam tempo:
hoje as validações de `usuario.tenant` e `status !== 'ATIVO'` acontecem **depois**
do `comparar`, o que está correto — mantenha essa ordem.

### Critério de aceite

- Teste que mede `login` com e-mail inexistente e com e-mail existente e senha
  errada; a diferença mediana fica abaixo de 20% (use várias amostras e mediana
  para reduzir ruído de CI).
- Teste unitário que `HASH_DUMMY_COMPARACAO` tem 60 caracteres e
  `bcrypt.compare('qualquer', HASH_DUMMY_COMPARACAO)` retorna `false`.
- Nenhum hash bcrypt literal restante em `src/` (`grep -rn '\$2[aby]\$' src/`).

---

## SEG-3 — Rotas de fluxos sem autorização por papel

**Prioridade:** Alta — **exige decisão antes de implementar**
**Arquivo:** `src/rotas/fluxo.rotas.ts:14-44`

### Sintoma

Comparando a proteção aplicada por módulo:

| Módulo                 | Middleware de papel                             |
| ---------------------- | ----------------------------------------------- |
| `contas-whatsapp`      | `rotas.use(exigirAdminTenant)` — todas as rotas |
| `empresa` (PUT)        | `exigirAdminTenant`                             |
| `setores` (POST)       | `exigirGestaoTenant`                            |
| `conversas/reatribuir` | `exigirGestaoTenant`                            |
| **`fluxos`**           | **nenhum**                                      |

Um usuário com papel `ATENDENTE` — o perfil menos privilegiado, tipicamente com
alta rotatividade — pode hoje:

- `POST /api/v1/fluxos` — criar fluxos;
- `PUT /api/v1/fluxos/:fluxoId` — reescrever o rascunho de qualquer fluxo;
- `POST /api/v1/fluxos/:fluxoId/publicar` — **publicar** e alterar o
  comportamento do bot para todos os contatos do tenant, incluindo redirecionar
  conversas para setores aos quais não pertence (`direcionar_setor`);
- `DELETE /api/v1/fluxos/:fluxoId` — remover fluxos.

### Divergência a resolver antes de codar

`docs/api/fluxos.md:5-7` diz apenas _"as rotas permitem ao usuário autenticado do
tenant listar, editar, publicar, simular e excluir fluxos"_, sem restringir
papel. Não está claro se a ausência de middleware é intencional ou esquecimento.
Conforme `AGENTS.md`, **avise o usuário e não escolha sozinho** entre código e
documentação.

### Correção sugerida (após aprovação)

Alinhar com `setores`, que também é configuração operacional:

```ts
export function criarRotasFluxos(controller: FluxoController): Router {
  const rotas = Router();

  // Leitura e simulação: qualquer usuário autenticado do tenant.
  rotas.get('/blocos', controller.catalogoBlocos);
  rotas.get('/', validar(listarFluxosSchema, 'query'), tratarAsync(controller.listar));
  rotas.get('/:fluxoId', validar(fluxoPublicIdSchema, 'params'), tratarAsync(controller.detalhar));
  rotas.post(
    '/:fluxoId/simular',
    validar(fluxoPublicIdSchema, 'params'),
    validar(simularFluxoSchema),
    tratarAsync(controller.simular),
  );

  // Escrita e publicação: gestão do tenant.
  rotas.post('/', exigirGestaoTenant, validar(criarFluxoSchema), tratarAsync(controller.criar));
  rotas.put(
    '/:fluxoId',
    exigirGestaoTenant,
    validar(fluxoPublicIdSchema, 'params'),
    validar(atualizarFluxoSchema),
    tratarAsync(controller.atualizar),
  );
  rotas.delete(
    '/:fluxoId',
    exigirGestaoTenant,
    validar(fluxoPublicIdSchema, 'params'),
    tratarAsync(controller.excluir),
  );
  rotas.post(
    '/:fluxoId/publicar',
    exigirGestaoTenant,
    validar(fluxoPublicIdSchema, 'params'),
    tratarAsync(controller.publicar),
  );

  return rotas;
}
```

### Critério de aceite

- Decisão registrada (papéis por operação) e `docs/api/fluxos.md` atualizado com
  a tabela de permissões por endpoint.
- Teste que `ATENDENTE` recebe `403 ACESSO_NEGADO` em `POST`, `PUT`, `DELETE` e
  `publicar`, e `200` em `GET` e `simular`.
- Swagger regenerado refletindo os perfis exigidos.

---

## SEG-4 — Socket.io não revalida o token durante a sessão

**Prioridade:** Média
**Arquivo:** `src/websocket/chat.gateway.ts:78-96`

### Sintoma

A autenticação acontece uma única vez, no handshake:

```ts
this.io.use((socket, proximo) => {
  void this.autenticar(socket)
    .then(() => {
      proximo();
    })
    .catch(() => {
      proximo(new Error('NAO_AUTENTICADO'));
    });
});
```

Depois disso o socket vive indefinidamente. Um access token tem 15 minutos
(`JWT_TENANT_EXPIRACAO_SEGUNDOS = 900`), mas a sessão WebSocket ignora isso:

- usuário **desativado** (`alterarAtivoERevogar`) continua recebendo mensagens em
  tempo real de todos os setores em que estava;
- usuário **excluído** (`excluirERevogar`) idem;
- tenant **suspenso ou cancelado** — inclusive após `prepararExclusaoDefinitiva`,
  que revoga refresh tokens mas não fecha sockets;
- vínculos de setor revogados: as salas foram associadas no `connect`
  (`chat.gateway.ts:127-128`) e nunca são reavaliadas.

Ou seja, a revogação de acesso implementada no HTTP não tem efeito no canal
tempo real.

### Correção sugerida

Revalidar periodicamente e desconectar quando o acesso deixar de ser válido:

```ts
private async conectar(socket: Socket): Promise<void> {
  const identidade = (socket.data as { identidade: IdentidadeSocket }).identidade;
  // ... joins atuais ...

  const revalidar = async (): Promise<void> => {
    const tenant = await this.tenants.buscarAtivoDoUsuario(identidade.email, identidade.tenantId);
    if (!tenant?.string_conexao_encrypted || identidade.expiraEm <= Date.now()) {
      socket.emit('sessao:expirada', { motivo: 'CREDENCIAL_INVALIDA' });
      socket.disconnect(true);
    }
  };

  const intervaloRevalidacao = setInterval(() => {
    void revalidar();
  }, 60_000);
  intervaloRevalidacao.unref();

  socket.on('disconnect', () => {
    clearInterval(intervaloRevalidacao);
    // ... limpeza atual ...
  });
}
```

Guarde `expiraEm` a partir do `exp` do JWT no `autenticar` e exponha um evento
`sessao:renovar` que aceite um novo access token, para o frontend renovar sem
derrubar a conexão. `buscarAtivoDoUsuario` já valida tenant ativo, usuário ativo
e não deletado numa única query — o custo é uma consulta por socket por minuto,
compatível com o cache proposto em `PER-1`.

### Critério de aceite

- Teste em `tests/websocket/chat.gateway.test.ts`: socket conectado é
  desconectado em até um ciclo de revalidação após o usuário ser desativado.
- Teste que o socket é desconectado quando o tenant passa a `SUSPENSO`.
- `docs/api/historico-conversas.md` documenta o evento `sessao:expirada` e o
  comportamento esperado do frontend.

---

## SEG-5 — `estadoToken` do TOTP é reutilizável por 5 minutos

**Prioridade:** Média
**Arquivo:** `src/services/estado-autenticacao-interna.service.ts:14-34`

### Sintoma

O token intermediário entre senha e segundo fator é um JWT stateless de 5 min:

```ts
public emitir(usuarioPublicId: string): string {
  return jwt.sign({ finalidade: 'totp' }, this.segredo, {
    subject: usuarioPublicId, issuer: 'zapbot-api', audience: 'zapbot-admin-2fa', expiresIn: 300,
  });
}
```

Não há registro de consumo. Consequências:

- o mesmo `estadoToken` serve para **múltiplas** tentativas em `/2fa/verificar`
  e para `/2fa/configurar`;
- se vazar (log de proxy, histórico do navegador, extensão), o atacante que já
  tenha o código TOTP — ou consiga adivinhá-lo dentro da janela — completa o
  login sem saber a senha;
- combinado com o limite de 10 req/15 min por IP em `/api/v1/interno/auth`, um
  atacante distribuído tem margem para tentar códigos de 6 dígitos.

Esse é o caminho de acesso ao painel `super_admin`, o mais privilegiado do
sistema.

### Correção sugerida

Tornar o estado de uso único, com registro em Redis:

```ts
export class EstadoAutenticacaoInternaService {
  public constructor(
    private readonly segredo: string,
    private readonly redis: Redis,
    private readonly expiracaoSegundos = 300,
  ) {}

  public emitir(usuarioPublicId: string): string {
    const jti = randomUUID();
    return jwt.sign({ finalidade: 'totp', jti }, this.segredo, {
      subject: usuarioPublicId,
      issuer: 'zapbot-api',
      audience: 'zapbot-admin-2fa',
      expiresIn: this.expiracaoSegundos,
    });
  }

  /** Consome o estado; a segunda chamada com o mesmo token falha. */
  public async consumir(token: string): Promise<{ sub: string }> {
    const estado = this.verificar(token);
    const reservado = await this.redis.set(
      `interno:2fa:estado:${estado.jti}`,
      '1',
      'EX',
      this.expiracaoSegundos,
      'NX',
    );
    if (reservado !== 'OK') {
      throw new NaoAutenticadoError('Estado de autenticação já utilizado');
    }
    return estado;
  }
}
```

`IdempotenciaRedisRepository.reservar` já implementa exatamente esse `SET NX EX`
(`src/repositories/idempotencia-redis.repository.ts:6-9`) — reutilize em vez de
duplicar.

Considere também um contador de tentativas de TOTP por usuário (não só por IP),
com bloqueio temporário após 5 códigos errados.

### Critério de aceite

- Teste que o segundo uso do mesmo `estadoToken` em `/2fa/verificar` devolve
  `401`.
- Teste que código TOTP errado não consome o estado indevidamente (decida:
  consumir só no sucesso, com contador de tentativas separado).
- `docs/api/admin-interno.md` atualizado com o comportamento de uso único.

---

## SEG-6 — `hub.verify_token` comparado sem `timingSafeEqual`

**Prioridade:** Baixa
**Arquivo:** `src/controllers/webhook-whatsapp.controller.ts:16-23`

### Sintoma

```ts
if (query['hub.verify_token'] !== this.verifyToken) {
  throw new AcessoNegadoError('Token de verificação do webhook inválido');
}
```

Comparação de string com curto-circuito. O projeto já usa `timingSafeEqual` para
a assinatura HMAC (`src/helpers/assinatura-webhook.helper.ts:16`) e para o Basic
Auth da documentação (`src/middlewares/documentacao.middleware.ts:13-18`) — este
ponto ficou de fora.

O risco prático é baixo (o `GET` de challenge só é usado na configuração inicial
e a assinatura HMAC protege o `POST`), mas é inconsistente com o padrão do
projeto e barato de corrigir.

### Correção sugerida

Extrair a comparação já existente em `documentacao.middleware.ts` para
`src/helpers/comparacao-segura.helper.ts` e usar nos três lugares:

```ts
import { timingSafeEqual } from 'node:crypto';

export function compararSegredoSeguro(recebido: string, esperado: string): boolean {
  const bufferRecebido = Buffer.from(recebido, 'utf8');
  const bufferEsperado = Buffer.from(esperado, 'utf8');
  return (
    bufferRecebido.length === bufferEsperado.length &&
    timingSafeEqual(bufferRecebido, bufferEsperado)
  );
}
```

```ts
if (!compararSegredoSeguro(query['hub.verify_token'], this.verifyToken)) {
  throw new AcessoNegadoError('Token de verificação do webhook inválido');
}
```

### Critério de aceite

- Helper com testes unitários (igual, diferente, tamanhos diferentes, vazio).
- `documentacao.middleware.ts` e `webhook-whatsapp.controller.ts` usando o helper
  compartilhado, sem duplicação.

---

## SEG-7 — Cookie de refresh com `secure` fixo quebra ambiente local

**Prioridade:** Baixa
**Arquivo:** `src/helpers/cookie-autenticacao.helper.ts:8-13`

### Sintoma

```ts
const opcoesCookieRefresh = {
  httpOnly: true,
  secure: true,
  sameSite: 'none' as const,
  path: CAMINHO_COOKIE_REFRESH,
};
```

`secure: true` + `SameSite=None` está **correto para produção** e é o que
`AGENTS.md` exige. Mas em desenvolvimento sobre `http://localhost` o navegador
descarta o cookie: o `POST /api/v1/auth/refresh` nunca recebe o token e o
desenvolvedor perde a sessão a cada 15 minutos, sem mensagem de erro clara.

Chrome trata `http://localhost` como contexto seguro para `secure`, mas o
comportamento varia entre navegadores e não vale para acesso por IP de rede
local (`http://192.168.x.x:3000`), comum em teste com celular.

### Correção sugerida

Manter o padrão estrito em produção e relaxar apenas fora dela, sem tocar em
`httpOnly`:

```ts
import { ambiente } from '../config/ambiente.js';

const producao = ambiente.NODE_ENV === 'production';

const opcoesCookieRefresh = {
  httpOnly: true,
  secure: producao,
  // SameSite=None exige Secure; fora de produção usa Lax para funcionar em http.
  sameSite: (producao ? 'none' : 'lax') as 'none' | 'lax',
  path: CAMINHO_COOKIE_REFRESH,
};
```

Documente em `docs/api/autenticacao.md` que o comportamento difere por ambiente e
que **produção sempre usa `Secure` + `SameSite=None`**, conforme o contrato com
o frontend.

### Critério de aceite

- Teste com `NODE_ENV=production` que o `Set-Cookie` contém `Secure` e
  `SameSite=None`.
- Teste com `NODE_ENV=development` que contém `SameSite=Lax` e não contém
  `Secure`.
- `httpOnly` e `Path=/api/v1/auth` presentes nos dois casos.

---

# Performance

## PER-1 — Consulta ao banco central em toda requisição autenticada

**Prioridade:** Alta
**Arquivo:** `src/middlewares/resolucao-tenant.middleware.ts:23-45`

### Sintoma

```ts
const tenant = await tenants.buscarAtivoDoUsuario(identidade.email, identidade.tenantId);
```

O middleware está montado em **oito** grupos de rotas (`src/app.ts:211-311`) e
roda em toda requisição autenticada. `buscarAtivoDoUsuario`
(`src/repositories/tenant-central.repository.ts:42-57`) faz join com `usuarios`:

```sql
SELECT ... FROM tenant
WHERE public_id = $1 AND status = 'ATIVO' AND deletado_at IS NULL
  AND EXISTS (SELECT 1 FROM usuario WHERE tenant_id = tenant.id AND email = $2 AND ativo AND deletado_at IS NULL)
```

Além disso, `criptografia.descriptografar` roda AES-GCM a cada requisição para
obter uma string de conexão que já está em cache no gerenciador.

Consequência: o banco central vira gargalo compartilhado por todos os tenants —
a carga de leitura cresce linearmente com o tráfego agregado da plataforma, e
uma lentidão momentânea no central degrada todos os tenants simultaneamente.

Não há índice cobrindo `(public_id, status, deletado_at)`; o `@unique` de
`public_id` resolve a seletividade, mas o `EXISTS` depende de
`@@index([tenant_id])` em `Usuario` (`prisma/central/schema.prisma:60`), que não
inclui `email`.

### Correção sugerida

**1. Cache curto em Redis**, invalidado por eventos de mudança de acesso:

```ts
export function criarResolucaoTenantMiddleware(
  tenants: LeitorTenantCentral,
  criptografia: CriptografiaService,
  conexoes: GerenciadorConexoesTenant,
  cache: CacheResolucaoTenant,
  ttlSegundos = 30,
): RequestHandler {
  return async (requisicao, resposta, proximo) => {
    try {
      const identidade = requisicao.usuarioTenant;
      if (!identidade) throw new AcessoNegadoError();

      const chave = `tenant:${identidade.tenantId}:resolucao:${identidade.email}`;
      let resolucao = await cache.obter(chave);
      if (!resolucao) {
        const tenant = await tenants.buscarAtivoDoUsuario(identidade.email, identidade.tenantId);
        if (!tenant?.string_conexao_encrypted) {
          throw new AcessoNegadoError('Tenant inativo ou sem banco provisionado');
        }
        resolucao = {
          id: tenant.id,
          publicId: tenant.public_id,
          stringConexao: criptografia.descriptografar(tenant.string_conexao_encrypted),
        };
        await cache.gravar(chave, resolucao, ttlSegundos);
      }
      // ...
    } catch (erro) {
      proximo(erro);
    }
  };
}
```

Invalidar a chave em: desativação/exclusão de usuário
(`alterarAtivoERevogar`, `excluirERevogar`), mudança de status do tenant
(`alterarStatusAuditado`) e exclusão definitiva (`prepararExclusaoDefinitiva`).
Com TTL de 30 s, mesmo sem invalidação explícita a janela de exposição é curta —
mas invalide, porque revogação de acesso é requisito de segurança.

**Cuidado:** a string de conexão descriptografada em Redis é um segredo. Ou
guarde ainda criptografada no cache (descriptografando por requisição, que é
barato), ou cacheie apenas `{ id, publicId }` e resolva a conexão pelo
gerenciador, que já a mantém.

**2. Índice de apoio** — em `prisma/central/schema.prisma`, modelo `Usuario`:

```prisma
@@index([email, tenant_id, ativo])
```

Valide com `EXPLAIN ANALYZE` antes de versionar a migration, e confirme que não
fica redundante com o `@unique` de `email`.

### Critério de aceite

- Medição antes/depois: número de queries ao banco central por requisição cai de
  1 para ~0 em regime de cache quente.
- Teste que desativar um usuário invalida o cache e a próxima requisição recebe
  `403` (não espera o TTL).
- Nenhuma string de conexão em texto claro no Redis (verificado por inspeção da
  chave).

---

## PER-2 — Buscas com `contains` sem índice adequado

**Prioridade:** Alta
**Arquivos:** `src/repositories/consulta-historico.repository.ts:11-23` e `45-74`,
`src/repositories/fluxo.repository.ts:16`,
`src/repositories/tenant-central.repository.ts:221`

### Sintoma

Todas as buscas textuais usam `contains`, que o Prisma traduz para
`LIKE '%termo%'` (ou `ILIKE` com `mode: 'insensitive'`):

```ts
{ nome_normalizado: { contains: normalizarTextoBusca(entrada.busca) } },
{ telefone: { contains: entrada.busca.replace(/\D/g, '') } },
```

Um padrão com curinga **à esquerda** não usa índice B-tree. Os índices existentes
não ajudam:

- `Contato.@@index([nome_normalizado])` — inútil para `%termo%`;
- `Setor`, `UsuarioTenant`, `Municipio` — mesma situação;
- `Contato.telefone` é `@unique` — inútil para `%1199%`.

Resultado: **Seq Scan** em `contato`, `conversa` (com join em `contato`), `fluxo`
e `tenant` a cada busca. Enquanto as tabelas são pequenas ninguém percebe; com
dezenas de milhares de contatos por tenant, a listagem começa a levar segundos —
e cada busca é executada **duas vezes** (`findMany` + `count` no mesmo
`$transaction`).

Isso contraria `AGENTS.md`: _"Crie índices para colunas usadas em filtros, busca,
ordenação"_ e _"Para consultas críticas, valide o plano com `EXPLAIN`"_.

### Correção sugerida

**Opção recomendada — índice trigram** (mantém a semântica atual de "contém"):

Nova migration em `prisma/tenant/migrations/<timestamp>_busca_trigram/migration.sql`:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS contato_nome_normalizado_trgm
  ON "Contato" USING gin (nome_normalizado gin_trgm_ops);

CREATE INDEX IF NOT EXISTS contato_telefone_trgm
  ON "Contato" USING gin (telefone gin_trgm_ops);
```

Equivalente em `prisma/central/migrations/` para `Tenant.nome` e
`Municipio.nome_normalizado`. Declare os índices no schema Prisma:

```prisma
@@index([nome_normalizado(ops: raw("gin_trgm_ops"))], type: Gin)
```

**Opção alternativa — prefixo**: se a busca por prefixo atender o produto, troque
`contains` por `startsWith`, que usa os índices B-tree já existentes (exige
`text_pattern_ops` para colunas com collation não-C). É mais barato, mas muda o
comportamento visível — decida com o usuário.

**Ganho complementar**: evite o `count` em toda página. Ofereça `total` apenas na
primeira página (`skip === 0`) ou use contagem estimada para listas grandes.

### Critério de aceite

- `EXPLAIN ANALYZE` de `listarContatos` com busca mostra _Bitmap Index Scan_ em
  vez de _Seq Scan_, com dataset representativo (≥ 50 mil contatos).
- Migrations separadas para central e tenant, aplicáveis de forma independente.
- Testes de busca existentes continuam passando (mesma semântica).
- Resultado do `EXPLAIN` registrado no PR, conforme `AGENTS.md`.

---

## PER-3 — `SCAN MATCH` no Redis a cada desconexão de socket

**Prioridade:** Média
**Arquivo:** `src/websocket/chat.gateway.ts:184-204`

### Sintoma

```ts
do {
  const [proximo, chaves] = await this.pub.scan(
    cursor,
    'MATCH',
    `tenant:${identidade.tenantId}:presenca:${identidade.usuarioId}:*`,
    'COUNT',
    20,
  );
  cursor = proximo;
  if (chaves.length > 0) online = true;
} while (cursor !== '0' && !online);
```

`SCAN` percorre o **keyspace inteiro**, não apenas as chaves que casam com o
padrão — o `MATCH` é um filtro aplicado depois. O Redis é compartilhado por
todos os tenants e hospeda também filas BullMQ, chaves de idempotência de
webhook (TTL de 7 dias!) e estados de fluxo (TTL de 30 dias). Em produção esse
keyspace tem facilmente centenas de milhares de chaves.

Com `COUNT 20`, encontrar zero correspondências (justamente o caso comum: última
aba do atendente fechando) exige percorrer **todo** o keyspace em blocos de 20 —
milhares de round-trips para uma única desconexão. Cada reload de página do
frontend dispara isso. Em picos de troca de turno, é um martelo no Redis
compartilhado.

### Correção sugerida

Trocar a varredura por um `SET` de sockets por usuário:

```ts
private chaveSocketsUsuario(identidade: IdentidadeSocket): string {
  return `tenant:${identidade.tenantId}:presenca:${identidade.usuarioId}:sockets`;
}

private async atualizarPresenca(socket: Socket, identidade: IdentidadeSocket): Promise<void> {
  const chave = this.chaveSocketsUsuario(identidade);
  await this.pub
    .multi()
    .sadd(chave, socket.id)
    .expire(chave, 75)   // renovado a cada heartbeat de 30 s
    .exec();
  this.io.to(this.roomTenant(identidade.tenantId)).emit('atendente:presenca', {
    usuarioId: identidade.usuarioId, online: true, socketId: socket.id,
  });
}

private async registrarDesconexao(identidade: IdentidadeSocket, socketId: string): Promise<void> {
  const chave = this.chaveSocketsUsuario(identidade);
  const [, restantes] = (await this.pub.multi().srem(chave, socketId).scard(chave).exec()) ?? [];
  const online = Number(restantes?.[1] ?? 0) > 0;
  this.io.to(this.roomTenant(identidade.tenantId)).emit('atendente:presenca', {
    usuarioId: identidade.usuarioId, online, socketId,
  });
}
```

Custo por desconexão: duas operações O(1) em vez de uma varredura O(N) do
keyspace. O `EXPIRE` renovado a cada heartbeat garante limpeza de sockets órfãos
após crash do processo.

### Critério de aceite

- Nenhuma chamada a `scan` em `src/websocket/`.
- Teste de integração: duas abas do mesmo usuário; fechar uma mantém
  `online: true`, fechar a segunda emite `online: false`.
- Teste que a chave expira após o período sem heartbeat.

---

## PER-4 — Conexão Redis única compartilhada por filas, workers e presença

**Prioridade:** Média
**Arquivos:** `src/config/redis.ts:3-11`, `src/servidor.ts:50-159`

### Sintoma

Uma única instância `ioredis` é criada e passada para tudo:

```ts
const redis = criarConexaoRedis(ambiente.REDIS_URL, 'api');
// 4 Queues, 4 Workers, IdempotenciaRedisRepository, ChatGateway (que duplica pub/sub)
```

Os `Worker` do BullMQ duplicam a conexão para os comandos bloqueantes
(verificado em `node_modules/bullmq/dist/cjs/classes/worker.js:120-128`), então
**não há risco de bloqueio** por `BZPOPMIN` — esse ponto está correto.

O problema é de contenção: um único socket TCP e um único pipeline de comandos
atendem 4 filas produtoras, 4 workers (com `concurrency` somada de 35),
a reserva de idempotência no caminho crítico do webhook, e a presença do chat.
O webhook precisa responder em menos de 1 s (`AGENTS.md`), e seu `SET NX EX` fica
enfileirado atrás de comandos de manutenção de fila dos workers. Sob carga, a
latência do webhook passa a depender do volume de jobs.

Além disso, um erro fatal nessa conexão derruba simultaneamente webhook,
processamento e chat — não há isolamento de falha.

### Correção sugerida

Separar conexões por finalidade, mantendo o registro de recursos existente:

```ts
const redisFilas = criarConexaoRedis(ambiente.REDIS_URL, 'filas');
const redisWorkers = criarConexaoRedis(ambiente.REDIS_URL, 'workers');
const redisAplicacao = criarConexaoRedis(ambiente.REDIS_URL, 'aplicacao'); // idempotência, estado de fluxo
const redisChat = criarConexaoRedis(ambiente.REDIS_URL, 'chat'); // presença + adapter

const filaMensagens = recursosMensageria.registrar(
  criarFila<JobMensagemRecebida>(NOMES_FILAS.mensagensRecebidas, redisFilas),
);
// ...
new IdempotenciaRedisRepository(redisAplicacao);
```

Ajuste o encerramento em `encerrar()` (`src/servidor.ts:192-204`) para fechar
todas as conexões, mantendo o tratamento de `status === 'wait'` que já existe
para o `lazyConnect`.

Considere também `enableOfflineQueue: false` na conexão do webhook: melhor
falhar rápido e devolver erro à Meta (que reenvia) do que acumular comandos em
memória durante uma indisponibilidade do Redis.

### Critério de aceite

- Cada finalidade com `connectionName` próprio, visível em `CLIENT LIST`.
- Teste de encerramento gracioso que fecha todas as conexões sem
  `unhandledRejection`.
- Latência p99 da rota de webhook medida sob carga de fila, comprovando
  independência do volume de jobs.

---

## PER-5 — `_count` por linha na listagem de contatos

**Prioridade:** Baixa
**Arquivo:** `src/repositories/consulta-historico.repository.ts:25-41`

### Sintoma

```ts
select: {
  // ...
  _count: { select: { conversas: true } },
},
```

O Prisma resolve `_count` com uma subconsulta correlacionada por linha. Com
`take` de até 100 (`src/dtos/paginacao.dto.ts:5`), são até 100 contagens de
`conversa` por página, cada uma percorrendo o índice
`@@index([contato_id, created_at])`. Junto com o `count` total da paginação, uma
listagem de contatos custa 3 varreduras distintas.

Não é crítico hoje, mas escala mal com o histórico de conversas — que é
justamente a tabela que mais cresce.

### Correção sugerida

Avaliar com o frontend se o total de conversas por contato é realmente exibido
na lista. Se for apenas informativo:

- **remover** o `_count` da listagem e mantê-lo só no detalhe do contato; ou
- **desnormalizar** com um contador em `Contato` atualizado na mesma transação de
  `HistoricoRepository.persistirRecebida`, que já é `Serializable`:

  ```prisma
  model Contato {
    // ...
    total_conversas Int @default(0)
  }
  ```

Depois valide o plano com `EXPLAIN ANALYZE` antes e depois.

### Critério de aceite

- Decisão registrada em `docs/api/historico-conversas.md` sobre o campo.
- Se mantido, medição comprovando custo aceitável com ≥ 50 mil contatos.
- Se removido, contrato de resposta atualizado no Swagger e no Markdown.

---

# Qualidade de código

## QUA-1 — Controllers instanciam services e repositories

**Prioridade:** Média
**Arquivos:** `src/controllers/fluxo.controller.ts:87-94`,
`src/controllers/direcionamento-atendimento.controller.ts:62-71`,
`src/controllers/conta-whatsapp.controller.ts:80-96`,
`src/controllers/empresa.controller.ts:37-44`,
`src/controllers/mensagem-atendimento.controller.ts:15-18`

### Sintoma

```ts
private repository(requisicao: Request): FluxoRepository {
  return new FluxoRepository(this.prisma(requisicao));
}
```

O `AGENTS.md` determina _"Use injeção de dependência simples por construtor"_.
Aqui o controller monta o grafo de dependências a cada requisição. Efeitos:

- **testabilidade** — não dá para injetar um repository falso sem simular todo o
  `Request`; os testes atuais são todos de integração via `supertest`;
- **acoplamento** — `FluxoController` importa `FluxoRepository`, `SetorRepository`,
  `MotorFluxoService`, `PublicacaoFluxoService`, `ValidacaoGrafoFluxoService` e
  `CatalogoBlocosFluxoService` (6 dependências concretas);
- **alocação por requisição** — barata individualmente, mas é sintoma do
  acoplamento, não a causa.

A razão real é legítima: o `PrismaClient` só existe **depois** da resolução do
tenant, em tempo de requisição. A solução não é abandonar DI, e sim injetar
_fábricas_.

### Correção sugerida

```ts
type FabricaFluxoRepository = (prisma: PrismaClient) => FluxoRepository;
type FabricaPublicacaoFluxo = (prisma: PrismaClient) => PublicacaoFluxoService;

export class FluxoController {
  public constructor(
    private readonly criarRepository: FabricaFluxoRepository,
    private readonly criarPublicacao: FabricaPublicacaoFluxo,
    private readonly motor: MotorFluxoService,
    private readonly catalogo: CatalogoBlocosFluxoService,
  ) {}

  public listar = async (requisicao: Request, resposta: Response): Promise<void> => {
    const repository = this.criarRepository(this.prisma(requisicao));
    resposta
      .status(200)
      .json(await repository.listar(requisicao.query as unknown as ListarFluxosEntrada));
  };
}
```

Composição em `app.ts` (ou no módulo de composição sugerido em `QUA-3`):

```ts
new FluxoController(
  (prisma) => new FluxoRepository(prisma),
  (prisma) =>
    new PublicacaoFluxoService(
      new FluxoRepository(prisma),
      new ValidacaoGrafoFluxoService(new SetorRepository(prisma)),
    ),
  new MotorFluxoService(),
  new CatalogoBlocosFluxoService(),
);
```

`MotorFluxoService` e `CatalogoBlocosFluxoService` são stateless — podem ser
singletons, hoje são recriados a cada chamada.

### Critério de aceite

- Nenhum `new *Repository(` ou `new *Service(` dentro de `src/controllers/`
  (`grep -rn 'new .*\(Repository\|Service\)(' src/controllers/`).
- Ao menos um teste unitário de controller com fábricas falsas, sem `supertest`.
- Comportamento das rotas inalterado (testes de integração passam sem edição).

---

## QUA-2 — Erro interno mascarado como `404 NAO_ENCONTRADO`

**Prioridade:** Baixa
**Arquivos:** `src/controllers/fluxo.controller.ts:92`,
`src/controllers/empresa.controller.ts:42`,
`src/controllers/conta-whatsapp.controller.ts:94,99,107`,
`src/controllers/direcionamento-atendimento.controller.ts:48,69`,
`src/controllers/mensagem-atendimento.controller.ts:12`

### Sintoma

```ts
private prisma(requisicao: Request): PrismaClient {
  if (!requisicao.contextoTenant) throw new NaoEncontradoError('Contexto do tenant ausente');
  return requisicao.contextoTenant.prisma;
}
```

`contextoTenant` ausente significa que o middleware de resolução não rodou — um
**erro de montagem da aplicação**, não um recurso inexistente. Devolver `404` a
um cliente que fez tudo certo:

- confunde o frontend, que trata `404` como "não existe" e pode limpar a tela;
- esconde a falha real do time: um `404` passa despercebido nos dashboards,
  enquanto um `500` gera alerta;
- polui o significado de `NAO_ENCONTRADO` no contrato da API.

### Correção sugerida

Criar um erro específico de invariante:

```ts
// src/erros/erro-aplicacao.ts
export class ContextoIndisponivelError extends ErroAplicacao {
  public constructor(recurso: string) {
    super('ERRO_INTERNO', `Contexto obrigatório ausente: ${recurso}`, 500);
  }
}
```

E extrair os acessos repetidos para helpers compartilhados, eliminando a
duplicação em cinco controllers:

```ts
// src/helpers/contexto-requisicao.helper.ts
export function exigirPrismaTenant(requisicao: Request): PrismaClient {
  if (!requisicao.contextoTenant) throw new ContextoIndisponivelError('contextoTenant');
  return requisicao.contextoTenant.prisma;
}

export function exigirUsuarioTenant(requisicao: Request): UsuarioTenantAutenticado {
  if (!requisicao.usuarioTenant) throw new ContextoIndisponivelError('usuarioTenant');
  return requisicao.usuarioTenant;
}
```

O `tratarErro` já registra `logger.error` para erros não-`ErroAplicacao`; como
este será `ErroAplicacao` com status 500, adicione log explícito no middleware
para status ≥ 500.

### Critério de aceite

- Nenhum `NaoEncontradoError` com mensagem sobre "contexto" em `src/controllers/`.
- Teste que a rota montada sem o middleware de resolução devolve `500 ERRO_INTERNO`
  e registra log de erro.
- Helpers com testes unitários.

---

## QUA-3 — `app.ts` concentra composição e repete blocos idênticos

**Prioridade:** Média
**Arquivo:** `src/app.ts:92-339` (339 linhas, 68 imports)

### Sintoma

O bloco abaixo aparece **oito vezes**, idêntico, entre as linhas 211 e 311:

```ts
criarAutenticacaoMiddleware(tokenTenant),
criarResolucaoTenantMiddleware(
  tenantsRepository,
  criptografiaConexaoTenant,
  obterGerenciadorConexoesTenant(),
),
```

Além da repetição, há inconsistência que passa despercebida justamente por causa
dela: nas linhas 138 e 217 o gerenciador é obtido de duas formas diferentes
(`conexoesTenant` já em variável, e `obterGerenciadorConexoesTenant()` chamado de
novo). É o mesmo singleton hoje, mas o código sugere que poderiam divergir.

Também há três instâncias separadas de `CriptografiaService` com a mesma chave
`TENANT_CONEXAO_CRIPTOGRAFIA_CHAVE` (linhas 135, 148) e mais uma em
`servidor.ts:69,74,81,155` — quatro objetos idênticos.

Uma função de 250 linhas que faz composição, montagem de rotas e configuração de
middlewares é difícil de revisar e é onde erros de ordem de middleware passam
despercebidos (ver `SEG-1`, sobre `trust proxy`).

### Correção sugerida

**1. Extrair o par de middlewares:**

```ts
// src/middlewares/contexto-tenant.middleware.ts
export function criarContextoTenant(
  tokens: TokenTenantService,
  tenants: LeitorTenantCentral,
  criptografia: CriptografiaService,
  conexoes: GerenciadorConexoesTenant,
): RequestHandler[] {
  return [
    criarAutenticacaoMiddleware(tokens),
    criarResolucaoTenantMiddleware(tenants, criptografia, conexoes),
  ];
}
```

```ts
const contextoTenant = criarContextoTenant(
  tokenTenant,
  tenantsRepository,
  criptografiaConexaoTenant,
  conexoesTenant,
);

aplicacao.use('/api/v1/fluxos', contextoTenant, criarRotasFluxos(fluxoController));
aplicacao.use('/api/v1/empresa', contextoTenant, criarRotasEmpresa(empresaController));
// ...
```

**2. Separar composição de montagem** — mover a criação de services e
controllers para `src/composicao/container.ts`, deixando `criarAplicacao`
responsável só por middlewares globais e mapeamento de rotas. Isso também
elimina a duplicação de `CriptografiaService` entre `app.ts` e `servidor.ts`.

**3. Reutilizar as instâncias de criptografia** em vez de recriá-las.

### Critério de aceite

- `src/app.ts` abaixo de 150 linhas.
- Uma única instância de `CriptografiaService` por chave em todo o processo.
- Uma única forma de obter o gerenciador de conexões.
- Todos os testes de integração passam sem alteração.

---

## QUA-4 — Hash dummy do bcrypt duplicado em dois arquivos

**Prioridade:** Baixa (resolvido junto com `SEG-2`)
**Arquivos:** `src/services/autenticacao.service.ts:39`,
`src/services/exclusao-tenant.service.ts:80`

### Sintoma

A mesma string literal de 56 caracteres aparece nos dois arquivos. Além de estar
incorreta (ver `SEG-2`), é uma constante de segurança copiada — se alguém
corrigir um lado, o outro fica silenciosamente vulnerável.

`AGENTS.md`: _"Conversões reutilizáveis pertencem a helpers compartilhados em
`src/helpers/`, nunca duplicadas em controllers, services ou repositories."_

### Correção sugerida

Já coberta em `SEG-2`: `src/helpers/hash-dummy.helper.ts` exportando
`HASH_DUMMY_COMPARACAO`.

### Critério de aceite

- `grep -rn '\$2[aby]\$' src/` retorna vazio.
- Ambos os services importam do helper.

---

## QUA-5 — `TotpService` não valida o tamanho da chave

**Prioridade:** Baixa
**Arquivo:** `src/services/totp.service.ts:9-11`

### Sintoma

```ts
public constructor(chaveHexadecimal: string) {
  this.chave = Buffer.from(chaveHexadecimal, 'hex');
}
```

`CriptografiaService` valida explicitamente (`src/services/criptografia.service.ts:8-10`):

```ts
if (this.chave.length !== 32) {
  throw new Error('A chave de criptografia deve possuir 32 bytes');
}
```

`TotpService` não valida. Hoje o schema de ambiente garante 64 hex para
`TOTP_CRIPTOGRAFIA_CHAVE`, então não há falha em produção. Mas em teste ou em um
refactor futuro, uma chave curta produz `createCipheriv` lançando erro obscuro
**no meio do fluxo de login do super admin**, em vez de falhar no boot.

`Buffer.from(valor, 'hex')` também ignora silenciosamente caracteres inválidos —
uma chave com typo vira um buffer truncado sem aviso.

### Correção sugerida

Reaproveitar a validação já existente em vez de duplicá-la:

```ts
export class TotpService {
  private readonly criptografia: CriptografiaService;

  public constructor(chaveHexadecimal: string) {
    this.criptografia = new CriptografiaService(chaveHexadecimal);
  }

  public criptografar(valor: string): string {
    return this.criptografia.criptografar(valor);
  }

  public descriptografar(valor: string): string {
    return this.criptografia.descriptografar(valor);
  }
  // ... métodos TOTP permanecem ...
}
```

**Atenção — mudança de formato:** `CriptografiaService` prefixa com `v1.` e usa 4
partes; `TotpService` usa 3 partes sem versão. Segredos TOTP já gravados no
banco **não** serão lidos pelo novo formato. Ou escreva uma migração de dados,
ou mantenha o formato atual e apenas adicione a validação de 32 bytes no
construtor. Para o volume esperado de super admins, a segunda opção é mais
segura.

### Critério de aceite

- Construtor lança erro claro para chave com tamanho incorreto.
- Teste unitário com chave de 16 bytes esperando erro no construtor.
- Segredos TOTP existentes continuam sendo decifrados (teste com payload no
  formato antigo).

---

## QUA-6 — Condicional duplicada em `MensagemAtendimentoService`

**Prioridade:** Baixa
**Arquivo:** `src/services/mensagem-atendimento.service.ts:42-50`

### Sintoma

```ts
if (!mensagem.duplicada) await this.enfileirador.adicionar(dados.tenantId, mensagem.public_id);
if (!mensagem.duplicada) barramentoChat.publicar('conversa:mensagem_atualizada', {/* ... */});
```

A mesma condição avaliada duas vezes em sequência. Além do ruído, há um risco
real: se `enfileirador.adicionar` lançar, o evento de chat não é publicado — mas
a mensagem **já foi persistida** como `PENDENTE`. O frontend não recebe
notificação e a mensagem some da tela até um refresh.

### Correção sugerida

```ts
if (mensagem.duplicada) return mensagem;

await this.enfileirador.adicionar(dados.tenantId, mensagem.public_id);
barramentoChat.publicar('conversa:mensagem_atualizada', {
  tenantId: dados.tenantId,
  conversaId: conversa.public_id,
  ...(conversa.setor ? { setorId: conversa.setor.public_id } : {}),
  mensagemId: mensagem.public_id,
  dados: { status: mensagem.status_entrega },
});
return mensagem;
```

Se a publicação do evento precisar ocorrer mesmo com falha no enfileiramento,
inverta a ordem ou use `try/finally` — mas defina explicitamente o comportamento
desejado e cubra com teste.

### Critério de aceite

- Uma única avaliação de `mensagem.duplicada`.
- Teste que falha no enfileirador produz o comportamento decidido (erro
  propagado, sem estado inconsistente visível ao frontend).

---

## QUA-7 — Validação de ciclos recursiva no grafo de fluxo

**Prioridade:** Baixa
**Arquivo:** `src/services/validacao-grafo-fluxo.service.ts:121-144`

### Sintoma

```ts
const visitar = (noId: string): void => {
  // ...
  for (const referencia of this.referencias(no)) visitar(referencia.id);
  // ...
};
```

DFS recursivo. `definicaoFluxoSchema` limita a 500 nós
(`src/dtos/fluxo.dto.ts:207`), então a profundidade máxima é 500 — bem dentro do
limite de pilha do Node (~10 mil quadros). **Não é um bug hoje.**

Vale registrar porque: (a) o catálogo declara `maximoBlocos: 500`
(`src/dtos/fluxo.dto.ts:185`) como literal, e se esse número subir a recursão
vira risco real; (b) `validarAlcancabilidade` logo acima (linhas 84-110) já usa
uma pilha explícita — as duas travessias do mesmo grafo usam estratégias
diferentes sem motivo.

### Correção sugerida

Uniformizar com pilha explícita, no mesmo estilo de `validarAlcancabilidade`:

```ts
private validarCiclos(
  nos: NoFluxo[],
  nosPorId: ReadonlyMap<string, NoFluxo>,
  erros: ErroValidacaoGrafo[],
): void {
  const estado = new Map<string, 'visitando' | 'concluido'>();
  const reportados = new Set<string>();

  for (const inicial of nos) {
    if (estado.has(inicial.id)) continue;
    const pilha: { noId: string; expandido: boolean }[] = [
      { noId: inicial.id, expandido: false },
    ];

    while (pilha.length > 0) {
      const atual = pilha.pop();
      if (!atual) continue;

      if (atual.expandido) {
        estado.set(atual.noId, 'concluido');
        continue;
      }
      const situacao = estado.get(atual.noId);
      if (situacao === 'concluido') continue;
      if (situacao === 'visitando') {
        if (!reportados.has(atual.noId)) {
          reportados.add(atual.noId);
          erros.push({
            codigo: 'CICLO_NAO_PERMITIDO',
            noId: atual.noId,
            campo: 'proximo',
            mensagem: 'O fluxo determinístico não permite ciclos',
          });
        }
        continue;
      }

      estado.set(atual.noId, 'visitando');
      pilha.push({ noId: atual.noId, expandido: true });
      const no = nosPorId.get(atual.noId);
      if (no) {
        for (const referencia of this.referencias(no)) {
          pilha.push({ noId: referencia.id, expandido: false });
        }
      }
    }
  }
}
```

Se `maximoBlocos` for elevado no futuro, esta implementação não precisa mudar.

### Critério de aceite

- Testes existentes de detecção de ciclo em
  `tests/services/validacao-grafo-fluxo.service.test.ts` continuam passando.
- Novo teste com cadeia linear de 500 nós (limite do schema) sem estouro de
  pilha e com detecção correta de ciclo no último nó.

---

# Testes

## TES-1 — Sem teste para evicção e concorrência do gerenciador de conexões

**Prioridade:** Alta (bloqueia validar `FAL-2`)
**Arquivo alvo:** `tests/database/gerenciador-conexoes-tenant.test.ts` (não existe)

`src/database/gerenciador-conexoes-tenant.ts` é o ponto central do isolamento
multi-tenant e não tem cobertura direta. `tests/database/isolamento-tenants.test.ts`
verifica separação de dados, não o ciclo de vida das conexões.

Cenários a cobrir (com `PrismaClient` falso, sem banco real):

```ts
it('não desconecta cliente que ainda está em uso', async () => {
  const gerenciador = new GerenciadorConexoesTenantLru(1);
  const clienteA = await gerenciador.obter(1, 'postgresql://a');
  await gerenciador.obter(2, 'postgresql://b'); // força evicção de 1
  expect(clienteA.desconectado).toBe(false);
});

it('desconecta o cliente descartado assim que a última referência é liberada', async () => {
  /* ... */
});
it('reaproveita a mesma abertura em chamadas concorrentes para o mesmo tenant', async () => {
  /* ... */
});
it('remove a abertura do mapa quando $connect falha', async () => {
  /* ... */
});
it('fecha() aguarda abertura em andamento antes de desconectar', async () => {
  /* ... */
});
```

**Critério de aceite:** todos os cenários acima cobertos; a suíte falha se o
`$disconnect()` incondicional de `abrir()` for reintroduzido.

---

## TES-2 — Sem teste para webhook com mensagem não-texto

**Prioridade:** Alta (bloqueia validar `FAL-1` e `FAL-3`)
**Arquivo alvo:** `tests/webhook-whatsapp.test.ts` (ampliar)

A suíte atual cobre assinatura inválida, challenge e mensagem de texto. Faltam
exatamente os casos que quebram em produção:

```ts
it('aceita e ignora mensagem de imagem sem falhar o webhook', async () => {
  const corpo = {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: '1',
        changes: [
          {
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: { phone_number_id: 'PNI' },
              messages: [
                {
                  id: 'wamid.1',
                  from: '5511999999999',
                  timestamp: '1735689600',
                  type: 'image',
                  image: { id: 'midia-1', mime_type: 'image/jpeg' },
                },
              ],
            },
          },
        ],
      },
    ],
  };
  const resposta = await enviarWebhookAssinado(corpo);
  expect(resposta.status).toBe(200);
  expect(resposta.body).toMatchObject({ recebidas: 0, ignoradas: 1 });
});

it('devolve 200 quando o phone_number_id não tem tenant ativo', async () => {
  /* ... */
});
it('processa a entry válida mesmo quando outra entry tem roteamento inválido', async () => {
  /* ... */
});
it('aceita field diferente de "messages" sem erro', async () => {
  /* ... */
});
```

**Critério de aceite:** nenhum payload realista da Meta produz resposta diferente
de `2xx` quando a assinatura é válida.

---

## TES-3 — Sem teste para o processador de mensagem de saída

**Prioridade:** Média (bloqueia validar `FAL-4` e `FAL-5`)
**Arquivo alvo:** `tests/services/processador-mensagem-saida.service.test.ts` (não existe)

`ProcessadorMensagemSaidaService` concentra o reenvio, a marcação de tentativa e
a classificação de erro transitório — nenhuma dessas regras tem teste.

```ts
it('marca como ENVIADA e grava o id da Meta em caso de sucesso', async () => {
  /* ... */
});
it('marca FALHA e não relança quando o erro não é transitório', async () => {
  /* ... */
});
it('libera a tentativa e relança quando o erro é transitório (permite retry)', async () => {
  /* ... */
});
it('retoma o envio quando a reserva anterior expirou (simula crash do worker)', async () => {
  /* ... */
});
it('não envia duas vezes quando dois workers processam o mesmo job', async () => {
  /* ... */
});
```

**Critério de aceite:** cenário de crash entre `marcarTentativa` e
`marcarEnviada` resulta em envio na tentativa seguinte, não em `JA_PROCESSADA`.

---

## TES-4 — Sem teste de autorização nas rotas de fluxos

**Prioridade:** Média (bloqueia validar `SEG-3`)
**Arquivo alvo:** `tests/fluxos-api.test.ts` (ampliar)

`tests/middlewares/autorizacao-tenant.middleware.test.ts` cobre o middleware
isolado, mas nenhum teste verifica **quais rotas de fluxo o aplicam** — que é
exatamente onde está a lacuna.

```ts
describe.each([
  ['post', '/api/v1/fluxos'],
  ['put', '/api/v1/fluxos/:id'],
  ['delete', '/api/v1/fluxos/:id'],
  ['post', '/api/v1/fluxos/:id/publicar'],
])('%s %s exige papel de gestão', (metodo, rota) => {
  it('recusa ATENDENTE com 403', async () => {
    /* ... */
  });
  it('aceita GESTOR', async () => {
    /* ... */
  });
});
```

Considere um teste de guarda que enumere as rotas registradas e falhe se alguma
rota mutadora de tenant não tiver middleware de papel — evita que a lacuna se
repita em módulos futuros.

**Critério de aceite:** matriz de papéis × endpoints coberta e coerente com
`docs/api/fluxos.md`.

---

## Observações que não viraram tarefa

Itens avaliados e conscientemente **não** listados como correção:

- **`.env.example` com valores que falham o schema** (ex.:
  `TENANT_CONEXAO_CRIPTOGRAFIA_CHAVE=gere-com-openssl-rand-hex-32`) — é
  intencional: o boot falha com mensagem clara indicando o que gerar. Melhor que
  um valor válido copiado para produção.
- **Conexão BullMQ compartilhada bloqueando comandos** — verificado em
  `node_modules/bullmq/dist/cjs/classes/worker.js:120-128`: os workers duplicam a
  conexão para comandos bloqueantes. O problema real é de contenção, tratado em
  `PER-4`.
- **Colisão de nome de banco de tenant** — `gerarNomeBanco` usa 12 hex do UUID
  (48 bits). `Tenant.nome_do_banco` é `@unique` no schema central, então uma
  colisão falha o provisionamento com `P2002` em vez de reaproveitar o banco de
  outro tenant. Risco aceitável.
- **`Dockerfile` sem `HEALTHCHECK`** apesar de instalar `curl` — a orquestração
  provavelmente usa `/api/v1/prontidao` externamente; confirme com o time de
  infraestrutura antes de adicionar.
- **`process.once('unhandledRejection')` derrubando o processo** — é a
  recomendação oficial do Node; o encerramento gracioso já está implementado
  corretamente com timeout forçado e `unref()`.
