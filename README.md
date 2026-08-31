# TS Module Management

Aplicação independente que expõe `ManagementPage.vue` por Module Federation.
Nesta primeira versão, o módulo contém a experiência de Produzíveis e usa mocks
locais persistidos no navegador apenas para demonstração.

```bash
npm install
npm run dev
```

A aplicação é executada em http://localhost:4176. O host carrega o arquivo
`remoteEntry.js` em http://localhost:4176/remoteEntry.js.
