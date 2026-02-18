'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useI18n, LanguageSwitch } from '@/lib/i18n'

export default function ForgotPasswordPage() {
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    const supabase = createClient()
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/confirm?next=/reset-password`,
    })

    if (resetError) {
      setError(resetError.message)
      setLoading(false)
      return
    }

    setMessage('Password reset email sent. Please check your inbox.')
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <nav className="px-6 h-20 flex items-center justify-between border-b border-gray-100">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <span className="text-2xl font-bold text-gray-900 font-display">ShiftFlow</span>
        </Link>
        <LanguageSwitch />
      </nav>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <h1 className="text-4xl font-bold text-gray-900 font-display text-center mb-2">
            {t('auth.forgotPassword')}
          </h1>
          <p className="text-xl text-gray-500 text-center mb-10">
            Enter your email and we will send you a reset link.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 text-lg text-red-600 bg-red-50 rounded-xl">
                {error}
              </div>
            )}
            {message && (
              <div className="p-4 text-lg text-green-700 bg-green-50 rounded-xl">
                {message}
              </div>
            )}

            <div className="space-y-3">
              <Label className="text-lg font-medium">{t('auth.email')}</Label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="input-senior"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full btn-senior bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? '...' : 'Send reset link'}
            </Button>

            <p className="text-lg text-gray-600 text-center">
              Remembered your password?{' '}
              <Link href="/login" className="text-blue-600 hover:underline font-semibold">
                {t('auth.loginNow')}
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
