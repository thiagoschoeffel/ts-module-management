<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ArrowRightIcon, BoxesIcon, Button, PlusIcon, Tabs, type TabItem } from '@thiagoschoeffel/ts-components'
import AddonsPanel from '../components/catalog/AddonsPanel.vue'
import ComponentTypesPanel from '../components/catalog/ComponentTypesPanel.vue'
import type { CatalogSection } from '../types/catalog'
import OfferListPage from './OfferListPage.vue'

type CatalogPanel = { openCreate: () => void }

const tabs: TabItem[] = [
  { value: 'ofertas', label: 'Ofertas' }, { value: 'tipos-componentes', label: 'Tipos de componente' }, { value: 'adicionais', label: 'Adicionais' }
]
const sectionContent: Record<CatalogSection, { title: string, subtitle: string, action: string }> = {
  ofertas: {
    title: 'Ofertas',
    subtitle: 'Gerencie os produtos comerciais disponíveis para venda.',
    action: 'Nova oferta'
  },
  'tipos-componentes': {
    title: 'Tipos de componente',
    subtitle: 'Configure os papéis comerciais usados para estruturar as ofertas.',
    action: 'Novo tipo'
  },
  adicionais: {
    title: 'Adicionais',
    subtitle: 'Gerencie os itens comprados além da configuração base das ofertas.',
    action: 'Novo adicional'
  }
}
const validSections = new Set(tabs.map(tab => tab.value))
function sectionFromUrl(): CatalogSection { const value = new URLSearchParams(window.location.search).get('secao'); return validSections.has(value ?? '') ? value as CatalogSection : 'ofertas' }
const activeSection = ref<CatalogSection>(sectionFromUrl())
const activeContent = computed(() => sectionContent[activeSection.value])
const componentTypesPanel = ref<CatalogPanel>()
const addonsPanel = ref<CatalogPanel>()

function updateSection(value: string) {
  activeSection.value = validSections.has(value) ? value as CatalogSection : 'ofertas'
  const url = new URL(window.location.href)
  if (activeSection.value === 'ofertas') url.searchParams.delete('secao'); else url.searchParams.set('secao', activeSection.value)
  for (const key of ['busca', 'status', 'ordenar', 'direcao', 'pagina', 'mock']) url.searchParams.delete(key)
  window.history.pushState(window.history.state, '', url)
}
function createOffer() {
  const current = `${window.location.pathname}${window.location.search}`
  window.location.assign(`/catalogo/novo?retorno=${encodeURIComponent(current)}`)
}
function createCurrent() {
  if (activeSection.value === 'ofertas') createOffer()
  else if (activeSection.value === 'tipos-componentes') componentTypesPanel.value?.openCreate()
  else addonsPanel.value?.openCreate()
}
function restore() { activeSection.value = sectionFromUrl() }
onMounted(() => window.addEventListener('popstate', restore))
onBeforeUnmount(() => window.removeEventListener('popstate', restore))
</script>

<template>
  <Tabs
    class="md:flex md:h-full md:min-h-0 md:flex-col md:[&>div:last-child]:min-h-0 md:[&>div:last-child]:flex-1"
    :model-value="activeSection"
    :tabs="tabs"
    variant="primary"
    aria-label="Seções do catálogo"
    @update:model-value="updateSection">
    <template #content="{ tab }">
      <div class="mt-4 md:mt-0 md:flex md:h-full md:min-h-0 md:flex-col md:pt-4">
        <div class="flex shrink-0 flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <header class="flex items-center gap-3 text-slate-800">
            <BoxesIcon class="size-8 shrink-0" :stroke-width="1.75" aria-hidden="true" />
            <div class="min-w-0">
              <div class="flex min-w-0 items-center gap-2">
                <h1 class="m-0 text-2xl font-bold leading-none">Catálogo</h1>
                <ArrowRightIcon class="size-5 shrink-0 text-slate-400" aria-hidden="true" />
                <span class="truncate text-2xl font-bold leading-none">{{ activeContent.title }}</span>
              </div>
              <p class="mt-2 text-sm leading-none text-slate-400">{{ activeContent.subtitle }}</p>
            </div>
          </header>

          <Button type="button" @click="createCurrent">
            <template #icon><PlusIcon /></template>
            {{ activeContent.action }}
          </Button>
        </div>

        <div class="mt-6 md:min-h-0 md:flex-1">
          <OfferListPage v-if="tab.value === 'ofertas'" />
          <ComponentTypesPanel v-else-if="tab.value === 'tipos-componentes'" ref="componentTypesPanel" />
          <AddonsPanel v-else ref="addonsPanel" />
        </div>
      </div>
    </template>
  </Tabs>
</template>
