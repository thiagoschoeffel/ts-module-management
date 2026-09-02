<script setup lang="ts">
import { computed, ref } from 'vue'
import { Badge, BoxesIcon, Button, Card, Drawer, EmptyState, Input, Select, type SelectOption } from '@thiagoschoeffel/ts-components'
import { getComponentTypes } from '../../mocks/catalogStore'
import type { OfferComponent } from '../../types/catalog'

const props = withDefaults(defineProps<{ showValidation?: boolean }>(), { showValidation: false })
const components = defineModel<OfferComponent[]>({ required: true })
const types = computed(() => getComponentTypes())
const drawerOpen = ref(false)
const editingIndex = ref<number>()
const draftTypeId = ref('')
const draftQuantity = ref<number>(1)
const showDrawerValidation = ref(false)
const removeIndex = ref<number>()

const drawerTitle = computed(() => editingIndex.value == null ? 'Adicionar componente' : 'Editar componente')
const drawerAction = computed(() => editingIndex.value == null ? 'Adicionar componente' : 'Salvar alterações')
const draftOptions = computed<SelectOption[]>(() => optionsFor(draftTypeId.value))
const typeError = computed(() => {
  if (!showDrawerValidation.value) return undefined
  if (!draftTypeId.value) return 'Selecione um tipo de componente.'
  const duplicated = components.value.some((item, index) => index !== editingIndex.value && item.componentTypeId === draftTypeId.value)
  return duplicated ? 'Este tipo já está incluído. Edite sua quantidade na linha existente.' : undefined
})
const quantityError = computed(() => showDrawerValidation.value && !(Number(draftQuantity.value) > 0) ? 'Use uma quantidade maior que zero.' : undefined)

function optionsFor(currentId: string): SelectOption[] {
  return types.value
    .filter(item => item.active || item.id === currentId)
    .map(item => ({ value: item.id, label: `${item.name}${item.active ? '' : ' (inativo)'}`, disabled: !item.active && item.id !== currentId }))
}
function typeName(id?: string) { return types.value.find(item => item.id === id)?.name ?? 'Tipo indisponível' }
function openCreate() {
  editingIndex.value = undefined
  draftTypeId.value = ''
  draftQuantity.value = 1
  showDrawerValidation.value = false
  removeIndex.value = undefined
  drawerOpen.value = true
}
function openEdit(index: number) {
  const component = components.value[index]
  if (!component) return
  editingIndex.value = index
  draftTypeId.value = component.componentTypeId
  draftQuantity.value = component.quantity
  showDrawerValidation.value = false
  removeIndex.value = undefined
  drawerOpen.value = true
}
function saveDraft() {
  showDrawerValidation.value = true
  if (typeError.value || quantityError.value) return
  const component: OfferComponent = {
    id: editingIndex.value == null ? `oc-${Date.now()}` : components.value[editingIndex.value]!.id,
    componentTypeId: draftTypeId.value,
    quantity: Number(draftQuantity.value)
  }
  if (editingIndex.value == null) components.value = [...components.value, component]
  else components.value = components.value.map((item, index) => index === editingIndex.value ? component : item)
  drawerOpen.value = false
}
function remove(index: number) {
  components.value = components.value.filter((_, itemIndex) => itemIndex !== index)
  removeIndex.value = undefined
}
function invalid(component: OfferComponent) {
  return !component.componentTypeId
    || !(Number(component.quantity) > 0)
    || components.value.some(item => item.id !== component.id && item.componentTypeId === component.componentTypeId)
}
</script>

<template>
  <div class="space-y-3">
    <Card v-for="(component, index) in components" :key="component.id">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <p class="font-semibold text-slate-800">{{ typeName(component.componentTypeId) }}</p>
            <Badge v-if="types.find(item => item.id === component.componentTypeId && !item.active)" variant="danger" size="small">Inativo</Badge>
            <Badge v-if="props.showValidation && invalid(component)" variant="danger" size="small">Revisar</Badge>
          </div>
          <p class="mt-1 text-sm text-slate-500">Quantidade incluída: {{ component.quantity }}</p>
        </div>
        <div class="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <template v-if="removeIndex === index">
            <span class="text-xs font-medium text-slate-600">Remover componente?</span>
            <Button type="button" size="small" variant="secondary" @click="removeIndex = undefined">Cancelar</Button>
            <Button type="button" size="small" variant="danger" @click="remove(index)">Sim</Button>
          </template>
          <template v-else>
            <Button type="button" size="small" variant="secondary" @click="openEdit(index)">Editar</Button>
            <Button type="button" size="small" variant="danger" @click="removeIndex = index">Remover</Button>
          </template>
        </div>
      </div>
    </Card>

    <EmptyState v-if="!components.length" size="small" :bordered="false" title="Nenhum componente incluído" description="A oferta pode ser salva sem componentes quando isso fizer sentido comercialmente.">
      <template #icon><BoxesIcon /></template>
      <template #action><Button type="button" size="small" variant="secondary" @click="openCreate">Adicionar componente</Button></template>
    </EmptyState>
    <Button v-else type="button" size="small" variant="secondary" @click="openCreate">Adicionar componente</Button>

    <Drawer v-model:open="drawerOpen" size="large" :title="drawerTitle" description="Defina o papel comercial incluído na oferta e quantas unidades desse papel o cliente recebe.">
      <div class="space-y-4">
        <Select
          v-model="draftTypeId"
          label="Tipo de componente"
          description="Tipos representam papéis como Prato do dia, Salada P, Fruta ou Proteína; não são itens produzíveis."
          placeholder="Selecione um tipo"
          required
          :options="draftOptions"
          :error="typeError" />
        <Input
          v-model="draftQuantity"
          type="number"
          inputmode="numeric"
          label="Quantidade incluída"
          description="Informe quantas unidades deste tipo fazem parte da configuração base da oferta."
          min="1"
          step="1"
          required
          :error="quantityError" />
      </div>
      <template #footer>
        <div class="flex items-center justify-between gap-2"><Button type="button" variant="secondary" @click="drawerOpen = false">Cancelar</Button><Button type="button" @click="saveDraft">{{ drawerAction }}</Button></div>
      </template>
    </Drawer>

  </div>
</template>
