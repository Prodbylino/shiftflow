'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useI18n, LanguageSwitch } from '@/lib/i18n'

export default function Home() {
  const { t } = useI18n()

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <span className="text-2xl font-bold text-gray-900 font-display">ShiftFlow</span>
          </div>
          <div className="flex items-center gap-4">
            <LanguageSwitch />
            <Link href="/login">
              <Button variant="ghost" className="text-lg text-gray-600 hover:text-gray-900 px-6 h-12">
                {t('nav.signIn')}
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section - Simplified for seniors */}
      <section className="pt-40 pb-32 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-senior-title font-display text-gray-900 mb-8">
            {t('home.title')}
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
              {t('home.titleHighlight')}
            </span>
          </h1>

          <p className="text-senior-subtitle text-gray-600 mb-16 max-w-2xl mx-auto">
            {t('home.subtitle')}
          </p>

          <Link href="/signup">
            <Button className="btn-senior bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-600/30 text-white">
              {t('home.cta')}
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="ml-3">
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </Button>
          </Link>

          <p className="text-xl text-gray-500 mt-8">
            {t('home.noCard')}
          </p>
        </div>
      </section>

      {/* Footer - Minimal */}
      <footer className="py-8 px-6 border-t border-gray-100">
        <div className="max-w-7xl mx-auto text-center text-gray-500">
          <p>&copy; 2025 ShiftFlow</p>
        </div>
      </footer>
    </div>
  )
}
