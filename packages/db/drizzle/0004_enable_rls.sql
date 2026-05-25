-- Phase 8 §8.6 — Supabase row-level security on every table that
-- touches citizens or citizen-generated content. Service-role bypasses
-- RLS (Supabase default) and is used exclusively by apps/api on Fly.io;
-- the web client only ever sees the anon key + the user's auth JWT.
--
-- Policy stance (S1):
--   - `public_read` policies allow SELECT for `anon` only on rows
--     visible to the public feed (e.g. complaints that have passed
--     moderation). All citizen-PII tables (`citizens`, `users`,
--     `audit_log`, `dev_metrics.*`) deny all client access.
--   - Mutations are NEVER performed via the anon key — apps/api does
--     all writes via the service-role and is the sole policy author.
--
-- This file is a one-shot enabler; per-row predicates that depend on
-- session role (admin vs operator) are added in S2 once Supabase Auth
-- carries a stable `app_metadata.role` claim (Phase 5 wave 2).

-- Citizen-PII surface — never readable by the anon client.
ALTER TABLE "citizens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;

-- Reference data — fine to be world-readable, but lock writes.
ALTER TABLE "states" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "districts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "parliamentary_constituencies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "assembly_constituencies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "feature_flags" ENABLE ROW LEVEL SECURITY;

-- Citizen-generated content — anon may SELECT visible rows; never write.
ALTER TABLE "complaints" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "complaint_flags" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "moderation_queue" ENABLE ROW LEVEL SECURITY;

-- Read-only public reference data (anon SELECT).
CREATE POLICY "states_anon_read" ON "states"
  FOR SELECT TO anon USING (true);
CREATE POLICY "districts_anon_read" ON "districts"
  FOR SELECT TO anon USING (true);
CREATE POLICY "parliamentary_constituencies_anon_read" ON "parliamentary_constituencies"
  FOR SELECT TO anon USING (true);
CREATE POLICY "assembly_constituencies_anon_read" ON "assembly_constituencies"
  FOR SELECT TO anon USING (true);
CREATE POLICY "categories_anon_read" ON "categories"
  FOR SELECT TO anon USING (true);

-- Public-feed complaints — anon may SELECT rows that have cleared
-- moderation. The `is_public` column is set to true by the moderation
-- worker on resolve. Rows in flight (under review, retired, deleted)
-- stay invisible to the anon client.
CREATE POLICY "complaints_anon_read_public" ON "complaints"
  FOR SELECT TO anon USING (
    status = 'published'
  );

-- No anon policies for: citizens, users, audit_log, complaint_flags,
-- moderation_queue, feature_flags. Default-deny via RLS-on, no policy.
-- All access for those tables flows through apps/api with the
-- service-role JWT (which bypasses RLS by Supabase convention).

-- dev_metrics is in a separate schema and is internal-only; RLS-on
-- with no policy is the lock-down stance.
ALTER TABLE "dev_metrics"."llm_calls" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "dev_metrics"."zkp_route_events" ENABLE ROW LEVEL SECURITY;
