<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Alert, Badge, Button, EmptyState, FactoryIcon, PlusIcon, SectionCard, TriangleAlertIcon } from '@thiagoschoeffel/ts-components'
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
  <div v-if="loading" class="grid animate-pulse gap-4 lg:grid-cols-2" aria-label="Carregando item produzível" aria-busy="true">
    <div v-for="index in 4" :key="index" class="h-40 rounded-xl border border-slate-200 bg-white shadow-xs"><div class="m-6 h-4 w-32 rounded bg-slate-200"></div><div class="mx-6 mt-4 h-3 w-2/3 rounded bg-slate-100"></div></div>
  </div>
  <EmptyState
    v-else-if="failed || !item" class="bg-white shadow-sm"
    :title="failed ? 'Não foi possível carregar o item' : 'Item produzível não encontrado'"
    :description="failed ? 'Tente carregar os dados novamente.' : 'O item solicitado não existe ou não está disponível.'">
    <template #icon><TriangleAlertIcon v-if="failed" /><FactoryIcon v-else /></template>
    <template #action><Button v-if="failed" @click="load">Tentar novamente</Button><a v-else href="/produziveis"><Button>Voltar para produzíveis</Button></a></template>
  </EmptyState>

  <div v-else class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-2"><Badge variant="neutral">{{ item.id }}</Badge><span class="text-sm text-slate-500">Item operacional</span></div>
      <div class="flex flex-wrap gap-2"><Button variant="secondary" @click="edit">Editar dados básicos</Button><Button @click="newComposition"><template #icon><PlusIcon /></template>{{ currentComposition ? 'Nova versão de composição' : 'Criar composição' }}</Button></div>
    </div>

    <SectionCard title="Resumo do item" description="A identidade permanece estável mesmo quando a composição evolui.">
      <dl class="grid gap-4 sm:grid-cols-3">
        <div><dt class="text-xs font-medium uppercase tracking-wide text-slate-400">Nome</dt><dd class="mt-1 font-medium text-slate-800">{{ item.name }}</dd></div>
        <div><dt class="text-xs font-medium uppercase tracking-wide text-slate-400">Versão atual</dt><dd class="mt-1 font-medium text-slate-800">{{ currentComposition ? `v${currentComposition.version}` : 'Sem composição' }}</dd></div>
        <div><dt class="text-xs font-medium uppercase tracking-wide text-slate-400">Versões preservadas</dt><dd class="mt-1 font-medium text-slate-800">{{ item.compositions.length }}</dd></div>
      </dl>
    </SectionCard>

    <SectionCard v-if="displayedComposition" :title="showingHistorical ? `Composição v${displayedComposition.version}` : 'Composição atual'" :description="showingHistorical ? 'Versão histórica preservada somente para consulta.' : `Versão ${displayedComposition.version}, criada em ${formatDate(displayedComposition.createdAt)}.`">
      <Alert v-if="showingHistorical" variants="neutral" size="small" title="Versão histórica" description="Esta composição é somente leitura e não pode ser sobrescrita."></Alert>
      <div v-else class="mb-4 flex items-center gap-2"><Badge variant="success">Atual</Badge><span class="text-sm text-slate-500">v{{ displayedComposition.version }}</span></div>
      <div class="mt-4 overflow-hidden rounded-lg border border-slate-200">
        <table class="w-full text-left text-sm">
          <thead class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th class="px-4 py-3 font-semibold">Componente</th><th class="px-4 py-3 font-semibold">Tipo</th><th class="px-4 py-3 text-right font-semibold">Quantidade</th></tr></thead>
          <tbody class="divide-y divide-slate-200 bg-white">
            <tr v-for="component in displayedComposition.components" :key="component.id">
              <td class="px-4 py-3 font-medium text-slate-800">{{ component.name }}</td>
              <td class="px-4 py-3"><Badge :variant="component.kind === 'producible-item' ? 'info' : 'neutral'">{{ component.kind === 'producible-item' ? 'Preparação' : 'Ingrediente' }}</Badge></td>
              <td class="px-4 py-3 text-right font-medium text-slate-700">{{ component.quantity }} {{ component.unit }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <Button v-if="showingHistorical" class="mt-4" variant="secondary" @click="selectedVersion = currentComposition?.version">Voltar para a versão atual</Button>
    </SectionCard>

    <EmptyState v-else class="bg-white shadow-sm" title="Este item ainda não possui composição" description="Crie a primeira composição para registrar como o item é produzido.">
      <template #icon><FactoryIcon /></template>
      <template #action><Button @click="newComposition"><template #icon><PlusIcon /></template>Criar primeira composição</Button></template>
    </EmptyState>

    <SectionCard v-if="previousCompositions.length" title="Histórico de versões" description="Versões anteriores permanecem disponíveis e nunca são reescritas.">
      <div class="divide-y divide-slate-200 rounded-lg border border-slate-200">
        <button
          v-for="version in previousCompositions" :key="version.version" type="button"
          class="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors first:rounded-t-lg last:rounded-b-lg hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500/40"
          :aria-pressed="displayedComposition?.version === version.version" @click="selectedVersion = version.version">
          <span><span class="font-medium text-slate-800">Versão {{ version.version }}</span><span class="ml-2 text-sm text-slate-500">{{ formatDate(version.createdAt) }}</span></span>
          <span class="text-sm font-medium text-slate-500">{{ version.components.length }} componente{{ version.components.length === 1 ? '' : 's' }}</span>
        </button>
      </div>
    </SectionCard>
  </div>
</template>
