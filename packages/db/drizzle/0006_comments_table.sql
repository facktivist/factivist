-- Phase 5 wave 4 — threaded comments under a complaint.
--
-- Schema source: packages/db/src/schema/comments.ts.
--
-- Anonymity posture (matches the rest of the citizen-content tables):
--   - RLS enabled at the table level.
--   - Anon SELECT gated on the parent complaint being published AND
--     the comment not being flagged.
--   - All writes flow through apps/api with the service-role key
--     (which bypasses RLS by Supabase convention).
--
-- This is a forward-only migration. Backfill not needed (no production
-- comments yet — S1 is pre-launch).

BEGIN;

CREATE TABLE IF NOT EXISTS "comments" (
  "id" TEXT PRIMARY KEY,
  "parent_id" TEXT REFERENCES "comments"("id") ON DELETE CASCADE,
  "complaint_slug" TEXT NOT NULL REFERENCES "complaints"("slug") ON DELETE CASCADE,
  "author_id" TEXT NOT NULL REFERENCES "citizens"("id") ON DELETE CASCADE,
  "body" TEXT NOT NULL,
  "flagged_state" TEXT NOT NULL DEFAULT 'ok' CHECK ("flagged_state" IN ('ok', 'flagged')),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "comments_by_complaint"
  ON "comments" ("complaint_slug", "created_at");

CREATE INDEX IF NOT EXISTS "comments_by_parent"
  ON "comments" ("parent_id");

-- RLS — citizen-content posture (matches 0004_enable_rls.sql).
ALTER TABLE "comments" ENABLE ROW LEVEL SECURITY;

-- Anon SELECT: only on comments whose parent complaint is published +
-- the comment itself isn't flagged. EXISTS subquery is allowed in
-- Supabase RLS predicates.
CREATE POLICY "comments_anon_read_published" ON "comments"
  FOR SELECT TO anon USING (
    flagged_state = 'ok'
    AND EXISTS (
      SELECT 1 FROM complaints c
      WHERE c.slug = comments.complaint_slug
        AND c.status = 'published'
    )
  );

-- No anon INSERT/UPDATE/DELETE policies — service role only.

COMMIT;
