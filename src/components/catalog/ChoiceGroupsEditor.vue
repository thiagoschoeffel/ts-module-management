<script setup lang="ts">
import { computed } from 'vue'
import { Badge, Button, Input, PlusIcon, Select, XIcon, type SelectOption } from '@thiagoschoeffel/ts-components'
import { getComponentTypes } from '../../mocks/catalogStore'
import type { OfferChoiceGroup, OfferChoiceOption } from '../../types/catalog'

const props = withDefaults(defineProps<{ showValidation?: boolean }>(), { showValidation: false })
const groups = defineModel<OfferChoiceGroup[]>({ required: true })
const types = computed(() => getComponentTypes())

function typeOptions(currentId: string): SelectOption[] { return types.value.filter(item => item.active || item.id === currentId).map(item => ({ value: item.id, label: `${item.name}${item.active ? '' : ' (inativo)'}` })) }
function addGroup() { groups.value = [...groups.value, { id: `grupo-${Date.now()}`, name: '', minSelections: 1, maxSelections: 1, options: [] }] }
function removeGroup(index: number) { groups.value = groups.value.filter((_, itemIndex) => itemIndex !== index) }
function addOption(group: OfferChoiceGroup) { group.options.push({ id: `op-${Date.now()}-${group.options.length}`, componentTypeId: '', surcharge: 0 }) }
function removeOption(group: OfferChoiceGroup, index: number) { group.options.splice(index, 1) }
function duplicated(group: OfferChoiceGroup, option: OfferChoiceOption) { return Boolean(option.componentTypeId && group.options.some(item => item.id !== option.id && item.componentTypeId === option.componentTypeId)) }
function groupNameError(group: OfferChoiceGroup) { return props.showValidation && !group.name.trim() ? 'Informe o nome do grupo.' : undefined }
function minError(group: OfferChoiceGroup) { return props.showValidation && (Number(group.minSelections) < 0 || Number(group.minSelections) > Number(group.maxSelections)) ? 'O mínimo deve ser positivo e não superar o máximo.' : undefined }
function maxError(group: OfferChoiceGroup) { return props.showValidation && (Number(group.maxSelections) < 1 || Number(group.maxSelections) > group.options.length) ? `Use um máximo entre 1 e ${Math.max(1, group.options.length)}.` : undefined }
function optionError(group: OfferChoiceGroup, option: OfferChoiceOption) { if (!props.showValidation) return undefined; if (!option.componentTypeId) return 'Selecione um tipo.'; return duplicated(group, option) ? 'Esta opção já está no grupo.' : undefined }
function surchargeError(option: OfferChoiceOption) { return props.showValidation && !(Number(option.surcharge) >= 0) ? 'Use um valor igual ou maior que zero.' : undefined }
</script>

<template>
  <div class="space-y-4">
    <div v-for="(group, groupIndex) in groups" :key="group.id" class="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div class="mb-4 flex items-center justify-between gap-3"><div><p class="font-semibold text-slate-800">Grupo {{ groupIndex + 1 }}</p><p class="mt-1 text-xs text-slate-500">Defina uma escolha simples entre tipos de componente.</p></div><Button type="button" size="small" variant="danger" icon-only :aria-label="`Remover grupo ${groupIndex + 1}`" @click="removeGroup(groupIndex)"><template #icon><XIcon /></template></Button></div>
      <div class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem_8rem]"><Input v-model="group.name" label="Nome" placeholder="Ex.: Acompanhamento" required :error="groupNameError(group)" /><Input v-model="group.minSelections" type="number" label="Mínimo" min="0" step="1" required :error="minError(group)" /><Input v-model="group.maxSelections" type="number" label="Máximo" min="1" step="1" required :error="maxError(group)" /></div>
      <div class="mt-4 space-y-3">
        <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Opções</p>
        <div v-for="(option, optionIndex) in group.options" :key="option.id" class="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-[minmax(0,1fr)_10rem_auto] sm:items-start"><Select v-model="option.componentTypeId" :label="`Opção ${optionIndex + 1}`" placeholder="Selecione um tipo" required :options="typeOptions(option.componentTypeId)" :error="optionError(group, option)" /><Input v-model="option.surcharge" type="number" inputmode="decimal" label="Acréscimo" min="0" step="0.01" required :error="surchargeError(option)" /><Button class="mt-7" type="button" size="small" variant="danger" icon-only :aria-label="`Remover opção ${optionIndex + 1}`" @click="removeOption(group, optionIndex)"><template #icon><XIcon /></template></Button></div>
        <Badge v-if="props.showValidation && !group.options.length" variant="danger">Adicione pelo menos uma opção.</Badge>
        <Button type="button" size="small" variant="secondary" @click="addOption(group)"><template #icon><PlusIcon /></template>Adicionar opção</Button>
      </div>
    </div>
    <p v-if="!groups.length" class="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-400">Nenhum grupo de escolha. Use grupos apenas quando o cliente precisar escolher entre opções.</p>
    <Button type="button" size="small" variant="secondary" @click="addGroup"><template #icon><PlusIcon /></template>Adicionar grupo de escolha</Button>
  </div>
</template>
