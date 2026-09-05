<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Alert, Button, ChevronLeftIcon, EmptyState, PageHeader, PlusIcon, TriangleAlertIcon } from '@thiagoschoeffel/ts-components'
import '@thiagoschoeffel/ts-components/style.css'
import './style.css'
import { managementPages } from './config/managementPages'
import { getOffer } from './mocks/catalogStore'
import { configureCatalogApi } from './mocks/catalogStore'
import { configureLogisticsApi, getDeliveryDriver } from './services/logisticsApi'
import { getProducible } from './mocks/producibleStore'
import { configureProducibleApi } from './mocks/producibleStore'
import { getUser } from './mocks/userStore'
import CatalogPage from './pages/CatalogPage.vue'
import DeliveryDriverFormPage from './pages/DeliveryDriverFormPage.vue'
import DeliveryDriverListPage from './pages/DeliveryDriverListPage.vue'
import FrozenStockPage from './pages/FrozenStockPage.vue'
import FrozenEntryPage from './pages/FrozenEntryPage.vue'
import FrozenLotDetailPage from './pages/FrozenLotDetailPage.vue'
import OfferDetailPage from './pages/OfferDetailPage.vue'
import OfferFormPage from './pages/OfferFormPage.vue'
import ProducibleDetailPage from './pages/ProducibleDetailPage.vue'
import ProducibleFormPage from './pages/ProducibleFormPage.vue'
import ProducibleListPage from './pages/ProducibleListPage.vue'
import UserFormPage from './pages/UserFormPage.vue'
import UserListPage from './pages/UserListPage.vue'
import { navigate } from './utils/navigation'
import type { ManagementPageProps } from './types/federation'

const props = withDefaults(defineProps<ManagementPageProps>(), {
  section: 'produziveis',
  produciblePage: 'list',
  producibleId: undefined,
  catalogPage: 'list',
  offerId: undefined,
  frozenPage: 'list',
  frozenLotId: undefined,
  apiRequest: undefined,
  deliveryDriverPage: 'list',
  deliveryDriverId: undefined,
  userPage: 'list',
  userId: undefined
})

const page = computed(() => managementPages[props.section])
const authoritativeLoading = ref(false)
const authoritativeError = ref('')
const authoritativeVersion = ref(0)
onMounted(async () => {
  if (!props.apiRequest || !['catalogo', 'produziveis', 'entregadores'].includes(props.section)) return
  authoritativeLoading.value = true
  try {
    if (props.section === 'entregadores') await configureLogisticsApi(props.apiRequest)
    else await Promise.all([configureCatalogApi(props.apiRequest), configureProducibleApi(props.apiRequest)])
  }
  catch (error) { authoritativeError.value = error instanceof Error ? error.message : 'Não foi possível carregar os dados autoritativos.' }
  finally { authoritativeLoading.value = false; authoritativeVersion.value++ }
})
const producible = computed(() => { authoritativeVersion.value; return getProducible(props.producibleId) })
const offer = computed(() => { authoritativeVersion.value; return getOffer(props.offerId) })
const deliveryDriver = computed(() => getDeliveryDriver(props.deliveryDriverId))
const user = computed(() => getUser(props.userId))
const isListPage = computed(() => (props.section === 'produziveis' && props.produciblePage === 'list')
  || (props.section === 'catalogo' && props.catalogPage === 'list')
  || (props.section === 'congelados' && props.frozenPage === 'list')
  || (props.section === 'entregadores' && props.deliveryDriverPage === 'list')
  || (props.section === 'usuarios' && props.userPage === 'list'))
