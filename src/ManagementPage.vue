<script setup lang="ts">
import { computed } from 'vue'
import { Button, ChevronLeftIcon, EmptyState, PageHeader, PlusIcon } from '@thiagoschoeffel/ts-components'
import '@thiagoschoeffel/ts-components/style.css'
import './style.css'
import { managementPages } from './config/managementPages'
import { getOffer } from './mocks/catalogStore'
import { getProducible } from './mocks/producibleStore'
import CatalogPage from './pages/CatalogPage.vue'
import OfferDetailPage from './pages/OfferDetailPage.vue'
import OfferFormPage from './pages/OfferFormPage.vue'
import ProducibleDetailPage from './pages/ProducibleDetailPage.vue'
import ProducibleFormPage from './pages/ProducibleFormPage.vue'
import ProducibleListPage from './pages/ProducibleListPage.vue'
import type { CatalogPage as CatalogPageName, ManagementSection, ProduciblePage } from './types/management'

const props = withDefaults(defineProps<{
  section?: ManagementSection
  produciblePage?: ProduciblePage
  producibleId?: string
  catalogPage?: CatalogPageName
  offerId?: string
}>(), {
  section: 'produziveis',
  produciblePage: 'list',
  producibleId: undefined,
  catalogPage: 'list',
  offerId: undefined
})

const page = computed(() => managementPages[props.section])
const producible = computed(() => getProducible(props.producibleId))
const offer = computed(() => getOffer(props.offerId))
const pageTitle = computed(() => {
  if (props.section === 'catalogo') {
    if (props.catalogPage === 'new') return 'Nova oferta'
    if (props.catalogPage === 'edit') return offer.value ? `Editar ${offer.value.name}` : 'Editar oferta'
    if (props.catalogPage === 'detail') return offer.value?.name ?? 'Detalhe da oferta'
    return page.value.title
  }
  if (props.produciblePage === 'new') return 'Novo item produzível'
  if (props.produciblePage === 'edit') return producible.value ? `Editar ${producible.value.name}` : 'Editar item produzível'
  if (props.produciblePage === 'detail') return producible.value?.name ?? 'Detalhe do item produzível'
  if (props.produciblePage === 'new-composition-version') return producible.value ? `Nova composição de ${producible.value.name}` : 'Nova composição'
  return page.value.title
})
const pageSubtitle = computed(() => {
  if (props.section === 'catalogo') {
    if (props.catalogPage === 'new') return 'Configure os dados comerciais, componentes, escolhas e adicionais.'
    if (props.catalogPage === 'edit') return 'Atualize a configuração comercial atual da oferta.'
    if (props.catalogPage === 'detail') return offer.value ? `${offer.value.id} · configuração comercial` : undefined
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
  window.location.assign(`/produziveis/novo?retorno=${encodeURIComponent(current)}`)
}
function catalogReturnUrl() {
  const candidate = new URLSearchParams(window.location.search).get('retorno')
  return candidate && /^\/catalogo(?:\?.*)?$/.test(candidate) ? candidate : '/catalogo'
}
</script>

<template>
  <div
    class="isolate"
    :class="(props.section === 'produziveis' && props.produciblePage === 'list') || (props.section === 'catalogo' && props.catalogPage === 'list')
      ? 'md:flex md:h-[calc(100dvh-11rem)] md:min-h-0 md:flex-col'
      : ''">
    <div v-if="!(props.section === 'catalogo' && props.catalogPage === 'list')" class="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
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
    </div>

    <main
      :class="[
        props.section === 'catalogo' && props.catalogPage === 'list' ? '' : 'mt-6',
        (props.section === 'produziveis' && props.produciblePage === 'list') || (props.section === 'catalogo' && props.catalogPage === 'list') ? 'md:min-h-0 md:flex-1' : ''
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
      <EmptyState v-else class="bg-white shadow-sm" title="Experiência ainda não disponível" description="Esta área de Gestão será implementada em uma entrega futura." />
    </main>
  </div>
</template>
