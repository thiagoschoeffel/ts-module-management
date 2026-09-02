<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  ArrowRightIcon, Badge, BoxesIcon, Button, Card, DataTable, EmptyState, Input,
  Pagination, SearchIcon, Select, TriangleAlertIcon, type DataTableColumn,
  type DataTableRow, type DataTableSortDirection, type SelectOption
} from '@thiagoschoeffel/ts-components'
import { formatCurrency, getOffers } from '../mocks/catalogStore'
import type { Offer } from '../types/catalog'

type StatusFilter = 'all' | 'active' | 'inactive'
type OfferSortKey = 'name' | 'basePrice' | 'structure' | 'addons' | 'active'
type OfferListMockScenario = 'padrao' | 'sem-ofertas' | 'sem-resultados' | 'erro'

const initialParams = new URLSearchParams(window.location.search)
const validMockScenarios = new Set<OfferListMockScenario>(['padrao', 'sem-ofertas', 'sem-resultados', 'erro'])
const initialMockScenario = initialParams.get('mock')
const mockScenario: OfferListMockScenario = validMockScenarios.has(initialMockScenario as OfferListMockScenario)
  ? initialMockScenario as OfferListMockScenario
  : 'padrao'
const initialPage = Number(initialParams.get('pagina'))
const initialSortKey = initialParams.get('ordenar')
const validSortKeys = new Set<OfferSortKey>(['name', 'basePrice', 'structure', 'addons', 'active'])
const search = ref(initialParams.get('busca') ?? (mockScenario === 'sem-resultados' ? 'Oferta inexistente' : ''))
const debouncedSearch = ref(search.value)
const status = ref<StatusFilter>(['active', 'inactive'].includes(initialParams.get('status') ?? '') ? initialParams.get('status') as StatusFilter : 'all')
const currentPage = ref(Number.isInteger(initialPage) && initialPage > 0 ? initialPage : 1)
const activeSortKey = ref<OfferSortKey>(validSortKeys.has(initialSortKey as OfferSortKey) ? initialSortKey as OfferSortKey : 'name')
const activeSortDirection = ref<DataTableSortDirection>(initialParams.get('direcao') === 'desc' ? 'desc' : 'asc')
const isLoading = ref(true)
const hasLoadingError = ref(false)
const itemsPerPage = 10
const offers = mockScenario === 'sem-ofertas' ? [] : getOffers()
let debounceTimeout: ReturnType<typeof setTimeout> | undefined
let loadingTimeout: ReturnType<typeof setTimeout> | undefined
let restoringHistory = false
let simulatedFailureShown = false

