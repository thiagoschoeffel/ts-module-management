<script setup lang="ts">
import { computed, ref } from 'vue'
import { Badge, Button, Card, Checkbox, DataTable, Drawer, EmptyState, Input, PlusIcon, Textarea, type DataTableColumn, type DataTableRow } from '@thiagoschoeffel/ts-components'
import { getComponentTypes, nextComponentTypeId, saveComponentType } from '../../mocks/catalogStore'
import type { ComponentType } from '../../types/catalog'

const version = ref(0)
const drawerOpen = ref(false)
const editingId = ref<string>()
const name = ref('')
const description = ref('')
const active = ref(true)
const showValidation = ref(false)
const items = computed(() => { version.value; return getComponentTypes() })
const rows = computed<DataTableRow[]>(() => items.value.map(item => ({ ...item })))
const columns: DataTableColumn[] = [
  { key: 'name', label: 'Tipo', size: 'medium' },
  { key: 'description', label: 'Descrição', size: 'large' },
  { key: 'active', label: 'Status', size: 'small', align: 'center' }
]
const nameError = computed(() => showValidation.value && !name.value.trim() ? 'Informe o nome do tipo.' : undefined)

function asType(row: DataTableRow) { return row as unknown as ComponentType }
function openForm(item?: ComponentType) {
  editingId.value = item?.id
  name.value = item?.name ?? ''
  description.value = item?.description ?? ''
  active.value = item?.active ?? true
  showValidation.value = false
  drawerOpen.value = true
}
function save() {
  showValidation.value = true
  if (nameError.value) return
  saveComponentType({ id: editingId.value ?? nextComponentTypeId(), name: name.value.trim(), description: description.value.trim() || undefined, active: active.value })
  version.value++
  drawerOpen.value = false
}
</script>

<template>
  <section class="space-y-4" aria-label="Tipos de componente">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <p class="text-sm text-slate-500">Papéis comerciais usados para estruturar ofertas.</p>
      <Button size="small" @click="openForm()"><template #icon><PlusIcon /></template>Novo tipo</Button>
    </div>

    <div class="space-y-3 md:hidden">
      <EmptyState v-if="!items.length" class="bg-white shadow-sm" title="Nenhum tipo cadastrado" description="Cadastre o primeiro papel comercial do catálogo." />
      <Card v-for="item in items" v-else :key="item.id">
        <div class="flex items-start justify-between gap-3"><div><p class="font-semibold text-slate-800">{{ item.name }}</p><p class="mt-1 text-sm text-slate-500">{{ item.description || 'Sem descrição' }}</p></div><Badge :variant="item.active ? 'success' : 'neutral'">{{ item.active ? 'Ativo' : 'Inativo' }}</Badge></div>
        <template #footer><Button class="w-full" size="small" variant="secondary" @click="openForm(item)">Editar</Button></template>
      </Card>
    </div>

    <DataTable class="hidden md:flex" :columns="columns" :rows="rows" :selectable="false" row-key="id" label="Tipos de componente" actions-label="Ação">
      <template #cell-name="{ row }"><p class="font-medium text-slate-800">{{ asType(row).name }}</p><p class="mt-1 text-xs text-slate-500">{{ asType(row).id }}</p></template>
      <template #cell-description="{ row }"><span :class="asType(row).description ? 'text-slate-600' : 'text-slate-400'">{{ asType(row).description || 'Sem descrição' }}</span></template>
      <template #cell-active="{ row }"><Badge :variant="asType(row).active ? 'success' : 'neutral'">{{ asType(row).active ? 'Ativo' : 'Inativo' }}</Badge></template>
      <template #actions="{ row }"><Button size="small" variant="secondary" @click="openForm(asType(row))">Editar</Button></template>
    </DataTable>

    <Drawer v-model:open="drawerOpen" size="small" :title="editingId ? 'Editar tipo de componente' : 'Novo tipo de componente'" description="Tipos representam papéis comerciais estáveis, não itens produzíveis.">
      <div class="space-y-4">
        <Input v-model="name" label="Nome" placeholder="Ex.: Salada P" required :error="nameError" />
        <Textarea v-model="description" label="Descrição" placeholder="Descrição opcional" :rows="3" />
        <Checkbox v-model="active" label="Tipo ativo" description="Tipos inativos continuam legíveis nas ofertas existentes." />
      </div>
      <template #footer><div class="flex justify-end gap-2"><Button variant="secondary" @click="drawerOpen = false">Cancelar</Button><Button @click="save">Salvar tipo</Button></div></template>
    </Drawer>
  </section>
</template>
