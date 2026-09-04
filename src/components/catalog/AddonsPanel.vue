<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  Badge, BadgeDollarSignIcon, Button, Card, Checkbox, DataTable, Drawer, EmptyState,
  Input, Pagination, SearchIcon, Select, Tabs, TriangleAlertIcon, type DataTableColumn,
  type DataTableRow, type DataTableSortDirection, type SelectOption, type TabItem
} from '@thiagoschoeffel/ts-components'
import { formatCurrency, getCatalogAddons, nextCatalogAddonId, saveCatalogAddon } from '../../mocks/catalogStore'
import { getProducibles } from '../../mocks/producibleStore'
import type { CatalogAddon } from '../../types/catalog'
import type { MeasurementUnit } from '../../types/producible'

type StatusFilter = 'all' | 'active' | 'inactive'
type AddonSortKey = 'name' | 'price' | 'producibleItemId' | 'operationalQuantity' | 'active'
type AddonListMockScenario = 'padrao' | 'sem-adicionais' | 'sem-resultados' | 'erro'

const initialParams = new URLSearchParams(window.location.search)
const validMockScenarios = new Set<AddonListMockScenario>(['padrao', 'sem-adicionais', 'sem-resultados', 'erro'])
const initialMockScenario = initialParams.get('mock')
const mockScenario: AddonListMockScenario = validMockScenarios.has(initialMockScenario as AddonListMockScenario)
  ? initialMockScenario as AddonListMockScenario
  : 'padrao'
const initialPage = Number(initialParams.get('pagina'))
const initialSortKey = initialParams.get('ordenar')
const validSortKeys = new Set<AddonSortKey>(['name', 'price', 'producibleItemId', 'operationalQuantity', 'active'])
const version = ref(0)
const search = ref(initialParams.get('busca') ?? (mockScenario === 'sem-resultados' ? 'Adicional inexistente' : ''))
const debouncedSearch = ref(search.value)
const status = ref<StatusFilter>(['active', 'inactive'].includes(initialParams.get('status') ?? '') ? initialParams.get('status') as StatusFilter : 'all')
const currentPage = ref(Number.isInteger(initialPage) && initialPage > 0 ? initialPage : 1)
const activeSortKey = ref<AddonSortKey>(validSortKeys.has(initialSortKey as AddonSortKey) ? initialSortKey as AddonSortKey : 'name')
const activeSortDirection = ref<DataTableSortDirection>(initialParams.get('direcao') === 'desc' ? 'desc' : 'asc')
const isLoading = ref(true)
const hasLoadingError = ref(false)
const drawerOpen = ref(false)
const editingId = ref<string>()
const name = ref('')
const price = ref<number>(0)
const producibleItemId = ref('none')
const operationalQuantity = ref<number>()
const operationalUnit = ref<MeasurementUnit>('g')
const active = ref(true)
const showValidation = ref(false)
const itemsPerPage = 10
let debounceTimeout: ReturnType<typeof setTimeout> | undefined
let loadingTimeout: ReturnType<typeof setTimeout> | undefined
let restoringHistory = false
let simulatedFailureShown = false

const items = computed(() => { version.value; return mockScenario === 'sem-adicionais' ? [] : getCatalogAddons() })
const producibles = computed(() => getProducibles())
const producibleOptions = computed<SelectOption[]>(() => [{ value: 'none', label: 'Sem item associado' }, ...producibles.value.map(item => ({ value: item.id, label: item.name }))])
const unitOptions: SelectOption[] = ['g', 'kg', 'ml', 'l', 'un'].map(value => ({ value, label: value }))
const statusTabs: TabItem[] = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Ativos' },
  { value: 'inactive', label: 'Inativos' }
]
const columns: DataTableColumn[] = [
  { key: 'name', label: 'Adicional', size: 'medium', sortable: true },
  { key: 'price', label: 'Preço', size: 'small', sortable: true },
  { key: 'producibleItemId', label: 'Produzível', size: 'large', sortable: true },
  { key: 'operationalQuantity', label: 'Quantidade operacional', size: 'medium', sortable: true },
  { key: 'active', label: 'Status', size: 'small', align: 'center', sortable: true }
]

