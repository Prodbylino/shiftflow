import 'react-native-url-polyfill/auto'
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
