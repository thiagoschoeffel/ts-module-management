<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Badge, Button, EmptyState, BoxesIcon, SectionCard, TriangleAlertIcon } from '@thiagoschoeffel/ts-components'
import { formatCurrency, getCatalogAddon, getComponentType, getOffer } from '../mocks/catalogStore'

const props = defineProps<{ offerId?: string }>()
const loading = ref(true)
const failed = ref(false)
let timeout: ReturnType<typeof setTimeout> | undefined
const offer = computed(() => getOffer(props.offerId))
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
    <div class="flex flex-wrap items-center justify-between gap-3"><div class="flex items-center gap-2"><Badge :variant="offer.active ? 'success' : 'neutral'">{{ offer.active ? 'Ativa' : 'Inativa' }}</Badge><span class="text-sm text-slate-500">{{ offer.id }}</span></div><Button @click="edit">Editar oferta</Button></div>
    <SectionCard title="Dados comerciais"><dl class="grid gap-4 sm:grid-cols-3"><div><dt class="text-xs font-medium uppercase tracking-wide text-slate-400">Nome</dt><dd class="mt-1 font-medium text-slate-800">{{ offer.name }}</dd></div><div><dt class="text-xs font-medium uppercase tracking-wide text-slate-400">Preço base</dt><dd class="mt-1 font-medium text-slate-800">{{ formatCurrency(offer.basePrice) }}</dd></div><div><dt class="text-xs font-medium uppercase tracking-wide text-slate-400">Escolha no cardápio</dt><dd class="mt-1 text-slate-700">{{ offer.requiresMenuChoice ? 'Obrigatória' : 'Não exigida' }}</dd></div><div class="sm:col-span-3"><dt class="text-xs font-medium uppercase tracking-wide text-slate-400">Descrição</dt><dd class="mt-1 text-slate-700">{{ offer.description || 'Sem descrição' }}</dd></div></dl></SectionCard>
    <div class="grid gap-4 lg:grid-cols-2">
      <SectionCard title="Componentes incluídos" description="Papéis comerciais; a resolução para itens concretos pertence ao cardápio."><ul v-if="offer.components.length" class="divide-y divide-slate-200 rounded-lg border border-slate-200"><li v-for="component in offer.components" :key="component.id" class="flex items-center justify-between gap-3 px-4 py-3"><span class="font-medium text-slate-800">{{ typeName(component.componentTypeId) }}</span><Badge variant="neutral">{{ component.quantity }} x</Badge></li></ul><p v-else class="text-sm text-slate-400">Nenhum componente incluído.</p></SectionCard>
      <SectionCard title="Adicionais permitidos"><ul v-if="offer.allowedAddonIds.length" class="divide-y divide-slate-200 rounded-lg border border-slate-200"><li v-for="id in offer.allowedAddonIds" :key="id" class="flex items-center justify-between gap-3 px-4 py-3"><span class="font-medium text-slate-800">{{ addon(id)?.name || 'Adicional indisponível' }}<span v-if="addon(id) && !addon(id)?.active" class="ml-1 text-xs text-slate-400">(inativo)</span></span><span class="text-sm font-medium text-slate-600">{{ addon(id) ? formatCurrency(addon(id)!.price) : '—' }}</span></li></ul><p v-else class="text-sm text-slate-400">Nenhum adicional permitido.</p></SectionCard>
    </div>
    <SectionCard title="Grupos de escolha"><div v-if="offer.choiceGroups.length" class="grid gap-3 lg:grid-cols-2"><div v-for="group in offer.choiceGroups" :key="group.id" class="rounded-lg border border-slate-200 p-4"><p class="font-semibold text-slate-800">{{ group.name }}</p><p class="mt-1 text-sm text-slate-500">{{ selectionRule(group.minSelections, group.maxSelections) }}</p><ul class="mt-3 divide-y divide-slate-100"><li v-for="option in group.options" :key="option.id" class="flex items-center justify-between gap-3 py-2 text-sm"><span class="text-slate-700">{{ typeName(option.componentTypeId) }}</span><span class="font-medium" :class="option.surcharge ? 'text-blue-600' : 'text-slate-400'">{{ option.surcharge ? `+ ${formatCurrency(option.surcharge)}` : 'Sem acréscimo' }}</span></li></ul></div></div><p v-else class="text-sm text-slate-400">Esta oferta não possui grupos de escolha.</p></SectionCard>
  </div>
</template>
