<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { Tabs, type TabItem } from '@thiagoschoeffel/ts-components'
import AddonsPanel from '../components/catalog/AddonsPanel.vue'
import ComponentTypesPanel from '../components/catalog/ComponentTypesPanel.vue'
import type { CatalogSection } from '../types/catalog'
import OfferListPage from './OfferListPage.vue'

const emit = defineEmits<{ 'section-change': [section: CatalogSection] }>()

const tabs: TabItem[] = [
  { value: 'ofertas', label: 'Ofertas' }, { value: 'tipos-componentes', label: 'Tipos de componente' }, { value: 'adicionais', label: 'Adicionais' }
]
const validSections = new Set(tabs.map(tab => tab.value))
function sectionFromUrl(): CatalogSection { const value = new URLSearchParams(window.location.search).get('secao'); return validSections.has(value ?? '') ? value as CatalogSection : 'ofertas' }
const activeSection = ref<CatalogSection>(sectionFromUrl())
function updateSection(value: string) {
  activeSection.value = validSections.has(value) ? value as CatalogSection : 'ofertas'
  emit('section-change', activeSection.value)
  const url = new URL(window.location.href)
  if (activeSection.value === 'ofertas') url.searchParams.delete('secao'); else url.searchParams.set('secao', activeSection.value)
  for (const key of ['busca', 'status', 'pagina']) url.searchParams.delete(key)
  window.history.pushState(window.history.state, '', url)
}
function restore() { activeSection.value = sectionFromUrl(); emit('section-change', activeSection.value) }
onMounted(() => { emit('section-change', activeSection.value); window.addEventListener('popstate', restore) })
onBeforeUnmount(() => window.removeEventListener('popstate', restore))
</script>

<template>
  <Tabs :model-value="activeSection" :tabs="tabs" aria-label="Seções do catálogo" @update:model-value="updateSection">
    <template #content="{ tab }">
      <OfferListPage v-if="tab.value === 'ofertas'" />
      <ComponentTypesPanel v-else-if="tab.value === 'tipos-componentes'" />
      <AddonsPanel v-else />
    </template>
  </Tabs>
</template>
