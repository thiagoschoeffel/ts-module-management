<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  ArrowRightIcon, Badge, Button, Card, DataTable, EmptyState, Input, Pagination,
  SearchIcon, Tabs, TriangleAlertIcon, UserRoundCogIcon, type DataTableColumn,
  type DataTableRow, type DataTableSortDirection, type TabItem
} from '@thiagoschoeffel/ts-components'
import { getUsers } from '../mocks/userStore'
import type { ManagementUser } from '../types/user'
import { userRoleBadgeVariants, userRoleLabels } from '../types/user'

type UserStatus = 'todos' | 'ativos' | 'inativos'
type UserSortKey = 'name' | 'accessId' | 'role' | 'active'
type UserMockScenario = 'padrao' | 'sem-usuarios' | 'sem-resultados' | 'erro'

const initialParams = new URLSearchParams(window.location.search)
const validScenarios = new Set<UserMockScenario>(['padrao', 'sem-usuarios', 'sem-resultados', 'erro'])
const requestedScenario = initialParams.get('mock')
const mockScenario: UserMockScenario = validScenarios.has(requestedScenario as UserMockScenario)
  ? requestedScenario as UserMockScenario
  : 'padrao'
const validStatuses = new Set<UserStatus>(['todos', 'ativos', 'inativos'])
const validSortKeys = new Set<UserSortKey>(['name', 'accessId', 'role', 'active'])
const requestedPage = Number(initialParams.get('pagina'))
const search = ref(initialParams.get('busca') ?? (mockScenario === 'sem-resultados' ? 'Usuário inexistente' : ''))
const debouncedSearch = ref(search.value)
const status = ref<UserStatus>(validStatuses.has(initialParams.get('status') as UserStatus) ? initialParams.get('status') as UserStatus : 'todos')
const currentPage = ref(Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1)
const sortKey = ref<UserSortKey>(validSortKeys.has(initialParams.get('ordenar') as UserSortKey) ? initialParams.get('ordenar') as UserSortKey : 'name')
const sortDirection = ref<DataTableSortDirection>(initialParams.get('direcao') === 'desc' ? 'desc' : 'asc')
const isLoading = ref(true)
const hasLoadingError = ref(false)
const itemsPerPage = 10
const users = mockScenario === 'sem-usuarios' ? [] : getUsers()
let debounceTimeout: ReturnType<typeof setTimeout> | undefined
let loadingTimeout: ReturnType<typeof setTimeout> | undefined
let restoringHistory = false

