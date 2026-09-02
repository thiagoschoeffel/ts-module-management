<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Alert, Badge, Button, Card, ChevronLeftIcon, EmptyState, FactoryIcon, InfoIcon, PlusIcon, TriangleAlertIcon } from '@thiagoschoeffel/ts-components'
import { getCurrentComposition, getProducible } from '../mocks/producibleStore'

const props = defineProps<{ producibleId?: string }>()
const loading = ref(true)
const failed = ref(false)
const selectedVersion = ref<number>()
let loadingTimeout: ReturnType<typeof setTimeout> | undefined
const item = computed(() => getProducible(props.producibleId))
const currentComposition = computed(() => getCurrentComposition(item.value))
const displayedComposition = computed(() => item.value?.compositions.find(version => version.version === selectedVersion.value) ?? currentComposition.value)
const previousCompositions = computed(() => [...(item.value?.compositions.filter(version => !version.isCurrent) ?? [])].sort((a, b) => b.version - a.version))
const showingHistorical = computed(() => Boolean(displayedComposition.value && !displayedComposition.value.isCurrent))
const ingredientCount = computed(() => displayedComposition.value?.components.filter(component => component.kind === 'ingredient').length ?? 0)
const preparationCount = computed(() => displayedComposition.value?.components.filter(component => component.kind === 'producible-item').length ?? 0)

function load() {
  failed.value = false
  loading.value = true
  if (loadingTimeout) clearTimeout(loadingTimeout)
  loadingTimeout = setTimeout(() => loading.value = false, 300)
}
function returnUrl() {
  const candidate = new URLSearchParams(window.location.search).get('retorno')
  return candidate && /^\/produziveis(?:\?.*)?$/.test(candidate) ? candidate : '/produziveis'
}
function edit() { if (item.value) window.location.assign(`/produziveis/${item.value.id}/editar?retorno=${encodeURIComponent(returnUrl())}`) }
function newComposition() { if (item.value) window.location.assign(`/produziveis/${item.value.id}/composicao/nova?retorno=${encodeURIComponent(returnUrl())}`) }
function formatDate(value: string) { return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date(value)) }

onMounted(load)
onBeforeUnmount(() => { if (loadingTimeout) clearTimeout(loadingTimeout) })
</script>

