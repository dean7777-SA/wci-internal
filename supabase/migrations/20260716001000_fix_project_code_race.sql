-- Fix race condition in project code generation by using per-year atomic counters.

CREATE TABLE IF NOT EXISTS public.project_code_counters (
  project_year INTEGER PRIMARY KEY,
  last_value INTEGER NOT NULL CHECK (last_value > 0)
);

-- Backfill counters from existing project_code values.
INSERT INTO public.project_code_counters (project_year, last_value)
SELECT
  split_part(project_code, '-', 2)::INTEGER AS project_year,
  MAX(split_part(project_code, '-', 3)::INTEGER) AS last_value
FROM public.projects
WHERE project_code ~ '^WCI-[0-9]{4}-[0-9]+$'
GROUP BY split_part(project_code, '-', 2)::INTEGER
ON CONFLICT (project_year) DO UPDATE
SET last_value = GREATEST(public.project_code_counters.last_value, EXCLUDED.last_value);

CREATE OR REPLACE FUNCTION public.generate_project_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  year_num INTEGER;
  next_num INTEGER;
BEGIN
  IF NEW.project_code IS NOT NULL
     AND NEW.project_code <> ''
     AND NEW.project_code <> 'PENDING' THEN
    RETURN NEW;
  END IF;

  year_num := EXTRACT(YEAR FROM NOW())::INTEGER;

  INSERT INTO public.project_code_counters (project_year, last_value)
  VALUES (year_num, 1)
  ON CONFLICT (project_year) DO UPDATE
  SET last_value = public.project_code_counters.last_value + 1
  RETURNING last_value INTO next_num;

  NEW.project_code := 'WCI-' || year_num::TEXT || '-' || LPAD(next_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$;
