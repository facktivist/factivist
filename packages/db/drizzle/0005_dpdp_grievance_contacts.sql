-- Phase 9 §3 — DPDP §8(7) compliance for grievance complainant PII.
--
-- BEFORE: complainant name + email lived in audit_log.rationale as
-- free text under the 180-day CERT-In retention. That violated:
--   - DPDP §8(7) (purpose-fulfilment erasure)
--   - DPDP Rules 2025 Rule 8(3) (audit_log itself MUST be ≥ 365 days)
--
-- AFTER:
--   - audit_log carries `rationale = "complainant_email_sha256=<hex>"`
--   - complainant PII lives in `grievance_contacts` with a 30-day
--     post-resolve erasure window enforced by
--     `scripts/grievance-contacts-sweep.ts`
--
-- This migration is **forward-only** + **non-destructive** — it adds a
-- new table; no existing rows are modified. Backfill of pre-Phase-9
-- audit_log.rationale grievance rows is not needed because S1 has not
-- yet ingested production grievances.
--
-- Legal counsel sign-off pending per Phase 9 §3 — counsel may amend the
-- 30-day post-resolve window. If they do, change
-- `GRIEVANCE_CONTACTS_ERASE_AFTER_DAYS` in the schema file AND alter
-- the GENERATED ALWAYS expression below in a follow-up migration.

BEGIN;

CREATE TABLE IF NOT EXISTS "grievance_contacts" (
  "grievance_id" TEXT PRIMARY KEY,
  "complainant_name" TEXT NOT NULL,
  "complainant_email" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "resolved_at" TIMESTAMPTZ,
  "erase_after" TIMESTAMPTZ GENERATED ALWAYS AS (resolved_at + INTERVAL '30 days') STORED
);

-- Sweep helper: makes the daily DELETE WHERE erase_after < now() fast.
CREATE INDEX IF NOT EXISTS "grievance_contacts_by_erase_after"
  ON "grievance_contacts" ("erase_after");

-- RLS on by default (matches 0004_enable_rls.sql posture for every
-- citizen / grievance-related table).
ALTER TABLE "grievance_contacts" ENABLE ROW LEVEL SECURITY;

-- Only the service role + admin claim can SELECT / INSERT / UPDATE /
-- DELETE. Anon is denied (no PII leakage via Supabase API). The named
-- policies match the convention in 0004_enable_rls.sql.
CREATE POLICY "grievance_contacts_admin_read"
  ON "grievance_contacts" FOR SELECT
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "grievance_contacts_admin_write"
  ON "grievance_contacts" FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "grievance_contacts_admin_update"
  ON "grievance_contacts" FOR UPDATE
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "grievance_contacts_admin_delete"
  ON "grievance_contacts" FOR DELETE
  USING (auth.jwt() ->> 'role' = 'admin');

COMMIT;
