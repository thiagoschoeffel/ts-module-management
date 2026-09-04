<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  Alert, ArrowRightIcon, Badge, Button, Card, Checkbox, CheckIcon, DataTable, Drawer, EmptyState,
  Input, PlusIcon, SearchIcon, Select, SnowflakeIcon, Tabs, TriangleAlertIcon,
  type DataTableColumn, type DataTableRow, type DataTableSortDirection, type SelectOption,
  type TabItem
} from '@thiagoschoeffel/ts-components'
import {
  getFrozenExpirationSummaries,
  getFrozenConfigurations,
  getFrozenStockSummaries,
  saveFrozenConfiguration
} from '../mocks/frozenStock'
import { formatCurrency } from '../mocks/catalogStore'
import { getCurrentComposition, getProducible, getProducibles } from '../mocks/producibleStore'
import type {
  FrozenConfiguration,
  FrozenExpirationSummary,
  FrozenLotStatus,
  FrozenStockSummary,
  FrozenStockTab
} from '../types/frozenStock'
import { navigate } from '../utils/navigation'

type FrozenMockScenario = 'padrao' | 'sem-congelados' | 'sem-resultados' | 'erro' | 'salvamento-erro'
type FrozenConfigurationRow = FrozenConfiguration & { producibleName: string }
type FrozenSortKey = 'producibleName' | 'presentation' | 'unitPrice' | 'availableQuantity' | 'lotCount'
  | 'nextExpiration' | 'status' | 'active' | 'lotId'
  | 'expiresOn' | 'physicalQuantity'

const params = new URLSearchParams(window.location.search)
const validTabs = new Set<FrozenStockTab>(['estoque', 'produtos', 'vencimentos'])
const requestedTab = params.get('tab')
const activeTab = ref<FrozenStockTab>(validTabs.has(requestedTab as FrozenStockTab) ? requestedTab as FrozenStockTab : 'estoque')
const sortKeysByTab: Record<FrozenStockTab, ReadonlySet<FrozenSortKey>> = {
  estoque: new Set(['producibleName', 'presentation', 'availableQuantity', 'lotCount', 'nextExpiration', 'status']),
  produtos: new Set(['producibleName', 'presentation', 'unitPrice', 'active']),
  vencimentos: new Set(['producibleName', 'lotId', 'expiresOn', 'physicalQuantity', 'status'])
}
const defaultSortByTab: Record<FrozenStockTab, FrozenSortKey> = {
  estoque: 'producibleName',
  produtos: 'producibleName',
  vencimentos: 'expiresOn'
}
const requestedSort = params.get('ordenar')
const sortKey = ref<FrozenSortKey>(
  sortKeysByTab[activeTab.value].has(requestedSort as FrozenSortKey)
    ? requestedSort as FrozenSortKey
    : defaultSortByTab[activeTab.value]
)
const sortDirection = ref<DataTableSortDirection>(params.get('direcao') === 'desc' ? 'desc' : 'asc')
const validScenarios = new Set<FrozenMockScenario>(['padrao', 'sem-congelados', 'sem-resultados', 'erro', 'salvamento-erro'])
const requestedScenario = params.get('mock')
const mockScenario: FrozenMockScenario = validScenarios.has(requestedScenario as FrozenMockScenario)
  ? requestedScenario as FrozenMockScenario
  : 'padrao'
const search = ref(params.get('busca') ?? (mockScenario === 'sem-resultados' ? 'Produto inexistente' : ''))
const debouncedSearch = ref(search.value)
const isLoading = ref(true)
const hasLoadingError = ref(false)
const configurationDrawerOpen = ref(false)
const editingConfigurationId = ref<string>()
const draftProducibleItemId = ref('')
const draftQuantityPerUnit = ref<number>(300)
const draftUnit = ref<FrozenConfiguration['unit']>('g')
const draftUnitPrice = ref<number>(0)
const draftActive = ref(true)
const showConfigurationValidation = ref(false)
const savingConfiguration = ref(false)
const configurationSaveError = ref('')
const createdLotId = params.get('entrada')
const configurationSavedMessage = ref(createdLotId ? `Entrada registrada no lote ${createdLotId}.` : '')
let debounceTimeout: ReturnType<typeof setTimeout> | undefined
let loadingTimeout: ReturnType<typeof setTimeout> | undefined
let configurationTimeout: ReturnType<typeof setTimeout> | undefined
let simulatedFailureShown = false
let simulatedSaveFailureShown = false
let restoringHistory = false

