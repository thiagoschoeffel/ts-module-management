<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  ArrowRightIcon, Badge, BikeIcon, Button, Card, DataTable, EmptyState, Input,
  Pagination, SearchIcon, Tabs, TriangleAlertIcon, type DataTableColumn,
  type DataTableRow, type DataTableSortDirection, type TabItem
} from '@thiagoschoeffel/ts-components'
import { getDeliveryDrivers } from '../mocks/deliveryDriverStore'
import type { DeliveryDriver } from '../types/deliveryDriver'

type DriverStatus = 'todos' | 'ativos' | 'inativos'
type DriverSortKey = 'name' | 'phone' | 'active'
type DriverMockScenario = 'padrao' | 'sem-entregadores' | 'sem-resultados' | 'erro'

const initialParams = new URLSearchParams(window.location.search)
const validScenarios = new Set<DriverMockScenario>(['padrao', 'sem-entregadores', 'sem-resultados', 'erro'])
const requestedScenario = initialParams.get('mock')
const mockScenario: DriverMockScenario = validScenarios.has(requestedScenario as DriverMockScenario)
  ? requestedScenario as DriverMockScenario
  : 'padrao'
const validStatuses = new Set<DriverStatus>(['todos', 'ativos', 'inativos'])
const validSortKeys = new Set<DriverSortKey>(['name', 'phone', 'active'])
const requestedPage = Number(initialParams.get('pagina'))
const search = ref(initialParams.get('busca') ?? (mockScenario === 'sem-resultados' ? 'Entregador inexistente' : ''))
const debouncedSearch = ref(search.value)
const status = ref<DriverStatus>(validStatuses.has(initialParams.get('status') as DriverStatus) ? initialParams.get('status') as DriverStatus : 'todos')
const currentPage = ref(Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1)
const sortKey = ref<DriverSortKey>(validSortKeys.has(initialParams.get('ordenar') as DriverSortKey) ? initialParams.get('ordenar') as DriverSortKey : 'name')
const sortDirection = ref<DataTableSortDirection>(initialParams.get('direcao') === 'desc' ? 'desc' : 'asc')
const isLoading = ref(true)
const hasLoadingError = ref(false)
const itemsPerPage = 10
const drivers = mockScenario === 'sem-entregadores' ? [] : getDeliveryDrivers()
let debounceTimeout: ReturnType<typeof setTimeout> | undefined
let loadingTimeout: ReturnType<typeof setTimeout> | undefined
let restoringHistory = false

const columns: DataTableColumn[] = [
  { key: 'name', label: 'Entregador', size: 'large', sortable: true },
  { key: 'phone', label: 'Telefone', size: 'medium', sortable: true },
  { key: 'active', label: 'Status', size: 'small', align: 'center', sortable: true }
]
const tabs: TabItem[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'ativos', label: 'Ativos' },
  { value: 'inativos', label: 'Inativos' }
]

watch(search, value => {
  if (debounceTimeout) clearTimeout(debounceTimeout)
  debounceTimeout = setTimeout(() => debouncedSearch.value = value, 250)
})

function setLoading() {
  if (loadingTimeout) clearTimeout(loadingTimeout)
  isLoading.value = true
  hasLoadingError.value = false
  loadingTimeout = setTimeout(() => {
    isLoading.value = false
    hasLoadingError.value = mockScenario === 'erro'
  }, 300)
}
function restoreFromUrl() {
  const params = new URLSearchParams(window.location.search)
  const page = Number(params.get('pagina'))
  const requestedStatus = params.get('status')
  const requestedSort = params.get('ordenar')
  search.value = params.get('busca') ?? ''
  debouncedSearch.value = search.value
  status.value = validStatuses.has(requestedStatus as DriverStatus) ? requestedStatus as DriverStatus : 'todos'
  sortKey.value = validSortKeys.has(requestedSort as DriverSortKey) ? requestedSort as DriverSortKey : 'name'
  sortDirection.value = params.get('direcao') === 'desc' ? 'desc' : 'asc'
  currentPage.value = Number.isInteger(page) && page > 0 ? page : 1
}
function persistState() {
  if (restoringHistory) return
  const url = new URL(window.location.href)
  const values = {
    busca: debouncedSearch.value.trim() || undefined,
    status: status.value === 'todos' ? undefined : status.value,
    ordenar: sortKey.value === 'name' ? undefined : sortKey.value,
    direcao: sortDirection.value === 'asc' ? undefined : sortDirection.value,
    pagina: currentPage.value > 1 ? String(currentPage.value) : undefined
  }
  for (const [key, value] of Object.entries(values)) {
    if (value) url.searchParams.set(key, value)
    else url.searchParams.delete(key)
  }
  if (url.href !== window.location.href) window.history.pushState(window.history.state, '', url)
}
watch([debouncedSearch, status, sortKey, sortDirection], () => { currentPage.value = 1; setLoading() })
watch([debouncedSearch, status, sortKey, sortDirection, currentPage], persistState)

