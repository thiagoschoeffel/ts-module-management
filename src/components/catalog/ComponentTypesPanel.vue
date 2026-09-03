<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  Badge, BoxesIcon, Button, Card, Checkbox, DataTable, Drawer, EmptyState, Input,
  Pagination, sanitizeRichText, SearchIcon, Tabs, Textarea, TriangleAlertIcon, type DataTableColumn,
  type DataTableRow, type DataTableSortDirection, type TabItem
} from '@thiagoschoeffel/ts-components'
import { getComponentTypes, nextComponentTypeId, saveComponentType } from '../../mocks/catalogStore'
import type { ComponentType } from '../../types/catalog'

type StatusFilter = 'all' | 'active' | 'inactive'
type ComponentTypeSortKey = 'name' | 'description' | 'active'
type ComponentTypeListMockScenario = 'padrao' | 'sem-tipos' | 'sem-resultados' | 'erro'

const initialParams = new URLSearchParams(window.location.search)
const validMockScenarios = new Set<ComponentTypeListMockScenario>(['padrao', 'sem-tipos', 'sem-resultados', 'erro'])
const initialMockScenario = initialParams.get('mock')
const mockScenario: ComponentTypeListMockScenario = validMockScenarios.has(initialMockScenario as ComponentTypeListMockScenario)
  ? initialMockScenario as ComponentTypeListMockScenario
  : 'padrao'
const initialPage = Number(initialParams.get('pagina'))
const initialSortKey = initialParams.get('ordenar')
const validSortKeys = new Set<ComponentTypeSortKey>(['name', 'description', 'active'])
const version = ref(0)
const search = ref(initialParams.get('busca') ?? (mockScenario === 'sem-resultados' ? 'Tipo inexistente' : ''))
const debouncedSearch = ref(search.value)
const status = ref<StatusFilter>(['active', 'inactive'].includes(initialParams.get('status') ?? '') ? initialParams.get('status') as StatusFilter : 'all')
const currentPage = ref(Number.isInteger(initialPage) && initialPage > 0 ? initialPage : 1)
const activeSortKey = ref<ComponentTypeSortKey>(validSortKeys.has(initialSortKey as ComponentTypeSortKey) ? initialSortKey as ComponentTypeSortKey : 'name')
const activeSortDirection = ref<DataTableSortDirection>(initialParams.get('direcao') === 'desc' ? 'desc' : 'asc')
const isLoading = ref(true)
const hasLoadingError = ref(false)
const drawerOpen = ref(false)
const editingId = ref<string>()
const name = ref('')
const description = ref('')
const active = ref(true)
const showValidation = ref(false)
const itemsPerPage = 10
let debounceTimeout: ReturnType<typeof setTimeout> | undefined
let loadingTimeout: ReturnType<typeof setTimeout> | undefined
let restoringHistory = false
let simulatedFailureShown = false

