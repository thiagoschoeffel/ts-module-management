<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ArrowRightIcon, Badge, Button, Card, DataTable, EmptyState, Input, Pagination, SearchIcon, Select, TriangleAlertIcon, type DataTableColumn, type DataTableRow, type SelectOption } from '@thiagoschoeffel/ts-components'
import { formatCurrency, getOffers } from '../mocks/catalogStore'
import type { Offer } from '../types/catalog'

type StatusFilter = 'all' | 'active' | 'inactive'
const params = new URLSearchParams(window.location.search)
const initialPage = Number(params.get('pagina'))
const search = ref(params.get('busca') ?? '')
const debouncedSearch = ref(search.value)
const status = ref<StatusFilter>(['active', 'inactive'].includes(params.get('status') ?? '') ? params.get('status') as StatusFilter : 'all')
const currentPage = ref(Number.isInteger(initialPage) && initialPage > 0 ? initialPage : 1)
const isLoading = ref(true)
const hasLoadingError = ref(false)
const itemsPerPage = 10
const offers = getOffers()
let debounceTimeout: ReturnType<typeof setTimeout> | undefined
let loadingTimeout: ReturnType<typeof setTimeout> | undefined
let restoring = false
const statusOptions: SelectOption[] = [{ value: 'all', label: 'Todas' }, { value: 'active', label: 'Ativas' }, { value: 'inactive', label: 'Inativas' }]
const columns: DataTableColumn[] = [
  { key: 'name', label: 'Oferta', size: 'large' }, { key: 'basePrice', label: 'Preço base', size: 'small' },
  { key: 'structure', label: 'Estrutura', size: 'large' }, { key: 'addons', label: 'Adicionais', size: 'small', align: 'center' },
  { key: 'active', label: 'Status', size: 'small', align: 'center' }
]
watch(search, value => { if (debounceTimeout) clearTimeout(debounceTimeout); debounceTimeout = setTimeout(() => debouncedSearch.value = value, 250) })
function load() { if (loadingTimeout) clearTimeout(loadingTimeout); hasLoadingError.value = false; isLoading.value = true; loadingTimeout = setTimeout(() => isLoading.value = false, 300) }
function restore() { const value = new URLSearchParams(window.location.search); search.value = value.get('busca') ?? ''; debouncedSearch.value = search.value; status.value = ['active', 'inactive'].includes(value.get('status') ?? '') ? value.get('status') as StatusFilter : 'all'; const page = Number(value.get('pagina')); currentPage.value = Number.isInteger(page) && page > 0 ? page : 1 }
function persist() { if (restoring) return; const url = new URL(window.location.href); if (debouncedSearch.value.trim()) url.searchParams.set('busca', debouncedSearch.value.trim()); else url.searchParams.delete('busca'); if (status.value !== 'all') url.searchParams.set('status', status.value); else url.searchParams.delete('status'); if (currentPage.value > 1) url.searchParams.set('pagina', String(currentPage.value)); else url.searchParams.delete('pagina'); if (url.href !== window.location.href) window.history.pushState(window.history.state, '', url) }
watch([debouncedSearch, status], () => { currentPage.value = 1; load() })
watch([debouncedSearch, status, currentPage], persist)
const filtered = computed(() => { const query = debouncedSearch.value.trim().toLocaleLowerCase('pt-BR'); return offers.filter(offer => (!query || offer.name.toLocaleLowerCase('pt-BR').includes(query)) && (status.value === 'all' || offer.active === (status.value === 'active'))) })
const visible = computed(() => filtered.value.slice((currentPage.value - 1) * itemsPerPage, currentPage.value * itemsPerPage))
const rows = computed<DataTableRow[]>(() => visible.value.map(offer => ({ ...offer, structure: '', addons: offer.allowedAddonIds.length })))
const hasFilters = computed(() => Boolean(debouncedSearch.value.trim()) || status.value !== 'all')
function asOffer(row: DataTableRow) { return row as unknown as Offer }
function structure(offer: Offer) { const parts = [`${offer.components.length} componente${offer.components.length === 1 ? '' : 's'}`]; if (offer.choiceGroups.length) parts.push(`${offer.choiceGroups.length} grupo${offer.choiceGroups.length === 1 ? '' : 's'} de escolha`); return parts.join(' · ') }
function listReturnUrl() { return `${window.location.pathname}${window.location.search}` }
function href(id: string) { return `/catalogo/${id}?retorno=${encodeURIComponent(listReturnUrl())}` }
function open(id: string) { window.location.assign(href(id)) }
function clear() { search.value = ''; debouncedSearch.value = ''; status.value = 'all' }
function popstate() { restoring = true; restore(); queueMicrotask(() => restoring = false) }
onMounted(() => { window.addEventListener('popstate', popstate); load() })
onBeforeUnmount(() => { if (debounceTimeout) clearTimeout(debounceTimeout); if (loadingTimeout) clearTimeout(loadingTimeout); window.removeEventListener('popstate', popstate) })
</script>

