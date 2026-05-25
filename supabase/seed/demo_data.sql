-- TimesheetAI demo account seed data
-- =========================================================
-- Run AFTER manually creating the demo user in Supabase Auth.
--
-- Steps:
--   1. In the Supabase dashboard, go to Authentication → Users → Add user
--      (or use the Auth API). Create:
--        Email:    demo@timesheetai.app
--        Password: <set a strong password; share with Apple reviewer
--                   via App Store Connect's "Demo Account" field>
--   2. Copy the new user's UUID from the Users table.
--   3. Paste that UUID into the @demo_user_id variable below.
--   4. Open Supabase → SQL Editor → run this whole script.
--   5. Sign into the app with demo@timesheetai.app. You should see
--      3 workplaces and ~20 shifts spanning the past month + next 2 weeks.
--
-- Re-running this script is safe: it deletes the demo user's existing
-- workplaces + shifts first, then re-seeds.
-- =========================================================

-- ---------- 1. Set the demo user's UUID here ----------
\set demo_user_id '00000000-0000-0000-0000-000000000000'  -- REPLACE before running

-- ---------- 2. Update the profile row (created automatically on signup) ----------
UPDATE public.profiles
SET
  full_name = 'Demo User',
  phone_number = '+15555550100',
  phone_verified = true,
  sms_notifications_enabled = false,   -- off, so reviewing the app does not trigger real SMS
  voice_call_enabled = false,
  notification_minutes_before = 30,
  timezone = 'America/Los_Angeles',
  preferred_language = 'en',
  updated_at = NOW()
WHERE id = :'demo_user_id';

-- ---------- 3. Wipe any existing demo data so this script is idempotent ----------
DELETE FROM public.shifts WHERE user_id = :'demo_user_id';
DELETE FROM public.organizations WHERE user_id = :'demo_user_id';

-- ---------- 4. Insert 3 workplaces ----------
WITH new_orgs AS (
  INSERT INTO public.organizations (user_id, name, color, hourly_rate)
  VALUES
    (:'demo_user_id', 'Coffee Bean', '#F59E0B', 26.50),   -- hospitality
    (:'demo_user_id', 'Library',     '#367BFD', 32.00),   -- casual desk work
    (:'demo_user_id', 'Tutoring',    '#10B981', 45.00)    -- self-employed
  RETURNING id, name
)
SELECT * FROM new_orgs;

-- ---------- 5. Insert ~20 shifts spread across last 30 days + next 14 days ----------
-- Reference the orgs by name (set via CTE) so script stays readable.
WITH orgs AS (
  SELECT id, name FROM public.organizations WHERE user_id = :'demo_user_id'
)
INSERT INTO public.shifts (user_id, organization_id, title, date, end_date, start_time, end_time, notes)
SELECT :'demo_user_id', o.id, s.title, s.date::date, s.end_date::date, s.start_time::time, s.end_time::time, s.notes
FROM (VALUES
  -- Past 30 days — mix of all three orgs
  ('Coffee Bean', 'Coffee Bean', (CURRENT_DATE - INTERVAL '28 days')::text, NULL, '06:00', '14:00', NULL),
  ('Coffee Bean', 'Coffee Bean', (CURRENT_DATE - INTERVAL '26 days')::text, NULL, '06:00', '14:00', NULL),
  ('Library',     'Library',     (CURRENT_DATE - INTERVAL '25 days')::text, NULL, '09:00', '17:00', NULL),
  ('Tutoring',    'Tutoring',    (CURRENT_DATE - INTERVAL '24 days')::text, NULL, '18:00', '20:00', 'Algebra session'),
  ('Coffee Bean', 'Coffee Bean', (CURRENT_DATE - INTERVAL '22 days')::text, NULL, '14:00', '22:00', NULL),
  ('Library',     'Library',     (CURRENT_DATE - INTERVAL '20 days')::text, NULL, '09:00', '17:00', NULL),
  ('Coffee Bean', 'Coffee Bean', (CURRENT_DATE - INTERVAL '18 days')::text, NULL, '06:00', '14:00', NULL),
  ('Tutoring',    'Tutoring',    (CURRENT_DATE - INTERVAL '17 days')::text, NULL, '17:00', '19:30', NULL),
  ('Library',     'Library',     (CURRENT_DATE - INTERVAL '15 days')::text, NULL, '09:00', '17:00', NULL),
  ('Coffee Bean', 'Coffee Bean', (CURRENT_DATE - INTERVAL '13 days')::text, NULL, '14:00', '22:00', NULL),
  ('Coffee Bean', 'Coffee Bean', (CURRENT_DATE - INTERVAL '11 days')::text,
                                 (CURRENT_DATE - INTERVAL '10 days')::text, '22:00', '06:00', 'Overnight close'),
  ('Tutoring',    'Tutoring',    (CURRENT_DATE - INTERVAL '9 days')::text,  NULL, '16:00', '18:00', NULL),
  ('Library',     'Library',     (CURRENT_DATE - INTERVAL '7 days')::text,  NULL, '09:00', '17:00', NULL),
  ('Coffee Bean', 'Coffee Bean', (CURRENT_DATE - INTERVAL '5 days')::text,  NULL, '06:00', '14:00', NULL),
  ('Coffee Bean', 'Coffee Bean', (CURRENT_DATE - INTERVAL '3 days')::text,  NULL, '14:00', '22:00', NULL),
  ('Library',     'Library',     (CURRENT_DATE - INTERVAL '1 days')::text,  NULL, '09:00', '17:00', NULL),

  -- Today + next 14 days — give the calendar dot grid something to display
  ('Coffee Bean', 'Coffee Bean', CURRENT_DATE::text,                          NULL, '14:00', '22:00', NULL),
  ('Library',     'Library',     (CURRENT_DATE + INTERVAL '2 days')::text,    NULL, '09:00', '17:00', NULL),
  ('Tutoring',    'Tutoring',    (CURRENT_DATE + INTERVAL '4 days')::text,    NULL, '18:00', '20:00', 'Calculus review'),
  ('Coffee Bean', 'Coffee Bean', (CURRENT_DATE + INTERVAL '6 days')::text,    NULL, '06:00', '14:00', NULL),
  ('Library',     'Library',     (CURRENT_DATE + INTERVAL '9 days')::text,    NULL, '09:00', '17:00', NULL),
  ('Coffee Bean', 'Coffee Bean', (CURRENT_DATE + INTERVAL '11 days')::text,
                                 (CURRENT_DATE + INTERVAL '12 days')::text, '22:00', '06:00', 'Overnight close')
) AS s(org_lookup, title, date, end_date, start_time, end_time, notes)
JOIN orgs o ON o.name = s.org_lookup;

-- ---------- 6. Quick sanity check ----------
SELECT
  (SELECT count(*) FROM public.organizations WHERE user_id = :'demo_user_id') AS workplaces,
  (SELECT count(*) FROM public.shifts        WHERE user_id = :'demo_user_id') AS shifts;
-- Expected: workplaces = 3, shifts = 22