function richTextHtml(value?: string) { return sanitizeRichText(value ?? '') }
function richTextPlainText(value?: string) { return richTextHtml(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() }

const items = computed(() => { version.value; return mockScenario === 'sem-tipos' ? [] : getComponentTypes() })
const statusTabs: TabItem[] = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Ativos' },
  { value: 'inactive', label: 'Inativos' }
]
const columns: DataTableColumn[] = [
  { key: 'name', label: 'Tipo', size: 'medium', sortable: true },
  { key: 'description', label: 'Descrição', size: 'large', sortable: true },
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
  activeSortKey.value = validSortKeys.has(sortKey as ComponentTypeSortKey) ? sortKey as ComponentTypeSortKey : 'name'
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

const itemsMatchingSearch = computed(() => {
  const query = debouncedSearch.value.trim().toLocaleLowerCase('pt-BR')
  return items.value.filter(item => !query
      || item.id.toLocaleLowerCase('pt-BR').includes(query)
      || item.name.toLocaleLowerCase('pt-BR').includes(query)
      || richTextPlainText(item.description).toLocaleLowerCase('pt-BR').includes(query))
})
const filteredItems = computed(() => {
  const matchingItems = itemsMatchingSearch.value.filter(item => status.value === 'all' || item.active === (status.value === 'active'))
  const direction = activeSortDirection.value === 'asc' ? 1 : -1
  return [...matchingItems].sort((first, second) => {
    const firstValue = first[activeSortKey.value] ?? ''
    const secondValue = second[activeSortKey.value] ?? ''
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
  if (debouncedSearch.value.trim()) return `Não encontramos tipos para “${debouncedSearch.value.trim()}”.`
  if (status.value === 'active') return 'Nenhum tipo ativo está cadastrado.'
  if (status.value === 'inactive') return 'Nenhum tipo inativo está cadastrado.'
  return 'Os tipos de componente cadastrados aparecerão aqui.'
})
const nameError = computed(() => showValidation.value && !name.value.trim() ? 'Informe o nome do tipo.' : undefined)

function asType(row: DataTableRow) { return row as unknown as ComponentType }
function clearFilters() { search.value = ''; debouncedSearch.value = ''; status.value = 'all' }
function updateSort(state: { key?: string, direction?: DataTableSortDirection }) {
  activeSortKey.value = validSortKeys.has(state.key as ComponentTypeSortKey) ? state.key as ComponentTypeSortKey : 'name'
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
function openForm(item?: ComponentType) {
  editingId.value = item?.id
  name.value = item?.name ?? ''
  description.value = item?.description ?? ''
  active.value = item?.active ?? true
  showValidation.value = false
  drawerOpen.value = true
}
function save() {
  showValidation.value = true
  if (nameError.value) return
  saveComponentType({ id: editingId.value ?? nextComponentTypeId(), name: name.value.trim(), description: description.value.trim() || undefined, active: active.value })
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
  <section class="md:flex md:h-full md:min-h-0 md:flex-col" aria-label="Tipos de componente">
    <Card class="md:shrink-0 [&>div]:p-4">
      <Tabs v-model="status" :tabs="statusTabs" aria-label="Tipos de componente por status" size="medium">
        <template #badge="{ tab }"><Badge size="small" :variant="tab.value === 'inactive' && tabCounts[tab.value] ? 'danger' : 'neutral'">{{ tabCounts[tab.value] }}</Badge></template>
        <template #content>
          <Input v-model="search" type="search" aria-label="Buscar tipo por nome, descrição ou código" placeholder="Buscar nome, descrição ou código..." clearable class="w-full sm:max-w-sm [&_input]:pl-10! [&_input]:pr-10!">
            <template #leading><SearchIcon class="size-4 text-slate-400" aria-hidden="true" /></template>
          </Input>
        </template>
      </Tabs>
    </Card>

    <Card class="mt-4 md:min-h-0 md:flex-1 [&>div]:flex [&>div]:min-h-0 [&>div]:flex-col [&>div]:p-4">
      <div class="space-y-3 md:hidden">
        <template v-if="isLoading && !hasLoadingError">
          <div v-for="index in 4" :key="index" class="animate-pulse rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><div class="h-4 w-36 rounded bg-slate-200" /><div class="mt-3 h-3 w-56 rounded bg-slate-100" /></div>
        </template>
        <EmptyState v-else-if="hasLoadingError || visibleItems.length === 0" class="bg-white shadow-sm" size="large" :title="hasLoadingError ? 'Não foi possível carregar os tipos' : 'Nenhum tipo encontrado'" :description="emptyDescription" :role="hasLoadingError ? 'alert' : 'status'">
          <template #icon><TriangleAlertIcon v-if="hasLoadingError" /><BoxesIcon v-else-if="items.length === 0" /><SearchIcon v-else /></template>
          <template #action><Button v-if="hasLoadingError" size="small" variant="secondary" @click="setLoading">Tentar novamente</Button><Button v-else-if="items.length === 0" type="button" size="small" variant="secondary" @click="openForm()">Novo tipo</Button><Button v-else-if="hasFilters" size="small" variant="secondary" @click="clearFilters">Limpar filtros</Button></template>
        </EmptyState>
        <Card v-for="item in isLoading ? [] : visibleItems" v-else :key="item.id">
          <div class="flex items-start justify-between gap-3"><div><p class="font-semibold text-slate-800">{{ item.name }}</p><p class="mt-1 text-xs text-slate-500">{{ item.id }}</p></div><Badge :variant="item.active ? 'success' : 'danger'">{{ item.active ? 'Ativo' : 'Inativo' }}</Badge></div>
          <div v-if="item.description" class="mt-3 space-y-2 text-sm text-slate-600 [&_a]:text-blue-600 [&_a]:underline [&_blockquote]:border-l-3 [&_blockquote]:border-slate-300 [&_blockquote]:pl-3 [&_em]:italic [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:font-semibold [&_ol]:list-decimal [&_ol]:pl-5 [&_s]:line-through [&_strong]:font-semibold [&_u]:underline [&_ul]:list-disc [&_ul]:pl-5" v-html="richTextHtml(item.description)" /><p v-else class="mt-3 text-sm text-slate-400">Sem descrição</p>
          <template #footer><Button class="w-full" size="small" variant="secondary" @click="openForm(item)">Editar</Button></template>
        </Card>
      </div>

      <DataTable
        :class="['hidden min-h-0 flex-1 md:flex', !isLoading && (hasLoadingError || visibleItems.length === 0) ? '[&_table]:h-full [&_tbody>tr>td]:align-middle' : '']"
        :columns="columns" :rows="hasLoadingError ? [] : rows" :selectable="false" :loading="isLoading && !hasLoadingError"
        sort-mode="manual" :sort-key="activeSortKey" :sort-direction="activeSortDirection"
        row-key="id" label="Tipos de componente filtrados por busca e status" actions-label="Ação" @sort="updateSort">
        <template #cell-name="{ row }"><p class="font-medium text-slate-800">{{ asType(row).name }}</p><p class="mt-1 text-xs text-slate-500">{{ asType(row).id }}</p></template>
        <template #cell-description="{ row }"><div v-if="asType(row).description" class="line-clamp-2 max-w-xl whitespace-normal break-words text-slate-600 [&_a]:underline [&_em]:italic [&_s]:line-through [&_strong]:font-semibold [&_u]:underline" v-html="richTextHtml(asType(row).description)" /><span v-else class="text-slate-400">Sem descrição</span></template>
        <template #cell-active="{ row }"><Badge :variant="asType(row).active ? 'success' : 'danger'">{{ asType(row).active ? 'Ativo' : 'Inativo' }}</Badge></template>
        <template #actions="{ row }"><Button size="small" variant="secondary" @click="openForm(asType(row))">Editar</Button></template>
        <template #empty><EmptyState :bordered="false" size="large" :title="hasLoadingError ? 'Não foi possível carregar os tipos' : 'Nenhum tipo encontrado'" :description="emptyDescription" :role="hasLoadingError ? 'alert' : 'status'"><template #icon><TriangleAlertIcon v-if="hasLoadingError" /><BoxesIcon v-else-if="items.length === 0" /><SearchIcon v-else /></template><template #action><Button v-if="hasLoadingError" size="small" variant="secondary" @click="setLoading">Tentar novamente</Button><Button v-else-if="items.length === 0" type="button" size="small" variant="secondary" @click="openForm()">Novo tipo</Button><Button v-else-if="hasFilters" size="small" variant="secondary" @click="clearFilters">Limpar filtros</Button></template></EmptyState></template>
      </DataTable>

      <div v-if="!hasLoadingError" class="mt-4 flex shrink-0 flex-wrap items-center justify-between gap-3">
        <p class="text-sm text-slate-500">Mostrando {{ visibleStart }}–{{ visibleEnd }} de {{ filteredItems.length }} tipos</p>
        <Pagination v-model="currentPage" :total="filteredItems.length" :items-per-page="itemsPerPage" size="medium" label="Paginação de tipos de componente" />
      </div>
    </Card>

    <Drawer v-model:open="drawerOpen" size="large" :title="editingId ? 'Editar tipo de componente' : 'Novo tipo de componente'" description="Defina um papel comercial reutilizável na estrutura das ofertas.">
      <div class="space-y-5">
        <Input v-model="name" label="Nome do tipo" description="Use um nome curto que identifique o papel na oferta, sem citar um item produzido específico." placeholder="Ex.: Salada P" required :error="nameError" />
        <Textarea v-model="description" label="Descrição" description="Explique como este tipo deve ser entendido ao configurar ofertas e cardápios." rich-text placeholder="Ex.: Porção pequena de salada definida pelo cardápio do dia." :rows="4" />
        <Checkbox v-model="active" label="Tipo ativo" description="Quando inativo, não poderá ser usado em novas configurações, mas continuará legível nas ofertas existentes." />
      </div>
      <template #footer><div class="flex items-center justify-between gap-2"><Button type="button" variant="secondary" @click="drawerOpen = false">Cancelar</Button><Button type="button" @click="save">{{ editingId ? 'Salvar alterações' : 'Adicionar tipo' }}</Button></div></template>
    </Drawer>
  </section>
</template>
