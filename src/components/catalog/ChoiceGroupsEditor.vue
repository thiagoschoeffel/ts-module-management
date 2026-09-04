<script setup lang="ts">
import { computed, ref } from 'vue'
import { Badge, BoxesIcon, Button, Card, ChevronLeftIcon, Drawer, EmptyState, Input, ListIcon, Select, type SelectOption } from '@thiagoschoeffel/ts-components'
import { formatCurrency, getComponentTypes } from '../../mocks/catalogStore'
import type { OfferChoiceGroup, OfferChoiceOption } from '../../types/catalog'

const props = withDefaults(defineProps<{ showValidation?: boolean }>(), { showValidation: false })
const groups = defineModel<OfferChoiceGroup[]>({ required: true })
const types = computed(() => getComponentTypes())
const drawerOpen = ref(false)
const drawerView = ref<'group' | 'option'>('group')
const editingIndex = ref<number>()
const draft = ref<OfferChoiceGroup>(emptyGroup())
const showDrawerValidation = ref(false)
const optionEditingIndex = ref<number>()
const optionDraft = ref<OfferChoiceOption>(emptyOption())
const showOptionValidation = ref(false)
const removeOptionIndex = ref<number>()
const removeIndex = ref<number>()

const drawerTitle = computed(() => {
  if (drawerView.value === 'option') return optionEditingIndex.value == null ? 'Adicionar opção' : 'Editar opção'
  return editingIndex.value == null ? 'Adicionar grupo de escolha' : 'Editar grupo de escolha'
})
const drawerDescription = computed(() => drawerView.value === 'option'
  ? `Configure uma alternativa${draft.value.name.trim() ? ` para ${draft.value.name.trim()}` : ' para o grupo de escolha'}.`
  : 'Agrupe alternativas da oferta e defina quantas opções o cliente deve ou pode selecionar.')
const drawerAction = computed(() => editingIndex.value == null ? 'Adicionar grupo' : 'Salvar alterações')
const optionAction = computed(() => optionEditingIndex.value == null ? 'Adicionar opção' : 'Salvar opção')
const groupNameError = computed(() => showDrawerValidation.value && !draft.value.name.trim() ? 'Informe um nome que explique a escolha.' : undefined)
const minError = computed(() => {
  if (!showDrawerValidation.value) return undefined
  if (Number(draft.value.minSelections) < 0) return 'O mínimo não pode ser negativo.'
  return Number(draft.value.minSelections) > Number(draft.value.maxSelections) ? 'O mínimo não pode superar o máximo.' : undefined
})
const maxError = computed(() => {
  if (!showDrawerValidation.value) return undefined
  if (Number(draft.value.maxSelections) < 1) return 'O máximo deve ser pelo menos 1.'
  return Number(draft.value.maxSelections) > draft.value.options.length ? `O máximo não pode superar as ${draft.value.options.length} opções disponíveis.` : undefined
})
const optionsError = computed(() => showDrawerValidation.value && !draft.value.options.length ? 'Adicione pelo menos uma opção ao grupo.' : undefined)
const invalidOptionsError = computed(() => showDrawerValidation.value && draft.value.options.some(optionInvalid) ? 'Revise as opções sinalizadas antes de salvar o grupo.' : undefined)
const optionTypeError = computed(() => {
  if (!showOptionValidation.value) return undefined
  if (!optionDraft.value.componentTypeId) return 'Selecione um tipo de componente.'
  return draft.value.options.some((option, index) => index !== optionEditingIndex.value && option.componentTypeId === optionDraft.value.componentTypeId)
    ? 'Este tipo já está entre as opções.'
    : undefined
})
const optionSurchargeError = computed(() => showOptionValidation.value && !(Number(optionDraft.value.surcharge) >= 0) ? 'Use um valor igual ou maior que zero.' : undefined)