const allStock = ref(mockScenario === 'sem-congelados' ? [] : getFrozenStockSummaries())
const configurationRows = ref<FrozenConfigurationRow[]>(mockScenario === 'sem-congelados'
  ? []
  : getFrozenConfigurations().map<FrozenConfigurationRow>(configuration => ({
      ...configuration,
      producibleName: getProducible(configuration.producibleItemId)?.name ?? 'Produzível não encontrado'
    })))
const allExpirations = ref(mockScenario === 'sem-congelados' ? [] : getFrozenExpirationSummaries())

const producibles = computed(() => getProducibles())
const producibleOptions = computed<SelectOption[]>(() => producibles.value.map(item => ({
  value: item.id,
  label: `${item.name}${getCurrentComposition(item) ? '' : ' · sem composição'}`
})))
const unitOptions: SelectOption[] = [
  { value: 'g', label: 'gramas (g)' },
  { value: 'kg', label: 'quilogramas (kg)' },
  { value: 'ml', label: 'mililitros (ml)' },
  { value: 'l', label: 'litros (l)' },
  { value: 'un', label: 'unidade (un)' }
]
const selectedProducible = computed(() => getProducible(draftProducibleItemId.value))
const editingConfiguration = computed(() => configurationRows.value.find(item => item.id === editingConfigurationId.value))
const isEditingConfiguration = computed(() => Boolean(editingConfigurationId.value))
const presentation = computed(() => `${Number(draftQuantityPerUnit.value) || 0} ${draftUnit.value}`)
const producibleError = computed(() => showConfigurationValidation.value && !draftProducibleItemId.value
  ? 'Selecione o item que representa esta preparação.'
  : undefined)
const quantityError = computed(() => showConfigurationValidation.value && !(Number(draftQuantityPerUnit.value) > 0)
  ? 'Use uma quantidade maior que zero.'
  : undefined)
const priceError = computed(() => showConfigurationValidation.value && !(Number(draftUnitPrice.value) > 0)
  ? 'Use um preço maior que zero.'
  : undefined)
const duplicatedConfiguration = computed(() => configurationRows.value.some(configuration =>
  configuration.id !== editingConfigurationId.value
  &&
  configuration.producibleItemId === draftProducibleItemId.value
  && configuration.quantityPerUnit === Number(draftQuantityPerUnit.value)
  && configuration.unit === draftUnit.value))

const tabs: TabItem[] = [
  { value: 'estoque', label: 'Estoque' },
  { value: 'produtos', label: 'Produtos habilitados' },
  { value: 'vencimentos', label: 'Vencimentos' }
]
const sectionContent: Record<FrozenStockTab, { title: string, subtitle: string }> = {
  estoque: {
    title: 'Estoque',
    subtitle: 'Acompanhe os saldos vendáveis por produto, apresentação e lote.'
  },
  produtos: {
    title: 'Produtos habilitados',
    subtitle: 'Consulte os itens produzíveis habilitados para estoque congelado.'
  },
  vencimentos: {
    title: 'Vencimentos',
    subtitle: 'Priorize lotes vencidos e próximos do vencimento para conferência.'
  }
}
const activeContent = computed(() => sectionContent[activeTab.value])
const stockColumns: DataTableColumn[] = [
  { key: 'producibleName', label: 'Produto', size: 'large', sortable: true },
  { key: 'presentation', label: 'Apresentação', size: 'small', sortable: true },
  { key: 'availableQuantity', label: 'Disponível', size: 'small', align: 'center', sortable: true },
  { key: 'lotCount', label: 'Lotes', size: 'small', align: 'center', sortable: true },
  { key: 'nextExpiration', label: 'Próximo vencimento', size: 'medium', sortable: true },
  { key: 'status', label: 'Status', size: 'small', align: 'center', sortable: true }
]
const productColumns: DataTableColumn[] = [
  { key: 'producibleName', label: 'Item produzível', size: 'large', sortable: true },
  { key: 'presentation', label: 'Apresentação', size: 'small', sortable: true },
  { key: 'unitPrice', label: 'Preço', size: 'small', sortable: true },
  { key: 'active', label: 'Status', size: 'small', align: 'center', sortable: true }
]
const expirationColumns: DataTableColumn[] = [
  { key: 'producibleName', label: 'Produto', size: 'large', sortable: true },
  { key: 'lotId', label: 'Lote', size: 'medium', sortable: true },
  { key: 'expiresOn', label: 'Validade', size: 'small', sortable: true },
  { key: 'physicalQuantity', label: 'Quantidade física', size: 'small', align: 'center', sortable: true },
  { key: 'status', label: 'Status', size: 'small', align: 'center', sortable: true }
]

watch(search, value => {
  if (debounceTimeout) clearTimeout(debounceTimeout)
  debounceTimeout = setTimeout(() => { debouncedSearch.value = value }, 250)
})

