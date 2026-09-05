# TS Module Management

Aplicação independente que expõe `ManagementPage.vue` por Module Federation.
O módulo contém as experiências de Produzíveis, Catálogo, Congelados,
Entregadores e Usuários. Congelados, Catálogo, Produzíveis e Entregadores usam a
API autenticada como fonte autoritativa; Usuários ainda preserva a demonstração
local até sua evolução dedicada.

## Entregadores

As telas de Entregadores persistem identificação, nome, telefone opcional,
estado ativo e disponibilidade operacional. Edições usam versão otimista e
somente cadastros ativos e disponíveis podem receber uma nova rota.

## Congelados

As rotas `/congelados`, `/congelados/entrada` e `/congelados/lotes/:id`
consultam e alteram configurações, estoque, vencimentos, lotes e movimentos pela
API. Entradas, ajustes e descartes usam idempotência; validade e saldos são
calculados no domínio do servidor. Loading, vazio, erro e retentativa são
tratados sem manter estado otimista incorreto.

## Impressão de etiquetas de congelados

Entradas e reimpressões de lotes preparam etiquetas Zebra em ZPL de 100 × 50 mm.
A configuração da estação é centralizada no `ts-host`; em modo `auto`, a
impressão pelo navegador continua disponível como fallback.

O snapshot do lote usado na etiqueta vem da API. O histórico autoritativo de
tentativas de impressão e a integração física completa pertencem ao E10.

As listagens usam abas com contagens para alternar estados: Produzíveis separa
itens com e sem composição; Ofertas, Tipos de componente, Adicionais,
Entregadores e Usuários separam registros ativos e inativos.

## Entregadores

A rota `/entregadores` oferece busca, filtro por status, paginação, cadastro e
edição direta. O cadastro mínimo inclui identificação, nome, telefone opcional e
estado ativo/inativo. A persistência demonstrativa usa a chave
`ts-management-delivery-drivers-v1` do `localStorage`.

Estados previsíveis podem ser revisados com `?mock=sem-entregadores`,
`?mock=sem-resultados` e `?mock=erro`.

## Usuários

A rota `/usuarios` oferece busca, filtro por status, paginação, cadastro e
edição direta. Cada usuário possui nome, identificação de acesso única, status
e um dos perfis iniciais: Administrador, Operador ou Entregador. A persistência
demonstrativa usa a chave `ts-management-users-v1` do `localStorage`.

Estados previsíveis podem ser revisados com `?mock=sem-usuarios`,
`?mock=sem-resultados` e `?mock=erro`.

```bash
npm install
npm run dev
```

A aplicação é executada em http://localhost:4176. O host carrega o arquivo
`remoteEntry.js` em http://localhost:4176/remoteEntry.js.
