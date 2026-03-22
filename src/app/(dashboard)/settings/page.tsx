'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { useDashboardAuth } from '@/lib/dashboard-auth-context'
import { useProfile } from '@/lib/hooks/useProfile'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types/database'

const TIMEZONES = [
  { value: 'Australia/Sydney', label: 'Sydney / Melbourne (AEDT/AEST)' },
  { value: 'Australia/Brisbane', label: 'Brisbane (AEST, no DST)' },
  { value: 'Australia/Adelaide', label: 'Adelaide (ACDT/ACST)' },
  { value: 'Australia/Perth', label: 'Perth (AWST)' },
  { value: 'Pacific/Auckland', label: 'Auckland (NZDT/NZST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong (HKT)' },
  { value: 'Asia/Shanghai', label: 'Shanghai / Beijing (CST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'America/New_York', label: 'New York (ET)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PT)' },
  { value: 'UTC', label: 'UTC' },
]

const NOTIFY_OPTIONS = [
  { value: 15, label: '15 minutes before' },
  { value: 30, label: '30 minutes before' },
  { value: 60, label: '1 hour before' },
  { value: 120, label: '2 hours before' },
]

type PhoneStep = 'idle' | 'sending' | 'otp' | 'verifying' | 'verified'

function normalizeAustralianPhone(input: string): string {
  const digits = input.replace(/\D/g, '')
  if (digits.startsWith('0') && digits.length === 10) {
    return '+61' + digits.slice(1)
  }
  if (digits.startsWith('61') && digits.length === 11) {
    return '+' + digits
  }
  return input.trim()
}

