<script setup lang="ts">
import { computed } from 'vue'
import { Badge, Button, Input, PlusIcon, Select, XIcon, type SelectOption } from '@thiagoschoeffel/ts-components'
import { getComponentTypes } from '../../mocks/catalogStore'
import type { OfferComponent } from '../../types/catalog'

const props = withDefaults(defineProps<{ showValidation?: boolean }>(), { showValidation: false })
const components = defineModel<OfferComponent[]>({ required: true })
const types = computed(() => getComponentTypes())

function optionsFor(currentId: string): SelectOption[] {
  return types.value.filter(item => item.active || item.id === currentId).map(item => ({ value: item.id, label: `${item.name}${item.active ? '' : ' (inativo)'}`, disabled: !item.active && item.id !== currentId }))
}
function add() { components.value = [...components.value, { id: `oc-${Date.now()}`, componentTypeId: '', quantity: 1 }] }
function remove(index: number) { components.value = components.value.filter((_, itemIndex) => itemIndex !== index) }
function duplicate(component: OfferComponent) { return Boolean(component.componentTypeId && components.value.some(item => item.id !== component.id && item.componentTypeId === component.componentTypeId)) }
function typeError(component: OfferComponent) { if (!props.showValidation) return undefined; if (!component.componentTypeId) return 'Selecione um tipo.'; return duplicate(component) ? 'Use uma única linha e ajuste a quantidade.' : undefined }
function quantityError(component: OfferComponent) { return props.showValidation && !(Number(component.quantity) > 0) ? 'Use uma quantidade maior que zero.' : undefined }
</script>

<template>
  <div class="space-y-3">
    <div v-for="(component, index) in components" :key="component.id" class="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div class="mb-3 flex items-center justify-between gap-3"><div class="flex items-center gap-2"><span class="text-sm font-semibold text-slate-700">Componente {{ index + 1 }}</span><Badge v-if="types.find(item => item.id === component.componentTypeId && !item.active)" variant="neutral" size="small">Inativo</Badge></div><Button type="button" size="small" variant="danger" icon-only :aria-label="`Remover componente ${index + 1}`" @click="remove(index)"><template #icon><XIcon /></template></Button></div>
      <div class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem]"><Select v-model="component.componentTypeId" label="Tipo de componente" placeholder="Selecione um tipo" required :options="optionsFor(component.componentTypeId)" :error="typeError(component)" /><Input v-model="component.quantity" type="number" inputmode="numeric" label="Quantidade" min="1" step="1" required :error="quantityError(component)" /></div>
    </div>
    <p v-if="!components.length" class="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-400">Nenhum componente incluído. A oferta pode ser salva sem componentes quando isso fizer sentido comercialmente.</p>
    <Button type="button" size="small" variant="secondary" @click="add"><template #icon><PlusIcon /></template>Adicionar componente</Button>
  </div>
</template>
