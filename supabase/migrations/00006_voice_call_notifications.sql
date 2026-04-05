-- Migration: Voice Call Notification Feature
-- Adds voice call reminders via Amazon Pinpoint Voice v2

-- 1. Add voice_call_enabled to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS voice_call_enabled BOOLEAN DEFAULT FALSE;

-- 2. Add notification_type to shift_notifications
ALTER TABLE shift_notifications
  ADD COLUMN IF NOT EXISTS notification_type TEXT DEFAULT 'sms'
    CHECK (notification_type IN ('sms', 'call'));

-- 3. Replace the per-shift unique index with a per-(shift, type) unique index
--    so each shift can have one SMS notification and one call notification
DROP INDEX IF EXISTS idx_shift_notifications_unique;
CREATE UNIQUE INDEX IF NOT EXISTS idx_shift_notifications_shift_type
  ON shift_notifications(shift_id, notification_type);

-- 4. RPC: query shifts needing a voice call reminder right now
CREATE OR REPLACE FUNCTION get_shifts_needing_voice_call()
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
    p.voice_call_enabled = TRUE
    AND p.phone_verified = TRUE
    AND p.phone_number IS NOT NULL
    AND (s.date::date + s.start_time::time) AT TIME ZONE p.timezone
        BETWEEN NOW() + ((p.notification_minutes_before - 2) * INTERVAL '1 minute')
            AND NOW() + ((p.notification_minutes_before + 2) * INTERVAL '1 minute')
    -- not already successfully called for this shift
    AND NOT EXISTS (
      SELECT 1 FROM shift_notifications sn
      WHERE sn.shift_id = s.id
        AND sn.notification_type = 'call'
        AND sn.status = 'sent'
    );
$$;
