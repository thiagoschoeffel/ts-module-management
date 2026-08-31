<script setup lang="ts">
import { computed } from 'vue'
import { Button, ChevronLeftIcon, EmptyState, PageHeader, PlusIcon } from '@thiagoschoeffel/ts-components'
import '@thiagoschoeffel/ts-components/style.css'
import './style.css'
import { managementPages } from './config/managementPages'
import { getProducible } from './mocks/producibleStore'
import ProducibleDetailPage from './pages/ProducibleDetailPage.vue'
import ProducibleFormPage from './pages/ProducibleFormPage.vue'
import ProducibleListPage from './pages/ProducibleListPage.vue'
import type { ManagementSection, ProduciblePage } from './types/management'

const props = withDefaults(defineProps<{
  section?: ManagementSection
  produciblePage?: ProduciblePage
  producibleId?: string
}>(), {
  section: 'produziveis',
  produciblePage: 'list',
  producibleId: undefined
})

const page = computed(() => managementPages[props.section])
const producible = computed(() => getProducible(props.producibleId))
const pageTitle = computed(() => {
  if (props.produciblePage === 'new') return 'Novo item produzível'
  if (props.produciblePage === 'edit') return producible.value ? `Editar ${producible.value.name}` : 'Editar item produzível'
  if (props.produciblePage === 'detail') return producible.value?.name ?? 'Detalhe do item produzível'
  if (props.produciblePage === 'new-composition-version') return producible.value ? `Nova composição de ${producible.value.name}` : 'Nova composição'
  return page.value.title
})
const pageSubtitle = computed(() => {
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
</script>

<template>
  <div class="isolate">
    <div class="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
      <PageHeader :title="pageTitle" :subtitle="pageSubtitle">
        <template #icon><component :is="page.icon" :size="32" :stroke-width="1.75" /></template>
      </PageHeader>

      <a
        v-if="props.produciblePage !== 'list'" :href="props.produciblePage === 'detail' ? listReturnUrl() : props.producibleId ? `/produziveis/${props.producibleId}?retorno=${encodeURIComponent(listReturnUrl())}` : listReturnUrl()"
        class="hidden items-center gap-1 text-sm font-medium text-slate-400 transition-colors hover:text-slate-800 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 sm:inline-flex">
        <ChevronLeftIcon class="size-4" aria-hidden="true" />
        {{ props.produciblePage === 'detail' ? 'Voltar para produzíveis' : props.producibleId ? 'Voltar para o item' : 'Voltar para produzíveis' }}
      </a>

      <Button v-if="props.produciblePage === 'list' && props.section === 'produziveis'" type="button" @click="createProducible">
        <template #icon><PlusIcon /></template>Novo item produzível
      </Button>
    </div>

    <main class="mt-4">
      <EmptyState v-if="props.section !== 'produziveis'" class="bg-white shadow-sm" title="Experiência ainda não disponível" description="Esta área de Gestão será implementada em uma entrega futura." />
      <ProducibleListPage v-else-if="props.produciblePage === 'list'" />
      <ProducibleFormPage v-else-if="props.produciblePage === 'new'" mode="create" />
      <ProducibleFormPage v-else-if="props.produciblePage === 'edit'" mode="edit" :producible-id="props.producibleId" />
      <ProducibleFormPage v-else-if="props.produciblePage === 'new-composition-version'" mode="composition" :producible-id="props.producibleId" />
      <ProducibleDetailPage v-else :producible-id="props.producibleId" />
    </main>
  </div>
</template>
