<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  Alert, AlertDialog, Badge, Button, Card, CheckIcon, ChevronLeftIcon, Dialog, Drawer,
  EmptyState, InfoIcon, Input, PrinterIcon, PrintPreview, SnowflakeIcon, Textarea, TriangleAlertIcon,
  richTextToPlainText, sanitizeRichText
} from '@thiagoschoeffel/ts-components'
import {
  getFrozenLotDetail,
  recordFrozenLabelPrint,
  recordFrozenStockAdjustment
} from '../mocks/frozenStock'
import { printFrozenProductLabels, type LabelPrintState } from '../services/frozenLabelPrinting'
import type {
  FrozenLabelPrintRecord,
  FrozenLotDetail,
  FrozenLotStatus,
  FrozenMovementType
} from '../types/frozenStock'
import { navigate } from '../utils/navigation'

type StockAction = 'adjust' | 'discard'

const props = defineProps<{ frozenLotId?: string }>()
const params = new URLSearchParams(window.location.search)
const detail = ref<FrozenLotDetail>()
const loading = ref(true)
const failed = ref(false)
const successMessage = ref('')
const actionDrawerOpen = ref(false)
const action = ref<StockAction>('adjust')
const actionQuantity = ref<number>(0)
const actionReason = ref('')
const showActionValidation = ref(false)
const savingAction = ref(false)
const actionError = ref('')
const discardConfirmationOpen = ref(false)
const printDialogOpen = ref(false)
const labelCopies = ref<number>(1)
const printState = ref<LabelPrintState>('idle')
const printError = ref('')
let loadingTimeout: ReturnType<typeof setTimeout> | undefined
let actionTimeout: ReturnType<typeof setTimeout> | undefined
let simulatedPrintFailureShown = false

const lot = computed(() => detail.value?.lot)
const label = computed(() => lot.value?.labelSnapshot)
const entryMovement = computed(() => detail.value?.movements.find(item => item.type === 'entrada-producao'))
const actionTitle = computed(() => action.value === 'adjust' ? 'Ajustar estoque' : 'Registrar descarte')
const actionDescription = computed(() => action.value === 'adjust'
  ? 'Registre a diferença encontrada na conferência. Use valor positivo para adicionar e negativo para retirar.'
  : 'Retire unidades físicas sem apagar o histórico do lote.')
const quantityError = computed(() => {
  if (!showActionValidation.value) return undefined
  const quantity = Number(actionQuantity.value)
  if (!Number.isInteger(quantity)) return 'Informe uma quantidade inteira.'
  if (action.value === 'adjust' && quantity === 0) return 'Informe uma quantidade diferente de zero.'
  if (action.value === 'discard' && quantity < 1) return 'Informe pelo menos uma unidade.'
  if (action.value === 'discard' && quantity > (lot.value?.physicalQuantity ?? 0)) return 'A quantidade supera o saldo físico do lote.'
  return undefined
})
const reasonError = computed(() => showActionValidation.value && richTextToPlainText(actionReason.value).trim().length < 3
  ? 'Descreva o motivo da movimentação.'
  : undefined)
const labelCopiesError = computed(() => !Number.isInteger(Number(labelCopies.value)) || Number(labelCopies.value) < 1
  ? 'Informe pelo menos uma etiqueta.'
  : undefined)

