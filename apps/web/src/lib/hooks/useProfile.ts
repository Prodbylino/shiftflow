'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ProfileUpdate } from '@/types/database'

export function useProfile() {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function updateProfile(userId: string, data: ProfileUpdate): Promise<boolean> {
    setSaving(true)
    setError(null)

    const supabase = createClient()
    const { error: err } = await supabase
      .from('profiles')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', userId)

    setSaving(false)

    if (err) {
      setError(err.message)
      return false
    }

    return true
  }

  return { updateProfile, saving, error }
}
