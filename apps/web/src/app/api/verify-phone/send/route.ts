import { NextRequest, NextResponse } from 'next/server'
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns'
import { authenticateRequest } from '@/lib/supabase/route-auth'

const sns = new SNSClient({
  region: process.env.AWS_REGION ?? 'ap-southeast-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export async function POST(req: NextRequest) {
  const { supabase, user } = await authenticateRequest(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { phone_number } = body as { phone_number?: string }

  if (!phone_number || !/^\+[1-9]\d{7,14}$/.test(phone_number)) {
    return NextResponse.json(
      { error: 'Invalid phone number. Use E.164 format, e.g. +61412345678' },
      { status: 400 }
    )
  }

  const otp = generateOtp()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes

  // Delete any existing OTPs for this user before inserting a new one
  await supabase
    .from('phone_verifications')
    .delete()
    .eq('user_id', user.id)

  const { error: insertError } = await supabase
    .from('phone_verifications')
    .insert({ user_id: user.id, phone_number, otp_code: otp, expires_at: expiresAt })

  if (insertError) {
    return NextResponse.json({ error: 'Failed to store verification code' }, { status: 500 })
  }

  try {
    await sns.send(new PublishCommand({
      PhoneNumber: phone_number,
      Message: `Your TimesheetAI verification code is: ${otp}. Valid for 10 minutes.`,
    }))
  } catch (err) {
    console.error('SNS send error:', err)
    return NextResponse.json({ error: 'Failed to send SMS. Check AWS credentials.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
