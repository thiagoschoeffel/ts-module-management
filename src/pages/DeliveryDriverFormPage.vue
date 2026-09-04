<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Alert, AlertDialog, Badge, Button, Card, Checkbox, CheckIcon, Input, TriangleAlertIcon } from '@thiagoschoeffel/ts-components'
import { getDeliveryDriver, nextDeliveryDriverId, saveDeliveryDriver } from '../mocks/deliveryDriverStore'
import { navigate } from '../utils/navigation'

const props = withDefaults(defineProps<{ mode?: 'create' | 'edit'; driverId?: string }>(), {
  mode: 'create', driverId: undefined
})
const driver = computed(() => getDeliveryDriver(props.driverId))
const name = ref('')
const phone = ref('')
const active = ref(true)
const showValidation = ref(false)
const saving = ref(false)
const savedMessage = ref('')
const cancelConfirmationOpen = ref(false)
const initialSnapshot = ref('')
let navigationTimeout: ReturnType<typeof setTimeout> | undefined

const snapshot = computed(() => JSON.stringify({ name: name.value, phone: phone.value, active: active.value }))
const isDirty = computed(() => initialSnapshot.value ? snapshot.value !== initialSnapshot.value : Boolean(name.value || phone.value || !active.value))
const nameError = computed(() => showValidation.value && !name.value.trim() ? 'Informe o nome do entregador.' : undefined)
const phoneError = computed(() => showValidation.value && phone.value && phone.value.replace(/\D/g, '').length < 10 ? 'Informe um telefone válido com DDD ou deixe o campo vazio.' : undefined)

function formatPhone(value: string) {
  let digits = value.replace(/\D/g, '')
  if (digits.length > 11 && digits.startsWith('55')) digits = digits.slice(2)
  digits = digits.slice(0, 11)
  if (!digits) return ''
  if (digits.length <= 2) return `(${digits}`
  const areaCode = digits.slice(0, 2)
  const localNumber = digits.slice(2)
  if (localNumber.length <= 4) return `(${areaCode}) ${localNumber}`
  if (digits.length <= 10) return `(${areaCode}) ${localNumber.slice(0, 4)}-${localNumber.slice(4)}`
  return `(${areaCode}) ${localNumber.slice(0, 5)}-${localNumber.slice(5)}`
}
function updatePhone(value: string | number) { phone.value = formatPhone(String(value)) }
function pastePhone(event: ClipboardEvent) {
  const value = event.clipboardData?.getData('text')
  if (!value) return
  event.preventDefault()
  phone.value = formatPhone(value)
}
function returnUrl() {
  const candidate = new URLSearchParams(window.location.search).get('retorno')
  return candidate && /^\/entregadores(?:\?.*)?$/.test(candidate) ? candidate : '/entregadores'
}
function leavePage() { navigate(returnUrl()) }
function cancel() { if (isDirty.value) cancelConfirmationOpen.value = true; else leavePage() }
function save() {
  showValidation.value = true
  if (nameError.value || phoneError.value || (props.mode === 'edit' && !driver.value)) return
  saving.value = true
  const id = props.mode === 'edit' && props.driverId ? props.driverId : nextDeliveryDriverId()
  navigationTimeout = setTimeout(() => {
    saveDeliveryDriver({ id, name: name.value.trim(), phone: phone.value.trim() || undefined, active: active.value })
    saving.value = false
    initialSnapshot.value = snapshot.value
    savedMessage.value = props.mode === 'edit' ? 'Alterações do entregador salvas.' : 'Entregador criado com sucesso.'
    navigationTimeout = setTimeout(leavePage, 700)
  }, 450)
}
function warnBeforeUnload(event: BeforeUnloadEvent) {
  if (!isDirty.value || savedMessage.value) return
  event.preventDefault()
  event.returnValue = ''
}

onMounted(() => {
  window.addEventListener('beforeunload', warnBeforeUnload)
  if (driver.value) {
    name.value = driver.value.name
    phone.value = formatPhone(driver.value.phone ?? '')
    active.value = driver.value.active
  }
  initialSnapshot.value = snapshot.value
})
onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', warnBeforeUnload)
  if (navigationTimeout) clearTimeout(navigationTimeout)
})
watch(snapshot, () => { if (savedMessage.value) savedMessage.value = '' })
</script>

<template>
  <form class="space-y-4 pb-20 lg:pb-0" @submit.prevent="save">
    <Alert v-if="savedMessage" variants="success" :description="savedMessage"><template #icon><CheckIcon /></template></Alert>
    <Alert v-if="props.mode === 'edit' && !driver" variants="danger" title="Entregador não encontrado" description="Volte para a lista e selecione um cadastro válido."><template #icon><TriangleAlertIcon /></template></Alert>

    <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      <Card>
        <template #header><h2 class="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Dados cadastrais</h2><p class="mt-1 text-sm text-slate-500">Informações usadas nas preferências de clientes e nas rotas.</p></template>
        <div class="grid gap-4 sm:grid-cols-2">
          <Input id="driver-name" v-model="name" label="Nome" placeholder="Nome do entregador" autocomplete="name" required :error="nameError" />
          <Input id="driver-phone" :model-value="phone" type="tel" inputmode="tel" autocomplete="tel" label="Telefone (opcional)" placeholder="(11) 99999-9999" :maxlength="15" :error="phoneError" @paste="pastePhone" @update:model-value="updatePhone" />
        </div>
        <Checkbox v-model="active" class="mt-4" label="Entregador ativo" />
      </Card>

      <aside class="space-y-4 lg:sticky lg:top-6">
        <Card>
          <template #header><h2 class="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Resumo</h2><p class="mt-1 text-sm text-slate-500">Confira os dados antes de salvar.</p></template>
          <dl class="space-y-3 text-sm">
            <div class="flex items-center justify-between gap-3"><dt class="text-slate-500">Nome</dt><dd class="max-w-48 truncate text-right font-medium text-slate-800">{{ name.trim() || 'Não informado' }}</dd></div>
            <div class="flex items-center justify-between gap-3"><dt class="text-slate-500">Telefone</dt><dd class="text-right text-slate-700">{{ phone || 'Não informado' }}</dd></div>
            <div class="flex items-center justify-between gap-3"><dt class="text-slate-500">Status</dt><dd><Badge size="medium" :variant="active ? 'success' : 'danger'">{{ active ? 'Ativo' : 'Inativo' }}</Badge></dd></div>
          </dl>
          <template #footer><Button type="submit" class="w-full" :loading="saving" :disabled="props.mode === 'edit' && !driver">{{ props.mode === 'edit' ? 'Salvar alterações' : 'Salvar entregador' }}</Button></template>
        </Card>
      </aside>
    </div>

    <Button type="button" variant="secondary" @click="cancel">Cancelar</Button>
    <div class="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-6 py-3 shadow-[0_-4px_16px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden"><Button type="submit" class="w-full" :loading="saving" :disabled="props.mode === 'edit' && !driver">{{ props.mode === 'edit' ? 'Salvar alterações' : 'Salvar entregador' }}</Button></div>
    <AlertDialog v-model:open="cancelConfirmationOpen" title="Deseja sair?" description="As alterações não salvas serão perdidas." cancel-label="Continuar editando" confirm-label="Sair sem salvar" confirm-variant="danger" @confirm="leavePage" />
  </form>
</template>
