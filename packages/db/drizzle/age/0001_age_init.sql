-- Apache AGE bootstrap for the Factivist domain knowledge graph.
--
-- This migration is kept SEPARATE from the drizzle-managed migrations because
-- (a) AGE introduces its own catalog and Cypher dialect that drizzle-kit does
-- not understand and (b) AGE requires the extension to be pre-approved on the
-- target Postgres. On Supabase, request enablement via the dashboard or open
-- a support ticket before applying this file.
--
-- Apply with: `bun run db:migrate:age` (see src/migrate-age.ts).
--
-- Idempotency: every statement uses IF NOT EXISTS or its Cypher equivalent so
-- the script can run on a fresh DB or against one where AGE is already set up
-- without producing errors. Re-running after a partial failure is safe.

CREATE EXTENSION IF NOT EXISTS age;

LOAD 'age';

SET search_path = ag_catalog, "$user", public;

-- Graph creation is the single non-idempotent step in AGE: `create_graph`
-- raises an exception if the graph already exists. We guard with a DO block
-- that catches the duplicate-object error.
DO $$
BEGIN
  PERFORM ag_catalog.create_graph('factivist_kg');
EXCEPTION
  WHEN duplicate_schema THEN NULL;
  WHEN duplicate_object THEN NULL;
END;
$$;

-- Vertex labels — entities, the claims made about them, the sources we cite,
-- and the evidence linking a source to a claim. Edge labels capture the
-- claim → source provenance ("CITES"), the relationship between conflicting
-- claims ("CONTRADICTS"), what an entity is about ("ABOUT"), and which claim
-- a piece of evidence supports ("SUPPORTS").
SELECT ag_catalog.create_vlabel('factivist_kg', 'Entity')   WHERE NOT EXISTS
  (SELECT 1 FROM ag_catalog.ag_label WHERE name = 'Entity'   AND graph = (SELECT graphid FROM ag_catalog.ag_graph WHERE name = 'factivist_kg'));
SELECT ag_catalog.create_vlabel('factivist_kg', 'Claim')    WHERE NOT EXISTS
  (SELECT 1 FROM ag_catalog.ag_label WHERE name = 'Claim'    AND graph = (SELECT graphid FROM ag_catalog.ag_graph WHERE name = 'factivist_kg'));
SELECT ag_catalog.create_vlabel('factivist_kg', 'Source')   WHERE NOT EXISTS
  (SELECT 1 FROM ag_catalog.ag_label WHERE name = 'Source'   AND graph = (SELECT graphid FROM ag_catalog.ag_graph WHERE name = 'factivist_kg'));
SELECT ag_catalog.create_vlabel('factivist_kg', 'Evidence') WHERE NOT EXISTS
  (SELECT 1 FROM ag_catalog.ag_label WHERE name = 'Evidence' AND graph = (SELECT graphid FROM ag_catalog.ag_graph WHERE name = 'factivist_kg'));

SELECT ag_catalog.create_elabel('factivist_kg', 'ASSERTS')      WHERE NOT EXISTS
  (SELECT 1 FROM ag_catalog.ag_label WHERE name = 'ASSERTS'      AND graph = (SELECT graphid FROM ag_catalog.ag_graph WHERE name = 'factivist_kg'));
SELECT ag_catalog.create_elabel('factivist_kg', 'CITES')        WHERE NOT EXISTS
  (SELECT 1 FROM ag_catalog.ag_label WHERE name = 'CITES'        AND graph = (SELECT graphid FROM ag_catalog.ag_graph WHERE name = 'factivist_kg'));
SELECT ag_catalog.create_elabel('factivist_kg', 'CONTRADICTS')  WHERE NOT EXISTS
  (SELECT 1 FROM ag_catalog.ag_label WHERE name = 'CONTRADICTS'  AND graph = (SELECT graphid FROM ag_catalog.ag_graph WHERE name = 'factivist_kg'));
SELECT ag_catalog.create_elabel('factivist_kg', 'ABOUT')        WHERE NOT EXISTS
  (SELECT 1 FROM ag_catalog.ag_label WHERE name = 'ABOUT'        AND graph = (SELECT graphid FROM ag_catalog.ag_graph WHERE name = 'factivist_kg'));
SELECT ag_catalog.create_elabel('factivist_kg', 'SUPPORTS')     WHERE NOT EXISTS
  (SELECT 1 FROM ag_catalog.ag_label WHERE name = 'SUPPORTS'     AND graph = (SELECT graphid FROM ag_catalog.ag_graph WHERE name = 'factivist_kg'));
