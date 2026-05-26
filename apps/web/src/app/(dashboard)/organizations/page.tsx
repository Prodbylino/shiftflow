'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useI18n, LanguageSwitch } from '@/lib/i18n'
import { UserMenu } from '@/components/calendar/UserMenu'
import { useOrganizations } from '@/lib/hooks'
import { LoadingSpinner } from '@/components/ui/loading'
import { toast } from 'sonner'
import { useDashboardAuth } from '@/lib/dashboard-auth-context'

type OrgRowProps = {
  org: { id: string; name: string; color: string; hourly_rate: number }
  onUpdate: (id: string, updates: { name?: string; color?: string; hourly_rate?: number }) => Promise<void>
  onDelete: (id: string) => Promise<void>
  hourlyRateLabel: string
  perHourLabel: string
  colorLabel: string
}

/**
 * Single editable workplace row. Holds *local* draft state for the
 * text inputs so fast typing doesn't fight with the refetch-on-update
 * cycle. Commits to the server on blur (or Enter), not on every keystroke.
 */
function OrgRow({ org, onUpdate, onDelete, hourlyRateLabel, perHourLabel, colorLabel }: OrgRowProps) {
  const [name, setName] = useState(org.name)
  const [rate, setRate] = useState(String(org.hourly_rate ?? 0))

  // Sync local state when the server value changes for reasons outside this row
  // (e.g., another tab edited it). Skip while the user is actively typing — we
  // detect that by checking the input has focus via document.activeElement at
  // commit time, but the cheaper proxy is: only sync if the row id changed.
  useEffect(() => {
    setName(org.name)
    setRate(String(org.hourly_rate ?? 0))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org.id])

  const commitName = () => {
    const trimmed = name.trim()
    if (trimmed && trimmed !== org.name) {
      onUpdate(org.id, { name: trimmed })
    } else if (!trimmed) {
      setName(org.name) // revert empty name
    }
  }

  const commitRate = () => {
    const parsed = parseFloat(rate)
    if (Number.isFinite(parsed) && parsed >= 0 && parsed !== org.hourly_rate) {
      onUpdate(org.id, { hourly_rate: parsed })
    } else if (!Number.isFinite(parsed) || parsed < 0) {
      setRate(String(org.hourly_rate ?? 0)) // revert invalid
    }
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <div
          className="w-6 h-6 rounded-full mt-1 flex-shrink-0"
          style={{ backgroundColor: org.color }}
        />

        <div className="flex-1 space-y-4">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
              if (e.key === 'Escape') setName(org.name)
            }}
            className="input-senior text-xl font-semibold border-0 bg-transparent p-0 h-auto"
          />

          <div className="flex items-center gap-3">
            <Label className="text-lg text-gray-600 w-24">{hourlyRateLabel}</Label>
            <div className="flex items-center gap-2">
              <span className="text-xl">$</span>
              <Input
                type="number"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                onBlur={commitRate}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                  if (e.key === 'Escape') setRate(String(org.hourly_rate ?? 0))
                }}
                className="w-24 h-12 text-lg rounded-xl"
              />
              <span className="text-lg text-gray-500">{perHourLabel}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Label className="text-lg text-gray-600 w-24">{colorLabel}</Label>
            <div className="flex gap-2">
              {colorOptions.map((color) => (
                <button
                  key={color.value}
                  onClick={() => onUpdate(org.id, { color: color.value })}
                  className={`w-10 h-10 rounded-full transition-transform ${
                    org.color === color.value ? 'ring-4 ring-offset-2 ring-gray-400 scale-110' : ''
                  }`}
                  style={{ backgroundColor: color.value }}
                />
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={() => onDelete(org.id)}
          className="text-gray-400 hover:text-red-500 transition-colors p-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18"/>
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

const colorOptions = [
  { value: '#2563eb', name: 'Blue' },
  { value: '#8b5cf6', name: 'Purple' },
  { value: '#22c55e', name: 'Green' },
  { value: '#f97316', name: 'Orange' },
  { value: '#ef4444', name: 'Red' },
  { value: '#06b6d4', name: 'Cyan' },
]

export default function OrganizationsPage() {
  const { t } = useI18n()
  const { user: authUser, profile, signOut } = useDashboardAuth()
  const {
    organizations,
    loading: orgsLoading,
    error: orgsError,
    createOrganization,
    updateOrganization,
    deleteOrganization,
  } = useOrganizations({
    userId: authUser?.id ?? null,
    authLoading: false,
  })

  const [newOrgName, setNewOrgName] = useState('')
  const [newOrgRate, setNewOrgRate] = useState('')
  const [newOrgColor, setNewOrgColor] = useState(colorOptions[0].value)

  const handleUpdateOrg = async (id: string, updates: { name?: string; color?: string; hourly_rate?: number }) => {
    const success = await updateOrganization(id, updates)
    if (!success) {
      toast.error(t('org.updateFailed') || 'Failed to update organization')
    }
    // No success toast — field edits auto-save silently
  }

  const handleAddOrg = async () => {
    if (!newOrgName) return
    const result = await createOrganization({
      name: newOrgName,
      color: newOrgColor,
      hourly_rate: parseFloat(newOrgRate) || 0,
    })
    if (result) {
      toast.success(t('org.created') || 'Organization created')
      setNewOrgName('')
      setNewOrgRate('')
      setNewOrgColor(colorOptions[0].value)
    } else {
      const errorMsg = orgsError || 'Failed to create organization'
      toast.error(errorMsg)
    }
  }

  const handleDeleteOrg = async (id: string) => {
    const success = await deleteOrganization(id)
    if (success) {
      toast.success(t('org.deleted') || 'Organization deleted')
    } else {
      toast.error(t('org.deleteFailed') || 'Failed to delete organization')
    }
  }

  if (orgsLoading) {
    return <LoadingSpinner />
  }

  const user = {
    name: profile?.full_name || 'User',
    email: profile?.email || '',
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-[1200px] mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <span className="text-2xl font-bold text-gray-900 font-display">TimesheetAI</span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <LanguageSwitch />
            <UserMenu user={user} onLogout={signOut} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[800px] mx-auto p-6">
        {/* Back Link */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-lg text-gray-600 hover:text-gray-900 mb-6"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6"/>
          </svg>
          Back to Calendar
        </Link>

        <h1 className="text-4xl font-bold font-display mb-8">{t('org.manage')}</h1>

        {/* Error Display */}
        {orgsError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600">
            <p className="font-medium">Error: {orgsError}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-2 text-sm underline hover:no-underline"
            >
              Refresh page
            </button>
          </div>
        )}

        {/* Existing Organizations */}
        <div className="space-y-4 mb-8">
          {organizations.map((org) => (
            <OrgRow
              key={org.id}
              org={org}
              onUpdate={handleUpdateOrg}
              onDelete={handleDeleteOrg}
              hourlyRateLabel={t('org.hourlyRate')}
              perHourLabel={t('org.perHour')}
              colorLabel={t('org.color')}
            />
          ))}
        </div>

        {/* Add New Organization */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border-2 border-dashed border-gray-200">
          <h2 className="text-2xl font-semibold mb-6">{t('org.addNew')}</h2>

          <div className="space-y-4">
            <div>
              <Label className="text-lg mb-2 block">{t('org.name')}</Label>
              <Input
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                placeholder="e.g. City Hospital"
                className="input-senior"
              />
            </div>

            <div className="flex items-center gap-3">
              <Label className="text-lg w-24">{t('org.hourlyRate')}</Label>
              <div className="flex items-center gap-2">
                <span className="text-xl">$</span>
                <Input
                  type="number"
                  value={newOrgRate}
                  onChange={(e) => setNewOrgRate(e.target.value)}
                  placeholder="30"
                  className="w-24 h-12 text-lg rounded-xl"
                />
                <span className="text-lg text-gray-500">{t('org.perHour')}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Label className="text-lg w-24">{t('org.color')}</Label>
              <div className="flex gap-2">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setNewOrgColor(color.value)}
                    className={`w-10 h-10 rounded-full transition-transform ${
                      newOrgColor === color.value ? 'ring-4 ring-offset-2 ring-gray-400 scale-110' : ''
                    }`}
                    style={{ backgroundColor: color.value }}
                  />
                ))}
              </div>
            </div>

            <Button
              onClick={handleAddOrg}
              disabled={!newOrgName}
              className="w-full h-14 text-lg rounded-xl bg-blue-600 hover:bg-blue-700 mt-4"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              {t('org.addNew')}
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
