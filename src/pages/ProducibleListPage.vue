<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  ArrowRightIcon, Badge, Button, Card, DataTable, EmptyState, Input, Pagination,
  SearchIcon, TriangleAlertIcon, type DataTableColumn, type DataTableRow
} from '@thiagoschoeffel/ts-components'
import { getProducibleSummaries } from '../mocks/producibleStore'
import type { ProducibleItemSummary } from '../types/producible'

const initialParams = new URLSearchParams(window.location.search)
const initialPage = Number(initialParams.get('pagina'))
const search = ref(initialParams.get('busca') ?? '')
const debouncedSearch = ref(search.value)
const currentPage = ref(Number.isInteger(initialPage) && initialPage > 0 ? initialPage : 1)
const isLoading = ref(true)
const hasLoadingError = ref(false)
const itemsPerPage = 10
const producibles = getProducibleSummaries()
let debounceTimeout: ReturnType<typeof setTimeout> | undefined
let loadingTimeout: ReturnType<typeof setTimeout> | undefined
let restoringHistory = false

const columns: DataTableColumn[] = [
  { key: 'name', label: 'Item', size: 'large' },
  { key: 'currentCompositionVersion', label: 'Composição atual', size: 'large', align: 'center' },
  { key: 'componentCount', label: 'Componentes', size: 'large', align: 'center' }
]

watch(search, value => {
  if (debounceTimeout) clearTimeout(debounceTimeout)
  debounceTimeout = setTimeout(() => debouncedSearch.value = value, 250)
})

function setLoading() {
  if (loadingTimeout) clearTimeout(loadingTimeout)
  hasLoadingError.value = false
  isLoading.value = true
  loadingTimeout = setTimeout(() => isLoading.value = false, 300)
}
function restoreFromUrl() {
  const params = new URLSearchParams(window.location.search)
  const page = Number(params.get('pagina'))
  search.value = params.get('busca') ?? ''
  debouncedSearch.value = search.value
  currentPage.value = Number.isInteger(page) && page > 0 ? page : 1
}
function persistState() {
  if (restoringHistory) return
  const url = new URL(window.location.href)
  if (debouncedSearch.value.trim()) url.searchParams.set('busca', debouncedSearch.value.trim())
  else url.searchParams.delete('busca')
  if (currentPage.value > 1) url.searchParams.set('pagina', String(currentPage.value))
  else url.searchParams.delete('pagina')
  if (url.href !== window.location.href) window.history.pushState(window.history.state, '', url)
}
watch(debouncedSearch, () => { currentPage.value = 1; setLoading() })
watch([debouncedSearch, currentPage], persistState)

const filteredProducibles = computed(() => {
  const query = debouncedSearch.value.trim().toLocaleLowerCase('pt-BR')
  return producibles.filter(item => !query
    || item.id.toLocaleLowerCase('pt-BR').includes(query)
    || item.name.toLocaleLowerCase('pt-BR').includes(query))
})
const visibleProducibles = computed(() => filteredProducibles.value.slice((currentPage.value - 1) * itemsPerPage, currentPage.value * itemsPerPage))
const rows = computed<DataTableRow[]>(() => visibleProducibles.value.map(item => ({ ...item })))
const hasFilters = computed(() => Boolean(debouncedSearch.value.trim()))