watch(search, value => {
  if (debounceTimeout) clearTimeout(debounceTimeout)
  debounceTimeout = setTimeout(() => debouncedSearch.value = value, 250)
})

function setLoading() {
  if (loadingTimeout) clearTimeout(loadingTimeout)
  hasLoadingError.value = false
  isLoading.value = true
  loadingTimeout = setTimeout(() => {
    isLoading.value = false
    hasLoadingError.value = mockScenario === 'erro' && !simulatedFailureShown
    simulatedFailureShown = simulatedFailureShown || hasLoadingError.value
  }, 300)
}
function restoreFromUrl() {
  const params = new URLSearchParams(window.location.search)
  const page = Number(params.get('pagina'))
  const sortKey = params.get('ordenar')
  search.value = params.get('busca') ?? ''
  debouncedSearch.value = search.value
  status.value = ['active', 'inactive'].includes(params.get('status') ?? '') ? params.get('status') as StatusFilter : 'all'
  activeSortKey.value = validSortKeys.has(sortKey as AddonSortKey) ? sortKey as AddonSortKey : 'name'
  activeSortDirection.value = params.get('direcao') === 'desc' ? 'desc' : 'asc'
  currentPage.value = Number.isInteger(page) && page > 0 ? page : 1
}
function persistState() {
  if (restoringHistory) return
  const url = new URL(window.location.href)
  const values = {
    busca: debouncedSearch.value.trim() || undefined,
    status: status.value === 'all' ? undefined : status.value,
    ordenar: activeSortKey.value === 'name' ? undefined : activeSortKey.value,
    direcao: activeSortDirection.value === 'asc' ? undefined : activeSortDirection.value,
    pagina: currentPage.value > 1 ? String(currentPage.value) : undefined
  }
  for (const [key, value] of Object.entries(values)) {
    if (value) url.searchParams.set(key, value)
    else url.searchParams.delete(key)
  }
  if (url.href !== window.location.href) window.history.pushState(window.history.state, '', url)
}

watch([debouncedSearch, status, activeSortKey, activeSortDirection], () => {
  currentPage.value = 1
  setLoading()
})
watch([debouncedSearch, status, activeSortKey, activeSortDirection, currentPage], persistState)

function producibleName(id?: string) { return producibles.value.find(item => item.id === id)?.name ?? (id ? 'Produzível indisponível' : 'Não associado') }
function operationalAmount(item: CatalogAddon) { return item.operationalQuantity ? `${item.operationalQuantity} ${item.operationalUnit}` : '—' }

const itemsMatchingSearch = computed(() => {
  const query = debouncedSearch.value.trim().toLocaleLowerCase('pt-BR')
  return items.value.filter(item => !query
      || item.id.toLocaleLowerCase('pt-BR').includes(query)
      || item.name.toLocaleLowerCase('pt-BR').includes(query)
      || producibleName(item.producibleItemId).toLocaleLowerCase('pt-BR').includes(query))
})
const filteredItems = computed(() => {
  const matchingItems = itemsMatchingSearch.value.filter(item => status.value === 'all' || item.active === (status.value === 'active'))
  const direction = activeSortDirection.value === 'asc' ? 1 : -1
  return [...matchingItems].sort((first, second) => {
    const key = activeSortKey.value
    const firstValue = key === 'producibleItemId' ? producibleName(first.producibleItemId) : first[key] ?? ''
    const secondValue = key === 'producibleItemId' ? producibleName(second.producibleItemId) : second[key] ?? ''
    if (typeof firstValue === 'number' && typeof secondValue === 'number') return (firstValue - secondValue) * direction
    if (typeof firstValue === 'boolean' && typeof secondValue === 'boolean') return (Number(firstValue) - Number(secondValue)) * direction
    return String(firstValue).localeCompare(String(secondValue), 'pt-BR', { numeric: true, sensitivity: 'base' }) * direction
  })
})
const visibleItems = computed(() => filteredItems.value.slice((currentPage.value - 1) * itemsPerPage, currentPage.value * itemsPerPage))
const rows = computed<DataTableRow[]>(() => visibleItems.value.map(item => ({ ...item })))
const tabCounts = computed<Record<string, number>>(() => ({
  all: itemsMatchingSearch.value.length,
  active: itemsMatchingSearch.value.filter(item => item.active).length,
  inactive: itemsMatchingSearch.value.filter(item => !item.active).length
}))
const hasFilters = computed(() => Boolean(debouncedSearch.value.trim()) || status.value !== 'all')
const visibleStart = computed(() => filteredItems.value.length === 0 ? 0 : (currentPage.value - 1) * itemsPerPage + 1)
const visibleEnd = computed(() => Math.min(currentPage.value * itemsPerPage, filteredItems.value.length))
function clampCurrentPage() {
  const lastPage = Math.max(1, Math.ceil(filteredItems.value.length / itemsPerPage))
  currentPage.value = Math.min(currentPage.value, lastPage)
}
const emptyDescription = computed(() => {
  if (hasLoadingError.value) return 'Verifique a conexão e tente carregar a lista novamente.'
  if (debouncedSearch.value.trim()) return `Não encontramos adicionais para “${debouncedSearch.value.trim()}”.`
  if (status.value === 'active') return 'Nenhum adicional ativo está cadastrado.'
  if (status.value === 'inactive') return 'Nenhum adicional inativo está cadastrado.'
  return 'Os adicionais cadastrados aparecerão aqui.'
})
const nameError = computed(() => showValidation.value && !name.value.trim() ? 'Informe o nome do adicional.' : undefined)
const priceError = computed(() => showValidation.value && !(Number(price.value) >= 0) ? 'Use um preço igual ou maior que zero.' : undefined)
const quantityError = computed(() => showValidation.value && operationalQuantity.value != null && !(Number(operationalQuantity.value) > 0) ? 'Use uma quantidade maior que zero.' : undefined)

