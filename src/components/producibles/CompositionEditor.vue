<script setup lang="ts">
import { computed, ref } from 'vue'
import { Badge, Button, EmptyState, FactoryIcon, Input, Select, type SelectOption } from '@thiagoschoeffel/ts-components'
import { getProducibles } from '../../mocks/producibleStore'
import type { CompositionComponent, CompositionComponentKind, MeasurementUnit } from '../../types/producible'

const props = withDefaults(defineProps<{
  ownerId?: string
  showValidation?: boolean
}>(), {
  ownerId: undefined,
  showValidation: false
})

const components = defineModel<CompositionComponent[]>({ required: true })
const pendingRemovalId = ref<string>()

const kindOptions: SelectOption[] = [
  { value: 'ingredient', label: 'Ingrediente' },
  { value: 'producible-item', label: 'Preparação / item produzível' }
]
const unitOptions: SelectOption[] = [
  { value: 'g', label: 'g' }, { value: 'kg', label: 'kg' }, { value: 'ml', label: 'ml' },
  { value: 'l', label: 'l' }, { value: 'un', label: 'un' }
]
const producibleOptions = computed<SelectOption[]>(() => getProducibles()
  .filter(item => item.id !== props.ownerId)
  .map(item => ({ value: item.id, label: item.name })))

function newComponent(): CompositionComponent {
  return { id: `cmp-${Date.now()}-${components.value.length}`, kind: 'ingredient', name: '', quantity: 1, unit: 'g' }
}

function addComponent() { components.value = [...components.value, newComponent()] }
function removeComponent(index: number) {
  components.value = components.value.filter((_, current) => current !== index)
  pendingRemovalId.value = undefined
}
function changeKind(component: CompositionComponent, value: string) {
  component.kind = value as CompositionComponentKind
  component.name = ''
  component.referenceId = undefined
}
function selectProducible(component: CompositionComponent, value: string) {
  const option = producibleOptions.value.find(item => item.value === value)
  component.referenceId = value
  component.name = option?.label ?? ''
}
function componentNameError(component: CompositionComponent) {
  if (!props.showValidation) return undefined
  if (component.kind === 'producible-item' && component.referenceId === props.ownerId) return 'Um item não pode incluir a si próprio.'
  return component.name.trim() ? undefined : component.kind === 'ingredient' ? 'Informe o ingrediente.' : 'Selecione uma preparação.'
}
function quantityError(component: CompositionComponent) {
  return props.showValidation && !(Number(component.quantity) > 0) ? 'Use uma quantidade maior que zero.' : undefined
}
</script>

<template>
  <div class="space-y-3">
    <div
      v-for="(component, index) in components"
      :key="component.id"
      class="rounded-lg border border-slate-200 bg-white p-4 shadow-xs">
      <div class="mb-3 flex items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <span class="text-sm font-semibold text-slate-700">Componente {{ index + 1 }}</span>
          <Badge :variant="component.kind === 'producible-item' ? 'info' : 'neutral'" size="small">
            {{ component.kind === 'producible-item' ? 'Preparação' : 'Ingrediente' }}
          </Badge>
        </div>
        <div v-if="pendingRemovalId === component.id" class="flex flex-wrap items-center justify-end gap-2">
          <span class="text-xs font-medium text-slate-600">Remover componente?</span>
          <Button type="button" size="small" variant="secondary" @click="pendingRemovalId = undefined">Cancelar</Button>
          <Button type="button" size="small" variant="danger" @click="removeComponent(index)">Sim</Button>
        </div>
        <Button v-else type="button" size="small" variant="danger" @click="pendingRemovalId = component.id">Remover</Button>
      </div>

      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-[12rem_minmax(12rem,1fr)_8rem_7rem]">
        <Select
          :model-value="component.kind" label="Tipo" required :options="kindOptions"
          @update:model-value="changeKind(component, $event)" />
        <Input
          v-if="component.kind === 'ingredient'" v-model="component.name"
          label="Ingrediente" placeholder="Ex.: Peito de frango" required :error="componentNameError(component)" />
        <Select
          v-else :model-value="component.referenceId" label="Preparação / item" required
          placeholder="Selecione um item" :options="producibleOptions" :error="componentNameError(component)"
          @update:model-value="selectProducible(component, $event)" />
        <Input
          v-model="component.quantity" type="number" inputmode="decimal" label="Quantidade"
          min="0.01" step="any" required :error="quantityError(component)" />
        <Select
          v-model="component.unit" label="Unidade" required :options="unitOptions"
          @update:model-value="component.unit = $event as MeasurementUnit" />
      </div>
    </div>

    <EmptyState v-if="!components.length" size="small" :bordered="false" title="Nenhum componente adicionado" description="O item pode ser salvo sem composição e completado depois."><template #icon><FactoryIcon /></template></EmptyState>

    <Button type="button" size="small" variant="secondary" @click="addComponent">
      Adicionar componente
    </Button>
  </div>
</template>
