<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  ArrowRightIcon, Badge, Button, Card, DataTable, EmptyState, Input, Pagination,
  FactoryIcon, SearchIcon, TriangleAlertIcon, type DataTableColumn, type DataTableRow,
  type DataTableSortDirection
} from '@thiagoschoeffel/ts-components'
import { getProducibleSummaries } from '../mocks/producibleStore'
import type { ProducibleItemSummary } from '../types/producible'

type ProducibleListMockScenario = 'padrao' | 'sem-produziveis' | 'sem-resultados' | 'erro'

const initialParams = new URLSearchParams(window.location.search)
const validMockScenarios = new Set<ProducibleListMockScenario>(['padrao', 'sem-produziveis', 'sem-resultados', 'erro'])
const initialMockScenario = initialParams.get('mock')
const mockScenario: ProducibleListMockScenario = validMockScenarios.has(initialMockScenario as ProducibleListMockScenario)
  ? initialMockScenario as ProducibleListMockScenario
  : 'padrao'
const initialPage = Number(initialParams.get('pagina'))
const initialSortKey = initialParams.get('ordenar')
const initialSortDirection = initialParams.get('direcao')
type ProducibleSortKey = 'name' | 'currentCompositionVersion' | 'componentCount'
const validSortKeys = new Set<ProducibleSortKey>(['name', 'currentCompositionVersion', 'componentCount'])
const search = ref(initialParams.get('busca') ?? (mockScenario === 'sem-resultados' ? 'Produzível inexistente' : ''))
const debouncedSearch = ref(search.value)
const currentPage = ref(Number.isInteger(initialPage) && initialPage > 0 ? initialPage : 1)
const activeSortKey = ref<ProducibleSortKey>(validSortKeys.has(initialSortKey as ProducibleSortKey) ? initialSortKey as ProducibleSortKey : 'name')
const activeSortDirection = ref<DataTableSortDirection>(initialSortDirection === 'desc' ? 'desc' : 'asc')
const isLoading = ref(true)
const hasLoadingError = ref(false)
const itemsPerPage = 10
const producibles = mockScenario === 'sem-produziveis' ? [] : getProducibleSummaries()
let debounceTimeout: ReturnType<typeof setTimeout> | undefined
let loadingTimeout: ReturnType<typeof setTimeout> | undefined
let restoringHistory = false

const columns: DataTableColumn[] = [
  { key: 'name', label: 'Item', size: 'large', sortable: true },
  { key: 'currentCompositionVersion', label: 'Composição atual', size: 'large', align: 'center', sortable: true },
  { key: 'componentCount', label: 'Componentes', size: 'large', align: 'center', sortable: true }
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
    hasLoadingError.value = mockScenario === 'erro'
  }, 300)
}
function restoreFromUrl() {
  const params = new URLSearchParams(window.location.search)
  const page = Number(params.get('pagina'))
  search.value = params.get('busca') ?? ''
  debouncedSearch.value = search.value
  const sortKey = params.get('ordenar')
  const sortDirection = params.get('direcao')
  activeSortKey.value = validSortKeys.has(sortKey as ProducibleSortKey) ? sortKey as ProducibleSortKey : 'name'
  activeSortDirection.value = sortDirection === 'desc' ? 'desc' : 'asc'
  currentPage.value = Number.isInteger(page) && page > 0 ? page : 1
}
function persistState() {
  if (restoringHistory) return
  const url = new URL(window.location.href)
  if (debouncedSearch.value.trim()) url.searchParams.set('busca', debouncedSearch.value.trim())
  else url.searchParams.delete('busca')
  if (activeSortKey.value !== 'name') url.searchParams.set('ordenar', activeSortKey.value)
  else url.searchParams.delete('ordenar')
  if (activeSortDirection.value !== 'asc') url.searchParams.set('direcao', activeSortDirection.value)
  else url.searchParams.delete('direcao')
  if (currentPage.value > 1) url.searchParams.set('pagina', String(currentPage.value))
  else url.searchParams.delete('pagina')
  if (url.href !== window.location.href) window.history.pushState(window.history.state, '', url)
}
watch([debouncedSearch, activeSortKey, activeSortDirection], () => { currentPage.value = 1; setLoading() })
watch([debouncedSearch, activeSortKey, activeSortDirection, currentPage], persistState)

