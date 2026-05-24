import { createClient } from '../client.ts'
import { categories } from '../schema/categories.ts'

/**
 * Canonical S1 complaint taxonomy — **exactly 35 rows**.
 *
 * Source of truth: `docs/product/product-vison.md` §1 (lists 36 rows under
 * the heading "35 Categories") merged per the AMB-05 user decision recorded
 * in the Phase 1 backlog memory + `aggregates.md` §Category. The merge folds
 * row 36 ("Public Money Scandals" — govt-official bribery + tender rigging)
 * into row 24 ("Corruption (Systemic & Everyday)" — bribery, nepotism,
 * tender rigging, welfare leakage) because the two are semantically the
 * same accusation surface. The product-vision label for #24 is preserved
 * verbatim so the 36→35 collapse is observable in the migration history.
 *
 * Ordering preserves the product-vision sequence with the merged row 36
 * dropped; `sortOrder` is a dense `0..34` so pickers can render
 * deterministically. The PK is the slug per [[ADR-012]] (`^[a-z0-9-]+$`)
 * and is stable across re-seeds — labels MAY evolve via migrations, slugs
 * MUST NOT.
 *
 * Invariants enforced here (see `aggregates.md` §Category, ATID-COMPL-003):
 *   I-CAT-1: row count == 35
 *   I-CAT-2: read-only at runtime (this file is build-time only)
 *   slug:    matches `^[a-z0-9-]+$`
 *   sortOrder: dense `0..34`, unique
 *
 * NOTE on `sortOrder`: the schema column is `text` (not numeric) — values
 * are zero-padded to two digits (`'00'..'34'`) so that lexicographic
 * ordering matches numeric ordering. The `GET /categories` route's
 * `orderBy(asc(sortOrder), asc(label))` then surfaces the intended order
 * without a server-side cast.
 */