<template>
  <div v-if="loading" class="animate-pulse space-y-4" aria-label="Carregando item produzível" aria-busy="true">
    <div class="flex items-center justify-between gap-4"><div class="h-5 w-52 rounded bg-slate-200"></div><div class="h-9 w-64 rounded-lg bg-slate-200"></div></div>
    <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div class="space-y-4"><div v-for="index in 2" :key="index" class="h-52 rounded-xl border border-slate-200 bg-white shadow-xs"></div></div>
      <div class="h-72 rounded-xl border border-slate-200 bg-white shadow-xs"></div>
    </div>
  </div>
  <EmptyState
    v-else-if="failed || !item" class="bg-white shadow-sm"
    :title="failed ? 'Não foi possível carregar o item' : 'Item produzível não encontrado'"
    :description="failed ? 'Tente carregar os dados novamente.' : 'O item solicitado não existe ou não está disponível.'">
    <template #icon><TriangleAlertIcon v-if="failed" /><FactoryIcon v-else /></template>
    <template #action><Button v-if="failed" @click="load">Tentar novamente</Button><a v-else href="/produziveis"><Button>Voltar para produzíveis</Button></a></template>
  </EmptyState>

  <section v-else aria-label="Detalhe do item produzível">
    <div class="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-center gap-2"><Badge size="medium" :variant="currentComposition ? 'success' : 'neutral'">{{ currentComposition ? 'Com composição' : 'Sem composição' }}</Badge><span class="text-sm text-slate-500">Item operacional</span></div>
      <div class="flex flex-col gap-3 sm:items-end">
        <a :href="returnUrl()" class="order-2 inline-flex items-center gap-1 self-start text-sm font-medium text-slate-400 transition-colors hover:text-slate-800 sm:hidden"><ChevronLeftIcon class="size-4" aria-hidden="true" />Voltar para produzíveis</a>
        <div class="flex flex-wrap gap-2"><Button variant="secondary" @click="edit">Editar dados básicos</Button><Button @click="newComposition"><template #icon><PlusIcon /></template>{{ currentComposition ? 'Nova composição' : 'Criar composição' }}</Button></div>
      </div>
    </div>

    <div class="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div class="min-w-0 space-y-4">
        <Card v-if="displayedComposition">
      <template #header>
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div><h2 class="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{{ showingHistorical ? `Composição v${displayedComposition.version}` : 'Composição atual' }}</h2><p class="mt-1 text-sm text-slate-500">Criada em {{ formatDate(displayedComposition.createdAt) }}.</p></div>
              <Badge size="medium" :variant="showingHistorical ? 'neutral' : 'success'">{{ showingHistorical ? 'Histórica' : `Atual · v${displayedComposition.version}` }}</Badge>
            </div>
      </template>
          <Alert v-if="showingHistorical" variants="neutral" size="small" title="Versão preservada" description="Esta composição é somente leitura e não pode ser sobrescrita."><template #icon><InfoIcon /></template></Alert>

          <div class="mt-4 space-y-2 md:hidden">
            <div v-for="component in displayedComposition.components" :key="component.id" class="rounded-lg border border-slate-200 p-3">
              <div class="flex items-start justify-between gap-3"><p class="font-medium text-slate-800">{{ component.name }}</p><p class="shrink-0 font-medium text-slate-700">{{ component.quantity }} {{ component.unit }}</p></div>
              <Badge class="mt-2" size="small" :variant="component.kind === 'producible-item' ? 'info' : 'neutral'">{{ component.kind === 'producible-item' ? 'Preparação' : 'Ingrediente' }}</Badge>
            </div>
          </div>
          <div class="mt-4 hidden overflow-hidden rounded-lg border border-slate-200 md:block">
            <table class="w-full text-left text-sm">
              <thead class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th class="px-4 py-3 font-semibold">Componente</th><th class="px-4 py-3 font-semibold">Tipo</th><th class="px-4 py-3 text-right font-semibold">Quantidade</th></tr></thead>
              <tbody class="divide-y divide-slate-200 bg-white"><tr v-for="component in displayedComposition.components" :key="component.id"><td class="px-4 py-3 font-medium text-slate-800">{{ component.name }}</td><td class="px-4 py-3"><Badge :variant="component.kind === 'producible-item' ? 'info' : 'neutral'">{{ component.kind === 'producible-item' ? 'Preparação' : 'Ingrediente' }}</Badge></td><td class="px-4 py-3 text-right font-medium text-slate-700">{{ component.quantity }} {{ component.unit }}</td></tr></tbody>
            </table>
          </div>
          <Button v-if="showingHistorical" class="mt-4" variant="secondary" @click="selectedVersion = currentComposition?.version">Voltar para a versão atual</Button>
        </Card>

        <Card v-else>
          <EmptyState :bordered="false" title="Este item ainda não possui composição" description="Crie a primeira composição para registrar como o item é produzido."><template #icon><FactoryIcon /></template><template #action><Button size="small" variant="secondary" @click="newComposition">Criar primeira composição</Button></template></EmptyState>
        </Card>

        <Card v-if="previousCompositions.length">
          <template #header><h2 class="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Histórico de versões</h2><p class="mt-1 text-sm text-slate-500">Consulte composições anteriores sem alterar o histórico.</p></template>
          <div class="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200">
            <button v-for="version in previousCompositions" :key="version.version" type="button" :class="['flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500/40', displayedComposition?.version === version.version ? 'bg-slate-50' : 'bg-white']" :aria-pressed="displayedComposition?.version === version.version" @click="selectedVersion = version.version"><span><span class="font-medium text-slate-800">Versão {{ version.version }}</span><span class="ml-2 text-sm text-slate-500">{{ formatDate(version.createdAt) }}</span></span><Badge variant="neutral">{{ version.components.length }} componente{{ version.components.length === 1 ? '' : 's' }}</Badge></button>
          </div>
        </Card>
      </div>

      <aside class="min-w-0 space-y-4 lg:sticky lg:top-20">
        <Card><template #header><h2 class="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Resumo do item</h2><p class="mt-1 text-sm text-slate-500">A identidade permanece estável entre as versões.</p></template>
          <dl class="space-y-3 text-sm">
            <div class="flex items-center justify-between gap-3"><dt class="text-slate-500">Código</dt><dd class="flex min-h-6 items-center justify-end font-medium text-slate-800">{{ item.id }}</dd></div>
            <div class="flex items-center justify-between gap-3"><dt class="text-slate-500">Versão atual</dt><dd class="flex min-h-6 items-center justify-end"><Badge size="medium" :variant="currentComposition ? 'success' : 'neutral'">{{ currentComposition ? `v${currentComposition.version}` : 'Nenhuma' }}</Badge></dd></div>
            <div class="flex items-center justify-between gap-3"><dt class="text-slate-500">Versões</dt><dd class="flex min-h-6 items-center justify-end font-medium text-slate-800">{{ item.compositions.length }}</dd></div>
            <div class="flex items-center justify-between gap-3"><dt class="text-slate-500">Ingredientes exibidos</dt><dd class="flex min-h-6 items-center justify-end font-medium text-slate-800">{{ ingredientCount }}</dd></div>
            <div class="flex items-center justify-between gap-3"><dt class="text-slate-500">Preparações exibidas</dt><dd class="flex min-h-6 items-center justify-end font-medium text-slate-800">{{ preparationCount }}</dd></div>
          </dl>
        </Card>
        <Alert variants="info" size="small" title="Composição versionada" description="Novas versões preservam o que foi usado nos pedidos anteriores."><template #icon><InfoIcon /></template></Alert>
      </aside>
    </div>
  </section>
</template>
