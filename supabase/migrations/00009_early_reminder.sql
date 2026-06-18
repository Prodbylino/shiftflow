-- Optional second, earlier reminder in addition to notification_minutes_before.
-- null = off. Intended values: 120 (2h), 180 (3h), 300 (5h), 1440 (1 day).
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS early_reminder_minutes_before INTEGER;

-- A shift can now get two reminders per channel (early + main), so the dedup
-- key gains a "kind". Existing rows backfill to 'main'.
ALTER TABLE shift_notifications
  ADD COLUMN IF NOT EXISTS reminder_kind TEXT NOT NULL DEFAULT 'main'
    CHECK (reminder_kind IN ('early', 'main'));

DROP INDEX IF EXISTS idx_shift_notifications_shift_type;
CREATE UNIQUE INDEX IF NOT EXISTS idx_shift_notifications_shift_type_kind
  ON shift_notifications(shift_id, notification_type, reminder_kind);

-- RPCs now emit both the main reminder (always) and the early reminder (only if
-- early_reminder_minutes_before is set), each tagged with its kind and deduped
-- independently.
DROP FUNCTION IF EXISTS get_shifts_needing_sms();
CREATE OR REPLACE FUNCTION get_shifts_needing_sms()
RETURNS TABLE(
  id uuid, user_id uuid, title text, start_time text,
  phone_number text, preferred_language text, reminder_kind text
)
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT s.id, s.user_id, s.title, s.start_time, p.phone_number, p.preferred_language, 'main'::text
  FROM shifts s JOIN profiles p ON s.user_id = p.id
  WHERE p.sms_notifications_enabled = TRUE AND p.phone_verified = TRUE AND p.phone_number IS NOT NULL
    AND (s.date::date + s.start_time::time) AT TIME ZONE p.timezone
        BETWEEN NOW() + ((p.notification_minutes_before - 2) * INTERVAL '1 minute')
            AND NOW() + ((p.notification_minutes_before + 2) * INTERVAL '1 minute')
    AND NOT EXISTS (SELECT 1 FROM shift_notifications sn
      WHERE sn.shift_id = s.id AND sn.notification_type = 'sms'
        AND sn.reminder_kind = 'main' AND sn.status = 'sent')
  UNION ALL
  SELECT s.id, s.user_id, s.title, s.start_time, p.phone_number, p.preferred_language, 'early'::text
  FROM shifts s JOIN profiles p ON s.user_id = p.id
  WHERE p.sms_notifications_enabled = TRUE AND p.phone_verified = TRUE AND p.phone_number IS NOT NULL
    AND p.early_reminder_minutes_before IS NOT NULL
    AND (s.date::date + s.start_time::time) AT TIME ZONE p.timezone
        BETWEEN NOW() + ((p.early_reminder_minutes_before - 2) * INTERVAL '1 minute')
            AND NOW() + ((p.early_reminder_minutes_before + 2) * INTERVAL '1 minute')
    AND NOT EXISTS (SELECT 1 FROM shift_notifications sn
      WHERE sn.shift_id = s.id AND sn.notification_type = 'sms'
        AND sn.reminder_kind = 'early' AND sn.status = 'sent');
$$;

DROP FUNCTION IF EXISTS get_shifts_needing_voice_call();
CREATE OR REPLACE FUNCTION get_shifts_needing_voice_call()
RETURNS TABLE(
  id uuid, user_id uuid, title text, start_time text,
  phone_number text, preferred_language text, reminder_kind text
)
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT s.id, s.user_id, s.title, s.start_time, p.phone_number, p.preferred_language, 'main'::text
  FROM shifts s JOIN profiles p ON s.user_id = p.id
  WHERE p.voice_call_enabled = TRUE AND p.phone_verified = TRUE AND p.phone_number IS NOT NULL
    AND (s.date::date + s.start_time::time) AT TIME ZONE p.timezone
        BETWEEN NOW() + ((p.notification_minutes_before - 2) * INTERVAL '1 minute')
            AND NOW() + ((p.notification_minutes_before + 2) * INTERVAL '1 minute')
    AND NOT EXISTS (SELECT 1 FROM shift_notifications sn
      WHERE sn.shift_id = s.id AND sn.notification_type = 'call'
        AND sn.reminder_kind = 'main' AND sn.status = 'sent')
  UNION ALL
  SELECT s.id, s.user_id, s.title, s.start_time, p.phone_number, p.preferred_language, 'early'::text
  FROM shifts s JOIN profiles p ON s.user_id = p.id
  WHERE p.voice_call_enabled = TRUE AND p.phone_verified = TRUE AND p.phone_number IS NOT NULL
    AND p.early_reminder_minutes_before IS NOT NULL
    AND (s.date::date + s.start_time::time) AT TIME ZONE p.timezone
        BETWEEN NOW() + ((p.early_reminder_minutes_before - 2) * INTERVAL '1 minute')
            AND NOW() + ((p.early_reminder_minutes_before + 2) * INTERVAL '1 minute')
    AND NOT EXISTS (SELECT 1 FROM shift_notifications sn
      WHERE sn.shift_id = s.id AND sn.notification_type = 'call'
        AND sn.reminder_kind = 'early' AND sn.status = 'sent');
$$;
