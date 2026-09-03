# TS Module Management

Aplicação independente que expõe `ManagementPage.vue` por Module Federation.
O módulo contém as experiências de Produzíveis, Catálogo, Entregadores e Usuários, com
mocks locais persistidos no navegador apenas para demonstração.

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