export default function SettingsPage() {
  const { user, profile: authProfile } = useDashboardAuth()
  const { updateProfile, saving } = useProfile()

  // Load fresh profile with SMS fields from Supabase
  const [profile, setProfile] = useState<Profile | null>(authProfile as Profile | null)

  useEffect(() => {
    if (!user?.id) return
    const supabase = createClient()
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
      .then(({ data }: { data: Profile | null }) => {
        if (data) setProfile(data)
      })
  }, [user?.id])

  // Profile section state
  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  useEffect(() => {
    if (profile?.full_name !== undefined) setFullName(profile.full_name ?? '')
  }, [profile?.full_name])

  // Phone verification state
  const [phoneInput, setPhoneInput] = useState(profile?.phone_number ?? '')
  const [otpInput, setOtpInput] = useState('')
  const [phoneStep, setPhoneStep] = useState<PhoneStep>(
    profile?.phone_verified ? 'verified' : 'idle'
  )
  useEffect(() => {
    if (profile) {
      setPhoneInput(profile.phone_number ?? '')
      setPhoneStep(profile.phone_verified ? 'verified' : 'idle')
    }
  }, [profile])

  // Notification settings state
  const [smsEnabled, setSmsEnabled] = useState(profile?.sms_notifications_enabled ?? false)
  const [minutesBefore, setMinutesBefore] = useState(profile?.notification_minutes_before ?? 60)
  const [timezone, setTimezone] = useState(profile?.timezone ?? 'Australia/Sydney')
  useEffect(() => {
    if (profile) {
      setSmsEnabled(profile.sms_notifications_enabled ?? false)
      setMinutesBefore(profile.notification_minutes_before ?? 60)
      setTimezone(profile.timezone ?? 'Australia/Sydney')
    }
  }, [profile])

  // Save profile name
  async function handleSaveProfile() {
    if (!user?.id) return
    const ok = await updateProfile(user.id, { full_name: fullName })
    if (ok) toast.success('Profile saved')
    else toast.error('Failed to save profile')
  }

  // Send OTP
  async function handleSendOtp() {
    if (!phoneInput) return
    const normalized = normalizeAustralianPhone(phoneInput)
    setPhoneInput(normalized)
    setPhoneStep('sending')
    try {
      const res = await fetch('/api/verify-phone/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: normalized }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPhoneStep('otp')
      toast.success('Verification code sent')
    } catch (err) {
      setPhoneStep('idle')
      toast.error(err instanceof Error ? err.message : 'Failed to send code')
    }
  }

  // Confirm OTP
  async function handleConfirmOtp() {
    if (!otpInput) return
    setPhoneStep('verifying')
    try {
      const res = await fetch('/api/verify-phone/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp_code: otpInput }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPhoneStep('verified')
      setProfile(prev => prev ? { ...prev, phone_number: data.phone_number, phone_verified: true } : prev)
      toast.success('Phone number verified!')
    } catch (err) {
      setPhoneStep('otp')
      toast.error(err instanceof Error ? err.message : 'Incorrect code')
    }
  }

  // Save notification settings
  async function handleSaveNotifications() {
    if (!user?.id) return
    const ok = await updateProfile(user.id, {
      sms_notifications_enabled: smsEnabled,
      notification_minutes_before: minutesBefore,
      timezone,
    })
    if (ok) toast.success('Notification settings saved')
    else toast.error('Failed to save settings')
  }

  const isPhoneVerified = phoneStep === 'verified'

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-[700px] mx-auto p-6 space-y-6">
        <h1 className="text-4xl font-bold font-display">Settings</h1>

        {/* Profile Section */}
        <section className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-2xl font-semibold mb-5">Profile</h2>
          <div className="space-y-4">
            <div>
              <Label className="text-lg mb-2 block">Display Name</Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your name"
                className="h-12 text-lg rounded-xl"
              />
            </div>
            <div>
              <Label className="text-lg mb-2 block">Email</Label>
              <Input
                value={profile?.email ?? ''}
                disabled
                className="h-12 text-lg rounded-xl bg-gray-50 text-gray-500"
              />
            </div>
            <Button
              onClick={handleSaveProfile}
              disabled={saving}
              className="h-12 text-lg px-8 rounded-xl bg-blue-600 hover:bg-blue-700"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </Button>
          </div>
        </section>

        {/* Phone Verification Section */}
        <section className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-2xl font-semibold mb-1">Phone Number</h2>
          <p className="text-gray-500 text-base mb-5">
            Required for SMS shift reminders. Enter your Australian number, e.g.{' '}
            <span className="font-mono">0412345678</span>
          </p>

          <div className="space-y-4">
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <Label className="text-lg mb-2 block">Phone Number</Label>
                <Input
                  value={phoneInput}
                  onChange={(e) => {
                    setPhoneInput(e.target.value)
                    if (phoneStep === 'verified') setPhoneStep('idle')
                  }}
                  placeholder="0412345678"
                  disabled={phoneStep === 'otp' || phoneStep === 'verifying'}
                  className="h-12 text-lg rounded-xl font-mono"
                />
              </div>

              {isPhoneVerified ? (
                <div className="flex items-center gap-2 h-12 px-4 bg-green-50 text-green-700 rounded-xl font-medium border border-green-200 whitespace-nowrap">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  Verified
                </div>
              ) : (
                <Button
                  onClick={handleSendOtp}
                  disabled={!phoneInput || phoneStep === 'sending' || phoneStep === 'otp' || phoneStep === 'verifying'}
                  className="h-12 text-base px-5 rounded-xl bg-blue-600 hover:bg-blue-700 whitespace-nowrap"
                >
                  {phoneStep === 'sending' ? 'Sending...' : 'Send Code'}
                </Button>
              )}
            </div>

            {/* OTP Input */}
            {(phoneStep === 'otp' || phoneStep === 'verifying') && (
              <div className="flex gap-3 items-end pt-1">
                <div className="flex-1">
                  <Label className="text-lg mb-2 block">Verification Code</Label>
                  <Input
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="6-digit code"
                    inputMode="numeric"
                    maxLength={6}
                    className="h-12 text-xl rounded-xl font-mono tracking-widest"
                  />
                </div>
                <Button
                  onClick={handleConfirmOtp}
                  disabled={otpInput.length !== 6 || phoneStep === 'verifying'}
                  className="h-12 text-base px-5 rounded-xl bg-green-600 hover:bg-green-700"
                >
                  {phoneStep === 'verifying' ? 'Verifying...' : 'Confirm'}
                </Button>
              </div>
            )}

            {(phoneStep === 'otp' || phoneStep === 'verifying') && (
              <p className="text-sm text-gray-500">
                Code sent to {phoneInput}. Valid for 10 minutes.{' '}
                <button
                  onClick={() => { setPhoneStep('idle'); setOtpInput('') }}
                  className="text-blue-600 underline"
                >
                  Change number
                </button>
              </p>
            )}
          </div>
        </section>

        {/* SMS Notifications Section */}
        <section className={`bg-white rounded-2xl p-6 shadow-sm ${!isPhoneVerified ? 'opacity-60' : ''}`}>
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="text-2xl font-semibold">SMS Reminders</h2>
              <p className="text-gray-500 text-base mt-1">
                {isPhoneVerified
                  ? 'Get a text before each upcoming shift.'
                  : 'Verify your phone number above to enable.'}
              </p>
            </div>

            {/* Toggle */}
            <button
              onClick={() => isPhoneVerified && setSmsEnabled(!smsEnabled)}
              disabled={!isPhoneVerified}
              className={`relative w-14 h-7 rounded-full transition-colors focus:outline-none ${
                smsEnabled && isPhoneVerified ? 'bg-blue-600' : 'bg-gray-300'
              }`}
              aria-checked={smsEnabled}
              role="switch"
            >
              <span
                className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                  smsEnabled && isPhoneVerified ? 'translate-x-7' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="space-y-5">
            <div>
              <Label className="text-lg mb-2 block">Remind me</Label>
              <div className="grid grid-cols-2 gap-3">
                {NOTIFY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => isPhoneVerified && setMinutesBefore(opt.value)}
                    disabled={!isPhoneVerified}
                    className={`h-12 rounded-xl border-2 text-base font-medium transition-colors ${
                      minutesBefore === opt.value
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-lg mb-2 block">My timezone</Label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                disabled={!isPhoneVerified}
                className="w-full h-12 px-4 text-base rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>

            <Button
              onClick={handleSaveNotifications}
              disabled={!isPhoneVerified || saving}
              className="w-full h-12 text-lg rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Notification Settings'}
            </Button>
          </div>
        </section>
      </main>
    </div>
  )
}