const statusOptions: SelectOption[] = [
  { value: 'all', label: 'Todas' },
  { value: 'active', label: 'Ativas' },
  { value: 'inactive', label: 'Inativas' }
]
const columns: DataTableColumn[] = [
  { key: 'name', label: 'Oferta', size: 'large', sortable: true },
  { key: 'basePrice', label: 'Preço base', size: 'small', sortable: true },
  { key: 'structure', label: 'Estrutura', size: 'large', sortable: true },
  { key: 'addons', label: 'Adicionais', size: 'small', align: 'center', sortable: true },
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
  activeSortKey.value = validSortKeys.has(sortKey as OfferSortKey) ? sortKey as OfferSortKey : 'name'
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

function structureCount(offer: Offer) { return offer.components.length + offer.choiceGroups.length }
function structure(offer: Offer) {
  const parts = [`${offer.components.length} componente${offer.components.length === 1 ? '' : 's'}`]
  if (offer.choiceGroups.length) parts.push(`${offer.choiceGroups.length} grupo${offer.choiceGroups.length === 1 ? '' : 's'} de escolha`)
  return parts.join(' · ')
}

const filteredOffers = computed(() => {
  const query = debouncedSearch.value.trim().toLocaleLowerCase('pt-BR')
  const matchingOffers = offers.filter(offer => {
    const matchesSearch = !query
      || offer.id.toLocaleLowerCase('pt-BR').includes(query)
      || offer.name.toLocaleLowerCase('pt-BR').includes(query)
      || offer.description?.toLocaleLowerCase('pt-BR').includes(query)
    return matchesSearch && (status.value === 'all' || offer.active === (status.value === 'active'))
  })
  const direction = activeSortDirection.value === 'asc' ? 1 : -1
  return [...matchingOffers].sort((first, second) => {
    const key = activeSortKey.value
    const firstValue = key === 'structure' ? structureCount(first) : key === 'addons' ? first.allowedAddonIds.length : first[key]
    const secondValue = key === 'structure' ? structureCount(second) : key === 'addons' ? second.allowedAddonIds.length : second[key]
    if (typeof firstValue === 'number' && typeof secondValue === 'number') return (firstValue - secondValue) * direction
    if (typeof firstValue === 'boolean' && typeof secondValue === 'boolean') return (Number(firstValue) - Number(secondValue)) * direction
    return String(firstValue).localeCompare(String(secondValue), 'pt-BR', { numeric: true, sensitivity: 'base' }) * direction
  })
})
const visibleOffers = computed(() => filteredOffers.value.slice((currentPage.value - 1) * itemsPerPage, currentPage.value * itemsPerPage))
const rows = computed<DataTableRow[]>(() => visibleOffers.value.map(offer => ({ ...offer, structure: structureCount(offer), addons: offer.allowedAddonIds.length })))
const hasFilters = computed(() => Boolean(debouncedSearch.value.trim()) || status.value !== 'all')
const visibleStart = computed(() => filteredOffers.value.length === 0 ? 0 : (currentPage.value - 1) * itemsPerPage + 1)
const visibleEnd = computed(() => Math.min(currentPage.value * itemsPerPage, filteredOffers.value.length))
function clampCurrentPage() {
  const lastPage = Math.max(1, Math.ceil(filteredOffers.value.length / itemsPerPage))
  currentPage.value = Math.min(currentPage.value, lastPage)
}
const emptyDescription = computed(() => {
  if (hasLoadingError.value) return 'Verifique a conexão e tente carregar a lista novamente.'
  if (debouncedSearch.value.trim()) return `Não encontramos ofertas para “${debouncedSearch.value.trim()}”.`
  if (status.value === 'active') return 'Nenhuma oferta ativa está cadastrada.'
  if (status.value === 'inactive') return 'Nenhuma oferta inativa está cadastrada.'
  return 'As ofertas cadastradas aparecerão aqui.'
})

function asOffer(row: DataTableRow) { return row as unknown as Offer }
function listReturnUrl() { return `${window.location.pathname}${window.location.search}` }
function offerHref(id: string) { return `/catalogo/${id}?retorno=${encodeURIComponent(listReturnUrl())}` }
function openOffer(id: string) { window.location.assign(offerHref(id)) }
function createOffer() { window.location.assign(`/catalogo/novo?retorno=${encodeURIComponent(listReturnUrl())}`) }
function clearFilters() { search.value = ''; debouncedSearch.value = ''; status.value = 'all' }
function updateSort(state: { key?: string, direction?: DataTableSortDirection }) {
  activeSortKey.value = validSortKeys.has(state.key as OfferSortKey) ? state.key as OfferSortKey : 'name'
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
  <section class="md:flex md:h-full md:min-h-0 md:flex-col" aria-label="Lista de ofertas">
    <Card class="md:shrink-0 [&>div]:p-4">
      <div class="flex flex-wrap items-end gap-3">
        <Input v-model="search" type="search" aria-label="Buscar oferta por nome, descrição ou código" placeholder="Buscar nome, descrição ou código..." clearable class="w-full sm:max-w-sm [&_input]:pl-10! [&_input]:pr-10!">
          <template #leading><SearchIcon class="size-4 text-slate-400" aria-hidden="true" /></template>
        </Input>
        <Select v-model="status" class="w-full sm:w-40!" aria-label="Filtrar ofertas por status" :options="statusOptions" />
      </div>
    </Card>

    <Card class="mt-4 md:min-h-0 md:flex-1 [&>div]:flex [&>div]:min-h-0 [&>div]:flex-col [&>div]:p-4">
      <div class="space-y-3 md:hidden">
        <template v-if="isLoading && !hasLoadingError">
          <div v-for="index in 4" :key="index" class="animate-pulse rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div class="h-4 w-40 rounded bg-slate-200" /><div class="mt-3 h-3 w-24 rounded bg-slate-100" /><div class="mt-4 h-3 w-48 rounded bg-slate-100" />
          </div>
        </template>
        <EmptyState v-else-if="hasLoadingError || visibleOffers.length === 0" class="bg-white shadow-sm" size="large" :title="hasLoadingError ? 'Não foi possível carregar as ofertas' : 'Nenhuma oferta encontrada'" :description="emptyDescription" :role="hasLoadingError ? 'alert' : 'status'">
          <template #icon><TriangleAlertIcon v-if="hasLoadingError" /><BoxesIcon v-else-if="offers.length === 0" /><SearchIcon v-else /></template>
          <template #action><Button v-if="hasLoadingError" size="small" variant="secondary" @click="setLoading">Tentar novamente</Button><Button v-else-if="offers.length === 0" type="button" size="small" variant="secondary" @click="createOffer">Nova oferta</Button><Button v-else-if="hasFilters" size="small" variant="secondary" @click="clearFilters">Limpar filtros</Button></template>
        </EmptyState>
        <Card v-for="offer in isLoading ? [] : visibleOffers" v-else :key="offer.id">
          <div class="flex items-start justify-between gap-3"><div><p class="font-semibold text-slate-800">{{ offer.name }}</p><p class="mt-1 text-xs text-slate-500">{{ offer.id }}</p></div><Badge :variant="offer.active ? 'success' : 'danger'">{{ offer.active ? 'Ativa' : 'Inativa' }}</Badge></div>
          <p class="mt-3 font-medium text-slate-700">{{ formatCurrency(offer.basePrice) }}</p>
          <p class="mt-2 text-sm text-slate-500">{{ structure(offer) }} · {{ offer.allowedAddonIds.length }} adicional{{ offer.allowedAddonIds.length === 1 ? '' : 'is' }}</p>
          <template #footer><a :href="offerHref(offer.id)" class="-mx-6 -my-4 flex items-center justify-between gap-3 px-6 py-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"><span>Ver oferta</span><ArrowRightIcon class="size-4" aria-hidden="true" /></a></template>
        </Card>
      </div>

      <DataTable
        :class="['hidden min-h-0 flex-1 md:flex', !isLoading && (hasLoadingError || visibleOffers.length === 0) ? '[&_table]:h-full [&_tbody>tr>td]:align-middle' : '']"
        :columns="columns" :rows="hasLoadingError ? [] : rows" :selectable="false" :loading="isLoading && !hasLoadingError"
        sort-mode="manual" :sort-key="activeSortKey" :sort-direction="activeSortDirection"
        row-key="id" label="Ofertas filtradas por busca e status" actions-label="Ação" @sort="updateSort">
        <template #cell-name="{ row }"><p class="font-medium text-slate-800">{{ asOffer(row).name }}</p><p class="mt-1 text-xs text-slate-500">{{ asOffer(row).id }}</p></template>
        <template #cell-basePrice="{ row }"><span class="font-medium text-slate-700">{{ formatCurrency(asOffer(row).basePrice) }}</span></template>
        <template #cell-structure="{ row }"><span class="text-slate-600">{{ structure(asOffer(row)) }}</span></template>
        <template #cell-addons="{ row }"><Badge variant="neutral">{{ asOffer(row).allowedAddonIds.length }}</Badge></template>
        <template #cell-active="{ row }"><Badge :variant="asOffer(row).active ? 'success' : 'danger'">{{ asOffer(row).active ? 'Ativa' : 'Inativa' }}</Badge></template>
        <template #actions="{ row }"><Button size="small" variant="secondary" @click="openOffer(asOffer(row).id)">Ver<template #trailingIcon><ArrowRightIcon /></template></Button></template>
        <template #empty><EmptyState :bordered="false" size="large" :title="hasLoadingError ? 'Não foi possível carregar as ofertas' : 'Nenhuma oferta encontrada'" :description="emptyDescription" :role="hasLoadingError ? 'alert' : 'status'"><template #icon><TriangleAlertIcon v-if="hasLoadingError" /><BoxesIcon v-else-if="offers.length === 0" /><SearchIcon v-else /></template><template #action><Button v-if="hasLoadingError" size="small" variant="secondary" @click="setLoading">Tentar novamente</Button><Button v-else-if="offers.length === 0" type="button" size="small" variant="secondary" @click="createOffer">Nova oferta</Button><Button v-else-if="hasFilters" size="small" variant="secondary" @click="clearFilters">Limpar filtros</Button></template></EmptyState></template>
      </DataTable>

      <div v-if="!hasLoadingError" class="mt-4 flex shrink-0 flex-wrap items-center justify-between gap-3">
        <p class="text-sm text-slate-500">Mostrando {{ visibleStart }}–{{ visibleEnd }} de {{ filteredOffers.length }} ofertas</p>
        <Pagination v-model="currentPage" :total="filteredOffers.length" :items-per-page="itemsPerPage" size="medium" label="Paginação de ofertas" />
      </div>
    </Card>
  </section>
</template>
