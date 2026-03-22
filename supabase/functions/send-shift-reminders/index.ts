// Supabase Edge Function: send-shift-reminders
// Runs every minute via pg_cron. Queries upcoming shifts and sends SMS via AWS SNS.
// Deno runtime — imports from esm.sh

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { AwsClient } from 'https://esm.sh/aws4fetch@1.0.20'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const aws = new AwsClient({
  accessKeyId: Deno.env.get('AWS_ACCESS_KEY_ID')!,
  secretAccessKey: Deno.env.get('AWS_SECRET_ACCESS_KEY')!,
  region: Deno.env.get('AWS_REGION') ?? 'ap-southeast-2',
})

async function sendSMS(phoneNumber: string, message: string): Promise<void> {
  const region = Deno.env.get('AWS_REGION') ?? 'ap-southeast-2'
  const url = new URL(`https://sns.${region}.amazonaws.com/`)
  url.searchParams.set('Action', 'Publish')
  url.searchParams.set('PhoneNumber', phoneNumber)
  url.searchParams.set('Message', message)

  const response = await aws.fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`SNS error ${response.status}: ${body}`)
  }
}

Deno.serve(async (_req) => {
  try {
    const { data: shifts, error } = await supabase.rpc('get_shifts_needing_sms')

    if (error) {
      console.error('Failed to query shifts:', error)
      return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }

    const results: { shift_id: string; status: string }[] = []

    for (const shift of shifts ?? []) {
      let status = 'sent'

      try {
        const message = `Reminder: Your shift "${shift.title}" starts at ${shift.start_time}. Have a great shift!`
        await sendSMS(shift.phone_number, message)
      } catch (err) {
        console.error(`Failed to send SMS for shift ${shift.id}:`, err)
        status = 'failed'
      }

      // Record notification (success or failure) — unique index prevents duplicates
      const { error: insertErr } = await supabase
        .from('shift_notifications')
        .insert({ shift_id: shift.id, user_id: shift.user_id, status })

      if (insertErr) {
        // Could be a duplicate (race condition) — safe to ignore
        console.warn(`Insert notification warning for shift ${shift.id}:`, insertErr.message)
      }

      results.push({ shift_id: shift.id, status })
    }

    return new Response(
      JSON.stringify({ processed: results.length, results }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Unexpected error:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