export const S1_CATEGORIES: readonly { slug: string; label: string; sortOrder: string }[] = [
  // Original 8 (product-vision rows 1..8)
  { slug: 'infrastructure', label: 'Infrastructure', sortOrder: '00' },
  { slug: 'women-safety', label: 'Women Safety', sortOrder: '01' },
  {
    slug: 'police-incompetence-intimidation-brutality',
    label: 'Police Incompetence, Intimidation & Brutality',
    sortOrder: '02',
  },
  { slug: 'mob-lynching', label: 'Mob Lynching', sortOrder: '03' },
  {
    slug: 'customer-grievance',
    label: 'Customer Grievance (Private & Government Orgs)',
    sortOrder: '04',
  },
  { slug: 'environmental-issues', label: 'Environmental Issues', sortOrder: '05' },
  { slug: 'bad-civic-behaviour', label: 'Bad Civic Behaviour', sortOrder: '06' },
  {
    slug: 'inter-organization-employee-issues',
    label: 'Inter-Organization Employee Issues',
    sortOrder: '07',
  },
  // Expanded 27 (product-vision rows 9..35; row 36 merged into row 24)
  { slug: 'healthcare-system-failures', label: 'Healthcare System Failures', sortOrder: '08' },
  { slug: 'education-system-problems', label: 'Education System Problems', sortOrder: '09' },
  { slug: 'land-property-disputes', label: 'Land & Property Disputes', sortOrder: '10' },
  { slug: 'caste-based-discrimination', label: 'Caste-Based Discrimination', sortOrder: '11' },
  {
    slug: 'religious-communal-discrimination',
    label: 'Religious & Communal Discrimination',
    sortOrder: '12',
  },
  { slug: 'child-labor-exploitation', label: 'Child Labor & Exploitation', sortOrder: '13' },
  {
    slug: 'digital-rights-privacy-violations',
    label: 'Digital Rights & Privacy Violations',
    sortOrder: '14',
  },
  { slug: 'rti-obstruction', label: 'RTI Obstruction', sortOrder: '15' },
  { slug: 'electoral-malpractice', label: 'Electoral Malpractice', sortOrder: '16' },
  {
    slug: 'public-transport-road-safety',
    label: 'Public Transport & Road Safety',
    sortOrder: '17',
  },
  {
    slug: 'water-sanitation-hygiene',
    label: 'Water, Sanitation & Hygiene',
    sortOrder: '18',
  },
  { slug: 'food-safety-adulteration', label: 'Food Safety & Adulteration', sortOrder: '19' },
  { slug: 'labor-rights-violations', label: 'Labor Rights Violations', sortOrder: '20' },
  { slug: 'housing-homelessness', label: 'Housing & Homelessness', sortOrder: '21' },
  {
    slug: 'media-censorship-press-freedom',
    label: 'Media Censorship & Press Freedom',
    sortOrder: '22',
  },
  // Row 23 (#24 in source list): "Public Money Scandals" (row 36) merged here per AMB-05.
  {
    slug: 'corruption-systemic-everyday',
    label: 'Corruption (Systemic & Everyday)',
    sortOrder: '23',
  },
  { slug: 'judicial-system-failures', label: 'Judicial System Failures', sortOrder: '24' },
  {
    slug: 'elderly-abuse-senior-citizen-issues',
    label: 'Elderly Abuse & Senior Citizen Issues',
    sortOrder: '25',
  },
  {
    slug: 'persons-with-disabilities-rights',
    label: 'Persons with Disabilities Rights',
    sortOrder: '26',
  },
  { slug: 'migrant-refugee-issues', label: 'Migrant & Refugee Issues', sortOrder: '27' },
  {
    slug: 'animal-cruelty-stray-animal-menace',
    label: 'Animal Cruelty & Stray Animal Menace',
    sortOrder: '28',
  },
  {
    slug: 'noise-pollution-public-nuisance',
    label: 'Noise Pollution & Public Nuisance',
    sortOrder: '29',
  },
  {
    slug: 'government-bureaucracy-red-tape',
    label: 'Government Bureaucracy & Red Tape',
    sortOrder: '30',
  },
  {
    slug: 'mental-health-substance-abuse',
    label: 'Mental Health & Substance Abuse',
    sortOrder: '31',
  },
  {
    slug: 'shrinking-civic-space-civil-liberties',
    label: 'Shrinking Civic Space & Civil Liberties',
    sortOrder: '32',
  },
  { slug: 'farmer-issues', label: 'Farmer Issues', sortOrder: '33' },
  {
    slug: 'consumer-financial-exploitation',
    label: 'Consumer Financial Exploitation',
    sortOrder: '34',
  },
] as const

/**
 * Idempotent category seed: inserts the 35-row S1 taxonomy, skipping any
 * row whose slug already exists. Safe to re-run after migrations or on a
 * fresh DB. Returns counts so the caller can observe drift between runs.
 *
 * The function takes no `db` argument by design — like `seedFeatureFlags`,
 * it owns its own connection so it can be invoked as a one-shot CLI
 * (`bun run db:seed:categories`) or programmatically from another seed
 * orchestrator. Tests mock `../client.ts` to avoid a live connection.
 */
export const seedCategories = async (): Promise<{
  inserted: number
  total: typeof S1_CATEGORIES.length
}> => {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error('DATABASE_URL must be set to run the categories seed.')
  }

  const database = createClient(url)

  const result = await database
    .insert(categories)
    .values([...S1_CATEGORIES])
    .onConflictDoNothing({ target: categories.slug })
    .returning({ slug: categories.slug })

  return { inserted: result.length, total: S1_CATEGORIES.length }
}

// Bun-only entrypoint guard. Skipped when imported by tests or the CLI.
if (import.meta.main) {
  const { inserted, total } = await seedCategories()
  console.log(
    JSON.stringify({
      seed: 'categories',
      inserted,
      total,
      existing: total - inserted,
    }),
  )
}
