<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Alert, AlertDialog, Badge, Button, Checkbox, CheckIcon, Input, MultiSelect, SectionCard, Textarea, TriangleAlertIcon, type MultiSelectOption } from '@thiagoschoeffel/ts-components'
import ChoiceGroupsEditor from '../components/catalog/ChoiceGroupsEditor.vue'
import OfferComponentsEditor from '../components/catalog/OfferComponentsEditor.vue'
import { formatCurrency, getCatalogAddons, getOffer, nextOfferId, saveOffer } from '../mocks/catalogStore'
import type { Offer, OfferChoiceGroup, OfferComponent } from '../types/catalog'

const props = withDefaults(defineProps<{ mode?: 'create' | 'edit'; offerId?: string }>(), { mode: 'create', offerId: undefined })
const existing = computed(() => getOffer(props.offerId))
const name = ref('')
const description = ref('')
const basePrice = ref<number>(0)
const active = ref(true)
const requiresMenuChoice = ref(false)
const components = ref<OfferComponent[]>([])
const choiceGroups = ref<OfferChoiceGroup[]>([])
const allowedAddonIds = ref<string[]>([])
const showValidation = ref(false)
const saving = ref(false)
const savedMessage = ref('')
const cancelConfirmationOpen = ref(false)
const initialSnapshot = ref('')
let navigationTimeout: ReturnType<typeof setTimeout> | undefined
const addons = computed(() => getCatalogAddons())
const addonOptions = computed<MultiSelectOption[]>(() => addons.value.filter(item => item.active || allowedAddonIds.value.includes(item.id)).map(item => ({ value: item.id, label: `${item.name} · ${formatCurrency(item.price)}${item.active ? '' : ' (inativo)'}`, disabled: !item.active && !allowedAddonIds.value.includes(item.id) })))
const snapshot = computed(() => JSON.stringify({ name: name.value, description: description.value, basePrice: basePrice.value, active: active.value, requiresMenuChoice: requiresMenuChoice.value, components: components.value, choiceGroups: choiceGroups.value, allowedAddonIds: allowedAddonIds.value }))
const isDirty = computed(() => initialSnapshot.value ? snapshot.value !== initialSnapshot.value : Boolean(name.value || description.value || components.value.length || choiceGroups.value.length || allowedAddonIds.value.length))
const nameError = computed(() => showValidation.value && !name.value.trim() ? 'Informe o nome da oferta.' : undefined)
const priceError = computed(() => showValidation.value && !(Number(basePrice.value) >= 0) ? 'Use um preço igual ou maior que zero.' : undefined)
const componentsInvalid = computed(() => components.value.some(component => !component.componentTypeId || !(Number(component.quantity) > 0) || components.value.some(other => other.id !== component.id && other.componentTypeId === component.componentTypeId)))
const groupsInvalid = computed(() => choiceGroups.value.some(group => !group.name.trim() || group.options.length < 1 || Number(group.minSelections) < 0 || Number(group.maxSelections) < 1 || Number(group.minSelections) > Number(group.maxSelections) || Number(group.maxSelections) > group.options.length || group.options.some(option => !option.componentTypeId || !(Number(option.surcharge) >= 0) || group.options.some(other => other.id !== option.id && other.componentTypeId === option.componentTypeId))))
const addonsInvalid = computed(() => new Set(allowedAddonIds.value).size !== allowedAddonIds.value.length)

function returnUrl() { const candidate = new URLSearchParams(window.location.search).get('retorno'); return candidate && /^\/catalogo(?:\?.*)?$/.test(candidate) ? candidate : '/catalogo' }
function detailUrl(id: string) { return `/catalogo/${id}?retorno=${encodeURIComponent(returnUrl())}` }
function leave() { window.location.assign(props.mode === 'edit' && props.offerId ? detailUrl(props.offerId) : returnUrl()) }
function cancel() { if (isDirty.value) cancelConfirmationOpen.value = true; else leave() }
function save() {
  showValidation.value = true
  if (nameError.value || priceError.value || componentsInvalid.value || groupsInvalid.value || addonsInvalid.value || (props.mode === 'edit' && !existing.value)) return
  saving.value = true
  const id = props.mode === 'edit' && props.offerId ? props.offerId : nextOfferId()
  const offer: Offer = { id, name: name.value.trim(), description: description.value.trim() || undefined, basePrice: Number(basePrice.value), active: active.value, requiresMenuChoice: requiresMenuChoice.value, components: structuredClone(components.value), choiceGroups: structuredClone(choiceGroups.value), allowedAddonIds: [...new Set(allowedAddonIds.value)] }
  navigationTimeout = setTimeout(() => { saveOffer(offer); saving.value = false; initialSnapshot.value = snapshot.value; savedMessage.value = props.mode === 'edit' ? 'Alterações da oferta salvas.' : 'Oferta criada com sucesso.'; navigationTimeout = setTimeout(() => window.location.assign(detailUrl(id)), 700) }, 450)
}
function warn(event: BeforeUnloadEvent) { if (!isDirty.value || savedMessage.value) return; event.preventDefault(); event.returnValue = '' }
onMounted(() => {
  window.addEventListener('beforeunload', warn)
  if (props.mode === 'edit' && existing.value) { const offer = existing.value; name.value = offer.name; description.value = offer.description ?? ''; basePrice.value = offer.basePrice; active.value = offer.active; requiresMenuChoice.value = offer.requiresMenuChoice; components.value = structuredClone(offer.components); choiceGroups.value = structuredClone(offer.choiceGroups); allowedAddonIds.value = [...offer.allowedAddonIds] }
  initialSnapshot.value = snapshot.value
})
onBeforeUnmount(() => { window.removeEventListener('beforeunload', warn); if (navigationTimeout) clearTimeout(navigationTimeout) })
watch(snapshot, () => { if (savedMessage.value) savedMessage.value = '' })
</script>

