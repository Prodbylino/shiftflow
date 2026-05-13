// Types
export * from './types/database'

// i18n
export { translations, translate } from './i18n/translations'
export type { Language, TranslationEntry, Translations } from './i18n/translations'

// Supabase client factory + provider
export { createShiftFlowClient } from './supabase/createClient'
export type {
  ShiftFlowClient,
  StorageAdapter,
  CreateClientOptions,
} from './supabase/createClient'
export { SupabaseProvider, useSupabase } from './supabase/SupabaseProvider'

// Cross-platform hooks
export { useAuth } from './hooks/useAuth'
export type { UseAuthReturn, AuthState, AuthActions } from './hooks/useAuth'
export { useShifts } from './hooks/useShifts'
export type { UseShiftsOptions, UseShiftsReturn } from './hooks/useShifts'
export { useOrganizations } from './hooks/useOrganizations'
export type { UseOrganizationsReturn } from './hooks/useOrganizations'
