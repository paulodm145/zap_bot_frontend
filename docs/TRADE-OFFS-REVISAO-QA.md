# Decisões de trade-off da revisão de QA

Este documento registra as escolhas realizadas durante a correção de
`docs/revisao-qa.md`. Ele preserva as divergências encontradas para revisão
posterior por outra IA ou pela equipe, sem deixar o código depender de uma
decisão implícita.

## Fluxo de entrada (`FAL-8`)

O motor não deve escolher arbitrariamente o fluxo publicado mais recente. A
conta WhatsApp passa a referenciar explicitamente um fluxo de entrada
publicado. Sem essa configuração, a mensagem é persistida e disponibilizada ao
atendimento, mas a automação não é iniciada. Essa escolha privilegia
previsibilidade e permite múltiplos números com fluxos diferentes.

## Permissões de fluxos (`SEG-3`)

Leitura e simulação permanecem disponíveis a qualquer usuário autenticado.
Criação, edição, publicação e exclusão exigem `ADMIN_TENANT` ou `GESTOR`. A
proteção contra alteração do comportamento global do bot prevalece sobre a
descrição anterior, genérica, de “usuário autenticado”.

## Cookie local (`SEG-7`)

Produção mantém obrigatoriamente `Secure` e `SameSite=None`. Desenvolvimento e
teste usam `SameSite=Lax` sem `Secure`, permitindo HTTP local. A diferença é
limitada pelo `NODE_ENV` e não relaxa o contrato de produção.

## Busca textual (`PER-2`)

A semântica visível de busca por trecho é preservada. São usados índices GIN
com `pg_trgm`; não se troca `contains` por busca de prefixo. Isso aumenta o
custo de escrita e armazenamento, aceito em favor da experiência existente.

## Total de conversas na lista (`PER-5`)

O `_count` correlacionado é removido da listagem de contatos. O total pertence
ao detalhe quando necessário. Evita-se desnormalização enquanto não houver uma
consulta concreta que justifique o custo transacional de manter um contador.

## Falha ao enfileirar mensagem (`QUA-6`)

Persistência e evento WebSocket permanecem visíveis mesmo se a fila falhar: o
evento é publicado em `finally` e o erro é propagado. A mensagem continua
`PENDENTE`, permitindo recuperação operacional, sem desaparecer da interface.

## Reserva de envio expirada (`FAL-4`)

A reserva pode ser retomada após dois minutos. Esgotamento definitivo continua
sendo responsabilidade das tentativas do BullMQ, que chama a classificação de
falha na última tentativa; não é criada uma varredura com um limite concorrente
e potencialmente divergente do job.

## Cache de autorização (`PER-1`)

O cache guarda apenas identidade interna, UUID público e conexão ainda
criptografada. Revogações invalidam explicitamente as chaves e um TTL curto é
mantido como defesa adicional. Nenhuma string de conexão em texto claro é
persistida no Redis.

## Filtros combinados do histórico

Filtros de setor, atendente, visão e escopo do usuário são combinados com
AND, em vez de propriedades repetidas no objeto Prisma. Isso evita que um
filtro posterior sobrescreva o isolamento do atendente ou a seleção feita na
tela.

## Exclusividade do roteamento WhatsApp

O vínculo de phone_number_id é criado somente quando não existe outro tenant.
A escrita concorrente que perder a corrida retorna conflito e não transfere
silenciosamente o número. Operações que falham após alterar a conta tentam
restaurar tanto o estado local quanto o índice central; falhas de
reconciliação permanecem registradas para correção operacional.

## Auditorias

As tabelas de auditoria do tenant também mantêm created_at e updated_at,
mesmo sendo predominantemente append-only, para manter o contrato estrutural
uniforme de persistência e permitir futuras correções administrativas sem
exceções de schema.
