<script setup lang="ts">
import { computed, ref } from 'vue'
import { Badge, Button, Card, Checkbox, DataTable, Drawer, EmptyState, Input, PlusIcon, Select, type DataTableColumn, type DataTableRow, type SelectOption } from '@thiagoschoeffel/ts-components'
import { formatCurrency, getCatalogAddons, nextCatalogAddonId, saveCatalogAddon } from '../../mocks/catalogStore'
import { getProducibles } from '../../mocks/producibleStore'
import type { CatalogAddon } from '../../types/catalog'
import type { MeasurementUnit } from '../../types/producible'

const version = ref(0)
const drawerOpen = ref(false)
const editingId = ref<string>()
const name = ref('')
const price = ref<number>(0)
const producibleItemId = ref('none')
const operationalQuantity = ref<number>()
const operationalUnit = ref<MeasurementUnit>('g')
const active = ref(true)
const showValidation = ref(false)
const items = computed(() => { version.value; return getCatalogAddons() })
const producibles = computed(() => getProducibles())
const producibleOptions = computed<SelectOption[]>(() => [{ value: 'none', label: 'Sem item associado' }, ...producibles.value.map(item => ({ value: item.id, label: item.name }))])
const unitOptions: SelectOption[] = ['g', 'kg', 'ml', 'l', 'un'].map(value => ({ value, label: value }))
const rows = computed<DataTableRow[]>(() => items.value.map(item => ({ ...item })))
const columns: DataTableColumn[] = [
  { key: 'name', label: 'Adicional', size: 'medium' }, { key: 'price', label: 'Preço', size: 'small' },
  { key: 'producibleItemId', label: 'Produzível', size: 'large' }, { key: 'operationalQuantity', label: 'Quantidade operacional', size: 'medium' },
  { key: 'active', label: 'Status', size: 'small', align: 'center' }
]
const nameError = computed(() => showValidation.value && !name.value.trim() ? 'Informe o nome do adicional.' : undefined)
const priceError = computed(() => showValidation.value && !(Number(price.value) >= 0) ? 'Use um preço igual ou maior que zero.' : undefined)
const quantityError = computed(() => showValidation.value && operationalQuantity.value != null && !(Number(operationalQuantity.value) > 0) ? 'Use uma quantidade maior que zero.' : undefined)

function asAddon(row: DataTableRow) { return row as unknown as CatalogAddon }
function producibleName(id?: string) { return producibles.value.find(item => item.id === id)?.name ?? (id ? 'Produzível indisponível' : 'Não associado') }
function openForm(item?: CatalogAddon) {
  editingId.value = item?.id; name.value = item?.name ?? ''; price.value = item?.price ?? 0
  producibleItemId.value = item?.producibleItemId ?? 'none'; operationalQuantity.value = item?.operationalQuantity
  operationalUnit.value = item?.operationalUnit ?? 'g'; active.value = item?.active ?? true
  showValidation.value = false; drawerOpen.value = true
}
function save() {
  showValidation.value = true
  if (nameError.value || priceError.value || quantityError.value) return
  saveCatalogAddon({
    id: editingId.value ?? nextCatalogAddonId(), name: name.value.trim(), price: Number(price.value),
    producibleItemId: producibleItemId.value === 'none' ? undefined : producibleItemId.value,
    operationalQuantity: operationalQuantity.value == null ? undefined : Number(operationalQuantity.value),
    operationalUnit: operationalQuantity.value == null ? undefined : operationalUnit.value, active: active.value
  })
  version.value++; drawerOpen.value = false
}
</script>

<template>
  <section class="space-y-4" aria-label="Adicionais do catálogo">
    <div class="flex flex-wrap items-center justify-between gap-3"><p class="text-sm text-slate-500">Itens comprados além da configuração base das ofertas.</p><Button size="small" @click="openForm()"><template #icon><PlusIcon /></template>Novo adicional</Button></div>
    <div class="space-y-3 md:hidden">
      <EmptyState v-if="!items.length" class="bg-white shadow-sm" title="Nenhum adicional cadastrado" description="Cadastre o primeiro adicional do catálogo." />
      <Card v-for="item in items" v-else :key="item.id"><div class="flex items-start justify-between gap-3"><div><p class="font-semibold text-slate-800">{{ item.name }}</p><p class="mt-1 text-sm text-slate-500">{{ formatCurrency(item.price) }} · {{ producibleName(item.producibleItemId) }}</p><p class="mt-1 text-xs text-slate-400">{{ item.operationalQuantity ? `${item.operationalQuantity} ${item.operationalUnit}` : 'Sem quantidade operacional' }}</p></div><Badge :variant="item.active ? 'success' : 'neutral'">{{ item.active ? 'Ativo' : 'Inativo' }}</Badge></div><template #footer><Button class="w-full" size="small" variant="secondary" @click="openForm(item)">Editar</Button></template></Card>
    </div>
    <DataTable class="hidden md:flex" :columns="columns" :rows="rows" :selectable="false" row-key="id" label="Adicionais do catálogo" actions-label="Ação">
      <template #cell-name="{ row }"><p class="font-medium text-slate-800">{{ asAddon(row).name }}</p><p class="mt-1 text-xs text-slate-500">{{ asAddon(row).id }}</p></template>
      <template #cell-price="{ row }"><span class="font-medium text-slate-700">{{ formatCurrency(asAddon(row).price) }}</span></template>
      <template #cell-producibleItemId="{ row }"><span :class="asAddon(row).producibleItemId ? 'text-slate-600' : 'text-slate-400'">{{ producibleName(asAddon(row).producibleItemId) }}</span></template>
      <template #cell-operationalQuantity="{ row }"><span>{{ asAddon(row).operationalQuantity ? `${asAddon(row).operationalQuantity} ${asAddon(row).operationalUnit}` : '—' }}</span></template>
      <template #cell-active="{ row }"><Badge :variant="asAddon(row).active ? 'success' : 'neutral'">{{ asAddon(row).active ? 'Ativo' : 'Inativo' }}</Badge></template>
      <template #actions="{ row }"><Button size="small" variant="secondary" @click="openForm(asAddon(row))">Editar</Button></template>
    </DataTable>
    <Drawer v-model:open="drawerOpen" size="small" :title="editingId ? 'Editar adicional' : 'Novo adicional'" description="O vínculo com Produzíveis é operacional e não altera sua composição.">
      <div class="space-y-4">
        <Input v-model="name" label="Nome" placeholder="Ex.: Proteína extra" required :error="nameError" />
        <Input v-model="price" type="number" inputmode="decimal" label="Preço" min="0" step="0.01" required :error="priceError" />
        <Select v-model="producibleItemId" label="Item produzível correspondente" :options="producibleOptions" />
        <div class="grid grid-cols-[minmax(0,1fr)_7rem] gap-3"><Input v-model="operationalQuantity" type="number" inputmode="decimal" label="Quantidade operacional" min="0.01" step="any" :error="quantityError" /><Select v-model="operationalUnit" label="Unidade" :options="unitOptions" @update:model-value="operationalUnit = $event as MeasurementUnit" /></div>
        <Checkbox v-model="active" label="Adicional ativo" description="Adicionais inativos continuam visíveis nas ofertas existentes." />
      </div>
      <template #footer><div class="flex justify-end gap-2"><Button variant="secondary" @click="drawerOpen = false">Cancelar</Button><Button @click="save">Salvar adicional</Button></div></template>
    </Drawer>
  </section>
</template>
