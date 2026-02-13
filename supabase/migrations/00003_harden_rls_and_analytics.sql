-- =====================================================
-- ShiftFlow hardening migration
-- - Stronger RLS policies
-- - Tenant integrity constraints for shifts -> organizations
-- - Data quality checks for shift duration
-- - Safe, index-friendly analytics RPCs
-- - updated_at triggers
-- =====================================================

-- -----------------------------------------------------
-- 0) Prechecks: fail fast if existing data is incompatible
-- -----------------------------------------------------
DO $$
DECLARE
  mismatched_shift_org_count BIGINT;
  invalid_shift_duration_count BIGINT;
BEGIN
  SELECT COUNT(*)
  INTO mismatched_shift_org_count
  FROM public.shifts s
  JOIN public.organizations o ON o.id = s.organization_id
  WHERE s.user_id <> o.user_id;

  IF mismatched_shift_org_count > 0 THEN
    RAISE EXCEPTION
      'Migration blocked: % shift rows reference an organization owned by a different user.',
      mismatched_shift_org_count
      USING HINT = 'Fix mismatched rows in public.shifts before rerunning.';
  END IF;

  SELECT COUNT(*)
  INTO invalid_shift_duration_count
  FROM public.shifts s
  WHERE COALESCE(s.end_date, s.date) < s.date
     OR (COALESCE(s.end_date, s.date) + s.end_time) <= (s.date + s.start_time);

  IF invalid_shift_duration_count > 0 THEN
    RAISE EXCEPTION
      'Migration blocked: % shift rows have invalid date/time ranges.',
      invalid_shift_duration_count
      USING HINT = 'Fix invalid shift date/time values before rerunning.';
  END IF;
END
$$;

-- -----------------------------------------------------
-- 1) Keep timestamps sane + auto-maintain updated_at
-- -----------------------------------------------------
UPDATE public.profiles
SET created_at = COALESCE(created_at, NOW()),
    updated_at = COALESCE(updated_at, NOW())
WHERE created_at IS NULL OR updated_at IS NULL;

UPDATE public.organizations
SET created_at = COALESCE(created_at, NOW()),
    updated_at = COALESCE(updated_at, NOW())
WHERE created_at IS NULL OR updated_at IS NULL;

UPDATE public.shifts
SET created_at = COALESCE(created_at, NOW()),
    updated_at = COALESCE(updated_at, NOW())
WHERE created_at IS NULL OR updated_at IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;

ALTER TABLE public.organizations
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;

ALTER TABLE public.shifts
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_organizations_updated_at ON public.organizations;
CREATE TRIGGER set_organizations_updated_at
BEFORE UPDATE ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_shifts_updated_at ON public.shifts;
CREATE TRIGGER set_shifts_updated_at
BEFORE UPDATE ON public.shifts
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------
-- 2) Tenant integrity and shift validity constraints
-- -----------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'organizations_id_user_id_key'
      AND conrelid = 'public.organizations'::regclass
  ) THEN
    ALTER TABLE public.organizations
      ADD CONSTRAINT organizations_id_user_id_key UNIQUE (id, user_id);
  END IF;
END
$$;

ALTER TABLE public.shifts
  DROP CONSTRAINT IF EXISTS shifts_organization_id_fkey;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'shifts_organization_user_fkey'
      AND conrelid = 'public.shifts'::regclass
  ) THEN
    ALTER TABLE public.shifts
      ADD CONSTRAINT shifts_organization_user_fkey
      FOREIGN KEY (organization_id, user_id)
      REFERENCES public.organizations (id, user_id)
      ON DELETE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'shifts_end_not_before_start_date'
      AND conrelid = 'public.shifts'::regclass
  ) THEN
    ALTER TABLE public.shifts
      ADD CONSTRAINT shifts_end_not_before_start_date
      CHECK (COALESCE(end_date, date) >= date);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'shifts_duration_positive'
      AND conrelid = 'public.shifts'::regclass
  ) THEN
    ALTER TABLE public.shifts
      ADD CONSTRAINT shifts_duration_positive
      CHECK ((COALESCE(end_date, date) + end_time) > (date + start_time));
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_shifts_org_date
ON public.shifts (organization_id, date);

-- -----------------------------------------------------
-- 3) Explicit RLS policies (USING + WITH CHECK)
-- -----------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;

CREATE POLICY profiles_select_own
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

CREATE POLICY profiles_insert_own
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

CREATE POLICY profiles_update_own
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can manage own organizations" ON public.organizations;
DROP POLICY IF EXISTS organizations_select_own ON public.organizations;
DROP POLICY IF EXISTS organizations_insert_own ON public.organizations;
DROP POLICY IF EXISTS organizations_update_own ON public.organizations;
DROP POLICY IF EXISTS organizations_delete_own ON public.organizations;

CREATE POLICY organizations_select_own
ON public.organizations
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY organizations_insert_own
ON public.organizations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY organizations_update_own
ON public.organizations
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY organizations_delete_own
ON public.organizations
FOR DELETE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own shifts" ON public.shifts;
DROP POLICY IF EXISTS shifts_select_own ON public.shifts;
DROP POLICY IF EXISTS shifts_insert_own ON public.shifts;
DROP POLICY IF EXISTS shifts_update_own ON public.shifts;
DROP POLICY IF EXISTS shifts_delete_own ON public.shifts;

CREATE POLICY shifts_select_own
ON public.shifts
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY shifts_insert_own
ON public.shifts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY shifts_update_own
ON public.shifts
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY shifts_delete_own
ON public.shifts
FOR DELETE
USING (auth.uid() = user_id);

-- -----------------------------------------------------
-- 4) Safer profile trigger function
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    updated_at = NOW();

  RETURN NEW;