function asAddon(row: DataTableRow) { return row as unknown as CatalogAddon }
function clearFilters() { search.value = ''; debouncedSearch.value = ''; status.value = 'all' }
function updateSort(state: { key?: string, direction?: DataTableSortDirection }) {
  activeSortKey.value = validSortKeys.has(state.key as AddonSortKey) ? state.key as AddonSortKey : 'name'
  activeSortDirection.value = state.direction ?? 'asc'
}
function handlePopState() {
  restoringHistory = true
  restoreFromUrl()
  clampCurrentPage()
  queueMicrotask(() => {
    restoringHistory = false
    persistState()
  })
}
function openForm(item?: CatalogAddon) {
  editingId.value = item?.id
  name.value = item?.name ?? ''
  price.value = item?.price ?? 0
  producibleItemId.value = item?.producibleItemId ?? 'none'
  operationalQuantity.value = item?.operationalQuantity
  operationalUnit.value = item?.operationalUnit ?? 'g'
  active.value = item?.active ?? true
  showValidation.value = false
  drawerOpen.value = true
}
function save() {
  showValidation.value = true
  if (nameError.value || priceError.value || quantityError.value) return
  saveCatalogAddon({
    id: editingId.value ?? nextCatalogAddonId(), name: name.value.trim(), price: Number(price.value),
    producibleItemId: producibleItemId.value === 'none' ? undefined : producibleItemId.value,
    operationalQuantity: operationalQuantity.value == null ? undefined : Number(operationalQuantity.value),
    operationalUnit: operationalQuantity.value == null ? undefined : operationalUnit.value, active: active.value
  })
  version.value++
  drawerOpen.value = false
}

defineExpose({ openCreate: () => openForm() })
onMounted(() => {
  window.addEventListener('popstate', handlePopState)
  clampCurrentPage()
  persistState()
  setLoading()
})
onBeforeUnmount(() => {
  if (debounceTimeout) clearTimeout(debounceTimeout)
  if (loadingTimeout) clearTimeout(loadingTimeout)
  window.removeEventListener('popstate', handlePopState)
})
</script>

