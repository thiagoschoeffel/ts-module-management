import type { Component } from 'vue'

export type ManagementSection = 'produziveis' | 'catalogo' | 'entregadores' | 'usuarios'
export type ProduciblePage = 'list' | 'new' | 'detail' | 'edit' | 'new-composition-version'

export interface ManagementPageConfig {
  title: string
  subtitle?: string
  icon: Component
}
