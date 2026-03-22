-- Migration: SMS Notification Feature
-- Adds phone verification and shift reminder infrastructure

-- 1. Add SMS-related fields to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sms_notifications_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS notification_minutes_before INTEGER DEFAULT 60,
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Australia/Sydney';

-- 2. OTP verification table (temporary codes, expire in 10 minutes)
CREATE TABLE IF NOT EXISTS phone_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Shift notifications tracking table (prevents duplicate sends)
CREATE TABLE IF NOT EXISTS shift_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint: one notification record per shift (prevents duplicate SMS)
CREATE UNIQUE INDEX IF NOT EXISTS idx_shift_notifications_unique ON shift_notifications(shift_id);
CREATE INDEX IF NOT EXISTS idx_shift_notifications_user ON shift_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_phone_verifications_user ON phone_verifications(user_id);

-- 4. RLS policies
ALTER TABLE phone_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own phone verifications"
  ON phone_verifications FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own shift notifications"
  ON shift_notifications FOR SELECT
  USING (auth.uid() = user_id);

-- 5. RPC: query shifts needing SMS reminder right now
-- Called by the Edge Function every minute
CREATE OR REPLACE FUNCTION get_shifts_needing_sms()
RETURNS TABLE(
  id uuid,
  user_id uuid,
  title text,
  start_time text,
  phone_number text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.id,
    s.user_id,
    s.title,
    s.start_time,
    p.phone_number
  FROM shifts s
  JOIN profiles p ON s.user_id = p.id
  WHERE
    p.sms_notifications_enabled = TRUE
    AND p.phone_verified = TRUE
    AND p.phone_number IS NOT NULL
    -- shift start time (in user's local timezone) falls within [now + minutes - 2, now + minutes + 2]
    AND (s.date::date + s.start_time::time) AT TIME ZONE p.timezone
        BETWEEN NOW() + ((p.notification_minutes_before - 2) * INTERVAL '1 minute')
            AND NOW() + ((p.notification_minutes_before + 2) * INTERVAL '1 minute')
    -- not already successfully notified
    AND NOT EXISTS (
      SELECT 1 FROM shift_notifications sn
      WHERE sn.shift_id = s.id AND sn.status = 'sent'
    );
$$;