function load() {
  failed.value = false
  loading.value = true
  if (loadingTimeout) clearTimeout(loadingTimeout)
  loadingTimeout = setTimeout(() => {
    failed.value = params.get('mock') === 'erro'
    detail.value = failed.value ? undefined : getFrozenLotDetail(props.frozenLotId)
    loading.value = false
  }, 300)
}
function refresh() { detail.value = getFrozenLotDetail(props.frozenLotId) }
function returnUrl() {
  const candidate = params.get('retorno')
  return candidate && /^\/congelados(?:\?.*)?$/.test(candidate) ? candidate : '/congelados'
}
function formatDate(value?: string) {
  if (!value) return '—'
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}
function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo'
  }).format(new Date(value))
}
function statusLabel(status?: FrozenLotStatus) {
  return status ? ({
    disponivel: 'Disponível',
    'proximo-vencimento': 'Próximo do vencimento',
    vencido: 'Vencido',
    esgotado: 'Sem estoque',
    'configuracao-inativa': 'Configuração inativa'
  } as const)[status] : '—'
}
function statusVariant(status?: FrozenLotStatus): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'disponivel') return 'success'
  if (status === 'proximo-vencimento') return 'warning'
  if (status === 'vencido') return 'danger'
  return 'neutral'
}
function movementLabel(type: FrozenMovementType) {
  return ({
    'entrada-producao': 'Entrada de produção',
    'saida-pedido': 'Saída por Pedido',
    'estorno-pedido': 'Estorno de Pedido',
    'ajuste-manual': 'Ajuste manual',
    'descarte-vencimento': 'Descarte'
  } as const)[type]
}
function movementVariant(type: FrozenMovementType): 'success' | 'info' | 'warning' | 'danger' | 'neutral' {
  if (type === 'entrada-producao') return 'success'
  if (type === 'descarte-vencimento') return 'danger'
  if (type === 'ajuste-manual') return 'warning'
  if (type === 'estorno-pedido') return 'info'
  return 'neutral'
}
function signedQuantity(quantity: number) { return quantity > 0 ? `+${quantity}` : String(quantity) }
function printStatus(record: FrozenLabelPrintRecord) { return record.status === 'success' ? 'Concluída' : 'Falhou' }
function openAction(nextAction: StockAction) {
  action.value = nextAction
  actionQuantity.value = nextAction === 'adjust' ? 0 : 1
  actionReason.value = ''
  showActionValidation.value = false
  actionError.value = ''
  actionDrawerOpen.value = true
}
function requestSaveAction() {
  showActionValidation.value = true
  actionError.value = ''
  if (quantityError.value || reasonError.value) return
  if (action.value === 'discard') discardConfirmationOpen.value = true
  else saveAction()
}
function saveAction() {
  if (!lot.value) return
  discardConfirmationOpen.value = false
  savingAction.value = true
  if (actionTimeout) clearTimeout(actionTimeout)
  actionTimeout = setTimeout(() => {
    try {
      recordFrozenStockAdjustment({
        lotId: lot.value!.id,
        quantity: Number(actionQuantity.value),
        reason: actionReason.value,
        responsibleName: 'Usuário atual',
        type: action.value === 'adjust' ? 'ajuste-manual' : 'descarte-vencimento'
      })
      refresh()
      successMessage.value = action.value === 'adjust'
        ? 'Ajuste registrado. O saldo foi atualizado pela nova movimentação.'
        : 'Descarte registrado. As unidades foram retiradas do saldo físico.'
      actionDrawerOpen.value = false
    }
    catch (error) {
      actionError.value = error instanceof Error ? error.message : 'Não foi possível registrar a movimentação.'
    }
    finally { savingAction.value = false }
  }, 400)
}
function openPrintDialog() {
  labelCopies.value = 1
  printState.value = 'idle'
  printError.value = ''
  printDialogOpen.value = true
}
async function printLabels() {
  if (!label.value || labelCopiesError.value) return
  const copies = Number(labelCopies.value)
  printState.value = 'preparing'
  printError.value = ''
  try {
    if (params.get('mock') === 'impressao-erro' && !simulatedPrintFailureShown) {
      simulatedPrintFailureShown = true
      throw new Error('Não foi possível acessar o serviço de impressão.')
    }
    printState.value = 'printing'
    await printFrozenProductLabels({ label: label.value, copies })
    recordFrozenLabelPrint({ lotId: label.value.lotId, copies, responsibleName: 'Usuário atual', status: 'success' })
    printState.value = 'success'
    refresh()
  }
  catch (error) {
    printState.value = 'error'
    printError.value = error instanceof Error ? error.message : 'Não foi possível imprimir as etiquetas.'
    recordFrozenLabelPrint({
      lotId: label.value.lotId, copies, responsibleName: 'Usuário atual', status: 'error', errorMessage: printError.value
    })
    refresh()
  }
}

onMounted(load)
onBeforeUnmount(() => {
  if (loadingTimeout) clearTimeout(loadingTimeout)
  if (actionTimeout) clearTimeout(actionTimeout)
})
</script>

