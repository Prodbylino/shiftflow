'use client'

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { translations, translate } from '@shiftflow/shared/i18n'
import type { Language } from '@shiftflow/shared/i18n'

interface I18nContextType {
  lang: Language
  setLang: (lang: Language) => void
  t: (key: string) => string
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>('en')

  const t = useCallback((key: string): string => {
    return translate(key, lang)
  }, [lang])

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider')
  }
  return context
}

export function LanguageSwitch() {
  const { lang, setLang } = useI18n()

  return (
    <div className="lang-switch">
      <button
        className={lang === 'en' ? 'active' : ''}
        onClick={() => setLang('en')}
      >
        EN
      </button>
      <button
        className={lang === 'zh' ? 'active' : ''}
        onClick={() => setLang('zh')}
      >
        中
      </button>
    </div>
  )
}
