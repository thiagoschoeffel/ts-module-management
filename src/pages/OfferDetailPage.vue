<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Badge, BadgeDollarSignIcon, BoxesIcon, Button, Card, EmptyState, ListIcon, sanitizeRichText, TriangleAlertIcon } from '@thiagoschoeffel/ts-components'
import { formatCurrency, getCatalogAddon, getComponentType, getOffer } from '../mocks/catalogStore'

const props = defineProps<{ offerId?: string }>()
const loading = ref(true)
const failed = ref(false)
let timeout: ReturnType<typeof setTimeout> | undefined
const offer = computed(() => getOffer(props.offerId))
const sanitizedDescription = computed(() => sanitizeRichText(offer.value?.description ?? ''))
function load() { failed.value = false; loading.value = true; if (timeout) clearTimeout(timeout); timeout = setTimeout(() => loading.value = false, 300) }
function returnUrl() { const candidate = new URLSearchParams(window.location.search).get('retorno'); return candidate && /^\/catalogo(?:\?.*)?$/.test(candidate) ? candidate : '/catalogo' }
function edit() { if (offer.value) window.location.assign(`/catalogo/${offer.value.id}/editar?retorno=${encodeURIComponent(returnUrl())}`) }
function typeName(id: string) { const item = getComponentType(id); return item ? `${item.name}${item.active ? '' : ' (inativo)'}` : 'Tipo indisponível' }
function addon(id: string) { return getCatalogAddon(id) }
function selectionRule(min: number, max: number) { if (min === 1 && max === 1) return 'Escolha exatamente 1'; if (min === max) return `Escolha exatamente ${min}`; return `Escolha de ${min} a ${max}` }
onMounted(load)
onBeforeUnmount(() => { if (timeout) clearTimeout(timeout) })
</script>