<template>
  <section class="md:flex md:h-full md:min-h-0 md:flex-col" aria-label="Adicionais do catálogo">
    <Card class="md:shrink-0 [&>div]:p-4">
      <Tabs v-model="status" :tabs="statusTabs" aria-label="Adicionais por status" size="medium">
        <template #badge="{ tab }"><Badge size="small" :variant="tab.value === 'inactive' && tabCounts[tab.value] ? 'danger' : 'neutral'">{{ tabCounts[tab.value] }}</Badge></template>
        <template #content>
          <Input v-model="search" type="search" aria-label="Buscar adicional por nome, produzível ou código" placeholder="Buscar nome, produzível ou código..." clearable class="w-full sm:max-w-sm [&_input]:pl-10! [&_input]:pr-10!">
            <template #leading><SearchIcon class="size-4 text-slate-400" aria-hidden="true" /></template>
          </Input>
        </template>
      </Tabs>
    </Card>

    <Card class="mt-4 md:min-h-0 md:flex-1 [&>div]:flex [&>div]:min-h-0 [&>div]:flex-col [&>div]:p-4">
      <div class="space-y-3 md:hidden">
        <template v-if="isLoading && !hasLoadingError">
          <div v-for="index in 4" :key="index" class="animate-pulse rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><div class="h-4 w-36 rounded bg-slate-200" /><div class="mt-3 h-3 w-52 rounded bg-slate-100" /><div class="mt-3 h-3 w-28 rounded bg-slate-100" /></div>
        </template>
        <EmptyState v-else-if="hasLoadingError || visibleItems.length === 0" class="bg-white shadow-sm" size="large" :title="hasLoadingError ? 'Não foi possível carregar os adicionais' : 'Nenhum adicional encontrado'" :description="emptyDescription" :role="hasLoadingError ? 'alert' : 'status'">
          <template #icon><TriangleAlertIcon v-if="hasLoadingError" /><BadgeDollarSignIcon v-else-if="items.length === 0" /><SearchIcon v-else /></template>
          <template #action><Button v-if="hasLoadingError" size="small" variant="secondary" @click="setLoading">Tentar novamente</Button><Button v-else-if="items.length === 0" type="button" size="small" variant="secondary" @click="openForm()">Novo adicional</Button><Button v-else-if="hasFilters" size="small" variant="secondary" @click="clearFilters">Limpar filtros</Button></template>
        </EmptyState>
        <Card v-for="item in isLoading ? [] : visibleItems" v-else :key="item.id">
          <div class="flex items-start justify-between gap-3"><div><p class="font-semibold text-slate-800">{{ item.name }}</p><p class="mt-1 text-xs text-slate-500">{{ item.id }}</p></div><Badge :variant="item.active ? 'success' : 'danger'">{{ item.active ? 'Ativo' : 'Inativo' }}</Badge></div>
          <p class="mt-3 font-medium text-slate-700">{{ formatCurrency(item.price) }}</p>
          <p class="mt-2 text-sm text-slate-500">{{ producibleName(item.producibleItemId) }} · {{ item.operationalQuantity ? `${item.operationalQuantity} ${item.operationalUnit}` : 'sem quantidade operacional' }}</p>
          <template #footer><Button class="w-full" size="small" variant="secondary" @click="openForm(item)">Editar</Button></template>
        </Card>
      </div>

      <DataTable
        :class="['desktop-only-flex min-h-0 flex-1', !isLoading && (hasLoadingError || visibleItems.length === 0) ? '[&_table]:h-full [&_tbody>tr>td]:align-middle' : '']"
        :columns="columns" :rows="hasLoadingError ? [] : rows" :selectable="false" :loading="isLoading && !hasLoadingError"
        sort-mode="manual" :sort-key="activeSortKey" :sort-direction="activeSortDirection"
        row-key="id" label="Adicionais filtrados por busca e status" actions-label="Ação" @sort="updateSort">
        <template #cell-name="{ row }"><p class="font-medium text-slate-800">{{ asAddon(row).name }}</p><p class="mt-1 text-xs text-slate-500">{{ asAddon(row).id }}</p></template>
        <template #cell-price="{ row }"><span class="font-medium text-slate-700">{{ formatCurrency(asAddon(row).price) }}</span></template>
        <template #cell-producibleItemId="{ row }"><span :class="asAddon(row).producibleItemId ? 'text-slate-600' : 'text-slate-400'">{{ producibleName(asAddon(row).producibleItemId) }}</span></template>
        <template #cell-operationalQuantity="{ row }"><span :class="asAddon(row).operationalQuantity ? 'text-slate-600' : 'text-slate-400'">{{ operationalAmount(asAddon(row)) }}</span></template>
        <template #cell-active="{ row }"><Badge :variant="asAddon(row).active ? 'success' : 'danger'">{{ asAddon(row).active ? 'Ativo' : 'Inativo' }}</Badge></template>
        <template #actions="{ row }"><Button size="small" variant="secondary" @click="openForm(asAddon(row))">Editar</Button></template>
        <template #empty><EmptyState :bordered="false" size="large" :title="hasLoadingError ? 'Não foi possível carregar os adicionais' : 'Nenhum adicional encontrado'" :description="emptyDescription" :role="hasLoadingError ? 'alert' : 'status'"><template #icon><TriangleAlertIcon v-if="hasLoadingError" /><BadgeDollarSignIcon v-else-if="items.length === 0" /><SearchIcon v-else /></template><template #action><Button v-if="hasLoadingError" size="small" variant="secondary" @click="setLoading">Tentar novamente</Button><Button v-else-if="items.length === 0" type="button" size="small" variant="secondary" @click="openForm()">Novo adicional</Button><Button v-else-if="hasFilters" size="small" variant="secondary" @click="clearFilters">Limpar filtros</Button></template></EmptyState></template>
      </DataTable>

      <div v-if="!hasLoadingError" class="mt-4 flex shrink-0 flex-wrap items-center justify-between gap-3">
        <p class="text-sm text-slate-500">Mostrando {{ visibleStart }}–{{ visibleEnd }} de {{ filteredItems.length }} adicionais</p>
        <Pagination v-model="currentPage" :total="filteredItems.length" :items-per-page="itemsPerPage" size="medium" label="Paginação de adicionais" />
      </div>
    </Card>

    <Drawer v-model:open="drawerOpen" size="large" :title="editingId ? 'Editar adicional' : 'Novo adicional'" description="Configure o que o cliente pode comprar além da oferta e, quando necessário, seu vínculo operacional.">
      <div class="space-y-6">
        <section class="space-y-4" aria-labelledby="addon-commercial-title">
          <div><h3 id="addon-commercial-title" class="text-sm font-semibold text-slate-800">Dados comerciais</h3><p class="mt-1 text-sm text-slate-500">Informações exibidas durante a venda do adicional.</p></div>
          <Input v-model="name" label="Nome do adicional" description="Use um nome direto e reconhecível pelo atendimento e pelo cliente." placeholder="Ex.: Proteína extra" required :error="nameError" />
          <Input v-model="price" class="[&_input]:pl-11!" type="number" inputmode="decimal" label="Preço" description="Valor acrescentado ao total quando este adicional é escolhido." min="0" step="0.01" required :error="priceError"><template #leading><span class="text-sm text-slate-400">R$</span></template></Input>
        </section>

        <section class="space-y-4 border-t border-slate-200 pt-5" aria-labelledby="addon-operation-title">
          <div><h3 id="addon-operation-title" class="text-sm font-semibold text-slate-800">Vínculo operacional</h3><p class="mt-1 text-sm text-slate-500">Relacione o adicional a um produzível para informar o consumo operacional; isso não altera sua composição.</p></div>
          <Select v-model="producibleItemId" label="Item produzível correspondente" description="Deixe sem associação quando o adicional não precisar ser controlado como produzível." :options="producibleOptions" />
          <div class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem]"><Input v-model="operationalQuantity" type="number" inputmode="decimal" label="Quantidade operacional" description="Quantidade consumida por unidade vendida." min="0.01" step="any" :error="quantityError" /><Select v-model="operationalUnit" label="Unidade" description="Unidade usada no controle operacional." :options="unitOptions" @update:model-value="operationalUnit = $event as MeasurementUnit" /></div>
        </section>

        <Checkbox v-model="active" label="Adicional ativo" description="Quando inativo, não poderá ser incluído em novas ofertas, mas continuará visível nas configurações existentes." />
      </div>
      <template #footer><div class="flex items-center justify-between gap-2"><Button type="button" variant="secondary" @click="drawerOpen = false">Cancelar</Button><Button type="button" @click="save">{{ editingId ? 'Salvar alterações' : 'Adicionar adicional' }}</Button></div></template>
    </Drawer>
  </section>
</template>