const pageTitle = computed(() => {
  if (props.section === 'congelados') {
    if (props.frozenPage === 'entry') return 'Registrar entrada de congelados'
    if (props.frozenPage === 'lot') return props.frozenLotId ? `Lote ${props.frozenLotId}` : 'Detalhe do lote'
    return page.value.title
  }
  if (props.section === 'catalogo') {
    if (props.catalogPage === 'new') return 'Nova oferta'
    if (props.catalogPage === 'edit') return offer.value ? `Editar ${offer.value.name}` : 'Editar oferta'
    if (props.catalogPage === 'detail') return offer.value?.name ?? 'Detalhe da oferta'
    return page.value.title
  }
  if (props.section === 'entregadores') {
    if (props.deliveryDriverPage === 'new') return 'Novo entregador'
    if (props.deliveryDriverPage === 'edit') return deliveryDriver.value ? `Editar ${deliveryDriver.value.name}` : 'Editar entregador'
    return page.value.title
  }
  if (props.section === 'usuarios') {
    if (props.userPage === 'new') return 'Novo usuário'
    if (props.userPage === 'edit') return user.value ? `Editar ${user.value.name}` : 'Editar usuário'
    return page.value.title
  }
  if (props.produciblePage === 'new') return 'Novo item produzível'
  if (props.produciblePage === 'edit') return producible.value ? `Editar ${producible.value.name}` : 'Editar item produzível'
  if (props.produciblePage === 'detail') return producible.value?.name ?? 'Detalhe do item produzível'
  if (props.produciblePage === 'new-composition-version') return producible.value ? `Nova composição de ${producible.value.name}` : 'Nova composição'
  return page.value.title
})
const pageSubtitle = computed(() => {
  if (props.section === 'congelados') {
    if (props.frozenPage === 'entry') return 'Crie o lote e registre a movimentação de entrada da produção realizada.'
    if (props.frozenPage === 'lot') return 'Consulte saldos, movimentações e o histórico de impressão preservado.'
    return page.value.subtitle
  }
  if (props.section === 'catalogo') {
    if (props.catalogPage === 'new') return 'Configure os dados comerciais, componentes, escolhas e adicionais.'
    if (props.catalogPage === 'edit') return 'Atualize a configuração comercial atual da oferta.'
    if (props.catalogPage === 'detail') return offer.value ? `${offer.value.id} · configuração comercial` : undefined
    return page.value.subtitle
  }
  if (props.section === 'entregadores') {
    if (props.deliveryDriverPage === 'new') return 'Cadastre quem poderá ser selecionado em clientes e rotas.'
    if (props.deliveryDriverPage === 'edit') return 'Atualize os dados atuais do entregador.'
    return page.value.subtitle
  }
  if (props.section === 'usuarios') {
    if (props.userPage === 'new') return 'Cadastre uma pessoa e defina seu perfil inicial de acesso.'
    if (props.userPage === 'edit') return 'Atualize a identificação, o perfil ou o status do usuário.'
    return page.value.subtitle
  }
  if (props.produciblePage === 'new') return 'Cadastre a identidade do item e, se desejar, sua primeira composição.'
  if (props.produciblePage === 'edit') return 'Atualize somente os dados básicos; a composição permanece intacta.'
  if (props.produciblePage === 'detail') return producible.value ? `${producible.value.id} · histórico de composição` : undefined
  if (props.produciblePage === 'new-composition-version') return 'Preserve a versão atual e registre a próxima composição.'
  return page.value.subtitle
})

function listReturnUrl() {
  const candidate = new URLSearchParams(window.location.search).get('retorno')
  return candidate && /^\/produziveis(?:\?.*)?$/.test(candidate) ? candidate : '/produziveis'
}
function createProducible() {
  const current = `${window.location.pathname}${window.location.search}`
  navigate(`/produziveis/novo?retorno=${encodeURIComponent(current)}`)
}
function catalogReturnUrl() {
  const candidate = new URLSearchParams(window.location.search).get('retorno')
  return candidate && /^\/catalogo(?:\?.*)?$/.test(candidate) ? candidate : '/catalogo'
}
function frozenReturnUrl() {
  const candidate = new URLSearchParams(window.location.search).get('retorno')
  return candidate && /^\/congelados(?:\?.*)?$/.test(candidate) ? candidate : '/congelados'
}
function deliveryDriverReturnUrl() {
  const candidate = new URLSearchParams(window.location.search).get('retorno')
  return candidate && /^\/entregadores(?:\?.*)?$/.test(candidate) ? candidate : '/entregadores'
}
function createDeliveryDriver() {
  const current = `${window.location.pathname}${window.location.search}`
  navigate(`/entregadores/novo?retorno=${encodeURIComponent(current)}`)
}
function userReturnUrl() {
  const candidate = new URLSearchParams(window.location.search).get('retorno')
  return candidate && /^\/usuarios(?:\?.*)?$/.test(candidate) ? candidate : '/usuarios'
}
function createUser() {
  const current = `${window.location.pathname}${window.location.search}`
  navigate(`/usuarios/novo?retorno=${encodeURIComponent(current)}`)
}
</script>