function setLoading() {
  if (loadingTimeout) clearTimeout(loadingTimeout)
  isLoading.value = true
  hasLoadingError.value = false
  loadingTimeout = setTimeout(() => {
    isLoading.value = false
    hasLoadingError.value = mockScenario === 'erro' && !simulatedFailureShown
    simulatedFailureShown = simulatedFailureShown || hasLoadingError.value
  }, 300)
}
function persistState() {
  if (restoringHistory) return
  const url = new URL(window.location.href)
  if (activeTab.value === 'estoque') url.searchParams.delete('tab')
  else url.searchParams.set('tab', activeTab.value)
  if (debouncedSearch.value.trim()) url.searchParams.set('busca', debouncedSearch.value.trim())
  else url.searchParams.delete('busca')
  if (sortKey.value === defaultSortByTab[activeTab.value]) url.searchParams.delete('ordenar')
  else url.searchParams.set('ordenar', sortKey.value)
  if (sortDirection.value === 'asc') url.searchParams.delete('direcao')
  else url.searchParams.set('direcao', sortDirection.value)
  if (url.href !== window.location.href) window.history.pushState(window.history.state, '', url)
}
function restoreFromUrl() {
  const nextParams = new URLSearchParams(window.location.search)
  const tab = nextParams.get('tab')
  activeTab.value = validTabs.has(tab as FrozenStockTab) ? tab as FrozenStockTab : 'estoque'
  const requestedSortKey = nextParams.get('ordenar')
  sortKey.value = sortKeysByTab[activeTab.value].has(requestedSortKey as FrozenSortKey)
    ? requestedSortKey as FrozenSortKey
    : defaultSortByTab[activeTab.value]
  sortDirection.value = nextParams.get('direcao') === 'desc' ? 'desc' : 'asc'
  search.value = nextParams.get('busca') ?? ''
  debouncedSearch.value = search.value
}
function updateTab(value: string) {
  activeTab.value = validTabs.has(value as FrozenStockTab) ? value as FrozenStockTab : 'estoque'
  sortKey.value = defaultSortByTab[activeTab.value]
  sortDirection.value = 'asc'
  configurationSavedMessage.value = ''
}
function handlePopState() {
  restoringHistory = true
  restoreFromUrl()
  setLoading()
  queueMicrotask(() => { restoringHistory = false })
}

watch([activeTab, debouncedSearch, sortKey, sortDirection], () => {
  persistState()
  setLoading()
})

const normalizedSearch = computed(() => debouncedSearch.value.trim().toLocaleLowerCase('pt-BR'))
function matchesSearch(...values: string[]) {
  return !normalizedSearch.value || values.some(value => value.toLocaleLowerCase('pt-BR').includes(normalizedSearch.value))
}
function compare(first: string | number | boolean | undefined, second: string | number | boolean | undefined) {
  const direction = sortDirection.value === 'asc' ? 1 : -1
  if (typeof first === 'number' && typeof second === 'number') return (first - second) * direction
  if (typeof first === 'boolean' && typeof second === 'boolean') return (Number(first) - Number(second)) * direction
  return String(first ?? '').localeCompare(String(second ?? ''), 'pt-BR', { numeric: true, sensitivity: 'base' }) * direction
}
function stockSortValue(item: FrozenStockSummary) {
  const values: Record<Extract<FrozenSortKey, 'producibleName' | 'presentation' | 'availableQuantity' | 'lotCount' | 'nextExpiration' | 'status'>, string | number | undefined> = {
    producibleName: item.producibleName,
    presentation: item.configuration.presentation,
    availableQuantity: item.availableQuantity,
    lotCount: item.lotCount,
    nextExpiration: item.nextExpiration ?? '9999-12-31',
    status: item.status
  }
  return values[sortKey.value as keyof typeof values]
}
function configurationSortValue(item: FrozenConfigurationRow) {
  const values = {
    producibleName: item.producibleName,
    presentation: item.presentation,
    unitPrice: item.unitPrice,
    active: item.active
  }
  return values[sortKey.value as keyof typeof values]
}
function expirationSortValue(item: FrozenExpirationSummary) {
  const values = {
    producibleName: item.producibleName,
    lotId: item.lot.id,
    expiresOn: item.lot.expiresOn,
    physicalQuantity: item.lot.physicalQuantity,
    status: item.status
  }
  return values[sortKey.value as keyof typeof values]
}
const stock = computed(() => allStock.value
  .filter(item => matchesSearch(item.producibleName, item.configuration.presentation, item.configuration.id))
  .sort((first, second) => compare(stockSortValue(first), stockSortValue(second))))
