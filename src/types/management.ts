import type { Component } from 'vue'

export type ManagementSection = 'produziveis' | 'catalogo' | 'entregadores' | 'usuarios'
export type ProduciblePage = 'list' | 'new' | 'detail' | 'edit' | 'new-composition-version'
export type CatalogPage = 'list' | 'new' | 'detail' | 'edit'
export type DeliveryDriverPage = 'list' | 'new' | 'edit'
export type UserPage = 'list' | 'new' | 'edit'

export interface ManagementPageConfig {
  title: string
  subtitle?: string
  icon: Component
}