<template>
  <div
    class="isolate"
    :class="isListPage ? 'md:flex md:h-[calc(100dvh-11rem)] md:min-h-0 md:flex-col' : ''">
    <div v-if="!((props.section === 'catalogo' && props.catalogPage === 'list') || (props.section === 'congelados' && props.frozenPage === 'list'))" class="ts-responsive-row gap-4">
      <PageHeader :title="pageTitle" :subtitle="pageSubtitle">
        <template #icon><component :is="page.icon" :size="32" :stroke-width="1.75" /></template>
      </PageHeader>

      <a
        v-if="props.section === 'produziveis' && props.produciblePage !== 'list'" :href="props.produciblePage === 'detail' ? listReturnUrl() : props.producibleId ? `/produziveis/${props.producibleId}?retorno=${encodeURIComponent(listReturnUrl())}` : listReturnUrl()"
        class="hidden items-center gap-1 text-sm font-medium text-slate-400 transition-colors hover:text-slate-800 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 sm:inline-flex">
        <ChevronLeftIcon class="size-4" aria-hidden="true" />
        {{ props.produciblePage === 'detail' ? 'Voltar para produzíveis' : props.producibleId ? 'Voltar para o item' : 'Voltar para produzíveis' }}
      </a>

      <Button v-if="props.produciblePage === 'list' && props.section === 'produziveis'" type="button" @click="createProducible">
        <template #icon><PlusIcon /></template>Novo item produzível
      </Button>
      <a
        v-if="props.section === 'catalogo' && props.catalogPage !== 'list'"
        :href="props.catalogPage === 'detail' ? catalogReturnUrl() : props.offerId ? `/catalogo/${props.offerId}?retorno=${encodeURIComponent(catalogReturnUrl())}` : catalogReturnUrl()"
        class="hidden items-center gap-1 text-sm font-medium text-slate-400 transition-colors hover:text-slate-800 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 sm:inline-flex">
        <ChevronLeftIcon class="size-4" aria-hidden="true" />
        {{ props.catalogPage === 'detail' ? 'Voltar para o Catálogo' : props.offerId ? 'Voltar para a oferta' : 'Voltar para o Catálogo' }}
      </a>
      <a
        v-if="props.section === 'congelados' && props.frozenPage !== 'list'"
        :href="frozenReturnUrl()"
        class="desktop-only-flex items-center gap-1 text-sm font-medium text-slate-400 transition-colors hover:text-slate-800 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40">
        <ChevronLeftIcon class="size-4" aria-hidden="true" />
        Voltar para congelados
      </a>
      <a
        v-if="props.section === 'entregadores' && props.deliveryDriverPage !== 'list'"
        :href="deliveryDriverReturnUrl()"
        class="hidden items-center gap-1 text-sm font-medium text-slate-400 transition-colors hover:text-slate-800 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 sm:inline-flex">
        <ChevronLeftIcon class="size-4" aria-hidden="true" />
        Voltar para entregadores
      </a>
      <Button v-if="props.section === 'entregadores' && props.deliveryDriverPage === 'list'" type="button" @click="createDeliveryDriver">
        <template #icon><PlusIcon /></template>Novo entregador
      </Button>
      <a
        v-if="props.section === 'usuarios' && props.userPage !== 'list'"
        :href="userReturnUrl()"
        class="hidden items-center gap-1 text-sm font-medium text-slate-400 transition-colors hover:text-slate-800 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 sm:inline-flex">
        <ChevronLeftIcon class="size-4" aria-hidden="true" />
        Voltar para usuários
      </a>
      <Button v-if="props.section === 'usuarios' && props.userPage === 'list'" type="button" @click="createUser">
        <template #icon><PlusIcon /></template>Novo usuário
      </Button>
    </div>

    <Alert v-if="authoritativeError" class="mt-6" variants="danger" title="Não foi possível carregar os dados autoritativos" :description="authoritativeError">
      <template #icon><TriangleAlertIcon /></template>
    </Alert>
    <div v-else-if="authoritativeLoading" class="mt-6 h-40 animate-pulse rounded-lg border border-slate-200 bg-white" aria-label="Carregando dados autoritativos" />
    <main
      v-else
      :key="authoritativeVersion"
      :class="[
        (props.section === 'catalogo' && props.catalogPage === 'list') || (props.section === 'congelados' && props.frozenPage === 'list') ? '' : 'mt-6',
        isListPage ? 'md:min-h-0 md:flex-1' : ''
      ]">
      <template v-if="props.section === 'produziveis'">
        <ProducibleListPage v-if="props.produciblePage === 'list'" />
        <ProducibleFormPage v-else-if="props.produciblePage === 'new'" mode="create" />
        <ProducibleFormPage v-else-if="props.produciblePage === 'edit'" mode="edit" :producible-id="props.producibleId" />
        <ProducibleFormPage v-else-if="props.produciblePage === 'new-composition-version'" mode="composition" :producible-id="props.producibleId" />
        <ProducibleDetailPage v-else :producible-id="props.producibleId" />
      </template>
      <template v-else-if="props.section === 'catalogo'">
        <CatalogPage v-if="props.catalogPage === 'list'" />
        <OfferFormPage v-else-if="props.catalogPage === 'new'" mode="create" />
        <OfferFormPage v-else-if="props.catalogPage === 'edit'" mode="edit" :offer-id="props.offerId" />
        <OfferDetailPage v-else :offer-id="props.offerId" />
      </template>
      <template v-else-if="props.section === 'entregadores'">
        <DeliveryDriverListPage v-if="props.deliveryDriverPage === 'list'" />
        <DeliveryDriverFormPage v-else :mode="props.deliveryDriverPage === 'edit' ? 'edit' : 'create'" :driver-id="props.deliveryDriverId" />
      </template>
      <template v-else-if="props.section === 'congelados'">
        <FrozenStockPage v-if="props.frozenPage === 'list'" :api-request="props.apiRequest" />
        <FrozenEntryPage v-else-if="props.frozenPage === 'entry'" :api-request="props.apiRequest" />
        <FrozenLotDetailPage v-else :frozen-lot-id="props.frozenLotId" :api-request="props.apiRequest" />
      </template>
      <template v-else-if="props.section === 'usuarios'">
        <UserListPage v-if="props.userPage === 'list'" />
        <UserFormPage v-else :mode="props.userPage === 'edit' ? 'edit' : 'create'" :user-id="props.userId" />
      </template>
      <EmptyState v-else class="bg-white shadow-sm" title="Experiência ainda não disponível" description="Esta área de Gestão será implementada em uma entrega futura." />
    </main>
  </div>
</template>
