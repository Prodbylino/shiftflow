-- Support one-off "custom" workplaces (no organization) and per-shift income
-- overrides for work that isn't paid by the hour.

-- A shift may have no organization (a custom, typed-in workplace name lives in
-- shifts.title). Drop the NOT NULL; the FK + ON DELETE CASCADE stay.
ALTER TABLE public.shifts ALTER COLUMN organization_id DROP NOT NULL;

-- Optional manual income for this shift. When set, it overrides the time×rate
-- estimate (used for flat-rate / piece-rate / custom-workplace shifts).
ALTER TABLE public.shifts
  ADD COLUMN IF NOT EXISTS custom_income NUMERIC;
