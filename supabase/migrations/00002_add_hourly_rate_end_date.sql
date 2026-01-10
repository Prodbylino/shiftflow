-- Add hourly_rate to organizations for earnings calculation
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10,2) DEFAULT 0;

-- Add end_date to shifts for multi-day shifts
ALTER TABLE public.shifts
ADD COLUMN IF NOT EXISTS end_date DATE;

-- Set end_date = date for existing records (single-day shifts)
UPDATE public.shifts SET end_date = date WHERE end_date IS NULL;
