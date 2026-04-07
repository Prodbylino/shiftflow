// Supabase Edge Function: send-shift-reminders
// Runs every minute via pg_cron. Queries upcoming shifts and sends SMS or voice call reminders.
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

function formatTime(timeStr: string): string {
  const [hoursStr, minutesStr] = timeStr.split(':')
  const hours = parseInt(hoursStr, 10)
  const minutes = parseInt(minutesStr, 10)
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  return minutes === 0 ? `${displayHours} ${period}` : `${displayHours}:${minutesStr} ${period}`
}

function formatTimeChinese(timeStr: string): string {
  const [hoursStr, minutesStr] = timeStr.split(':')
  const hours = parseInt(hoursStr, 10)
  const minutes = parseInt(minutesStr, 10)
  const period = hours < 6 ? '凌晨' : hours < 12 ? '上午' : hours < 13 ? '中午' : hours < 18 ? '下午' : '晚上'
  const displayHours = hours % 12 || 12
  return minutes === 0 ? `${period}${displayHours}点` : `${period}${displayHours}点${minutes}分`
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function buildSmsMessage(title: string, startTime: string, lang: string): string {
  if (lang === 'zh') {
    return `提醒：您在${title}的班次将于${formatTimeChinese(startTime)}开始。工作愉快！`
  }
  return `Reminder: Your shift "${capitalize(title)}" starts at ${formatTime(startTime)}. Have a great shift!`
}

function buildCallMessage(title: string, startTime: string, lang: string): { message: string; voice: string } {
  if (lang === 'zh') {
    return {
      message: `您好，这是来自ShiftFlow的班次提醒。您在${title}的班次将于${formatTimeChinese(startTime)}开始，请准时出发，工作愉快！`,
      voice: 'Polly.Zhiyu',
    }
  }
  return {
    message: `This is a reminder from ShiftFlow. Your shift at ${capitalize(title)} starts at ${formatTime(startTime)}. Have a great shift!`,
    voice: 'Polly.Nicole',
  }
}

async function sendVoiceCall(phoneNumber: string, message: string, voice: string): Promise<void> {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')
  const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER')

  if (!accountSid || !authToken || !fromNumber) {
    throw new Error('Twilio credentials are not configured')
  }

  const twiml = `<Response><Say voice="${voice}">${message}</Say></Response>`

  const body = new URLSearchParams({
    To: phoneNumber,
    From: fromNumber,
    Twiml: twiml,
  })

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
      },
      body: body.toString(),
    }
  )

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Twilio Voice error ${response.status}: ${text}`)
  }
}

Deno.serve(async (_req) => {
  try {
    const results: { shift_id: string; type: string; status: string }[] = []

    // --- SMS reminders ---
    const { data: smsShifts, error: smsError } = await supabase.rpc('get_shifts_needing_sms')

    if (smsError) {
      console.error('Failed to query SMS shifts:', smsError)
    } else {
      for (const shift of smsShifts ?? []) {
        let status = 'sent'
        try {
          const message = buildSmsMessage(shift.title, shift.start_time, shift.preferred_language ?? 'en')
          await sendSMS(shift.phone_number, message)
        } catch (err) {
          console.error(`Failed to send SMS for shift ${shift.id}:`, err)
          status = 'failed'
        }

        const { error: insertErr } = await supabase
          .from('shift_notifications')
          .insert({ shift_id: shift.id, user_id: shift.user_id, status, notification_type: 'sms' })

        if (insertErr) {
          console.warn(`Insert SMS notification warning for shift ${shift.id}:`, insertErr.message)
        }

        results.push({ shift_id: shift.id, type: 'sms', status })
      }
    }

    // --- Voice call reminders ---
    const { data: callShifts, error: callError } = await supabase.rpc('get_shifts_needing_voice_call')

    if (callError) {
      console.error('Failed to query voice call shifts:', callError)
    } else {
      for (const shift of callShifts ?? []) {
        let status = 'sent'
        try {
          const { message, voice } = buildCallMessage(shift.title, shift.start_time, shift.preferred_language ?? 'en')
          await sendVoiceCall(shift.phone_number, message, voice)
        } catch (err) {
          console.error(`Failed to send voice call for shift ${shift.id}:`, err)
          status = 'failed'
        }

        const { error: insertErr } = await supabase
          .from('shift_notifications')
          .insert({ shift_id: shift.id, user_id: shift.user_id, status, notification_type: 'call' })

        if (insertErr) {
          console.warn(`Insert call notification warning for shift ${shift.id}:`, insertErr.message)
        }

        results.push({ shift_id: shift.id, type: 'call', status })
      }
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
