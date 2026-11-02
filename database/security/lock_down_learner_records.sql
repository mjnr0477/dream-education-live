-- Lock learner records behind the authenticated application server.
-- Dream Education reads and writes these tables through its server-side
-- Supabase service credential after application-level account/relationship checks.
-- Keep RLS enabled; service_role retains the backend access required by the app.

BEGIN;

DROP POLICY IF EXISTS "Allow public learner registration" ON public.dream_learners;
DROP POLICY IF EXISTS "Allow learning assessment insert" ON public.learning_assessments;
DROP POLICY IF EXISTS "Allow learning assessment read" ON public.learning_assessments;

REVOKE ALL ON TABLE
  public.dream_learners,
  public.learning_history,
  public.learning_assessments
FROM anon, authenticated;

GRANT ALL ON TABLE
  public.dream_learners,
  public.learning_history,
  public.learning_assessments
TO service_role;

COMMIT;