const columns: DataTableColumn[] = [
  { key: 'name', label: 'Usuário', size: 'large', sortable: true },
  { key: 'accessId', label: 'Identificação de acesso', size: 'medium', sortable: true },
  { key: 'role', label: 'Perfil', size: 'medium', sortable: true },
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
  status.value = validStatuses.has(requestedStatus as UserStatus) ? requestedStatus as UserStatus : 'todos'
  sortKey.value = validSortKeys.has(requestedSort as UserSortKey) ? requestedSort as UserSortKey : 'name'
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

const usersMatchingSearch = computed(() => {
  const query = debouncedSearch.value.trim().toLocaleLowerCase('pt-BR')
  return users.filter(user => !query
    || user.id.toLocaleLowerCase('pt-BR').includes(query)
    || user.name.toLocaleLowerCase('pt-BR').includes(query)
    || user.accessId.toLocaleLowerCase('pt-BR').includes(query)
    || userRoleLabels[user.role].toLocaleLowerCase('pt-BR').includes(query))
})
const filteredUsers = computed(() => {
  const matching = usersMatchingSearch.value.filter(user => status.value === 'todos'
    || (status.value === 'ativos' ? user.active : !user.active))
  const direction = sortDirection.value === 'asc' ? 1 : -1
  return [...matching].sort((first, second) => {
    const firstValue = sortKey.value === 'role' ? userRoleLabels[first.role] : first[sortKey.value]
    const secondValue = sortKey.value === 'role' ? userRoleLabels[second.role] : second[sortKey.value]
    if (typeof firstValue === 'boolean' && typeof secondValue === 'boolean')
      return (Number(firstValue) - Number(secondValue)) * direction
    return String(firstValue).localeCompare(String(secondValue), 'pt-BR', { numeric: true, sensitivity: 'base' }) * direction
  })
})
const visibleUsers = computed(() => filteredUsers.value.slice((currentPage.value - 1) * itemsPerPage, currentPage.value * itemsPerPage))
const rows = computed<DataTableRow[]>(() => visibleUsers.value.map(user => ({ ...user })))
const tabCounts = computed<Record<string, number>>(() => ({
  todos: usersMatchingSearch.value.length,
  ativos: usersMatchingSearch.value.filter(user => user.active).length,
  inativos: usersMatchingSearch.value.filter(user => !user.active).length
}))
const hasFilters = computed(() => Boolean(debouncedSearch.value.trim()) || status.value !== 'todos')
const visibleStart = computed(() => filteredUsers.value.length ? (currentPage.value - 1) * itemsPerPage + 1 : 0)
const visibleEnd = computed(() => Math.min(currentPage.value * itemsPerPage, filteredUsers.value.length))
const emptyDescription = computed(() => {
  if (hasLoadingError.value) return 'Verifique a conexão e tente carregar a lista novamente.'
  if (hasFilters.value) return 'Nenhum usuário corresponde à busca e ao status selecionado.'
  return 'Os usuários cadastrados aparecerão aqui.'
})

function asUser(row: DataTableRow) { return row as unknown as ManagementUser }
function listReturnUrl() { return `${window.location.pathname}${window.location.search}` }
function editHref(id: string) { return `/usuarios/${id}/editar?retorno=${encodeURIComponent(listReturnUrl())}` }
function editUser(id: string) { window.location.assign(editHref(id)) }
function createUser() { window.location.assign(`/usuarios/novo?retorno=${encodeURIComponent(listReturnUrl())}`) }
function clearFilters() { search.value = ''; debouncedSearch.value = ''; status.value = 'todos' }
function updateSort(state: { key?: string; direction?: DataTableSortDirection }) {
  sortKey.value = validSortKeys.has(state.key as UserSortKey) ? state.key as UserSortKey : 'name'
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
  <section class="md:flex md:h-full md:min-h-0 md:flex-col" aria-label="Lista de usuários">
    <Card class="md:shrink-0 [&>div]:p-4">
      <Tabs v-model="status" :tabs="tabs" aria-label="Usuários por status" size="medium">
        <template #badge="{ tab }">
          <Badge size="small" :variant="tab.value === 'inativos' && tabCounts[tab.value] ? 'danger' : 'neutral'">
            {{ tabCounts[tab.value] }}
          </Badge>
        </template>
        <template #content>
          <Input v-model="search" type="search" aria-label="Buscar usuário por nome, identificação, perfil ou código" placeholder="Buscar nome, acesso, perfil ou código..." clearable class="w-full sm:max-w-sm">
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
        <EmptyState v-else-if="hasLoadingError || visibleUsers.length === 0" class="bg-white shadow-sm" size="large" :title="hasLoadingError ? 'Não foi possível carregar os usuários' : 'Nenhum usuário encontrado'" :description="emptyDescription" :role="hasLoadingError ? 'alert' : 'status'">
          <template #icon><TriangleAlertIcon v-if="hasLoadingError" /><UserRoundCogIcon v-else-if="users.length === 0" /><SearchIcon v-else /></template>
          <template #action><Button v-if="hasLoadingError" size="small" @click="setLoading">Tentar novamente</Button><Button v-else-if="users.length === 0" size="small" variant="secondary" @click="createUser">Novo usuário</Button><Button v-else-if="hasFilters" size="small" variant="secondary" @click="clearFilters">Limpar filtros</Button></template>
        </EmptyState>
        <Card v-for="user in isLoading ? [] : visibleUsers" v-else :key="user.id">
          <div class="flex items-start justify-between gap-3">
            <div><p class="font-semibold text-slate-800">{{ user.name }}</p><p class="mt-1 text-xs text-slate-500">{{ user.id }} · {{ user.accessId }}</p></div>
            <Badge :variant="user.active ? 'success' : 'danger'">{{ user.active ? 'Ativo' : 'Inativo' }}</Badge>
          </div>
          <div class="mt-3"><Badge :variant="userRoleBadgeVariants[user.role]">{{ userRoleLabels[user.role] }}</Badge></div>
          <template #footer><a :href="editHref(user.id)" class="-mx-6 -my-4 flex items-center justify-between gap-3 px-6 py-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"><span>Editar usuário</span><ArrowRightIcon class="size-4" aria-hidden="true" /></a></template>
        </Card>
      </div>

      <DataTable :class="['hidden min-h-0 flex-1 md:flex', !isLoading && (hasLoadingError || visibleUsers.length === 0) ? '[&_table]:h-full [&_tbody>tr>td]:align-middle' : '']" :columns="columns" :rows="hasLoadingError ? [] : rows" :selectable="false" :loading="isLoading && !hasLoadingError" sort-mode="manual" :sort-key="sortKey" :sort-direction="sortDirection" row-key="id" label="Usuários filtrados por status e busca" actions-label="Ação" @sort="updateSort">
        <template #cell-name="{ row }"><p class="font-medium text-slate-800">{{ asUser(row).name }}</p><p class="mt-1 text-xs text-slate-500">{{ asUser(row).id }}</p></template>
        <template #cell-accessId="{ row }"><span class="font-medium text-slate-700">{{ asUser(row).accessId }}</span></template>
        <template #cell-role="{ row }"><Badge :variant="userRoleBadgeVariants[asUser(row).role]">{{ userRoleLabels[asUser(row).role] }}</Badge></template>
        <template #cell-active="{ row }"><Badge :variant="asUser(row).active ? 'success' : 'danger'">{{ asUser(row).active ? 'Ativo' : 'Inativo' }}</Badge></template>
        <template #actions="{ row }"><Button size="small" variant="secondary" @click="editUser(asUser(row).id)">Editar<template #trailingIcon><ArrowRightIcon /></template></Button></template>
        <template #empty><EmptyState :bordered="false" size="large" :title="hasLoadingError ? 'Não foi possível carregar os usuários' : 'Nenhum usuário encontrado'" :description="emptyDescription" :role="hasLoadingError ? 'alert' : 'status'"><template #icon><TriangleAlertIcon v-if="hasLoadingError" /><UserRoundCogIcon v-else-if="users.length === 0" /><SearchIcon v-else /></template><template #action><Button v-if="hasLoadingError" size="small" variant="secondary" @click="setLoading">Tentar novamente</Button><Button v-else-if="users.length === 0" size="small" variant="secondary" @click="createUser">Novo usuário</Button><Button v-else-if="hasFilters" size="small" variant="secondary" @click="clearFilters">Limpar filtros</Button></template></EmptyState></template>
      </DataTable>

      <div v-if="!hasLoadingError" class="mt-4 flex shrink-0 flex-wrap items-center justify-between gap-3">
        <p class="text-sm text-slate-500" aria-live="polite">Mostrando {{ visibleStart }}–{{ visibleEnd }} de {{ filteredUsers.length }} usuários</p>
        <Pagination v-model="currentPage" :total="filteredUsers.length" :items-per-page="itemsPerPage" size="medium" label="Paginação de usuários" />
      </div>
    </Card>
  </section>
</template>