const configurations = computed(() => configurationRows.value
  .filter(item => matchesSearch(item.producibleName, item.presentation, item.id))
  .sort((first, second) => compare(configurationSortValue(first), configurationSortValue(second))))
const expirations = computed(() => allExpirations.value
  .filter(item => matchesSearch(item.producibleName, item.configuration.presentation, item.lot.id))
  .sort((first, second) => compare(expirationSortValue(first), expirationSortValue(second))))
const columns = computed(() =>
  activeTab.value === 'estoque' ? stockColumns : activeTab.value === 'produtos' ? productColumns : expirationColumns)
const rows = computed<DataTableRow[]>(() => {
  if (activeTab.value === 'estoque') {
    return stock.value.map(item => ({
      ...item,
      id: item.configuration.id,
      presentation: item.configuration.presentation
    }))
  }
  if (activeTab.value === 'produtos') return configurations.value.map(item => ({ ...item }))
  return expirations.value.map(item => ({
    ...item,
    id: item.lot.id,
    lotId: item.lot.id,
    expiresOn: item.lot.expiresOn,
    physicalQuantity: item.lot.physicalQuantity
  }))
})
const visibleItems = computed(() =>
  activeTab.value === 'estoque' ? stock.value : activeTab.value === 'produtos' ? configurations.value : expirations.value)
const hasSearch = computed(() => Boolean(normalizedSearch.value))
const emptyTitle = computed(() => {
  if (hasLoadingError.value) return 'Não foi possível carregar os congelados'
  if (hasSearch.value) return 'Nenhum resultado encontrado'
  if (activeTab.value === 'estoque') return 'Nenhum estoque de congelados'
  if (activeTab.value === 'produtos') return 'Nenhum produto habilitado'
  return 'Nenhum lote para acompanhar'
})
const emptyDescription = computed(() => {
  if (hasLoadingError.value) return 'Verifique a conexão e tente carregar os dados novamente.'
  if (hasSearch.value) return `Não encontramos congelados para “${debouncedSearch.value.trim()}”.`
  if (activeTab.value === 'estoque') return 'Os saldos por produto e apresentação aparecerão após a primeira entrada.'
  if (activeTab.value === 'produtos') return 'Produtos habilitados a partir do Catálogo aparecerão aqui.'
  return 'Lotes vencidos e próximos do vencimento aparecerão aqui por ordem de validade.'
})
const tableLabel = computed(() => {
  if (activeTab.value === 'estoque') return 'Estoque de congelados filtrado por busca'
  if (activeTab.value === 'produtos') return 'Produtos habilitados para estoque congelado'
  return 'Lotes congelados ordenados por validade'
})

