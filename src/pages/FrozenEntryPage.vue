<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { getLocalTimeZone, today } from '@internationalized/date'
import {
  Alert, AlertDialog, Badge, Button, Card, CheckIcon, DatePicker, Dialog, EmptyState,
  Input, PrinterIcon, PrintPreview, Select, SnowflakeIcon, TriangleAlertIcon, type DateValue, type SelectOption
} from '@thiagoschoeffel/ts-components'
import { formatCurrency } from '../mocks/catalogStore'
import { loadFrozenStock, previewFrozenExpiration, registerFrozenProduction } from '../services/frozenStockApi'
import { navigate } from '../utils/navigation'
import { printFrozenProductLabels, type LabelPrintState } from '../services/frozenLabelPrinting'
import type { AuthenticatedApiRequest, FrozenConfiguration, FrozenLot, FrozenProductLabelSnapshot } from '../types/frozenStock'

type ConfigurationOption = FrozenConfiguration & { producibleName: string }

const params = new URLSearchParams(window.location.search)
const props = defineProps<{ apiRequest?: AuthenticatedApiRequest }>()
const configurations = ref<ConfigurationOption[]>([])
const loading = ref(true)
const loadingFailed = ref(false)
const expirationOn = ref('')
const configurationId = ref('')
const manufacturedOn = shallowRef<DateValue>(today(getLocalTimeZone()))
const producedQuantity = ref<number>(1)
const showValidation = ref(false)
const saving = ref(false)
const saveError = ref('')
const cancelConfirmationOpen = ref(false)
const printDialogOpen = ref(false)
const savedLot = ref<FrozenLot>()
const labelCopies = ref<number>(1)
const printState = ref<LabelPrintState>('idle')
const printError = ref('')
const pendingEntryKey = ref('')
const initialSnapshot = JSON.stringify({
  configurationId: configurationId.value,
  manufacturedOn: manufacturedOn.value.toString(),
  producedQuantity: producedQuantity.value
})

const configurationOptions = computed<SelectOption[]>(() => configurations.value.map(configuration => ({
  value: configuration.id,
  label: `${configuration.producibleName} · ${configuration.presentation} · ${formatCurrency(configuration.unitPrice)}`
})))
const selectedConfiguration = computed(() => configurations.value.find(configuration => configuration.id === configurationId.value))
const configurationError = computed(() => showValidation.value && !selectedConfiguration.value
  ? 'Selecione uma configuração ativa.'
  : undefined)
const manufacturedOnError = computed(() => showValidation.value && !manufacturedOn.value
  ? 'Informe a data de fabricação.'
  : undefined)
const quantityError = computed(() => showValidation.value && !(Number(producedQuantity.value) > 0)
  ? 'Use uma quantidade maior que zero.'
  : undefined)
const snapshot = computed(() => JSON.stringify({
  configurationId: configurationId.value,
  manufacturedOn: manufacturedOn.value?.toString() ?? '',
  producedQuantity: producedQuantity.value
}))
const isDirty = computed(() => snapshot.value !== initialSnapshot)
const labelSnapshot = computed<FrozenProductLabelSnapshot | undefined>(() => {
  return savedLot.value?.labelSnapshot
})
const labelCopiesError = computed(() => !Number.isInteger(Number(labelCopies.value)) || Number(labelCopies.value) < 1
  ? 'Informe pelo menos uma etiqueta.'
  : undefined)

