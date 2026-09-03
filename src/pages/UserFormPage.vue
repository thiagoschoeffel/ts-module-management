<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  Alert, AlertDialog, Badge, Button, Card, Checkbox, CheckIcon, Input, Select,
  TriangleAlertIcon, type SelectOption
} from '@thiagoschoeffel/ts-components'
import { accessIdAlreadyExists, getUser, nextUserId, saveUser } from '../mocks/userStore'
import type { UserRole } from '../types/user'
import { userRoleBadgeVariants, userRoleLabels } from '../types/user'

const props = withDefaults(defineProps<{ mode?: 'create' | 'edit'; userId?: string }>(), {
  mode: 'create', userId: undefined
})
const user = computed(() => getUser(props.userId))
const name = ref('')
const accessId = ref('')
const role = ref<UserRole>('operator')
const active = ref(true)
const showValidation = ref(false)
const saving = ref(false)
const savedMessage = ref('')
const cancelConfirmationOpen = ref(false)
const initialSnapshot = ref('')
let navigationTimeout: ReturnType<typeof setTimeout> | undefined

const roleOptions: SelectOption[] = (Object.entries(userRoleLabels) as [UserRole, string][])
  .map(([value, label]) => ({ value, label }))
const snapshot = computed(() => JSON.stringify({ name: name.value, accessId: accessId.value, role: role.value, active: active.value }))
const isDirty = computed(() => initialSnapshot.value ? snapshot.value !== initialSnapshot.value : Boolean(name.value || accessId.value || role.value !== 'operator' || !active.value))
const nameError = computed(() => showValidation.value && !name.value.trim() ? 'Informe o nome do usuário.' : undefined)
const accessIdError = computed(() => {
  if (!showValidation.value) return undefined
  const value = accessId.value.trim()
  if (!value) return 'Informe a identificação usada no acesso.'
  if (!/^[a-zA-Z0-9._@+-]+$/.test(value)) return 'Use apenas letras, números, ponto, arroba, hífen ou sublinhado.'
  if (accessIdAlreadyExists(value, props.mode === 'edit' ? props.userId : undefined)) return 'Esta identificação de acesso já está em uso.'
  return undefined
})

function returnUrl() {
  const candidate = new URLSearchParams(window.location.search).get('retorno')
  return candidate && /^\/usuarios(?:\?.*)?$/.test(candidate) ? candidate : '/usuarios'
}
function leavePage() { window.location.assign(returnUrl()) }
function cancel() { if (isDirty.value) cancelConfirmationOpen.value = true; else leavePage() }
function save() {
  showValidation.value = true
  if (nameError.value || accessIdError.value || (props.mode === 'edit' && !user.value)) return
  saving.value = true
  const id = props.mode === 'edit' && props.userId ? props.userId : nextUserId()
  navigationTimeout = setTimeout(() => {
    saveUser({ id, name: name.value.trim(), accessId: accessId.value.trim().toLocaleLowerCase('pt-BR'), role: role.value, active: active.value })
    saving.value = false
    initialSnapshot.value = snapshot.value
    savedMessage.value = props.mode === 'edit' ? 'Alterações do usuário salvas.' : 'Usuário criado com sucesso.'
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
  if (user.value) {
    name.value = user.value.name
    accessId.value = user.value.accessId
    role.value = user.value.role
    active.value = user.value.active
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
    <Alert v-if="props.mode === 'edit' && !user" variants="danger" title="Usuário não encontrado" description="Volte para a lista e selecione um cadastro válido."><template #icon><TriangleAlertIcon /></template></Alert>

    <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      <div class="space-y-4">
        <Card>
          <template #header><h2 class="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Dados cadastrais</h2><p class="mt-1 text-sm text-slate-500">Identifique a pessoa e defina como ela acessará o sistema.</p></template>
          <div class="grid gap-4 sm:grid-cols-2">
            <Input id="user-name" v-model="name" label="Nome" placeholder="Nome do usuário" autocomplete="name" required :error="nameError" />
            <Input id="user-access-id" v-model="accessId" label="Identificação de acesso" description="Use um nome de usuário ou e-mail único." placeholder="nome.sobrenome" autocomplete="username" autocapitalize="none" :spellcheck="false" required :error="accessIdError" />
          </div>
          <Checkbox v-model="active" class="mt-4" label="Usuário ativo" />
        </Card>

        <Card>
          <template #header><h2 class="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Perfil</h2><p class="mt-1 text-sm text-slate-500">O perfil representa a função inicial do usuário, sem permissões granulares nesta etapa.</p></template>
          <Select v-model="role" class="sm:max-w-sm" label="Perfil do usuário" :options="roleOptions" @update:model-value="role = $event as UserRole" />
        </Card>
      </div>

      <aside class="space-y-4 lg:sticky lg:top-6">
        <Card>
          <template #header><h2 class="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Resumo</h2><p class="mt-1 text-sm text-slate-500">Confira os dados antes de salvar.</p></template>
          <dl class="space-y-3 text-sm">
            <div class="flex items-center justify-between gap-3"><dt class="text-slate-500">Nome</dt><dd class="max-w-48 truncate text-right font-medium text-slate-800">{{ name.trim() || 'Não informado' }}</dd></div>
            <div class="flex items-center justify-between gap-3"><dt class="text-slate-500">Acesso</dt><dd class="max-w-48 truncate text-right text-slate-700">{{ accessId.trim() || 'Não informado' }}</dd></div>
            <div class="flex items-center justify-between gap-3"><dt class="text-slate-500">Perfil</dt><dd><Badge size="medium" :variant="userRoleBadgeVariants[role]">{{ userRoleLabels[role] }}</Badge></dd></div>
            <div class="flex items-center justify-between gap-3"><dt class="text-slate-500">Status</dt><dd><Badge size="medium" :variant="active ? 'success' : 'danger'">{{ active ? 'Ativo' : 'Inativo' }}</Badge></dd></div>
          </dl>
          <template #footer><Button type="submit" class="w-full" :loading="saving" :disabled="props.mode === 'edit' && !user">{{ props.mode === 'edit' ? 'Salvar alterações' : 'Salvar usuário' }}</Button></template>
        </Card>
      </aside>
    </div>

    <Button type="button" variant="secondary" @click="cancel">Cancelar</Button>
    <div class="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-6 py-3 shadow-[0_-4px_16px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden"><Button type="submit" class="w-full" :loading="saving" :disabled="props.mode === 'edit' && !user">{{ props.mode === 'edit' ? 'Salvar alterações' : 'Salvar usuário' }}</Button></div>
    <AlertDialog v-model:open="cancelConfirmationOpen" title="Deseja sair?" description="As alterações não salvas serão perdidas." cancel-label="Continuar editando" confirm-label="Sair sem salvar" confirm-variant="danger" @confirm="leavePage" />
  </form>
</template>
