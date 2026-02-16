import { createClient, resetClient } from '@/lib/supabase/client'

const DEFAULT_TIMEOUT_MS = 30000
const DEFAULT_RETRIES = 1

const isRetryableError = (error: unknown): boolean => {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return true
  }

  if (error instanceof TypeError) {
    // Browser fetch failures are usually TypeError (network/drop/dns)
    return true
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return message.includes('timeout') || message.includes('abort')
  }

  return false
}

export async function runSupabaseQueryWithRetry<T>(
  label: string,
  operation: (
    supabase: ReturnType<typeof createClient>,
    signal: AbortSignal
  ) => Promise<T>,
  options?: {
    timeoutMs?: number
    retries?: number
  }
): Promise<T> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const retries = options?.retries ?? DEFAULT_RETRIES
  const maxAttempts = retries + 1

  let lastError: unknown = null

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const supabase = createClient()
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      controller.abort()
    }, timeoutMs)
    const startedAt = performance.now()
    let succeeded = false

    try {
      const result = await operation(supabase, controller.signal)
      succeeded = true
      return result
    } catch (error) {
      lastError = error
      const canRetry = attempt < maxAttempts && isRetryableError(error)

      if (!canRetry) {
        throw error
      }

      console.warn(`[supabase] ${label} failed on attempt ${attempt}, retrying once`, error)
      resetClient()
    } finally {
      const elapsedMs = Math.round(performance.now() - startedAt)
      if (!succeeded || elapsedMs > 5000) {
        console.warn(
          `[supabase] ${label} attempt ${attempt}/${maxAttempts} ${succeeded ? 'succeeded' : 'failed'} in ${elapsedMs}ms`
        )
      }
      window.clearTimeout(timer)
    }
  }

  if (lastError) {
    throw lastError
  }

  throw new Error(`[supabase] ${label} failed without an error payload`)
}