function formatDate(value?: string) {
  if (!value) return '—'
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}
function statusLabel(status: FrozenLotStatus) {
  return {
    disponivel: 'Disponível',
    'proximo-vencimento': 'Próximo do vencimento',
    vencido: 'Vencido',
    esgotado: 'Sem estoque',
    'configuracao-inativa': 'Configuração inativa'
  }[status]
}
function statusVariant(status: FrozenLotStatus): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'disponivel') return 'success'
  if (status === 'proximo-vencimento') return 'warning'
  if (status === 'vencido') return 'danger'
  return 'neutral'
}
function asStock(row: DataTableRow) { return row as unknown as FrozenStockSummary }
function asConfiguration(row: DataTableRow) { return row as unknown as FrozenConfigurationRow }
function asExpiration(row: DataTableRow) { return row as unknown as FrozenExpirationSummary }
function rowStatus(row: DataTableRow) { return String(row.status) as FrozenLotStatus }
function updateSort(state: { key?: string, direction?: DataTableSortDirection }) {
  sortKey.value = sortKeysByTab[activeTab.value].has(state.key as FrozenSortKey)
    ? state.key as FrozenSortKey
    : defaultSortByTab[activeTab.value]
  sortDirection.value = state.direction ?? 'asc'
}
function clearSearch() { search.value = ''; debouncedSearch.value = '' }
function refreshFrozenData() {
  if (mockScenario === 'sem-congelados') return
  configurationRows.value = getFrozenConfigurations().map<FrozenConfigurationRow>(configuration => ({
    ...configuration,
    producibleName: getProducible(configuration.producibleItemId)?.name ?? 'Produzível não encontrado'
  }))
  allStock.value = getFrozenStockSummaries()
  allExpirations.value = getFrozenExpirationSummaries()
}
function openConfigurationDrawer(configuration?: FrozenConfigurationRow) {
  editingConfigurationId.value = configuration?.id
  draftProducibleItemId.value = configuration?.producibleItemId ?? ''
  draftQuantityPerUnit.value = configuration?.quantityPerUnit ?? 300
  draftUnit.value = configuration?.unit ?? 'g'
  draftUnitPrice.value = configuration?.unitPrice ?? 0
  draftActive.value = configuration?.active ?? true
  showConfigurationValidation.value = false
  configurationSaveError.value = ''
  configurationSavedMessage.value = ''
  configurationDrawerOpen.value = true
}
function registerProductionEntry() {
  const current = `${window.location.pathname}${window.location.search}`
  navigate(`/congelados/entrada?retorno=${encodeURIComponent(current)}`)
}
function openLot(lotId: string) {
  const current = `${window.location.pathname}${window.location.search}`
  navigate(`/congelados/lotes/${encodeURIComponent(lotId)}?retorno=${encodeURIComponent(current)}`)
}
function saveConfiguration() {
  showConfigurationValidation.value = true
  configurationSaveError.value = ''
  if (producibleError.value || quantityError.value || priceError.value || duplicatedConfiguration.value) return
  const producible = selectedProducible.value
  if (!producible) return
  const current = editingConfiguration.value
  const configuration: FrozenConfiguration = {
    id: current?.id ?? `cong-demo-${Date.now()}`,
    producibleItemId: producible.id,
    presentation: presentation.value,
    quantityPerUnit: Number(draftQuantityPerUnit.value),
    unit: draftUnit.value,
    unitPrice: Number(draftUnitPrice.value),
    active: draftActive.value
  }
  savingConfiguration.value = true
  if (configurationTimeout) clearTimeout(configurationTimeout)
  configurationTimeout = setTimeout(() => {
    if (mockScenario === 'salvamento-erro' && !simulatedSaveFailureShown) {
      simulatedSaveFailureShown = true
      savingConfiguration.value = false
      configurationSaveError.value = 'Não foi possível salvar a configuração. Nenhum dado foi alterado.'
      return
    }
    try {
      saveFrozenConfiguration(configuration)
      refreshFrozenData()
      configurationDrawerOpen.value = false
      configurationSavedMessage.value = current
        ? `${producible.name} · ${presentation.value} foi atualizado. ${configuration.active ? 'A configuração está ativa.' : 'Novas entradas e vendas foram desabilitadas; o histórico foi preservado.'}`
        : `${producible.name} · ${presentation.value} foi habilitado para estoque congelado.`
      search.value = ''
      debouncedSearch.value = ''
    }
    catch (error) {
      configurationSaveError.value = error instanceof Error ? error.message : 'Não foi possível salvar a configuração.'
    }
    finally { savingConfiguration.value = false }
  }, 400)
}

onMounted(() => {
  window.addEventListener('popstate', handlePopState)
  persistState()
  setLoading()
})
onBeforeUnmount(() => {
  if (debounceTimeout) clearTimeout(debounceTimeout)
  if (loadingTimeout) clearTimeout(loadingTimeout)
  if (configurationTimeout) clearTimeout(configurationTimeout)
  window.removeEventListener('popstate', handlePopState)
})
</script>