function formatDate(value: string) {
  if (!value) return '—'
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}
function returnUrl() {
  const candidate = params.get('retorno')
  return candidate && /^\/congelados(?:\?.*)?$/.test(candidate) ? candidate : '/congelados'
}
function leave() { navigate(returnUrl()) }
function finish() {
  if (!savedLot.value) return leave()
  const destination = new URL(returnUrl(), window.location.origin)
  destination.searchParams.set('entrada', savedLot.value.id)
  navigate(`${destination.pathname}${destination.search}`)
}
function updatePrintDialog(open: boolean) {
  printDialogOpen.value = open
}
function cancel() {
  if (isDirty.value) cancelConfirmationOpen.value = true
  else leave()
}
function goToConfigurations() { navigate('/congelados?tab=produtos') }
async function load() {
  loading.value = true
  loadingFailed.value = false
  try {
    if (!props.apiRequest) throw new Error('Sessão autenticada indisponível.')
    const snapshot = await loadFrozenStock(props.apiRequest)
    configurations.value = snapshot.configurations.filter(configuration =>
      configuration.active
      && snapshot.producibles.some(item => item.id === configuration.producibleItemId && item.active))
    expirationOn.value = await previewFrozenExpiration(props.apiRequest, manufacturedOn.value.toString())
  }
  catch {
    loadingFailed.value = true
  }
  finally { loading.value = false }
}
async function save() {
  showValidation.value = true
  saveError.value = ''
  if (configurationError.value || manufacturedOnError.value || quantityError.value || !manufacturedOn.value) return
  if (!props.apiRequest) {
    saveError.value = 'A sessão autenticada da API não está disponível.'
    return
  }
  saving.value = true
  try {
      pendingEntryKey.value ||= crypto.randomUUID()
      const result = await registerFrozenProduction(props.apiRequest, {
        frozenConfigurationId: configurationId.value,
        manufacturedOn: manufacturedOn.value.toString(),
        producedQuantity: Number(producedQuantity.value),
        idempotencyKey: pendingEntryKey.value
      })
      savedLot.value = result.lot
      labelCopies.value = result.lot.producedQuantity
      printState.value = 'idle'
      printDialogOpen.value = true
      saving.value = false
  }
  catch (error) {
      saving.value = false
      saveError.value = error instanceof Error ? error.message : 'Não foi possível registrar a entrada.'
  }
}
async function printLabels() {
  const label = labelSnapshot.value
  if (!label || labelCopiesError.value) return
  printState.value = 'preparing'
  printError.value = ''
  try {
    if (params.get('mock') === 'impressao-erro')
      throw new Error('Não foi possível acessar o serviço de impressão.')
    printState.value = 'printing'
    await printFrozenProductLabels({ label, copies: Number(labelCopies.value) })
    printState.value = 'success'
  }
  catch (error) {
    printState.value = 'error'
    printError.value = error instanceof Error ? error.message : 'Não foi possível imprimir as etiquetas.'
  }
}
function warn(event: BeforeUnloadEvent) {
  if (!isDirty.value || saving.value || savedLot.value) return
  event.preventDefault()
  event.returnValue = ''
}

window.addEventListener('beforeunload', warn)
watch([configurationId, manufacturedOn, producedQuantity], () => {
  if (!saving.value && !savedLot.value) pendingEntryKey.value = ''
})
watch(manufacturedOn, async value => {
  expirationOn.value = ''
  if (!props.apiRequest || !value) return
  try { expirationOn.value = await previewFrozenExpiration(props.apiRequest, value.toString()) }
  catch { saveError.value = 'Não foi possível calcular a validade pela API.' }
})
onMounted(load)
onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', warn)
})
</script>