END;
$$;

-- -----------------------------------------------------
-- 5) Analytics RPCs: security + correctness + performance
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_monthly_summary(
  p_user_id UUID,
  p_year INTEGER,
  p_month INTEGER
)
RETURNS TABLE (
  organization_id UUID,
  organization_name TEXT,
  organization_color TEXT,
  shift_count BIGINT,
  total_hours DECIMAL
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_role TEXT := auth.role();
  v_month_start DATE;
  v_month_end DATE;
BEGIN
  IF v_role = 'service_role' THEN
    IF p_user_id IS NULL THEN
      RAISE EXCEPTION 'p_user_id is required for service_role';
    END IF;
    v_uid := p_user_id;
  ELSE
    IF v_uid IS NULL THEN
      RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF p_user_id IS DISTINCT FROM v_uid THEN
      RAISE EXCEPTION 'p_user_id must match auth.uid()';
    END IF;
  END IF;

  IF p_month < 1 OR p_month > 12 THEN
    RAISE EXCEPTION 'p_month must be between 1 and 12';
  END IF;

  v_month_start := make_date(p_year, p_month, 1);
  v_month_end := (v_month_start + INTERVAL '1 month')::DATE;

  RETURN QUERY
  SELECT
    o.id AS organization_id,
    o.name AS organization_name,
    o.color AS organization_color,
    COUNT(s.id) AS shift_count,
    COALESCE(
      SUM(EXTRACT(EPOCH FROM ((COALESCE(s.end_date, s.date) + s.end_time) - (s.date + s.start_time))) / 3600),
      0
    ) AS total_hours
  FROM public.organizations o
  LEFT JOIN public.shifts s ON s.organization_id = o.id
    AND s.date >= v_month_start
    AND s.date < v_month_end
  WHERE o.user_id = v_uid
  GROUP BY o.id, o.name, o.color
  ORDER BY total_hours DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_financial_year_summary(
  p_user_id UUID,
  p_fy_start_year INTEGER
)
RETURNS TABLE (
  organization_id UUID,
  organization_name TEXT,
  organization_color TEXT,
  shift_count BIGINT,
  total_hours DECIMAL
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_role TEXT := auth.role();
  v_fy_start DATE;
  v_fy_end DATE;
BEGIN
  IF v_role = 'service_role' THEN
    IF p_user_id IS NULL THEN
      RAISE EXCEPTION 'p_user_id is required for service_role';
    END IF;
    v_uid := p_user_id;
  ELSE
    IF v_uid IS NULL THEN
      RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF p_user_id IS DISTINCT FROM v_uid THEN
      RAISE EXCEPTION 'p_user_id must match auth.uid()';
    END IF;
  END IF;

  v_fy_start := make_date(p_fy_start_year, 7, 1);
  v_fy_end := make_date(p_fy_start_year + 1, 7, 1);

  RETURN QUERY
  SELECT
    o.id AS organization_id,
    o.name AS organization_name,
    o.color AS organization_color,
    COUNT(s.id) AS shift_count,
    COALESCE(
      SUM(EXTRACT(EPOCH FROM ((COALESCE(s.end_date, s.date) + s.end_time) - (s.date + s.start_time))) / 3600),
      0
    ) AS total_hours
  FROM public.organizations o
  LEFT JOIN public.shifts s ON s.organization_id = o.id
    AND s.date >= v_fy_start
    AND s.date < v_fy_end
  WHERE o.user_id = v_uid
  GROUP BY o.id, o.name, o.color
  ORDER BY total_hours DESC;
END;
$$;

-- Optional: harden companion RPC used by the analytics page
CREATE OR REPLACE FUNCTION public.get_shifts_by_financial_year(
  p_user_id UUID,
  p_fy_start_year INTEGER
)
RETURNS TABLE (
  id UUID,
  organization_id UUID,
  organization_name TEXT,
  organization_color TEXT,
  title TEXT,
  date DATE,
  start_time TIME,
  end_time TIME,
  hours_worked DECIMAL
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_role TEXT := auth.role();
  v_fy_start DATE;
  v_fy_end DATE;
BEGIN
  IF v_role = 'service_role' THEN
    IF p_user_id IS NULL THEN
      RAISE EXCEPTION 'p_user_id is required for service_role';
    END IF;
    v_uid := p_user_id;
  ELSE
    IF v_uid IS NULL THEN
      RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF p_user_id IS DISTINCT FROM v_uid THEN
      RAISE EXCEPTION 'p_user_id must match auth.uid()';
    END IF;
  END IF;

  v_fy_start := make_date(p_fy_start_year, 7, 1);
  v_fy_end := make_date(p_fy_start_year + 1, 7, 1);

  RETURN QUERY
  SELECT
    s.id,
    s.organization_id,
    o.name AS organization_name,
    o.color AS organization_color,
    s.title,
    s.date,
    s.start_time,
    s.end_time,
    EXTRACT(EPOCH FROM ((COALESCE(s.end_date, s.date) + s.end_time) - (s.date + s.start_time))) / 3600 AS hours_worked
  FROM public.shifts s
  JOIN public.organizations o ON s.organization_id = o.id
  WHERE s.user_id = v_uid
    AND s.date >= v_fy_start
    AND s.date < v_fy_end
  ORDER BY s.date, s.start_time;
END;
$$;

REVOKE ALL ON FUNCTION public.get_monthly_summary(UUID, INTEGER, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_financial_year_summary(UUID, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_shifts_by_financial_year(UUID, INTEGER) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_monthly_summary(UUID, INTEGER, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_financial_year_summary(UUID, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_shifts_by_financial_year(UUID, INTEGER) TO authenticated, service_role;