<template>
  <section class="md:flex md:h-full md:min-h-0 md:flex-col" aria-label="Estoque de congelados">
    <Tabs
      class="[&_[role=tab]]:px-2 sm:[&_[role=tab]]:px-3"
      :model-value="activeTab"
      :tabs="tabs"
      variant="primary"
      aria-label="Áreas de congelados"
      @update:model-value="updateTab" />

    <div class="pt-4 md:flex md:min-h-0 md:flex-1 md:flex-col">
      <header class="ts-responsive-row-start w-full min-w-0 gap-4 text-slate-800">
        <div class="flex min-w-0 flex-1 items-start gap-3">
          <SnowflakeIcon class="size-8 shrink-0" :stroke-width="1.75" aria-hidden="true" />
          <div class="min-w-0 flex-1 overflow-hidden">
            <div class="flex min-w-0 flex-wrap items-start gap-x-2 gap-y-1">
              <h1 class="m-0 shrink-0 text-2xl font-bold leading-none">Congelados</h1>
              <ArrowRightIcon class="size-5 shrink-0 text-slate-400" aria-hidden="true" />
              <span class="min-w-0 text-2xl font-bold leading-tight">{{ activeContent.title }}</span>
            </div>
            <p class="mt-2 text-sm leading-snug text-slate-400">{{ activeContent.subtitle }}</p>
          </div>
        </div>
        <Button v-if="activeTab === 'estoque'" type="button" class="shrink-0" @click="registerProductionEntry">
          <template #icon><PlusIcon /></template>
          Registrar entrada
        </Button>
        <Button v-else-if="activeTab === 'produtos'" type="button" class="shrink-0" @click="openConfigurationDrawer()">
          <template #icon><PlusIcon /></template>
          Habilitar item produzível
        </Button>
      </header>

      <Alert
        v-if="configurationSavedMessage"
        class="mt-6 shrink-0"
        variants="success"
        :description="configurationSavedMessage">
        <template #icon><CheckIcon /></template>
      </Alert>
      <Card :class="[configurationSavedMessage ? 'mt-4' : 'mt-6', 'shrink-0 [&>div]:p-4']">
      <Input
        v-model="search"
        type="search"
        aria-label="Buscar congelado por produto, apresentação, lote ou código"
        placeholder="Buscar produto, apresentação, lote ou código..."
        clearable
        class="w-full sm:max-w-md">
        <template #leading><SearchIcon class="size-4 text-slate-400" aria-hidden="true" /></template>
      </Input>
      </Card>

      <Card class="mt-4 md:min-h-0 md:flex-1 [&>div]:flex [&>div]:min-h-0 [&>div]:flex-col [&>div]:p-4">
      <div class="space-y-3 md:hidden">
        <template v-if="isLoading && !hasLoadingError">
          <div v-for="index in 3" :key="index" class="animate-pulse rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div class="h-4 w-44 rounded bg-slate-200" />
            <div class="mt-3 h-3 w-24 rounded bg-slate-100" />
            <div class="mt-4 h-3 w-36 rounded bg-slate-100" />
          </div>
        </template>

        <EmptyState
          v-else-if="hasLoadingError || visibleItems.length === 0"
          class="bg-white shadow-sm"
          size="large"
          :title="emptyTitle"
          :description="emptyDescription"
          :role="hasLoadingError ? 'alert' : 'status'">
          <template #icon><TriangleAlertIcon v-if="hasLoadingError" /><SearchIcon v-else-if="hasSearch" /><SnowflakeIcon v-else /></template>
          <template #action>
            <Button v-if="hasLoadingError" size="small" variant="secondary" @click="setLoading">Tentar novamente</Button>
            <Button v-else-if="hasSearch" size="small" variant="secondary" @click="clearSearch">Limpar busca</Button>
            <Button v-else-if="activeTab === 'estoque'" type="button" size="small" variant="secondary" @click="registerProductionEntry">Registrar entrada</Button>
            <Button v-else-if="activeTab === 'produtos'" type="button" size="small" variant="secondary" @click="openConfigurationDrawer()">Habilitar item produzível</Button>
          </template>
        </EmptyState>

        <template v-else-if="activeTab === 'estoque'">
          <Card v-for="item in isLoading ? [] : stock" :key="item.configuration.id">
            <div class="flex items-start justify-between gap-3">
              <div><p class="font-semibold text-slate-800">{{ item.producibleName }}</p><p class="mt-1 text-xs text-slate-500">{{ item.configuration.presentation }}</p></div>
              <Badge :variant="statusVariant(item.status)">{{ statusLabel(item.status) }}</Badge>
            </div>
            <p class="mt-4 text-sm text-slate-500">Disponível <strong class="text-slate-800">{{ item.availableQuantity }}</strong> · {{ item.lotCount }} lote{{ item.lotCount === 1 ? '' : 's' }}</p>
            <p class="mt-2 text-sm text-slate-500">Próximo vencimento: <span class="font-medium text-slate-700">{{ formatDate(item.nextExpiration) }}</span></p>
            <Button v-if="item.nextLotId" class="mt-4" type="button" size="small" variant="secondary" @click="openLot(item.nextLotId)">
              Abrir lote prioritário
              <template #trailingIcon><ArrowRightIcon /></template>
            </Button>
          </Card>
        </template>

        <template v-else-if="activeTab === 'produtos'">
          <Card v-for="item in isLoading ? [] : configurations" :key="item.id">
            <div class="flex items-start justify-between gap-3">
              <div><p class="font-semibold text-slate-800">{{ item.producibleName }}</p><p class="mt-1 text-xs text-slate-500">{{ item.presentation }}</p></div>
              <Badge :variant="item.active ? 'success' : 'danger'">{{ item.active ? 'Ativo' : 'Inativo' }}</Badge>
            </div>
            <p class="mt-4 text-sm text-slate-500">Preço: <span class="font-medium text-slate-700">{{ formatCurrency(item.unitPrice) }}</span></p>
            <div class="mt-4 flex flex-wrap gap-2">
              <Button type="button" size="small" variant="secondary" @click="openConfigurationDrawer(item)">Editar</Button>
            </div>
          </Card>
        </template>

        <template v-else>
          <Card v-for="item in isLoading ? [] : expirations" :key="item.lot.id">
            <div class="flex items-start justify-between gap-3">
              <div><p class="font-semibold text-slate-800">{{ item.producibleName }}</p><p class="mt-1 text-xs text-slate-500">{{ item.configuration.presentation }} · {{ item.lot.id }}</p></div>
              <Badge :variant="statusVariant(item.status)">{{ statusLabel(item.status) }}</Badge>
            </div>
            <p class="mt-4 text-sm text-slate-500">Validade: <span class="font-medium text-slate-700">{{ formatDate(item.lot.expiresOn) }}</span></p>
            <p class="mt-2 text-sm text-slate-500">Quantidade física: <span class="font-medium text-slate-700">{{ item.lot.physicalQuantity }}</span></p>
            <Button class="mt-4" type="button" size="small" variant="secondary" @click="openLot(item.lot.id)">
              Abrir lote
              <template #trailingIcon><ArrowRightIcon /></template>
            </Button>
          </Card>
        </template>
      </div>

      <DataTable
        :class="['desktop-only-flex min-h-0 flex-1', !isLoading && (hasLoadingError || visibleItems.length === 0) ? '[&_table]:h-full [&_tbody>tr>td]:align-middle' : '']"
        :columns="columns"
        :rows="hasLoadingError ? [] : rows"
        :selectable="false"
        :loading="isLoading && !hasLoadingError"
        sort-mode="manual"
        :sort-key="sortKey"
        :sort-direction="sortDirection"
        row-key="id"
        :label="tableLabel"
        @sort="updateSort">
        <template #cell-producibleName="{ row }"><p class="font-medium text-slate-800">{{ String(row.producibleName) }}</p></template>
        <template #cell-presentation="{ row }"><span class="text-slate-600">{{ String(row.presentation) }}</span></template>

        <template v-if="activeTab === 'estoque'" #cell-availableQuantity="{ row }"><span class="font-semibold text-slate-800">{{ asStock(row).availableQuantity }}</span></template>
        <template v-if="activeTab === 'estoque'" #cell-lotCount="{ row }"><Badge variant="neutral">{{ asStock(row).lotCount }}</Badge></template>
        <template v-if="activeTab === 'estoque'" #cell-nextExpiration="{ row }"><span class="text-slate-600">{{ formatDate(asStock(row).nextExpiration) }}</span></template>
        <template #cell-status="{ row }"><Badge :variant="statusVariant(rowStatus(row))">{{ statusLabel(rowStatus(row)) }}</Badge></template>

        <template v-if="activeTab === 'produtos'" #cell-unitPrice="{ row }"><span class="font-medium text-slate-700">{{ formatCurrency(asConfiguration(row).unitPrice) }}</span></template>
        <template v-if="activeTab === 'produtos'" #cell-active="{ row }"><Badge :variant="asConfiguration(row).active ? 'success' : 'danger'">{{ asConfiguration(row).active ? 'Ativo' : 'Inativo' }}</Badge></template>

        <template v-if="activeTab === 'vencimentos'" #cell-lotId="{ row }"><span class="font-mono text-xs text-slate-600">{{ asExpiration(row).lot.id }}</span></template>
        <template v-if="activeTab === 'vencimentos'" #cell-expiresOn="{ row }"><span class="font-medium text-slate-700">{{ formatDate(asExpiration(row).lot.expiresOn) }}</span></template>
        <template v-if="activeTab === 'vencimentos'" #cell-physicalQuantity="{ row }"><span class="font-semibold text-slate-800">{{ asExpiration(row).lot.physicalQuantity }}</span></template>
        <template #actions="{ row }">
          <div v-if="activeTab === 'produtos'" class="flex justify-end gap-2">
            <Button type="button" size="small" variant="secondary" @click="openConfigurationDrawer(asConfiguration(row))">Editar</Button>
          </div>
          <Button v-else-if="activeTab === 'vencimentos' || asStock(row).nextLotId" type="button" size="small" variant="secondary" :aria-label="activeTab === 'vencimentos' ? `Abrir lote ${asExpiration(row).lot.id}` : `Abrir lote prioritário de ${String(row.producibleName)}`" @click="openLot(activeTab === 'vencimentos' ? asExpiration(row).lot.id : asStock(row).nextLotId!)">
            Abrir
            <template #trailingIcon><ArrowRightIcon /></template>
          </Button>
        </template>
        <template #empty>
          <EmptyState :bordered="false" size="large" :title="emptyTitle" :description="emptyDescription" :role="hasLoadingError ? 'alert' : 'status'">
            <template #icon><TriangleAlertIcon v-if="hasLoadingError" /><SearchIcon v-else-if="hasSearch" /><SnowflakeIcon v-else /></template>
            <template #action>
              <Button v-if="hasLoadingError" size="small" variant="secondary" @click="setLoading">Tentar novamente</Button>
              <Button v-else-if="hasSearch" size="small" variant="secondary" @click="clearSearch">Limpar busca</Button>
              <Button v-else-if="activeTab === 'estoque'" type="button" size="small" variant="secondary" @click="registerProductionEntry">Registrar entrada</Button>
              <Button v-else-if="activeTab === 'produtos'" type="button" size="small" variant="secondary" @click="openConfigurationDrawer()">Habilitar item produzível</Button>
            </template>
          </EmptyState>
        </template>
      </DataTable>
      </Card>
    </div>

    <Drawer
      v-model:open="configurationDrawerOpen"
      size="large"
      :title="isEditingConfiguration ? 'Editar configuração de congelado' : 'Habilitar item produzível'"
      :description="isEditingConfiguration ? 'Atualize apresentação e preço sem reescrever lotes ou etiquetas anteriores.' : 'Escolha uma preparação existente e defina sua apresentação e seu preço para venda como congelado.'">
      <div class="space-y-4">
        <Alert v-if="configurationSaveError" variants="danger" title="Configuração não salva" :description="configurationSaveError" role="alert"><template #icon><TriangleAlertIcon /></template></Alert>
        <Alert
          v-if="showConfigurationValidation && duplicatedConfiguration"
          variants="danger"
          title="Apresentação já habilitada"
          description="Este item já possui uma configuração com a mesma quantidade e unidade.">
          <template #icon><TriangleAlertIcon /></template>
        </Alert>

        <Select
          v-model="draftProducibleItemId"
          label="Item produzível"
          description="Nome e composição continuam sendo administrados em Produzíveis."
          placeholder="Selecione uma preparação"
          required
          :disabled="isEditingConfiguration"
          :options="producibleOptions"
          :error="producibleError" />
        <p v-if="isEditingConfiguration" class="-mt-2 text-xs text-slate-500">O item produzível não pode ser trocado porque identifica o histórico desta configuração.</p>

        <Card v-if="selectedProducible" class="[&>div]:p-4">
          <dl class="grid gap-3 text-sm sm:grid-cols-2">
            <div><dt class="text-slate-400">Preparação</dt><dd class="mt-1 font-medium text-slate-800">{{ selectedProducible.name }}</dd></div>
            <div><dt class="text-slate-400">Composição atual</dt><dd class="mt-1 font-medium text-slate-800">{{ getCurrentComposition(selectedProducible) ? `v${getCurrentComposition(selectedProducible)?.version}` : 'Não cadastrada' }}</dd></div>
          </dl>
        </Card>

        <div class="grid gap-4 sm:grid-cols-2">
          <Input
            v-model="draftQuantityPerUnit"
            type="number"
            inputmode="decimal"
            label="Quantidade por unidade"
            min="0.01"
            step="0.01"
            required
            :error="quantityError" />
          <Select
            v-model="draftUnit"
            label="Unidade de medida"
            required
            :options="unitOptions" />
        </div>

        <Input
          v-model="draftUnitPrice"
          class="[&_input]:pl-11!"
          type="number"
          inputmode="decimal"
          label="Preço de venda"
          description="O Pedido usará este valor quando esta configuração for escolhida."
          min="0.01"
          step="0.01"
          required
          :error="priceError">
          <template #leading><span class="text-sm text-slate-400">R$</span></template>
        </Input>

        <Checkbox
          v-model="draftActive"
          label="Configuração ativa"
          description="Quando inativa, não aceita novas entradas nem vendas; lotes, movimentações e etiquetas anteriores são preservados." />

        <Card class="[&>div]:p-4">
          <p class="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Apresentação gerada</p>
          <p class="mt-2 text-lg font-semibold text-slate-800">{{ presentation }}</p>
          <p class="mt-1 text-sm text-slate-500">Essa informação identifica a unidade armazenada; o nome e a composição vêm do item produzível.</p>
        </Card>
      </div>
      <template #footer>
        <div class="flex items-center justify-between gap-2">
          <Button type="button" variant="secondary" :disabled="savingConfiguration" @click="configurationDrawerOpen = false">Cancelar</Button>
          <Button type="button" :loading="savingConfiguration" @click="saveConfiguration">{{ isEditingConfiguration ? 'Salvar alterações' : 'Habilitar item' }}</Button>
        </div>
      </template>
    </Drawer>

  </section>
</template>
