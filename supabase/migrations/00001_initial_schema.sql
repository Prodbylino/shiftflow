-- Shift Planner Initial Schema
-- Run this SQL in your Supabase SQL Editor

-- =====================================================
-- 1. PROFILES TABLE (extends auth.users)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- =====================================================
-- 2. ORGANIZATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organizations
CREATE POLICY "Users can manage own organizations" ON public.organizations
  FOR ALL USING (auth.uid() = user_id);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_organizations_user ON public.organizations(user_id);

-- =====================================================
-- 3. SHIFTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.shifts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shifts
CREATE POLICY "Users can manage own shifts" ON public.shifts
  FOR ALL USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_shifts_user_date ON public.shifts(user_id, date);
CREATE INDEX IF NOT EXISTS idx_shifts_org ON public.shifts(organization_id);

-- =====================================================
-- 4. RECURRENCE PATTERNS TABLE (for auto-suggestions)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.recurrence_patterns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  confidence_score DECIMAL(3,2) DEFAULT 0.00 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  occurrence_count INTEGER DEFAULT 0,
  last_detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, organization_id, day_of_week, start_time)
);

-- Enable RLS
ALTER TABLE public.recurrence_patterns ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage own patterns" ON public.recurrence_patterns
  FOR ALL USING (auth.uid() = user_id);

-- Index
CREATE INDEX IF NOT EXISTS idx_patterns_user ON public.recurrence_patterns(user_id);

-- =====================================================
-- 5. SHIFT SUGGESTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.shift_suggestions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  pattern_id UUID REFERENCES public.recurrence_patterns(id) ON DELETE CASCADE NOT NULL,
  suggested_date DATE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'dismissed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(pattern_id, suggested_date)
);

-- Enable RLS
ALTER TABLE public.shift_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage own suggestions" ON public.shift_suggestions
  FOR ALL USING (auth.uid() = user_id);

-- Index
CREATE INDEX IF NOT EXISTS idx_suggestions_user_status ON public.shift_suggestions(user_id, status);

-- =====================================================
-- 6. FUNCTION: Auto-create profile on signup
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 7. FUNCTION: Get monthly summary
-- =====================================================
CREATE OR REPLACE FUNCTION get_monthly_summary(
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
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id AS organization_id,
    o.name AS organization_name,
    o.color AS organization_color,
    COUNT(s.id) AS shift_count,
    COALESCE(SUM(EXTRACT(EPOCH FROM (s.end_time - s.start_time)) / 3600), 0) AS total_hours
  FROM public.organizations o
  LEFT JOIN public.shifts s ON s.organization_id = o.id
    AND EXTRACT(YEAR FROM s.date) = p_year
    AND EXTRACT(MONTH FROM s.date) = p_month
  WHERE o.user_id = p_user_id
  GROUP BY o.id, o.name, o.color
  ORDER BY total_hours DESC;
END;
$$;

-- =====================================================
-- 8. FUNCTION: Get shifts by Australian Financial Year
-- =====================================================
CREATE OR REPLACE FUNCTION get_shifts_by_financial_year(
  p_user_id UUID,
  p_fy_start_year INTEGER -- e.g., 2024 for FY 2024-2025 (July 2024 - June 2025)
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
SECURITY DEFINER
AS $$
BEGIN
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
    EXTRACT(EPOCH FROM (s.end_time - s.start_time)) / 3600 AS hours_worked
  FROM public.shifts s
  JOIN public.organizations o ON s.organization_id = o.id
  WHERE s.user_id = p_user_id
    AND s.date >= make_date(p_fy_start_year, 7, 1)
    AND s.date <= make_date(p_fy_start_year + 1, 6, 30)
  ORDER BY s.date, s.start_time;
END;
$$;

-- =====================================================
-- 9. FUNCTION: Get financial year summary
-- =====================================================
CREATE OR REPLACE FUNCTION get_financial_year_summary(
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
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id AS organization_id,
    o.name AS organization_name,
    o.color AS organization_color,
    COUNT(s.id) AS shift_count,
    COALESCE(SUM(EXTRACT(EPOCH FROM (s.end_time - s.start_time)) / 3600), 0) AS total_hours
  FROM public.organizations o
  LEFT JOIN public.shifts s ON s.organization_id = o.id
    AND s.date >= make_date(p_fy_start_year, 7, 1)
    AND s.date <= make_date(p_fy_start_year + 1, 6, 30)
  WHERE o.user_id = p_user_id
  GROUP BY o.id, o.name, o.color
  ORDER BY total_hours DESC;
END;
$$;