function emptyGroup(): OfferChoiceGroup {
  return { id: `grupo-${Date.now()}`, name: '', minSelections: 1, maxSelections: 1, options: [] }
}
function emptyOption(): OfferChoiceOption {
  return { id: `op-${Date.now()}`, componentTypeId: '', surcharge: 0 }
}
function typeOptions(currentId: string): SelectOption[] {
  return types.value
    .filter(item => item.active || item.id === currentId)
    .map(item => ({ value: item.id, label: `${item.name}${item.active ? '' : ' (inativo)'}`, disabled: !item.active && item.id !== currentId }))
}
function typeName(id: string) { return types.value.find(item => item.id === id)?.name ?? 'Tipo indisponível' }
function selectionRule(group: OfferChoiceGroup) {
  if (group.minSelections === 1 && group.maxSelections === 1) return 'Escolha exatamente 1 opção'
  if (group.minSelections === group.maxSelections) return `Escolha exatamente ${group.minSelections} opções`
  return `Escolha de ${group.minSelections} a ${group.maxSelections} opções`
}
function openCreate() {
  editingIndex.value = undefined
  draft.value = emptyGroup()
  showDrawerValidation.value = false
  removeOptionIndex.value = undefined
  removeIndex.value = undefined
  drawerView.value = 'group'
  drawerOpen.value = true
}
function openEdit(index: number) {
  const group = groups.value[index]
  if (!group) return
  editingIndex.value = index
  draft.value = { ...group, options: group.options.map(option => ({ ...option })) }
  showDrawerValidation.value = false
  removeOptionIndex.value = undefined
  removeIndex.value = undefined
  drawerView.value = 'group'
  drawerOpen.value = true
}
function openCreateOption() {
  optionEditingIndex.value = undefined
  optionDraft.value = emptyOption()
  showOptionValidation.value = false
  drawerView.value = 'option'
}
function openEditOption(index: number) {
  const option = draft.value.options[index]
  if (!option) return
  optionEditingIndex.value = index
  optionDraft.value = { ...option }
  showOptionValidation.value = false
  drawerView.value = 'option'
}
function saveOption() {
  showOptionValidation.value = true
  if (optionTypeError.value || optionSurchargeError.value) return
  const value = { ...optionDraft.value, surcharge: Number(optionDraft.value.surcharge) }
  if (optionEditingIndex.value == null) draft.value.options.push(value)
  else draft.value.options.splice(optionEditingIndex.value, 1, value)
  drawerView.value = 'group'
}
function removeOption(index: number) {
  draft.value.options.splice(index, 1)
  removeOptionIndex.value = undefined
}
function optionInvalid(option: OfferChoiceOption, index?: number) {
  return !option.componentTypeId
    || !(Number(option.surcharge) >= 0)
    || draft.value.options.some((other, otherIndex) => otherIndex !== index && other.id !== option.id && other.componentTypeId === option.componentTypeId)
}
function saveDraft() {
  showDrawerValidation.value = true
  if (groupNameError.value || minError.value || maxError.value || optionsError.value || invalidOptionsError.value) return
  const value = { ...draft.value, options: draft.value.options.map(option => ({ ...option })) }
  value.name = value.name.trim()
  value.minSelections = Number(value.minSelections)
  value.maxSelections = Number(value.maxSelections)
  value.options = value.options.map(option => ({ ...option, surcharge: Number(option.surcharge) }))
  if (editingIndex.value == null) groups.value = [...groups.value, value]
  else groups.value = groups.value.map((group, index) => index === editingIndex.value ? value : group)
  drawerOpen.value = false
}
function removeGroup(index: number) {
  groups.value = groups.value.filter((_, groupIndex) => groupIndex !== index)
  removeIndex.value = undefined
}
function invalid(group: OfferChoiceGroup) {
  return !group.name.trim()
    || !group.options.length
    || Number(group.minSelections) < 0
    || Number(group.maxSelections) < 1
    || Number(group.minSelections) > Number(group.maxSelections)
    || Number(group.maxSelections) > group.options.length
    || group.options.some(option => !option.componentTypeId || !(Number(option.surcharge) >= 0) || group.options.some(other => other.id !== option.id && other.componentTypeId === option.componentTypeId))
}
</script>