<template>
  <div v-if="loading" class="animate-pulse space-y-4" aria-label="Carregando configurações" aria-busy="true">
    <div class="h-72 rounded-lg border border-slate-200 bg-white" />
  </div>

  <EmptyState
    v-else-if="loadingFailed || !configurations.length"
    class="bg-white shadow-sm"
    size="large"
    :title="loadingFailed ? 'Não foi possível carregar as configurações' : 'Nenhuma configuração ativa'"
    :description="loadingFailed ? 'Verifique a conexão e tente novamente.' : 'Habilite um item produzível antes de registrar sua entrada no estoque.'">
    <template #icon><TriangleAlertIcon v-if="loadingFailed" /><SnowflakeIcon v-else /></template>
    <template #action><Button type="button" size="small" variant="secondary" @click="loadingFailed ? load() : goToConfigurations()">{{ loadingFailed ? 'Tentar novamente' : 'Ver produtos habilitados' }}</Button></template>
  </EmptyState>

  <form v-else class="space-y-4 pb-20 lg:pb-0" @submit.prevent="save">
    <Alert v-if="saveError" variants="danger" title="Entrada não registrada" :description="saveError" role="alert">
      <template #icon><TriangleAlertIcon /></template>
    </Alert>

    <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      <Card>
        <template #header>
          <h2 class="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Produção realizada</h2>
          <p class="mt-1 text-sm text-slate-500">Registre somente configurações já habilitadas para estoque congelado.</p>
        </template>

        <div class="space-y-4">
          <Select
            v-model="configurationId"
            label="Configuração de congelado"
            description="A apresentação e o preço são definidos na configuração; esta entrada altera somente lote e estoque."
            placeholder="Selecione o item e a apresentação"
            required
            :options="configurationOptions"
            :error="configurationError" />

          <Card v-if="selectedConfiguration" class="[&>div]:p-4">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p class="font-semibold text-slate-800">{{ selectedConfiguration.producibleName }}</p>
                <p class="mt-1 text-sm text-slate-500">{{ selectedConfiguration.presentation }} · {{ formatCurrency(selectedConfiguration.unitPrice) }}</p>
              </div>
              <Badge variant="success">Ativo</Badge>
            </div>
          </Card>

          <div class="grid gap-4 sm:grid-cols-2">
            <DatePicker
              v-model="manufacturedOn"
              label="Data de fabricação"
              description="A validade considera 90 dias corridos a partir desta data."
              locale="pt-BR"
              required
              :error="manufacturedOnError" />
            <Input
              v-model="producedQuantity"
              type="number"
              inputmode="numeric"
              label="Quantidade produzida"
              description="Número de unidades físicas adicionadas ao lote."
              min="1"
              step="1"
              required
              :error="quantityError" />
          </div>

          <Input
            :model-value="formatDate(expirationOn)"
            label="Validade calculada"
            description="Definida automaticamente pela política vigente e armazenada no lote."
            readonly>
            <template #trailing><Badge variant="info">+90 dias</Badge></template>
          </Input>
        </div>
      </Card>

      <aside class="space-y-4 lg:sticky lg:top-6">
        <Card>
          <template #header><h2 class="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Resumo da entrada</h2></template>
          <dl class="space-y-3 text-sm">
            <div class="flex justify-between gap-3"><dt class="text-slate-500">Item</dt><dd class="text-right font-medium text-slate-800">{{ selectedConfiguration?.producibleName ?? 'Não selecionado' }}</dd></div>
            <div class="flex justify-between gap-3"><dt class="text-slate-500">Apresentação</dt><dd class="font-medium text-slate-800">{{ selectedConfiguration?.presentation ?? '—' }}</dd></div>
            <div class="flex justify-between gap-3"><dt class="text-slate-500">Quantidade</dt><dd class="font-medium text-slate-800">{{ Number(producedQuantity) || 0 }}</dd></div>
            <div class="flex justify-between gap-3"><dt class="text-slate-500">Fabricação</dt><dd class="font-medium text-slate-800">{{ formatDate(manufacturedOn.toString()) }}</dd></div>
            <div class="flex justify-between gap-3"><dt class="text-slate-500">Validade</dt><dd class="font-medium text-slate-800">{{ formatDate(expirationOn) }}</dd></div>
            <div class="flex justify-between gap-3"><dt class="text-slate-500">Responsável</dt><dd class="text-right font-medium text-slate-800">Usuário atual</dd></div>
          </dl>
          <template #footer>
            <Button type="submit" class="w-full" :loading="saving">
              Registrar entrada
            </Button>
          </template>
        </Card>
      </aside>
    </div>

    <Button type="button" variant="secondary" @click="cancel">Cancelar</Button>
    <div class="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-6 py-3 shadow-[0_-4px_16px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
      <Button type="submit" class="w-full" :loading="saving">Registrar entrada</Button>
    </div>
    <AlertDialog
      v-model:open="cancelConfirmationOpen"
      title="Deseja sair?"
      description="Os dados desta entrada ainda não foram registrados."
      cancel-label="Continuar preenchendo"
      confirm-label="Sair sem registrar"
      confirm-variant="danger"
      @confirm="leave" />

    <Dialog
      :open="printDialogOpen"
      title="Entrada registrada"
      :description="`Lote ${savedLot?.id ?? ''} criado. A impressão não altera o estoque.`"
      size="large"
      @update:open="updatePrintDialog">
      <div v-if="labelSnapshot" class="grid gap-5 sm:grid-cols-[minmax(0,1fr)_13rem] sm:items-start">
        <PrintPreview variant="label" format="100 × 50 mm" aria-label="Pré-visualização da etiqueta do lote">
          <div class="h-full p-[5%]">
            <div class="flex items-baseline justify-between border-b-2 border-slate-900 pb-[2%]">
              <strong class="text-base sm:text-lg">Sabor Santè</strong>
              <span class="text-[8px] font-bold uppercase tracking-wider sm:text-[10px]">Congelado</span>
            </div>
            <h3 class="mt-[3%] truncate text-base font-bold uppercase leading-none sm:text-xl">{{ labelSnapshot.producibleName }}</h3>
            <p class="mt-[1%] text-xs font-semibold sm:text-sm">{{ labelSnapshot.presentation }}</p>
            <dl class="mt-[3%] grid grid-cols-2 gap-x-4 gap-y-1 text-[9px] sm:text-xs">
              <div><dt class="text-slate-500">Fabricação</dt><dd class="font-semibold">{{ formatDate(labelSnapshot.manufacturedOn) }}</dd></div>
              <div><dt class="text-slate-500">Validade</dt><dd class="font-semibold">{{ formatDate(labelSnapshot.expiresOn) }}</dd></div>
              <div class="col-span-2"><dt class="text-slate-500">Lote</dt><dd class="truncate font-mono font-semibold">{{ labelSnapshot.lotId }}</dd></div>
            </dl>
          </div>
        </PrintPreview>

        <div class="space-y-3">
          <Input
            v-model="labelCopies"
            type="number"
            inputmode="numeric"
            label="Quantidade de etiquetas"
            description="Alterar esta quantidade não modifica o estoque."
            min="1"
            step="1"
            required
            :disabled="printState === 'preparing' || printState === 'printing'"
            :error="labelCopiesError" />
          <Alert v-if="printState === 'success'" variants="success" title="Etiquetas enviadas" description="As etiquetas foram encaminhadas para impressão.">
            <template #icon><CheckIcon /></template>
          </Alert>
          <Alert v-else-if="printState === 'error'" variants="danger" title="Não foi possível imprimir" :description="printError" role="alert">
            <template #icon><TriangleAlertIcon /></template>
          </Alert>
        </div>
      </div>

      <template #footer>
        <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" :disabled="printState === 'preparing' || printState === 'printing'" @click="finish">
            {{ printState === 'success' ? 'Concluir' : 'Concluir sem imprimir' }}
          </Button>
          <Button type="button" :loading="printState === 'preparing' || printState === 'printing'" @click="printLabels">
            <template #icon><PrinterIcon /></template>
            {{ printState === 'error' ? 'Tentar novamente' : printState === 'success' ? 'Imprimir novamente' : `Imprimir ${Number(labelCopies) || 0} etiqueta${Number(labelCopies) === 1 ? '' : 's'}` }}
          </Button>
        </div>
      </template>
    </Dialog>
  </form>
</template>