<template>
  <div v-if="loading" class="animate-pulse space-y-4" aria-label="Carregando lote" aria-busy="true">
    <div class="flex items-center justify-between gap-4"><div class="h-6 w-48 rounded bg-slate-200" /><div class="h-9 w-72 rounded-lg bg-slate-200" /></div>
    <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]"><div class="h-80 rounded-lg border border-slate-200 bg-white" /><div class="h-64 rounded-lg border border-slate-200 bg-white" /></div>
  </div>

  <EmptyState
    v-else-if="failed || !detail"
    class="bg-white shadow-sm"
    size="large"
    :title="failed ? 'Não foi possível carregar o lote' : 'Lote não encontrado'"
    :description="failed ? 'Tente carregar os dados novamente.' : 'O lote solicitado não existe ou não está disponível.'"
    :role="failed ? 'alert' : 'status'">
    <template #icon><TriangleAlertIcon v-if="failed" /><SnowflakeIcon v-else /></template>
    <template #action><Button v-if="failed" @click="load">Tentar novamente</Button><Button v-else @click="navigate(returnUrl())">Voltar para congelados</Button></template>
  </EmptyState>

  <section v-else aria-label="Detalhe do lote congelado">
    <Alert v-if="successMessage" class="mb-4" variants="success" :description="successMessage"><template #icon><CheckIcon /></template></Alert>

    <div class="ts-responsive-row mb-5 gap-4">
      <div class="flex flex-wrap items-center gap-2">
        <Badge size="medium" :variant="statusVariant(detail.status)">{{ statusLabel(detail.status) }}</Badge>
        <span class="font-mono text-sm text-slate-500">{{ detail.lot.id }}</span>
      </div>
      <div class="flex flex-col gap-3 sm:items-end">
        <a :href="returnUrl()" class="order-2 inline-flex items-center gap-1 self-start text-sm font-medium text-slate-400 transition-colors hover:text-slate-800 sm:hidden"><ChevronLeftIcon class="size-4" aria-hidden="true" />Voltar para congelados</a>
        <div class="flex flex-wrap gap-2">
          <Button variant="secondary" @click="openPrintDialog"><template #icon><PrinterIcon /></template>Reimprimir etiquetas</Button>
          <Button variant="secondary" @click="openAction('adjust')">Ajustar estoque</Button>
          <Button variant="danger" :disabled="detail.lot.physicalQuantity === 0" @click="openAction('discard')">Registrar descarte</Button>
        </div>
      </div>
    </div>

    <div class="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div class="min-w-0 space-y-4">
        <Card>
          <template #header><h2 class="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Movimentações</h2><p class="mt-1 text-sm text-slate-500">O saldo atual é explicado pelo histórico; não há edição direta.</p></template>
          <div class="divide-y divide-slate-200">
            <div v-for="movement in detail.movements" :key="movement.id" class="grid gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_auto]">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2"><Badge :variant="movementVariant(movement.type)">{{ movementLabel(movement.type) }}</Badge><span class="text-sm text-slate-500">{{ formatDateTime(movement.occurredAt) }}</span></div>
                <p class="mt-2 text-sm font-medium text-slate-800">{{ movement.responsibleName }}</p>
                <div v-if="movement.reason" class="mt-1 space-y-2 text-sm text-slate-500 [&_a]:text-blue-600 [&_a]:underline [&_blockquote]:border-l-3 [&_blockquote]:border-slate-300 [&_blockquote]:pl-3 [&_em]:italic [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:font-semibold [&_ol]:list-decimal [&_ol]:pl-5 [&_s]:line-through [&_strong]:font-semibold [&_u]:underline [&_ul]:list-disc [&_ul]:pl-5" v-html="sanitizeRichText(movement.reason)" />
              </div>
              <div class="text-left sm:text-right">
                <p :class="['text-lg font-semibold', movement.quantity < 0 ? 'text-red-600' : 'text-emerald-600']">{{ signedQuantity(movement.quantity) }}</p>
                <p class="mt-1 text-xs text-slate-500">Físico {{ movement.physicalQuantityAfter }} · disponível {{ movement.availableQuantityAfter }}</p>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <template #header><h2 class="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Histórico de impressão</h2><p class="mt-1 text-sm text-slate-500">Reimpressões usam o snapshot preservado deste lote.</p></template>
          <EmptyState v-if="!detail.printHistory.length" :bordered="false" title="Nenhuma impressão registrada" description="A entrada e o estoque permanecem válidos mesmo sem impressão."><template #icon><PrinterIcon /></template><template #action><Button size="small" variant="secondary" @click="openPrintDialog">Imprimir etiquetas</Button></template></EmptyState>
          <div v-else class="divide-y divide-slate-200">
            <div v-for="record in detail.printHistory" :key="record.id" class="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div><div class="flex items-center gap-2"><Badge :variant="record.status === 'success' ? 'success' : 'danger'">{{ printStatus(record) }}</Badge><span class="text-sm font-medium text-slate-700">{{ record.copies }} etiqueta{{ record.copies === 1 ? '' : 's' }}</span></div><p class="mt-1 text-xs text-slate-500">{{ record.responsibleName }} · {{ formatDateTime(record.occurredAt) }}</p><p v-if="record.errorMessage" class="mt-1 text-sm text-red-600">{{ record.errorMessage }}</p></div>
            </div>
          </div>
        </Card>
      </div>

      <aside class="min-w-0 space-y-4 lg:sticky lg:top-6">
        <Card>
          <template #header><h2 class="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Resumo do lote</h2></template>
          <dl class="space-y-3 text-sm">
            <div class="flex justify-between gap-3"><dt class="text-slate-500">Produto</dt><dd class="text-right font-medium text-slate-800">{{ detail.producibleName }}</dd></div>
            <div class="flex justify-between gap-3"><dt class="text-slate-500">Apresentação</dt><dd class="font-medium text-slate-800">{{ detail.lot.labelSnapshot.presentation }}</dd></div>
            <div class="flex justify-between gap-3"><dt class="text-slate-500">Fabricação</dt><dd class="font-medium text-slate-800">{{ formatDate(detail.lot.manufacturedOn) }}</dd></div>
            <div class="flex justify-between gap-3"><dt class="text-slate-500">Validade</dt><dd class="font-medium text-slate-800">{{ formatDate(detail.lot.expiresOn) }}</dd></div>
            <div class="flex justify-between gap-3"><dt class="text-slate-500">Produzida</dt><dd class="font-medium text-slate-800">{{ detail.lot.producedQuantity }}</dd></div>
            <div class="flex justify-between gap-3"><dt class="text-slate-500">Física</dt><dd class="font-medium text-slate-800">{{ detail.lot.physicalQuantity }}</dd></div>
            <div class="flex justify-between gap-3"><dt class="text-slate-500">Disponível</dt><dd class="font-semibold text-slate-800">{{ detail.lot.availableQuantity }}</dd></div>
            <div class="flex items-center justify-between gap-3"><dt class="text-slate-500">Configuração atual</dt><dd><Badge :variant="detail.configuration.active ? 'success' : 'neutral'">{{ detail.configuration.active ? 'Ativa' : 'Inativa' }}</Badge></dd></div>
            <div class="flex justify-between gap-3"><dt class="text-slate-500">Responsável</dt><dd class="text-right font-medium text-slate-800">{{ entryMovement?.responsibleName ?? '—' }}</dd></div>
          </dl>
        </Card>
        <Alert v-if="detail.status === 'vencido'" variants="danger" size="small" title="Fora do estoque vendável" description="O lote vencido permanece no saldo físico até sua conferência e descarte."><template #icon><TriangleAlertIcon /></template></Alert>
        <Alert v-else variants="info" size="small" title="Snapshot preservado" description="Mudanças futuras no produto ou na apresentação não alteram esta etiqueta."><template #icon><InfoIcon /></template></Alert>
      </aside>
    </div>

    <Drawer v-model:open="actionDrawerOpen" size="medium" :title="actionTitle" :description="actionDescription">
      <div class="space-y-4">
        <Alert v-if="actionError" variants="danger" title="Movimentação não registrada" :description="actionError" role="alert"><template #icon><TriangleAlertIcon /></template></Alert>
        <Card class="[&>div]:p-4"><dl class="grid grid-cols-2 gap-3 text-sm"><div><dt class="text-slate-500">Saldo físico</dt><dd class="mt-1 font-semibold text-slate-800">{{ detail.lot.physicalQuantity }}</dd></div><div><dt class="text-slate-500">Disponível</dt><dd class="mt-1 font-semibold text-slate-800">{{ detail.lot.availableQuantity }}</dd></div></dl></Card>
        <Input v-model="actionQuantity" type="number" inputmode="numeric" :label="action === 'adjust' ? 'Quantidade do ajuste' : 'Quantidade para descarte'" :description="action === 'adjust' ? 'Use + para adicionar e − para retirar unidades.' : 'As unidades serão retiradas do saldo físico e, quando aplicável, do disponível.'" :min="action === 'discard' ? 1 : undefined" step="1" required :error="quantityError" />
        <Textarea v-model="actionReason" label="Motivo" description="O motivo ficará registrado no histórico do lote com a formatação aplicada." rich-text :rows="4" required :error="reasonError" />
        <Input model-value="Usuário atual" label="Responsável" readonly />
      </div>
      <template #footer><div class="flex items-center justify-between gap-2"><Button variant="secondary" :disabled="savingAction" @click="actionDrawerOpen = false">Cancelar</Button><Button :variant="action === 'discard' ? 'danger' : 'primary'" :loading="savingAction" @click="requestSaveAction">{{ actionTitle }}</Button></div></template>
    </Drawer>

    <AlertDialog v-model:open="discardConfirmationOpen" title="Confirmar descarte?" :description="`${Number(actionQuantity) || 0} unidade(s) serão retiradas do lote ${detail.lot.id}. O histórico será preservado.`" cancel-label="Voltar" confirm-label="Registrar descarte" confirm-variant="danger" @confirm="saveAction" />

    <Dialog v-model:open="printDialogOpen" title="Reimprimir etiquetas" description="A reimpressão usa o conteúdo histórico do lote e não altera seu estoque." size="large">
      <div v-if="label" class="grid gap-5 sm:grid-cols-[minmax(0,1fr)_13rem] sm:items-start">
        <PrintPreview variant="label" format="100 × 50 mm" aria-label="Pré-visualização da etiqueta do lote">
          <div class="h-full p-[5%]"><div class="flex items-baseline justify-between border-b-2 border-slate-900 pb-[2%]"><strong class="text-base sm:text-lg">Sabor Santè</strong><span class="text-[8px] font-bold uppercase tracking-wider sm:text-[10px]">Congelado</span></div><h3 class="mt-[3%] truncate text-base font-bold uppercase leading-none sm:text-xl">{{ label.producibleName }}</h3><p class="mt-[1%] text-xs font-semibold sm:text-sm">{{ label.presentation }}</p><dl class="mt-[3%] grid grid-cols-2 gap-x-4 gap-y-1 text-[9px] sm:text-xs"><div><dt class="text-slate-500">Fabricação</dt><dd class="font-semibold">{{ formatDate(label.manufacturedOn) }}</dd></div><div><dt class="text-slate-500">Validade</dt><dd class="font-semibold">{{ formatDate(label.expiresOn) }}</dd></div><div class="col-span-2"><dt class="text-slate-500">Lote</dt><dd class="truncate font-mono font-semibold">{{ label.lotId }}</dd></div></dl></div>
        </PrintPreview>
        <div class="space-y-3"><Input v-model="labelCopies" type="number" inputmode="numeric" label="Quantidade de etiquetas" description="A reimpressão não cria movimentação." min="1" step="1" required :disabled="printState === 'preparing' || printState === 'printing'" :error="labelCopiesError" /><Alert v-if="printState === 'success'" variants="success" title="Etiquetas enviadas" description="A tentativa de impressão foi registrada no histórico."><template #icon><CheckIcon /></template></Alert><Alert v-else-if="printState === 'error'" variants="danger" title="Não foi possível imprimir" :description="printError" role="alert"><template #icon><TriangleAlertIcon /></template></Alert></div>
      </div>
      <template #footer><div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="secondary" :disabled="printState === 'preparing' || printState === 'printing'" @click="printDialogOpen = false">Fechar</Button><Button :loading="printState === 'preparing' || printState === 'printing'" @click="printLabels"><template #icon><PrinterIcon /></template>{{ printState === 'error' ? 'Tentar novamente' : printState === 'success' ? 'Imprimir novamente' : 'Imprimir etiquetas' }}</Button></div></template>
    </Dialog>
  </section>
</template>
