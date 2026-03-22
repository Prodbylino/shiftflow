-- Migration: pg_cron setup for shift SMS reminders
--
-- IMPORTANT: Before running this migration, replace the two placeholders:
--   YOUR_PROJECT_REF   → your Supabase project ref (e.g. abcdefghijklmnop)
--   YOUR_SERVICE_ROLE_KEY → your Supabase service role key (from Project Settings → API)
--
-- Alternatively, set up the schedule manually in the Supabase Dashboard:
--   Edge Functions → send-shift-reminders → Schedule → Add schedule: "* * * * *"

-- Enable pg_net extension (for making HTTP requests from SQL)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Schedule the Edge Function to run every minute
-- Uncomment and fill in the placeholders when ready to activate:
--
-- SELECT cron.schedule(
--   'send-shift-reminders',
--   '* * * * *',
--   $$
--   SELECT extensions.net.http_post(
--     url      := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-shift-reminders',
--     headers  := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY", "Content-Type": "application/json"}'::jsonb,
--     body     := '{}'::jsonb
--   );
--   $$
-- );