<template>
  <section class="space-y-4" aria-label="Lista de ofertas">
    <div class="flex flex-wrap items-end gap-3"><Input v-model="search" type="search" aria-label="Buscar oferta por nome" placeholder="Buscar oferta..." clearable class="w-full sm:max-w-sm"><template #leading><SearchIcon class="size-4 text-slate-400" /></template></Input><Select v-model="status" class="w-full sm:w-40" aria-label="Filtrar ofertas por status" :options="statusOptions" /></div>
    <p v-if="!hasLoadingError" class="text-sm text-slate-500" aria-live="polite">{{ filtered.length }} oferta{{ filtered.length === 1 ? '' : 's' }} exibida{{ filtered.length === 1 ? '' : 's' }}</p>
    <div class="space-y-3 md:hidden">
      <template v-if="isLoading"><div v-for="index in 4" :key="index" class="h-32 animate-pulse rounded-lg border border-slate-200 bg-white shadow-sm" /></template>
      <EmptyState v-else-if="hasLoadingError || !visible.length" class="bg-white shadow-sm" :title="hasLoadingError ? 'Não foi possível carregar as ofertas' : 'Nenhuma oferta encontrada'" :description="hasLoadingError ? 'Tente carregar a lista novamente.' : 'Ajuste a busca ou os filtros atuais.'"><template #icon><TriangleAlertIcon v-if="hasLoadingError" /><SearchIcon v-else /></template><template #action><Button v-if="hasLoadingError" size="small" @click="load">Tentar novamente</Button><Button v-else-if="hasFilters" size="small" variant="secondary" @click="clear">Limpar filtros</Button></template></EmptyState>
      <Card v-for="offer in isLoading ? [] : visible" v-else :key="offer.id"><div class="flex items-start justify-between gap-3"><div><p class="font-semibold text-slate-800">{{ offer.name }}</p><p class="mt-1 text-sm font-medium text-slate-600">{{ formatCurrency(offer.basePrice) }}</p></div><Badge :variant="offer.active ? 'success' : 'neutral'">{{ offer.active ? 'Ativa' : 'Inativa' }}</Badge></div><p class="mt-3 text-sm text-slate-500">{{ structure(offer) }} · {{ offer.allowedAddonIds.length }} adicionais</p><template #footer><a :href="href(offer.id)" class="-mx-6 -my-4 flex items-center justify-between px-6 py-4 text-sm font-medium text-slate-700 hover:bg-slate-100"><span>Ver oferta</span><ArrowRightIcon class="size-4" /></a></template></Card>
    </div>
    <DataTable class="hidden h-[min(36rem,calc(100dvh-18rem))] md:flex" :columns="columns" :rows="hasLoadingError ? [] : rows" :selectable="false" :loading="isLoading" row-key="id" label="Ofertas filtradas" actions-label="Ação">
      <template #cell-name="{ row }"><p class="font-medium text-slate-800">{{ asOffer(row).name }}</p><p class="mt-1 text-xs text-slate-500">{{ asOffer(row).id }}</p></template><template #cell-basePrice="{ row }"><span class="font-medium text-slate-700">{{ formatCurrency(asOffer(row).basePrice) }}</span></template><template #cell-structure="{ row }"><span class="text-slate-600">{{ structure(asOffer(row)) }}</span></template><template #cell-addons="{ row }"><Badge variant="neutral">{{ asOffer(row).allowedAddonIds.length }}</Badge></template><template #cell-active="{ row }"><Badge :variant="asOffer(row).active ? 'success' : 'neutral'">{{ asOffer(row).active ? 'Ativa' : 'Inativa' }}</Badge></template><template #actions="{ row }"><Button size="small" variant="secondary" @click="open(asOffer(row).id)">Ver<template #trailingIcon><ArrowRightIcon /></template></Button></template>
      <template #empty><EmptyState :bordered="false" size="small" :title="hasLoadingError ? 'Não foi possível carregar as ofertas' : 'Nenhuma oferta encontrada'" description="Ajuste a busca ou os filtros atuais."><template #icon><TriangleAlertIcon v-if="hasLoadingError" /><SearchIcon v-else /></template><template #action><Button v-if="hasLoadingError" size="small" @click="load">Tentar novamente</Button><Button v-else-if="hasFilters" size="small" variant="secondary" @click="clear">Limpar filtros</Button></template></EmptyState></template>
    </DataTable>
    <div v-if="!hasLoadingError && filtered.length > itemsPerPage" class="flex flex-wrap items-center justify-between gap-3"><p class="text-sm text-slate-500">Mostrando {{ (currentPage - 1) * itemsPerPage + 1 }}–{{ Math.min(currentPage * itemsPerPage, filtered.length) }} de {{ filtered.length }} ofertas</p><Pagination v-model="currentPage" :total="filtered.length" :items-per-page="itemsPerPage" label="Paginação de ofertas" /></div>
  </section>
</template>