function asProducible(row: DataTableRow) { return row as unknown as ProducibleItemSummary }
function listReturnUrl() { return `${window.location.pathname}${window.location.search}` }
function producibleHref(id: string) { return `/produziveis/${id}?retorno=${encodeURIComponent(listReturnUrl())}` }
function openProducible(id: string) { window.location.assign(producibleHref(id)) }
function clearFilters() { search.value = ''; debouncedSearch.value = '' }
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
  <section class="space-y-4" aria-label="Lista de itens produzíveis">
    <Input
      v-model="search" type="search" aria-label="Buscar produzível por nome ou código"
      placeholder="Buscar nome ou código..." clearable class="w-full sm:max-w-sm">
      <template #leading><SearchIcon class="size-4 text-slate-400" aria-hidden="true" /></template>
    </Input>

    <p v-if="!hasLoadingError" class="text-sm text-slate-500" aria-live="polite">
      {{ filteredProducibles.length }} item{{ filteredProducibles.length === 1 ? '' : 's' }} exibido{{ filteredProducibles.length === 1 ? '' : 's' }}
    </p>

    <div class="space-y-3 md:hidden">
      <template v-if="isLoading && !hasLoadingError">
        <div v-for="index in 4" :key="index" class="animate-pulse rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div class="h-4 w-40 rounded bg-slate-200"></div><div class="mt-3 h-3 w-24 rounded bg-slate-100"></div>
        </div>
      </template>
      <EmptyState
        v-else-if="hasLoadingError || visibleProducibles.length === 0" class="bg-white shadow-sm" size="large"
        :title="hasLoadingError ? 'Não foi possível carregar os produzíveis' : 'Nenhum item produzível encontrado'"
        :description="hasLoadingError ? 'Tente carregar a lista novamente.' : 'Ajuste a busca ou cadastre um novo item.'">
        <template #icon><TriangleAlertIcon v-if="hasLoadingError" /><SearchIcon v-else /></template>
        <template #action><Button v-if="hasLoadingError" size="small" @click="setLoading">Tentar novamente</Button><Button v-else-if="hasFilters" size="small" variant="secondary" @click="clearFilters">Limpar busca</Button></template>
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
      class="hidden h-[min(36rem,calc(100dvh-15rem))] md:block" :columns="columns" :rows="hasLoadingError ? [] : rows"
      :selectable="false" :loading="isLoading && !hasLoadingError" row-key="id" label="Itens produzíveis filtrados" actions-label="Ação">
      <template #cell-name="{ row }"><p class="font-medium text-slate-800">{{ asProducible(row).name }}</p><p class="mt-1 text-xs text-slate-500">{{ asProducible(row).id }}</p></template>
      <template #cell-currentCompositionVersion="{ row }"><Badge :variant="asProducible(row).currentCompositionVersion ? 'info' : 'neutral'">{{ asProducible(row).currentCompositionVersion ? `v${asProducible(row).currentCompositionVersion}` : 'Nenhuma' }}</Badge></template>
      <template #cell-componentCount="{ row }"><span class="font-medium text-slate-700">{{ asProducible(row).componentCount ?? 0 }}</span></template>
      <template #actions="{ row }"><Button size="small" variant="secondary" @click="openProducible(asProducible(row).id)">Ver<template #trailingIcon><ArrowRightIcon /></template></Button></template>
      <template #empty><EmptyState :bordered="false" size="small" :title="hasLoadingError ? 'Não foi possível carregar os produzíveis' : 'Nenhum item produzível encontrado'" :description="hasLoadingError ? 'Tente carregar a lista novamente.' : 'Ajuste a busca ou cadastre um novo item.'"><template #icon><TriangleAlertIcon v-if="hasLoadingError" /><SearchIcon v-else /></template><template #action><Button v-if="hasLoadingError" size="small" @click="setLoading">Tentar novamente</Button><Button v-else-if="hasFilters" size="small" variant="secondary" @click="clearFilters">Limpar busca</Button></template></EmptyState></template>
    </DataTable>

    <div v-if="!hasLoadingError && filteredProducibles.length > itemsPerPage" class="flex flex-wrap items-center justify-between gap-3">
      <p class="text-sm text-slate-500">Mostrando {{ (currentPage - 1) * itemsPerPage + 1 }}–{{ Math.min(currentPage * itemsPerPage, filteredProducibles.length) }} de {{ filteredProducibles.length }} itens</p>
      <Pagination v-model="currentPage" :total="filteredProducibles.length" :items-per-page="itemsPerPage" label="Paginação de produzíveis" />
    </div>
  </section>
</template>
