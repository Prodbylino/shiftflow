import 'react-native-url-polyfill/auto'
import { AppState } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createTimesheetAIClient } from '@timesheetai/shared'

const url = process.env.EXPO_PUBLIC_SUPABASE_URL
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error(
    'Missing Supabase env vars. Copy apps/mobile/.env.example to apps/mobile/.env and fill in EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.',
  )
}

export const supabase = createTimesheetAIClient({
  url,
  anonKey,
  storage: AsyncStorage,
  detectSessionInUrl: false,
})

// The session itself is already persisted (AsyncStorage + persistSession), so a
// restart restores the login. This keeps the access token actively refreshed
// while the app is foregrounded — the Supabase-recommended RN pattern — so a
// long-lived login never lapses and forces an unexpected re-auth. Refresh pauses
// in the background and resumes on return.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh()
  } else {
    supabase.auth.stopAutoRefresh()
  }
})

