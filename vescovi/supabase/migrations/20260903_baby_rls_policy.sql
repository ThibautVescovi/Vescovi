-- Enable RLS and allow anonymous inserts into baby table
-- Date: 2026-09-03

-- Ensure RLS is enabled on the table
ALTER TABLE public.baby ENABLE ROW LEVEL SECURITY;

-- Allow anyone (including anon) to INSERT into baby. Adjust later if you want stricter rules.
CREATE POLICY "Allow public inserts" ON public.baby
  FOR INSERT
  USING (true)
  WITH CHECK (true);

-- Optionally, you may want to allow SELECT for all so a public listing works:
-- CREATE POLICY "Allow public select" ON public.baby
--   FOR SELECT
--   USING (true);