const filteredProducibles = computed(() => {
  const query = debouncedSearch.value.trim().toLocaleLowerCase('pt-BR')
  const matchingItems = producibles.filter(item => !query
    || item.id.toLocaleLowerCase('pt-BR').includes(query)
    || item.name.toLocaleLowerCase('pt-BR').includes(query))
  const direction = activeSortDirection.value === 'asc' ? 1 : -1
  return [...matchingItems].sort((first, second) => {
    const firstValue = first[activeSortKey.value] ?? -1
    const secondValue = second[activeSortKey.value] ?? -1
    if (typeof firstValue === 'number' && typeof secondValue === 'number')
      return (firstValue - secondValue) * direction
    return String(firstValue).localeCompare(String(secondValue), 'pt-BR', { numeric: true, sensitivity: 'base' }) * direction
  })
})
const visibleProducibles = computed(() => filteredProducibles.value.slice((currentPage.value - 1) * itemsPerPage, currentPage.value * itemsPerPage))
const rows = computed<DataTableRow[]>(() => visibleProducibles.value.map(item => ({ ...item })))
const hasFilters = computed(() => Boolean(debouncedSearch.value.trim()))
const visibleStart = computed(() => filteredProducibles.value.length === 0 ? 0 : (currentPage.value - 1) * itemsPerPage + 1)
const visibleEnd = computed(() => Math.min(currentPage.value * itemsPerPage, filteredProducibles.value.length))
const emptyDescription = computed(() => {
  if (hasLoadingError.value) return 'Verifique a conexão e tente carregar a lista novamente.'
  if (hasFilters.value) return `Não encontramos itens para “${debouncedSearch.value.trim()}”.`
  return 'Os itens cadastrados aparecerão aqui.'
})