<template>
  <div class="space-y-4">
    <Card v-for="(group, groupIndex) in groups" :key="group.id">
      <div class="ts-responsive-row-start gap-4">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2"><p class="font-semibold text-slate-800">{{ group.name }}</p><Badge variant="neutral">{{ group.options.length }} opç{{ group.options.length === 1 ? 'ão' : 'ões' }}</Badge><Badge v-if="props.showValidation && invalid(group)" variant="danger" size="small">Revisar</Badge></div>
          <p class="mt-1 text-sm text-slate-500">{{ selectionRule(group) }}</p>
        </div>
        <div class="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <template v-if="removeIndex === groupIndex">
            <span class="text-xs font-medium text-slate-600">Remover grupo?</span>
            <Button type="button" size="small" variant="secondary" @click="removeIndex = undefined">Cancelar</Button>
            <Button type="button" size="small" variant="danger" @click="removeGroup(groupIndex)">Sim</Button>
          </template>
          <template v-else>
            <Button type="button" size="small" variant="secondary" @click="openEdit(groupIndex)">Editar</Button>
            <Button type="button" size="small" variant="danger" @click="removeIndex = groupIndex">Remover</Button>
          </template>
        </div>
      </div>
      <template v-if="group.options.length">
        <div class="mt-4 space-y-2 md:hidden">
          <div v-for="option in group.options" :key="option.id" class="rounded-lg border border-slate-200 p-3">
            <div class="flex items-start justify-between gap-3">
              <div><p class="text-xs font-medium uppercase tracking-wide text-slate-400">Tipo de componente</p><p class="mt-1 font-medium text-slate-800">{{ typeName(option.componentTypeId) }}</p></div>
              <p class="shrink-0 font-medium" :class="option.surcharge ? 'text-emerald-600' : 'text-slate-400'">{{ option.surcharge ? `+ ${formatCurrency(option.surcharge)}` : 'Sem acréscimo' }}</p>
            </div>
          </div>
        </div>
        <div class="mt-4 hidden overflow-hidden rounded-lg border border-slate-200 md:block">
          <table class="w-full text-left text-sm">
            <thead class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th class="px-4 py-3 font-semibold">Tipo de componente</th><th class="px-4 py-3 text-right font-semibold">Acréscimo</th></tr></thead>
            <tbody class="divide-y divide-slate-200 bg-white"><tr v-for="option in group.options" :key="option.id"><td class="px-4 py-3 font-medium text-slate-800">{{ typeName(option.componentTypeId) }}</td><td class="px-4 py-3 text-right font-medium" :class="option.surcharge ? 'text-emerald-600' : 'text-slate-400'">{{ option.surcharge ? `+ ${formatCurrency(option.surcharge)}` : 'Sem acréscimo' }}</td></tr></tbody>
          </table>
        </div>
      </template>
    </Card>

    <EmptyState v-if="!groups.length" size="small" :bordered="false" title="Nenhum grupo de escolha" description="Use grupos apenas quando o cliente precisar escolher entre opções.">
      <template #icon><ListIcon /></template>
      <template #action><Button type="button" size="small" variant="secondary" @click="openCreate">Adicionar grupo de escolha</Button></template>
    </EmptyState>
    <Button v-else type="button" size="small" variant="secondary" @click="openCreate">Adicionar grupo de escolha</Button>

    <Drawer v-model:open="drawerOpen" size="large" :title="drawerTitle" :description="drawerDescription">
      <div v-if="drawerView === 'group'" class="space-y-5">
        <Input v-model="draft.name" label="Nome do grupo" description="Use um nome que deixe a decisão clara, como Acompanhamento ou Escolha sua sobremesa." placeholder="Ex.: Acompanhamento" required :error="groupNameError" />
        <div class="grid gap-3 sm:grid-cols-2">
          <Input v-model="draft.minSelections" type="number" inputmode="numeric" label="Mínimo de escolhas" description="Use zero quando a escolha for opcional." min="0" step="1" required :error="minError" />
          <Input v-model="draft.maxSelections" type="number" inputmode="numeric" label="Máximo de escolhas" description="Não pode ser maior que o número de opções." min="1" step="1" required :error="maxError" />
        </div>

        <section class="space-y-3" aria-labelledby="choice-options-title">
          <div><h3 id="choice-options-title" class="text-sm font-semibold text-slate-800">Opções disponíveis</h3><p class="mt-1 text-sm text-slate-500">Cada opção aponta para um tipo de componente e pode acrescentar um valor ao preço base.</p></div>
          <Card v-for="(option, optionIndex) in draft.options" :key="option.id">
            <div class="ts-responsive-row gap-3">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2"><p class="font-medium text-slate-800">{{ typeName(option.componentTypeId) }}</p><Badge v-if="showDrawerValidation && optionInvalid(option, optionIndex)" variant="danger" size="small">Revisar</Badge></div>
                <p class="mt-1 text-sm" :class="option.surcharge ? 'font-medium text-emerald-600' : 'text-slate-400'">{{ option.surcharge ? `Acréscimo de ${formatCurrency(option.surcharge)}` : 'Sem acréscimo' }}</p>
              </div>
              <div class="flex shrink-0 flex-wrap items-center justify-end gap-2">
                <template v-if="removeOptionIndex === optionIndex">
                  <span class="text-xs font-medium text-slate-600">Remover opção?</span>
                  <Button type="button" size="small" variant="secondary" @click="removeOptionIndex = undefined">Cancelar</Button>
                  <Button type="button" size="small" variant="danger" @click="removeOption(optionIndex)">Sim</Button>
                </template>
                <template v-else>
                  <Button type="button" size="small" variant="secondary" @click="openEditOption(optionIndex)">Editar</Button>
                  <Button type="button" size="small" variant="danger" @click="removeOptionIndex = optionIndex">Remover</Button>
                </template>
              </div>
            </div>
          </Card>
          <EmptyState v-if="!draft.options.length" size="small" :bordered="false" title="Nenhuma opção adicionada" description="Adicione as alternativas que o cliente poderá escolher.">
            <template #icon><BoxesIcon /></template>
            <template #action><Button type="button" size="small" variant="secondary" @click="openCreateOption">Adicionar opção</Button></template>
          </EmptyState>
          <p v-if="optionsError" class="text-xs text-red-600" role="alert">{{ optionsError }}</p>
          <p v-if="invalidOptionsError" class="text-xs text-red-600" role="alert">{{ invalidOptionsError }}</p>
          <Button v-if="draft.options.length" type="button" size="small" variant="secondary" @click="openCreateOption">Adicionar opção</Button>
        </section>
      </div>

      <div v-else class="space-y-5">
        <button type="button" class="inline-flex cursor-pointer items-center gap-1 text-sm font-medium text-slate-400 transition-colors hover:text-slate-800" @click="drawerView = 'group'">
          <ChevronLeftIcon class="size-4" /> Voltar para o grupo
        </button>
        <Select v-model="optionDraft.componentTypeId" label="Tipo de componente" description="Tipo entregue quando esta alternativa é escolhida." placeholder="Selecione um tipo" required :options="typeOptions(optionDraft.componentTypeId)" :error="optionTypeError" />
        <Input v-model="optionDraft.surcharge" class="[&_input]:pl-11!" type="number" inputmode="decimal" label="Acréscimo" description="Valor somado ao preço base quando o cliente escolhe esta opção. Use zero quando não houver acréscimo." min="0" step="0.01" required :error="optionSurchargeError"><template #leading><span class="text-sm text-slate-400">R$</span></template></Input>
      </div>

      <template v-if="drawerView === 'group'" #footer>
        <div class="flex items-center justify-between gap-2"><Button type="button" variant="secondary" @click="drawerOpen = false">Cancelar</Button><Button type="button" @click="saveDraft">{{ drawerAction }}</Button></div>
      </template>
      <template v-else #footer>
        <div class="flex items-center justify-between gap-2"><Button type="button" variant="secondary" @click="drawerView = 'group'">Cancelar</Button><Button type="button" @click="saveOption">{{ optionAction }}</Button></div>
      </template>
    </Drawer>

  </div>
</template>
