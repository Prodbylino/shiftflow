import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

import type { Language } from './translations'
import { translate } from './translations'
import { useSupabase } from '../supabase/SupabaseProvider'
import { useAuth } from '../hooks/useAuth'

export interface I18nContextValue {
  language: Language
  t: (key: string) => string
  setLanguage: (lang: Language) => Promise<void>
}

const I18nContext = createContext<I18nContextValue | null>(null)

const isLanguage = (value: unknown): value is Language => value === 'en' || value === 'zh'

export function I18nProvider({ children }: { children: ReactNode }) {
  const supabase = useSupabase()
  const { user } = useAuth()
  const [language, setLanguageState] = useState<Language>('en')

  // Hydrate from the signed-in user's profile. Until then (and on auth
  // screens) we render the default language.
  useEffect(() => {
    if (!user) return
    let cancelled = false
    supabase
      .from('profiles')
      .select('preferred_language')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (!cancelled && isLanguage(data?.preferred_language)) {
          setLanguageState(data.preferred_language)
        }
      })
    return () => {
      cancelled = true
    }
  }, [supabase, user])

  const setLanguage = useCallback<I18nContextValue['setLanguage']>(
    async (lang) => {
      // Flip the whole UI immediately; persistence follows in the background.
      setLanguageState(lang)
      if (user) {
        await supabase.from('profiles').update({ preferred_language: lang }).eq('id', user.id)
      }
    },
    [supabase, user],
  )

  const t = useCallback((key: string) => translate(key, language), [language])

  const value = useMemo(() => ({ language, t, setLanguage }), [language, t, setLanguage])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    throw new Error('useI18n must be used inside <I18nProvider>')
  }
  return ctx
}