<template>
  <form class="space-y-4 pb-20 lg:pb-0" @submit.prevent="save">
    <Alert v-if="savedMessage" variants="success" :description="savedMessage"><template #icon><CheckIcon /></template></Alert>
    <Alert v-if="props.mode === 'edit' && !existing" variants="danger" title="Oferta não encontrada" description="Volte para o Catálogo e selecione uma oferta válida."><template #icon><TriangleAlertIcon /></template></Alert>
    <Alert v-if="showValidation && (componentsInvalid || groupsInvalid || addonsInvalid)" variants="danger" title="Revise a configuração comercial" description="Corrija os campos indicados em componentes, grupos ou adicionais antes de salvar."><template #icon><TriangleAlertIcon /></template></Alert>
    <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      <div class="space-y-4">
        <SectionCard title="Dados comerciais" description="Identidade e condições atuais daquilo que o cliente compra."><div class="grid gap-4 sm:grid-cols-2"><Input v-model="name" label="Nome" placeholder="Ex.: Prato + Salada P" required :error="nameError" /><Input v-model="basePrice" type="number" inputmode="decimal" label="Preço base" min="0" step="0.01" required :error="priceError" /></div><Textarea v-model="description" class="mt-4" label="Descrição" placeholder="Descrição opcional para reconhecer a oferta" :rows="3" /><div class="mt-4 grid gap-3 sm:grid-cols-2"><Checkbox v-model="active" label="Oferta ativa" description="Pode ser usada em novas configurações comerciais." /><Checkbox v-model="requiresMenuChoice" label="Exige escolha no cardápio" description="O cardápio futuro resolverá o item concreto do dia." /></div></SectionCard>
        <SectionCard title="Componentes incluídos" description="Estrutura base da oferta por tipo de componente; não selecione itens produzíveis aqui."><OfferComponentsEditor v-model="components" :show-validation="showValidation" /></SectionCard>
        <SectionCard title="Grupos de escolha" description="Opções internas com mínimo, máximo e eventual acréscimo financeiro."><ChoiceGroupsEditor v-model="choiceGroups" :show-validation="showValidation" /></SectionCard>
        <SectionCard title="Adicionais permitidos" description="Escolha os adicionais que podem ser comprados com esta oferta."><MultiSelect v-model="allowedAddonIds" label="Adicionais" :options="addonOptions" placeholder="Nenhum adicional permitido" /><p v-if="!addons.some(item => item.active)" class="mt-3 text-sm text-slate-400">Cadastre adicionais ativos na aba Adicionais do Catálogo.</p></SectionCard>
      </div>
      <aside class="space-y-4 lg:sticky lg:top-20"><SectionCard title="Resumo"><dl class="space-y-2 text-sm"><div class="flex justify-between gap-3"><dt>Preço base</dt><dd class="font-medium text-slate-800">{{ formatCurrency(Number(basePrice) || 0) }}</dd></div><div class="flex justify-between gap-3"><dt>Componentes</dt><dd class="font-medium text-slate-800">{{ components.length }}</dd></div><div class="flex justify-between gap-3"><dt>Grupos</dt><dd class="font-medium text-slate-800">{{ choiceGroups.length }}</dd></div><div class="flex justify-between gap-3"><dt>Adicionais</dt><dd><Badge variant="neutral">{{ allowedAddonIds.length }}</Badge></dd></div><div class="flex justify-between gap-3"><dt>Status</dt><dd><Badge :variant="active ? 'success' : 'neutral'">{{ active ? 'Ativa' : 'Inativa' }}</Badge></dd></div></dl><template #footer><Button type="submit" class="w-full" :loading="saving" :disabled="props.mode === 'edit' && !existing">{{ props.mode === 'edit' ? 'Salvar alterações' : 'Salvar oferta' }}</Button></template></SectionCard></aside>
    </div>
    <Button type="button" variant="secondary" @click="cancel">Cancelar</Button>
    <div class="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-6 py-3 shadow-[0_-4px_16px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden"><Button type="submit" class="w-full" :loading="saving" :disabled="props.mode === 'edit' && !existing">{{ props.mode === 'edit' ? 'Salvar alterações' : 'Salvar oferta' }}</Button></div>
    <AlertDialog v-model:open="cancelConfirmationOpen" title="Deseja sair?" description="As alterações não salvas serão perdidas." cancel-label="Continuar editando" confirm-label="Sair sem salvar" confirm-variant="danger" @confirm="leave" />
  </form>
</template>
