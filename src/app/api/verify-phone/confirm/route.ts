import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { otp_code } = body as { otp_code?: string }

  if (!otp_code || !/^\d{6}$/.test(otp_code)) {
    return NextResponse.json({ error: 'Invalid OTP format' }, { status: 400 })
  }

  // Look up the verification record
  const { data: verification, error: lookupError } = await supabase
    .from('phone_verifications')
    .select('*')
    .eq('user_id', user.id)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (lookupError || !verification) {
    return NextResponse.json(
      { error: 'Verification code expired or not found. Please request a new one.' },
      { status: 400 }
    )
  }

  if (verification.otp_code !== otp_code) {
    return NextResponse.json({ error: 'Incorrect verification code' }, { status: 400 })
  }

  // Mark phone as verified in profiles
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ phone_number: verification.phone_number, phone_verified: true })
    .eq('id', user.id)

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }

  // Clean up used OTP
  await supabase.from('phone_verifications').delete().eq('user_id', user.id)

  return NextResponse.json({ success: true, phone_number: verification.phone_number })
}
