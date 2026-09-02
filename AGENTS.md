# Padrão de páginas — Sabor Santè

## Antes de alterar

- Leia primeiro `../ts-host/ESTUDO DE CASO.md`; regras do negócio prevalecem sobre conveniência visual ou técnica.
- Use Pedidos como fonte da macrodiagramação e Clientes como adaptação validada para cadastros:
  - `../ts-module-operation/src/pages/OrderListPage.vue`, `OrderDetailPage.vue` e `NewOrderPage.vue`;
  - `../ts-module-commercial/src/pages/CustomerListPage.vue`, `CustomerDetailPage.vue` e `CustomerFormPage.vue`.
- Reutilize `@thiagoschoeffel/ts-components`; não recrie componentes disponíveis na biblioteca.

## Diagramação

- Cabeçalho: `PageHeader` à esquerda e ação principal ou “Voltar para {entidade}” à direita. Páginas internas preservam o parâmetro `retorno`; a listagem não exibe voltar.
- Separe cabeçalho e conteúdo com `mt-6`. Use `gap-4`/`space-y-4` entre blocos relacionados e `gap-6` entre colunas principais.
- Listagens desktop devem ocupar o máximo da altura útil do palco, como em Clientes e Pedidos: aplique `md:h-[calc(100dvh-11rem)]`, `md:min-h-0` e layout flex no contêiner da página; faça o `main` crescer com `md:flex-1 md:min-h-0`; e mantenha a listagem interna com `md:h-full`. A `DataTable` deve crescer no espaço restante do card, sem usar uma altura fixa ou repetir o cálculo do viewport dentro da página.
- Formulários usam conteúdo principal e resumo lateral: `lg:grid-cols-[minmax(0,1fr)_20rem]`; o resumo pode ser `sticky top-20`.
- Detalhes usam cards com títulos, alinhamentos e espaçamentos equivalentes aos de Pedidos. No mobile, empilhe conteúdo e mantenha ações acessíveis.

## Listagens

- Tabs que navegam entre subseções da entidade ficam acima do cabeçalho da seção e usam variante `primary` na opção ativa. No Catálogo, o cabeçalho indica a hierarquia “Catálogo → subseção” com `ArrowRightIcon`, e título, subtítulo e ação mudam conforme a tab.
- Card superior: busca e filtros. Card inferior: `DataTable`, estados e paginação no rodapé.
- Não repita no card de filtros a quantidade total de registros quando essa informação já aparece no texto da paginação. Contagens nas tabs só devem existir quando distinguem listas ou estados e ajudam na escolha do filtro.
- Toda coluna significativa deve informar ordenação; defina uma ordenação inicial previsível e preserve busca, tab, ordenação e página na URL.
- Forneça loading, erro e `EmptyState`; dentro de cards, prefira empty state sem borda artificial (`bordered=false`).
- Listagens devem aceitar cenários previsíveis por URL para revisão visual: `mock=padrao`, ausência total da entidade (`sem-ofertas`, `sem-tipos`, `sem-adicionais`, `sem-produziveis`), `sem-resultados` e `erro`. O estado sem dados oferece a ação principal; sem resultados limpa filtros; erro permite tentar novamente.
- Mantenha equivalência funcional no mobile, mesmo quando a tabela virar cards.

## Formulários e detalhes

- Valores de domínio fechados usam `Select`/`MultiSelect`, nunca texto livre. Valores repetíveis removíveis usam `Chips`.
- Formulários auxiliares abrem em `Drawer size="large"`, com título e descrição claros, campos explicados e ações no rodapé em cantos opostos: cancelar à esquerda e confirmar à direita. Tipos de componente, adicionais, componentes da oferta e grupos de escolha seguem esse padrão.
- Fluxos auxiliares com subcadastros mudam o conteúdo do mesmo drawer, como a personalização de itens em Pedidos. No grupo de escolha, adicionar ou editar uma opção abre uma etapa própria, com navegação de volta, validação local e retorno ao resumo do grupo.
- Listagens dentro ou fora de drawers usam `Card` branco do design system, nunca um bloco customizado com fundo cinza.
- Em páginas de detalhe, conjuntos estruturados usam tabela com cabeçalho e linhas no desktop e uma versão compacta equivalente no mobile. Ofertas aplicam isso a componentes incluídos, adicionais permitidos e opções dos grupos de escolha.
- Ações destrutivas de itens repetíveis exigem confirmação inline no próprio card (“Remover?”, “Cancelar”, “Sim”); botões descrevem a ação e não usam apenas “x”. Reserve dialogs para decisões que tiram o usuário do contexto, como abandonar um formulário.
- Observações formatadas usam `Textarea rich-text` e são exibidas com HTML sanitizado.
- Campos monetários usam o slot `leading` do `Input` com `R$`; acréscimos positivos são exibidos em verde. Quantidades aparecem como números, sem sufixo “x” quando o cabeçalho já informa o significado.
- Use `Alert` com ícone: `info` para contexto/snapshot, `warning` para atenção operacional e `danger` para falha ou risco destrutivo.
- Badges comunicam semântica: `neutral` para contagens, `info` para contexto, `warning` para atenção, `success` para ativo/positivo e `danger` para inativo. Em resumos, use `medium`, alinhado ao fim e centralizado verticalmente.
- Ícone de “+” fica reservado à criação principal da página; ações secundárias “Adicionar” usam texto, salvo necessidade visual comprovada.
- Em páginas de visualização de dados, `EmptyState` internos não exibem botões; a ação de edição permanece no cabeçalho. Essa exceção não se aplica a listagens nem a erros de página inteira.

## Validação

- Confira desktop e mobile após mudanças visuais.
- Execute `npm run build` no projeto alterado e corrija também falhas de tipagem e `git diff --check` antes de concluir.
- Em problemas que surgem depois de alternar módulos, reproduza a sequência pelo menu e volte à tela original; Module Federation pode mudar a ordem dos estilos. Host e módulos devem usar a mesma versão de `@thiagoschoeffel/ts-components`, com `package-lock.json` atualizado.