<template>
  <div v-if="loading" class="grid animate-pulse gap-4 lg:grid-cols-2" aria-label="Carregando oferta" aria-busy="true"><div v-for="index in 4" :key="index" class="h-40 rounded-xl border border-slate-200 bg-white shadow-xs" /></div>
  <EmptyState v-else-if="failed || !offer" class="bg-white shadow-sm" :title="failed ? 'Não foi possível carregar a oferta' : 'Oferta não encontrada'" :description="failed ? 'Tente carregar os dados novamente.' : 'A oferta solicitada não existe ou não está disponível.'"><template #icon><TriangleAlertIcon v-if="failed" /><BoxesIcon v-else /></template><template #action><Button v-if="failed" @click="load">Tentar novamente</Button><a v-else href="/catalogo"><Button>Voltar para o Catálogo</Button></a></template></EmptyState>
  <div v-else class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3"><div class="flex items-center gap-2"><Badge :variant="offer.active ? 'success' : 'danger'">{{ offer.active ? 'Ativa' : 'Inativa' }}</Badge><span class="text-sm text-slate-500">{{ offer.id }}</span></div><Button @click="edit">Editar oferta</Button></div>
    <Card><template #header><h2 class="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Dados comerciais</h2></template><dl class="grid gap-4 sm:grid-cols-3"><div><dt class="text-xs font-medium uppercase tracking-wide text-slate-400">Nome</dt><dd class="mt-1 font-medium text-slate-800">{{ offer.name }}</dd></div><div><dt class="text-xs font-medium uppercase tracking-wide text-slate-400">Preço base</dt><dd class="mt-1 font-medium text-slate-800">{{ formatCurrency(offer.basePrice) }}</dd></div><div><dt class="text-xs font-medium uppercase tracking-wide text-slate-400">Escolha no cardápio</dt><dd class="mt-1 text-slate-700">{{ offer.requiresMenuChoice ? 'Obrigatória' : 'Não exigida' }}</dd></div><div class="sm:col-span-3"><dt class="text-xs font-medium uppercase tracking-wide text-slate-400">Descrição</dt><dd v-if="offer.description" class="mt-1 space-y-2 whitespace-pre-line text-slate-700 [&_a]:text-blue-600 [&_a]:underline [&_blockquote]:border-l-3 [&_blockquote]:border-slate-300 [&_blockquote]:pl-3 [&_em]:italic [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:text-base [&_h3]:font-semibold [&_ol]:list-decimal [&_ol]:pl-6 [&_s]:line-through [&_strong]:font-semibold [&_u]:underline [&_ul]:list-disc [&_ul]:pl-6" v-html="sanitizedDescription" /><dd v-else class="mt-1 text-slate-400">Sem descrição</dd></div></dl></Card>
    <div class="grid gap-4 lg:grid-cols-2">
      <Card>
        <template #header><h2 class="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Componentes incluídos</h2><p class="mt-1 text-sm text-slate-500">Papéis comerciais; a resolução para itens concretos pertence ao cardápio.</p></template>
        <template v-if="offer.components.length">
          <div class="space-y-2 md:hidden">
            <div v-for="component in offer.components" :key="component.id" class="rounded-lg border border-slate-200 p-3">
              <div class="flex items-start justify-between gap-3"><div><p class="text-xs font-medium uppercase tracking-wide text-slate-400">Tipo de componente</p><p class="mt-1 font-medium text-slate-800">{{ typeName(component.componentTypeId) }}</p></div><p class="shrink-0 font-medium text-slate-700">{{ component.quantity }}</p></div>
            </div>
          </div>
          <div class="hidden overflow-hidden rounded-lg border border-slate-200 md:block">
            <table class="w-full text-left text-sm"><thead class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th class="px-4 py-3 font-semibold">Tipo de componente</th><th class="px-4 py-3 text-right font-semibold">Quantidade</th></tr></thead><tbody class="divide-y divide-slate-200 bg-white"><tr v-for="component in offer.components" :key="component.id"><td class="px-4 py-3 font-medium text-slate-800">{{ typeName(component.componentTypeId) }}</td><td class="px-4 py-3 text-right font-medium text-slate-700">{{ component.quantity }}</td></tr></tbody></table>
          </div>
        </template>
        <EmptyState v-else :bordered="false" size="small" title="Nenhum componente incluído" description="Esta oferta ainda não possui uma estrutura base de componentes.">
          <template #icon><BoxesIcon /></template>
        </EmptyState>
      </Card>
      <Card>
        <template #header><h2 class="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Adicionais permitidos</h2></template>
        <template v-if="offer.allowedAddonIds.length">
          <div class="space-y-2 md:hidden">
            <div v-for="id in offer.allowedAddonIds" :key="id" class="rounded-lg border border-slate-200 p-3">
              <div class="flex items-start justify-between gap-3"><div><p class="text-xs font-medium uppercase tracking-wide text-slate-400">Adicional</p><p class="mt-1 font-medium text-slate-800">{{ addon(id)?.name || 'Adicional indisponível' }}<span v-if="addon(id) && !addon(id)?.active" class="ml-1 text-xs text-slate-400">(inativo)</span></p></div><p class="shrink-0 font-medium text-slate-700">{{ addon(id) ? formatCurrency(addon(id)!.price) : '—' }}</p></div>
            </div>
          </div>
          <div class="hidden overflow-hidden rounded-lg border border-slate-200 md:block">
            <table class="w-full text-left text-sm"><thead class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th class="px-4 py-3 font-semibold">Adicional</th><th class="px-4 py-3 text-right font-semibold">Preço</th></tr></thead><tbody class="divide-y divide-slate-200 bg-white"><tr v-for="id in offer.allowedAddonIds" :key="id"><td class="px-4 py-3 font-medium text-slate-800">{{ addon(id)?.name || 'Adicional indisponível' }}<span v-if="addon(id) && !addon(id)?.active" class="ml-1 text-xs text-slate-400">(inativo)</span></td><td class="px-4 py-3 text-right font-medium text-slate-700">{{ addon(id) ? formatCurrency(addon(id)!.price) : '—' }}</td></tr></tbody></table>
          </div>
        </template>
        <EmptyState v-else :bordered="false" size="small" title="Nenhum adicional permitido" description="Nenhum adicional pode ser comprado junto com esta oferta.">
          <template #icon><BadgeDollarSignIcon /></template>
        </EmptyState>
      </Card>
    </div>
    <Card>
      <template #header><h2 class="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Grupos de escolha</h2></template>
      <div v-if="offer.choiceGroups.length" class="space-y-3">
        <Card v-for="group in offer.choiceGroups" :key="group.id">
          <div class="flex flex-wrap items-center gap-2"><p class="font-semibold text-slate-800">{{ group.name }}</p><Badge variant="neutral">{{ group.options.length }} opç{{ group.options.length === 1 ? 'ão' : 'ões' }}</Badge></div>
          <p class="mt-1 text-sm text-slate-500">{{ selectionRule(group.minSelections, group.maxSelections) }}</p>
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
          <p v-else class="mt-4 text-sm text-slate-400">Nenhuma opção cadastrada.</p>
        </Card>
      </div>
      <EmptyState v-else :bordered="false" size="small" title="Nenhum grupo de escolha" description="Esta oferta não exige que o cliente escolha entre alternativas.">
        <template #icon><ListIcon /></template>
      </EmptyState>
    </Card>
  </div>
</template>