const driversMatchingSearch = computed(() => {
  const query = debouncedSearch.value.trim().toLocaleLowerCase('pt-BR')
  const phoneQuery = query.replace(/\D/g, '')
  return drivers.filter(driver => !query
    || driver.id.toLocaleLowerCase('pt-BR').includes(query)
    || driver.name.toLocaleLowerCase('pt-BR').includes(query)
    || (phoneQuery.length > 0 && (driver.phone ?? '').replace(/\D/g, '').includes(phoneQuery)))
})
const filteredDrivers = computed(() => {
  const matching = driversMatchingSearch.value.filter(driver => status.value === 'todos'
    || (status.value === 'ativos' ? driver.active : !driver.active))
  const direction = sortDirection.value === 'asc' ? 1 : -1
  return [...matching].sort((first, second) => {
    const firstValue = first[sortKey.value] ?? ''
    const secondValue = second[sortKey.value] ?? ''
    if (typeof firstValue === 'boolean' && typeof secondValue === 'boolean')
      return (Number(firstValue) - Number(secondValue)) * direction
    return String(firstValue).localeCompare(String(secondValue), 'pt-BR', { numeric: true, sensitivity: 'base' }) * direction
  })
})
const visibleDrivers = computed(() => filteredDrivers.value.slice((currentPage.value - 1) * itemsPerPage, currentPage.value * itemsPerPage))
const rows = computed<DataTableRow[]>(() => visibleDrivers.value.map(driver => ({ ...driver })))
const tabCounts = computed<Record<string, number>>(() => ({
  todos: driversMatchingSearch.value.length,
  ativos: driversMatchingSearch.value.filter(driver => driver.active).length,
  inativos: driversMatchingSearch.value.filter(driver => !driver.active).length
}))
const hasFilters = computed(() => Boolean(debouncedSearch.value.trim()) || status.value !== 'todos')
const visibleStart = computed(() => filteredDrivers.value.length ? (currentPage.value - 1) * itemsPerPage + 1 : 0)
const visibleEnd = computed(() => Math.min(currentPage.value * itemsPerPage, filteredDrivers.value.length))
const emptyDescription = computed(() => {
  if (hasLoadingError.value) return 'Verifique a conexão e tente carregar a lista novamente.'
  if (hasFilters.value) return 'Nenhum entregador corresponde à busca e ao status selecionado.'
  return 'Os entregadores cadastrados aparecerão aqui.'
})

function asDriver(row: DataTableRow) { return row as unknown as DeliveryDriver }
function listReturnUrl() { return `${window.location.pathname}${window.location.search}` }
function editHref(id: string) { return `/entregadores/${id}/editar?retorno=${encodeURIComponent(listReturnUrl())}` }
function editDriver(id: string) { window.location.assign(editHref(id)) }
function createDriver() { window.location.assign(`/entregadores/novo?retorno=${encodeURIComponent(listReturnUrl())}`) }
function clearFilters() { search.value = ''; debouncedSearch.value = ''; status.value = 'todos' }
function updateSort(state: { key?: string; direction?: DataTableSortDirection }) {
  sortKey.value = validSortKeys.has(state.key as DriverSortKey) ? state.key as DriverSortKey : 'name'
  sortDirection.value = state.direction ?? 'asc'
}
function handlePopState() {
  restoringHistory = true
  restoreFromUrl()
  queueMicrotask(() => restoringHistory = false)
}

onMounted(() => { window.addEventListener('popstate', handlePopState); setLoading() })
onBeforeUnmount(() => {
  if (debounceTimeout) clearTimeout(debounceTimeout)
  if (loadingTimeout) clearTimeout(loadingTimeout)
  window.removeEventListener('popstate', handlePopState)
})
</script>