function asProducible(row: DataTableRow) { return row as unknown as ProducibleItemSummary }
function listReturnUrl() { return `${window.location.pathname}${window.location.search}` }
function producibleHref(id: string) { return `/produziveis/${id}?retorno=${encodeURIComponent(listReturnUrl())}` }
function openProducible(id: string) { window.location.assign(producibleHref(id)) }
function createProducible() { window.location.assign(`/produziveis/novo?retorno=${encodeURIComponent(listReturnUrl())}`) }
function clearFilters() { search.value = ''; debouncedSearch.value = '' }
function updateSort(state: { key?: string; direction?: DataTableSortDirection }) {
  activeSortKey.value = validSortKeys.has(state.key as ProducibleSortKey) ? state.key as ProducibleSortKey : 'name'
  activeSortDirection.value = state.direction ?? 'asc'
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
  <section class="md:flex md:h-full md:min-h-0 md:flex-col" aria-label="Lista de itens produzíveis">
    <Card class="md:shrink-0 [&>div]:p-4">
      <Input
        v-model="search" type="search" aria-label="Buscar produzível por nome ou código"
        placeholder="Buscar nome ou código..." clearable class="w-full sm:max-w-sm">
        <template #leading><SearchIcon class="size-4 text-slate-400" aria-hidden="true" /></template>
      </Input>
    </Card>

    <Card class="mt-4 md:min-h-0 md:flex-1 [&>div]:flex [&>div]:min-h-0 [&>div]:flex-col [&>div]:p-4">
      <div class="space-y-3 md:hidden">
      <template v-if="isLoading && !hasLoadingError">
        <div v-for="index in 4" :key="index" class="animate-pulse rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div class="h-4 w-40 rounded bg-slate-200"></div><div class="mt-3 h-3 w-24 rounded bg-slate-100"></div>
        </div>
      </template>
      <EmptyState
        v-else-if="hasLoadingError || visibleProducibles.length === 0" class="bg-white shadow-sm" size="large"
        :title="hasLoadingError ? 'Não foi possível carregar os produzíveis' : 'Nenhum item produzível encontrado'"
        :description="emptyDescription" :role="hasLoadingError ? 'alert' : 'status'">
        <template #icon><TriangleAlertIcon v-if="hasLoadingError" /><FactoryIcon v-else-if="producibles.length === 0" /><SearchIcon v-else /></template>
        <template #action><Button v-if="hasLoadingError" size="small" @click="setLoading">Tentar novamente</Button><Button v-else-if="producibles.length === 0" type="button" size="small" variant="secondary" @click="createProducible">Novo item produzível</Button><Button v-else-if="hasFilters" size="small" variant="secondary" @click="clearFilters">Limpar busca</Button></template>
      </EmptyState>
      <Card v-for="item in isLoading ? [] : visibleProducibles" v-else :key="item.id">
        <div class="flex items-start justify-between gap-3">
          <div><p class="font-semibold text-slate-800">{{ item.name }}</p><p class="mt-1 text-xs text-slate-500">{{ item.id }}</p></div>
          <Badge :variant="item.currentCompositionVersion ? 'info' : 'neutral'">{{ item.currentCompositionVersion ? `v${item.currentCompositionVersion}` : 'Sem composição' }}</Badge>
        </div>
        <p class="mt-3 text-sm text-slate-600">{{ item.componentCount ?? 0 }} componente{{ item.componentCount === 1 ? '' : 's' }}</p>
        <template #footer><a :href="producibleHref(item.id)" class="-mx-6 -my-4 flex items-center justify-between gap-3 px-6 py-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"><span>Ver item</span><ArrowRightIcon class="size-4" aria-hidden="true" /></a></template>
      </Card>
      </div>

    <DataTable
      :class="['hidden min-h-0 flex-1 md:flex', !isLoading && (hasLoadingError || visibleProducibles.length === 0) ? '[&_table]:h-full [&_tbody>tr>td]:align-middle' : '']"
      :columns="columns" :rows="hasLoadingError ? [] : rows" :selectable="false" :loading="isLoading && !hasLoadingError"
      sort-mode="manual" :sort-key="activeSortKey" :sort-direction="activeSortDirection"
      row-key="id" label="Itens produzíveis filtrados" actions-label="Ação" @sort="updateSort">
      <template #cell-name="{ row }"><p class="font-medium text-slate-800">{{ asProducible(row).name }}</p><p class="mt-1 text-xs text-slate-500">{{ asProducible(row).id }}</p></template>
      <template #cell-currentCompositionVersion="{ row }"><Badge :variant="asProducible(row).currentCompositionVersion ? 'info' : 'neutral'">{{ asProducible(row).currentCompositionVersion ? `v${asProducible(row).currentCompositionVersion}` : 'Nenhuma' }}</Badge></template>
      <template #cell-componentCount="{ row }"><span class="font-medium text-slate-700">{{ asProducible(row).componentCount ?? 0 }}</span></template>
      <template #actions="{ row }"><Button size="small" variant="secondary" @click="openProducible(asProducible(row).id)">Ver<template #trailingIcon><ArrowRightIcon /></template></Button></template>
      <template #empty><EmptyState :bordered="false" size="large" :title="hasLoadingError ? 'Não foi possível carregar os produzíveis' : 'Nenhum item produzível encontrado'" :description="emptyDescription" :role="hasLoadingError ? 'alert' : 'status'"><template #icon><TriangleAlertIcon v-if="hasLoadingError" /><FactoryIcon v-else-if="producibles.length === 0" /><SearchIcon v-else /></template><template #action><Button v-if="hasLoadingError" size="small" variant="secondary" @click="setLoading">Tentar novamente</Button><Button v-else-if="producibles.length === 0" type="button" size="small" variant="secondary" @click="createProducible">Novo item produzível</Button><Button v-else-if="hasFilters" size="small" variant="secondary" @click="clearFilters">Limpar busca</Button></template></EmptyState></template>
    </DataTable>

      <div v-if="!hasLoadingError" class="mt-4 flex shrink-0 flex-wrap items-center justify-between gap-3">
        <p class="text-sm text-slate-500">Mostrando {{ visibleStart }}–{{ visibleEnd }} de {{ filteredProducibles.length }} itens</p>
        <Pagination v-model="currentPage" :total="filteredProducibles.length" :items-per-page="itemsPerPage" size="medium" label="Paginação de produzíveis" />
      </div>
    </Card>
  </section>
</template>
