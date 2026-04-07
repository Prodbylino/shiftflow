-- Migration: Language preference for reminders
-- Adds preferred_language to profiles and updates RPC functions to return it

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'en'
    CHECK (preferred_language IN ('en', 'zh'));

-- Update get_shifts_needing_sms to return preferred_language
DROP FUNCTION IF EXISTS get_shifts_needing_sms();
CREATE OR REPLACE FUNCTION get_shifts_needing_sms()
RETURNS TABLE(
  id uuid,
  user_id uuid,
  title text,
  start_time text,
  phone_number text,
  preferred_language text
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
    p.phone_number,
    p.preferred_language
  FROM shifts s
  JOIN profiles p ON s.user_id = p.id
  WHERE
    p.sms_notifications_enabled = TRUE
    AND p.phone_verified = TRUE
    AND p.phone_number IS NOT NULL
    AND (s.date::date + s.start_time::time) AT TIME ZONE p.timezone
        BETWEEN NOW() + ((p.notification_minutes_before - 2) * INTERVAL '1 minute')
            AND NOW() + ((p.notification_minutes_before + 2) * INTERVAL '1 minute')
    AND NOT EXISTS (
      SELECT 1 FROM shift_notifications sn
      WHERE sn.shift_id = s.id
        AND sn.notification_type = 'sms'
        AND sn.status = 'sent'
    );
$$;

-- Update get_shifts_needing_voice_call to return preferred_language
DROP FUNCTION IF EXISTS get_shifts_needing_voice_call();
CREATE OR REPLACE FUNCTION get_shifts_needing_voice_call()
RETURNS TABLE(
  id uuid,
  user_id uuid,
  title text,
  start_time text,
  phone_number text,
  preferred_language text
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
    p.phone_number,
    p.preferred_language
  FROM shifts s
  JOIN profiles p ON s.user_id = p.id
  WHERE
    p.voice_call_enabled = TRUE
    AND p.phone_verified = TRUE
    AND p.phone_number IS NOT NULL
    AND (s.date::date + s.start_time::time) AT TIME ZONE p.timezone
        BETWEEN NOW() + ((p.notification_minutes_before - 2) * INTERVAL '1 minute')
            AND NOW() + ((p.notification_minutes_before + 2) * INTERVAL '1 minute')
    AND NOT EXISTS (
      SELECT 1 FROM shift_notifications sn
      WHERE sn.shift_id = s.id
        AND sn.notification_type = 'call'
        AND sn.status = 'sent'
    );
$$;