<template>
  <section class="md:flex md:h-full md:min-h-0 md:flex-col" aria-label="Lista de entregadores">
    <Card class="md:shrink-0 [&>div]:p-4">
      <Tabs v-model="status" :tabs="tabs" aria-label="Entregadores por status" size="medium">
        <template #badge="{ tab }">
          <Badge size="small" :variant="tab.value === 'inativos' && tabCounts[tab.value] ? 'danger' : 'neutral'">
            {{ tabCounts[tab.value] }}
          </Badge>
        </template>
        <template #content>
          <Input v-model="search" type="search" aria-label="Buscar entregador por nome, telefone ou código" placeholder="Buscar nome, telefone ou código..." clearable class="w-full sm:max-w-sm">
            <template #leading><SearchIcon class="size-4 text-slate-400" aria-hidden="true" /></template>
          </Input>
        </template>
      </Tabs>
    </Card>

    <Card class="mt-4 md:min-h-0 md:flex-1 [&>div]:flex [&>div]:min-h-0 [&>div]:flex-col [&>div]:p-4">
      <div class="space-y-3 md:hidden">
        <template v-if="isLoading && !hasLoadingError">
          <div v-for="index in 4" :key="index" class="animate-pulse rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div class="h-4 w-40 rounded bg-slate-200"></div><div class="mt-3 h-3 w-28 rounded bg-slate-100"></div>
          </div>
        </template>
        <EmptyState v-else-if="hasLoadingError || visibleDrivers.length === 0" class="bg-white shadow-sm" size="large" :title="hasLoadingError ? 'Não foi possível carregar os entregadores' : 'Nenhum entregador encontrado'" :description="emptyDescription" :role="hasLoadingError ? 'alert' : 'status'">
          <template #icon><TriangleAlertIcon v-if="hasLoadingError" /><BikeIcon v-else-if="drivers.length === 0" /><SearchIcon v-else /></template>
          <template #action><Button v-if="hasLoadingError" size="small" @click="setLoading">Tentar novamente</Button><Button v-else-if="drivers.length === 0" size="small" variant="secondary" @click="createDriver">Novo entregador</Button><Button v-else-if="hasFilters" size="small" variant="secondary" @click="clearFilters">Limpar filtros</Button></template>
        </EmptyState>
        <Card v-for="driver in isLoading ? [] : visibleDrivers" v-else :key="driver.id">
          <div class="flex items-start justify-between gap-3">
            <div><p class="font-semibold text-slate-800">{{ driver.name }}</p><p class="mt-1 text-xs text-slate-500">{{ driver.id }}</p></div>
            <Badge :variant="driver.active ? 'success' : 'danger'">{{ driver.active ? 'Ativo' : 'Inativo' }}</Badge>
          </div>
          <p class="mt-3 text-sm text-slate-600">{{ driver.phone || 'Telefone não informado' }}</p>
          <template #footer><a :href="editHref(driver.id)" class="-mx-6 -my-4 flex items-center justify-between gap-3 px-6 py-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"><span>Editar entregador</span><ArrowRightIcon class="size-4" aria-hidden="true" /></a></template>
        </Card>
      </div>

      <DataTable :class="['hidden min-h-0 flex-1 md:flex', !isLoading && (hasLoadingError || visibleDrivers.length === 0) ? '[&_table]:h-full [&_tbody>tr>td]:align-middle' : '']" :columns="columns" :rows="hasLoadingError ? [] : rows" :selectable="false" :loading="isLoading && !hasLoadingError" sort-mode="manual" :sort-key="sortKey" :sort-direction="sortDirection" row-key="id" label="Entregadores filtrados por status e busca" actions-label="Ação" @sort="updateSort">
        <template #cell-name="{ row }"><p class="font-medium text-slate-800">{{ asDriver(row).name }}</p><p class="mt-1 text-xs text-slate-500">{{ asDriver(row).id }}</p></template>
        <template #cell-phone="{ row }"><span :class="asDriver(row).phone ? 'font-medium text-slate-700' : 'text-slate-400'">{{ asDriver(row).phone || 'Não informado' }}</span></template>
        <template #cell-active="{ row }"><Badge :variant="asDriver(row).active ? 'success' : 'danger'">{{ asDriver(row).active ? 'Ativo' : 'Inativo' }}</Badge></template>
        <template #actions="{ row }"><Button size="small" variant="secondary" @click="editDriver(asDriver(row).id)">Editar<template #trailingIcon><ArrowRightIcon /></template></Button></template>
        <template #empty><EmptyState :bordered="false" size="large" :title="hasLoadingError ? 'Não foi possível carregar os entregadores' : 'Nenhum entregador encontrado'" :description="emptyDescription" :role="hasLoadingError ? 'alert' : 'status'"><template #icon><TriangleAlertIcon v-if="hasLoadingError" /><BikeIcon v-else-if="drivers.length === 0" /><SearchIcon v-else /></template><template #action><Button v-if="hasLoadingError" size="small" variant="secondary" @click="setLoading">Tentar novamente</Button><Button v-else-if="drivers.length === 0" size="small" variant="secondary" @click="createDriver">Novo entregador</Button><Button v-else-if="hasFilters" size="small" variant="secondary" @click="clearFilters">Limpar filtros</Button></template></EmptyState></template>
      </DataTable>

      <div v-if="!hasLoadingError" class="mt-4 flex shrink-0 flex-wrap items-center justify-between gap-3">
        <p class="text-sm text-slate-500" aria-live="polite">Mostrando {{ visibleStart }}–{{ visibleEnd }} de {{ filteredDrivers.length }} entregadores</p>
        <Pagination v-model="currentPage" :total="filteredDrivers.length" :items-per-page="itemsPerPage" size="medium" label="Paginação de entregadores" />
      </div>
    </Card>
  </section>
</template>
