-- Build 01 security hardening: keep backend-owned intelligence data out of the public Data API.
-- The application server uses its server-side Supabase credential.

REVOKE ALL ON TABLE
  public.dream_learner_graph_snapshots,
  public.dream_learning_events,
  public.dream_learning_sessions,
  public.dream_school_tenants,
  public.dream_knowledge_documents,
  public.dream_knowledge_chunks,
  public.dream_competency_credentials,
  public.dream_tenant_memberships,
  public.dream_developer_api_keys
FROM anon, authenticated;

GRANT ALL ON TABLE
  public.dream_learner_graph_snapshots,
  public.dream_learning_events,
  public.dream_learning_sessions,
  public.dream_school_tenants,
  public.dream_knowledge_documents,
  public.dream_knowledge_chunks,
  public.dream_competency_credentials,
  public.dream_tenant_memberships,
  public.dream_developer_api_keys
TO service_role;

REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
