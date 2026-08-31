<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Alert, AlertDialog, Button, CheckIcon, Input, SectionCard, TriangleAlertIcon } from '@thiagoschoeffel/ts-components'
import CompositionEditor from '../components/producibles/CompositionEditor.vue'
import { addCompositionVersion, createProducible, getCurrentComposition, getProducible, updateProducibleName } from '../mocks/producibleStore'
import type { CompositionComponent } from '../types/producible'

const props = withDefaults(defineProps<{
  mode?: 'create' | 'edit' | 'composition'
  producibleId?: string
}>(), { mode: 'create', producibleId: undefined })

const item = computed(() => getProducible(props.producibleId))
const name = ref('')
const components = ref<CompositionComponent[]>([])
const showValidation = ref(false)
const saving = ref(false)
const savedMessage = ref('')
const cancelConfirmationOpen = ref(false)
const initialSnapshot = ref('')
let navigationTimeout: ReturnType<typeof setTimeout> | undefined

const snapshot = computed(() => JSON.stringify({ name: name.value, components: components.value }))
const isDirty = computed(() => initialSnapshot.value ? snapshot.value !== initialSnapshot.value : Boolean(name.value || components.value.length))
const nameError = computed(() => showValidation.value && !name.value.trim() ? 'Informe o nome do item produzível.' : undefined)
const componentErrors = computed(() => components.value.some(component =>
  !component.name.trim() || !(Number(component.quantity) > 0) || !component.unit
  || (component.kind === 'producible-item' && (!component.referenceId || component.referenceId === props.producibleId))))

function returnUrl() {
  const candidate = new URLSearchParams(window.location.search).get('retorno')
  return candidate && /^\/produziveis(?:\?.*)?$/.test(candidate) ? candidate : '/produziveis'
}
function detailUrl(id: string) { return `/produziveis/${id}?retorno=${encodeURIComponent(returnUrl())}` }
function leavePage() {
  window.location.assign(props.producibleId && props.mode !== 'create' ? detailUrl(props.producibleId) : returnUrl())
}
function cancel() { if (isDirty.value) cancelConfirmationOpen.value = true; else leavePage() }
function save() {
  showValidation.value = true
  if ((props.mode !== 'composition' && nameError.value) || componentErrors.value || (props.mode !== 'create' && !item.value)) return
  saving.value = true
  navigationTimeout = setTimeout(() => {
    let savedId = props.producibleId
    if (props.mode === 'create') savedId = createProducible(name.value.trim(), components.value).id
    else if (props.mode === 'edit' && savedId) updateProducibleName(savedId, name.value.trim())
    else if (props.mode === 'composition' && savedId) addCompositionVersion(savedId, components.value)
    saving.value = false
    initialSnapshot.value = snapshot.value
    savedMessage.value = props.mode === 'create' ? 'Item produzível criado com sucesso.' : props.mode === 'edit' ? 'Dados básicos atualizados.' : 'Nova versão de composição criada.'
    if (savedId) navigationTimeout = setTimeout(() => window.location.assign(detailUrl(savedId)), 700)
  }, 450)
}
function warnBeforeUnload(event: BeforeUnloadEvent) {
  if (!isDirty.value || savedMessage.value) return
  event.preventDefault(); event.returnValue = ''
}

onMounted(() => {
  window.addEventListener('beforeunload', warnBeforeUnload)
  if (item.value) {
    name.value = item.value.name
    if (props.mode === 'composition') components.value = structuredClone(getCurrentComposition(item.value)?.components ?? [])
  }
  initialSnapshot.value = snapshot.value
})
onBeforeUnmount(() => { window.removeEventListener('beforeunload', warnBeforeUnload); if (navigationTimeout) clearTimeout(navigationTimeout) })
watch(snapshot, () => { if (savedMessage.value) savedMessage.value = '' })
</script>

<template>
  <form class="space-y-4 pb-20 lg:pb-0" @submit.prevent="save">
    <Alert v-if="savedMessage" variants="success" :description="savedMessage"><template #icon><CheckIcon /></template></Alert>
    <Alert v-if="props.mode !== 'create' && !item" variants="danger" title="Item produzível não encontrado" description="Volte para a lista e selecione um item válido."><template #icon><TriangleAlertIcon /></template></Alert>
    <Alert v-if="props.mode === 'composition' && item" variants="info" title="Uma nova versão será criada" description="A composição atual será preservada no histórico e não sofrerá alterações."></Alert>

    <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      <div class="space-y-4">
        <SectionCard v-if="props.mode !== 'composition'" title="Dados do item" description="Identidade operacional estável do item produzido.">
          <Input id="producible-name" v-model="name" label="Nome" placeholder="Ex.: Molho da casa" required :error="nameError" />
        </SectionCard>

        <SectionCard
          v-if="props.mode !== 'edit'" :title="props.mode === 'create' ? 'Primeira composição' : 'Componentes da nova versão'"
          :description="props.mode === 'create' ? 'Defina como este item é produzido agora ou complete a composição depois.' : 'A edição começou como uma cópia da versão atual.'">
          <CompositionEditor v-model="components" :owner-id="props.producibleId" :show-validation="showValidation" />
        </SectionCard>
      </div>

      <aside class="space-y-4 lg:sticky lg:top-20">
        <SectionCard title="Resumo">
          <dl class="space-y-2 text-sm">
            <div v-if="props.mode === 'composition'" class="flex justify-between gap-3"><dt>Item</dt><dd class="text-right font-medium text-slate-800">{{ item?.name }}</dd></div>
            <div v-else class="flex justify-between gap-3"><dt>Nome</dt><dd class="text-right font-medium text-slate-800">{{ name.trim() || 'Não informado' }}</dd></div>
            <div v-if="props.mode !== 'edit'" class="flex justify-between gap-3"><dt>Componentes</dt><dd class="font-medium text-slate-800">{{ components.length }}</dd></div>
            <div v-if="props.mode === 'composition'" class="flex justify-between gap-3"><dt>Nova versão</dt><dd class="font-medium text-slate-800">v{{ Math.max(0, ...(item?.compositions.map(version => version.version) ?? [])) + 1 }}</dd></div>
          </dl>
          <template #footer><Button type="submit" class="w-full" :loading="saving" :disabled="props.mode !== 'create' && !item">{{ props.mode === 'create' ? 'Salvar item' : props.mode === 'edit' ? 'Salvar alterações' : 'Criar nova versão' }}</Button></template>
        </SectionCard>
      </aside>
    </div>

    <Button type="button" variant="secondary" @click="cancel">Cancelar</Button>
    <div class="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-6 py-3 shadow-[0_-4px_16px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden"><Button type="submit" class="w-full" :loading="saving" :disabled="props.mode !== 'create' && !item">{{ props.mode === 'create' ? 'Salvar item' : props.mode === 'edit' ? 'Salvar alterações' : 'Criar nova versão' }}</Button></div>
    <AlertDialog v-model:open="cancelConfirmationOpen" title="Deseja sair?" description="As alterações não salvas serão perdidas." cancel-label="Continuar editando" confirm-label="Sair sem salvar" confirm-variant="danger" @confirm="leavePage" />
  </form>
</template>
