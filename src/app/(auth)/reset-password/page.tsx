'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useI18n, LanguageSwitch } from '@/lib/i18n'

export default function ResetPasswordPage() {
  const router = useRouter()
  const { t } = useI18n()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [canReset, setCanReset] = useState(false)

  useEffect(() => {
    const verifyRecoverySession = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        setError('Reset link is invalid or expired. Please request a new one.')
        setCanReset(false)
      } else {
        setCanReset(true)
      }
      setCheckingSession(false)
    }

    void verifyRecoverySession()
  }, [])

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canReset) return

    setError(null)

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    await supabase.auth.signOut()
    router.replace('/login?reset=success')
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
            Reset Password
          </h1>
          <p className="text-xl text-gray-500 text-center mb-10">
            Choose a new password for your account.
          </p>

          <form onSubmit={handleResetPassword} className="space-y-6">
            {error && (
              <div className="p-4 text-lg text-red-600 bg-red-50 rounded-xl">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <Label className="text-lg font-medium">{t('auth.password')}</Label>
              <Input
                type="password"
                placeholder="Min 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                disabled={loading || checkingSession || !canReset}
                className="input-senior"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-lg font-medium">{t('auth.confirmPassword')}</Label>
              <Input
                type="password"
                placeholder="Repeat your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                disabled={loading || checkingSession || !canReset}
                className="input-senior"
              />
            </div>

            <Button
              type="submit"
              disabled={loading || checkingSession || !canReset}
              className="w-full btn-senior bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? '...' : 'Update password'}
            </Button>

            <p className="text-lg text-gray-600 text-center">
              <Link href="/login" className="text-blue-600 hover:underline font-semibold">
                Back to login
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
