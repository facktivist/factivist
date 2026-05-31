# Factivist S1 — DDD Aggregates

> **Phase 4 deliverable** (action plan §4.5 — `docs/architecture/aggregates.md`).
> Tactical Domain-Driven Design view of the seven bounded contexts named in
> [`s1-c4.md`](./s1-c4.md) §LEVEL 2 (identity, complaint, comment, moderation,
> discovery, geo, admin). Each aggregate listed here is a **consistency
> boundary**: every write inside it MUST satisfy the invariants in one
> transaction; cross-aggregate writes go via domain events or a separate
> repository call.
>
> Companion files:
>
> - [`s1-c4.md`](./s1-c4.md) — C4 Context → Container → Component diagrams.
> - [`bounded-contexts.md`](./bounded-contexts.md) — per-context purpose + public interface.
> - [`package-map.md`](./package-map.md) — bounded context ↔ `apps/*` ↔ `packages/*` mapping.
> - [`../adr/`](../adr/) — `[[ADR-001]]`..`[[ADR-013]]` source decisions.
> - [`packages/shared/src/data/atid-registry.ts`](../../packages/shared/src/data/atid-registry.ts)
>   — ATID-anchored Given/When/Then assertions cited as `ATID-…` below.
>
> Cross-cutting invariants (apply to every aggregate) live at the bottom of
> this file under [Cross-aggregate invariants](#cross-aggregate-invariants).
> Inline `[[ADR-NNN]]` and `ATID-…` anchors are load-bearing — do not strip
> them when refactoring.

---

## Aggregate index

| # | Aggregate root | Bounded context | Repository | Key invariants |
|---|----------------|-----------------|------------|----------------|
| 1 | `Citizen` | identity | `CitizenRepository` | PK = `Nullifier` (32 B); no PII fields anywhere; on-chain `CitizenVerifier.nullifierUsed[]` is the authority ([[ADR-003]], [[ADR-010]]) |
| 2 | `Complaint` | complaint | `ComplaintRepository` | PK = `Slug` ([[ADR-012]]); `author_id → Citizen`; ≤ 3 photos; EXIF stripped server-side ([[ADR-004]]); manual constituency picker only ([[ADR-013]]) |
| 3 | `Comment` | comment | `CommentRepository` | Belongs to one `Complaint`; flat in S1 (no `parent_comment_id`); same `author_id → Citizen` nullifier guard |
| 4 | `ModerationCase` | moderation | `ModerationCaseRepository` | Polymorphic target (`complaint` \| `comment`); decision is atomic with target `status` update; SLA: 24 h NCII, 24 h pii-leak, 24 h Factivist defamation, 36 h Rule 3(1)(d) ceiling ([[ADR-014]], [[ADR-020]]) |
| 5 | `Constituency` | geo | `ConstituencyRepository` (read-only) | Closed reference set ([[ADR-007]]); layered ECI 2008 Order (text) + DataMeet shapefiles (geometry) + India Post PIN directory; hierarchy `State → District → PC → AC` enforced |
| 6 | `Category` | complaint (reference) | `CategoryRepository` (read-only) | Exactly 35 rows at S1 launch (Phase 1 user decision); PK = `CategorySlug` (`^[a-z0-9-]+$`); seeded via Drizzle migration |
| 7 | `Flag` | moderation | `FlagRepository` (child via `ModerationCase`) | Polymorphic `target_kind ∈ {complaint, comment}`; reporter identity NEVER returned to non-admin readers; `pii-leak` is a first-class reason (Phase 3 decision D4) |
| 8 | `Admin` | admin | `AdminRepository` | Distinct trust root from `Citizen` — Supabase Auth JWT + `role=admin`; never reuses citizen nullifier; cannot deanonymise ([[ADR-010]]) |
| 9 | `FeatureFlag` | admin | `FeatureFlagRepository` | Gates `S1_PUBLIC_BROWSE`, `S1_COMPLAINT_SUBMIT` (action plan §5.4); every mutation writes `audit_log` |

---

## 1. `Citizen` aggregate

Owned by the **identity** context. The aggregate root carries the proof of
unique Indian citizenship and nothing else. It is the only aggregate whose
PK is a cryptographic value rather than a slug or UUID.

### Aggregate root
- **Entity**: `Citizen`
- **PK**: `Nullifier` — a 32-byte value (`bytea` / `Hex<32>`) globally unique
  across the entire system. Scope of uniqueness is the on-chain
  `CitizenVerifier.nullifierUsed[]` set on Polygon PoS mainnet.
- **Surrogate `citizen_id`**: a UUID exists for relational convenience
  (foreign-keyed by `Complaint.author_id`, `Comment.author_id`,
  `Flag.reporter_id`) but is derived 1:1 from `Nullifier`. Per ATID-COMPL-006,
  the raw nullifier is NEVER stored in any non-`citizens` row.

### Member entities
- None at S1. `Citizen` is a single-row aggregate. (S2 may add
  `DeviceCredential` / `RecoveryShare`.)

### Value objects
- `Nullifier` — `{ value: Hex<32> }`. Constructed by
  `Poseidon(seed, Poseidon(photo[0..15]), Poseidon(photo[16..31]))` per the
  ZKP research wiki. **Aadhaar number is NOT in the input** (this corrects
  the vision §3.3 wording).
- `Handle` — `{ value: Base32<10> }`. Deterministic Poseidon-derived from
  `Nullifier` (see `packages/shared/src/handle.ts`); ~50 bits, collision-safe
  at S1 scale (ATID-IDENT-006).
- `StateCode` / `DistrictCode` — typed aliases over the geo enums in
  `packages/shared/constants/geo.ts`. The only two PII-adjacent fields stored
  for a citizen, and both are coarse-grained (≥ tens of thousands of people).
- `VerificationStatus` — `'verified' | 'revoked'`. S1 never revokes; field
  exists for forward compatibility.

### Invariants
- **I-CIT-1** (ATID-IDENT-001, ATID-IDENT-003): The row contains exactly
  `{ id, nullifier, state_code, district_code, created_at }` — no name,
  Aadhaar, DOB, gender, photo bytes, PIN, GPS, IP, email, phone, or device
  fingerprint, in any column, log, or trace.
- **I-CIT-2** (ATID-IDENT-002): On every `VerifyCitizen` command, the API
  MUST check `CitizenVerifier.nullifierUsed[nullifier]` on-chain BEFORE the
  insert. The on-chain set is authoritative; the local row is a cache.
- **I-CIT-3** (ATID-IDENT-005, ATID-IDENT-007): `GET /citizens/:handle`
  returns only `{ handle, state, district, complaint_count, joined_at }` —
  any other column is a leak and fails the adversarial test (ATID-MOD-002).
- **I-CIT-4**: `Handle` derivation MUST be pure and deterministic across web
  + mobile (golden-test verified, ATID-IDENT-006).

### Commands
- `VerifyCitizen(proof, publicSignals) → Citizen | NullifierAlreadyUsedError`
- `RouteProving(deviceClass) → 'on-device' | 'server-fallback'` ([[ADR-011]],
  ATID-IDENT-004) — informational; does not mutate the aggregate.

### Events
- `CitizenVerified { nullifier, stateCode, districtCode, occurredAt }`
  (subscribed by complaint + admin for `complaint_count` projection).
- `NullifierAlreadyUsed { nullifier, attemptedAt }` (audit-only; never stored
  per-attempt to avoid building an Aadhaar oracle).

### Repository
```ts
interface CitizenRepository {
  insertVerified(c: NewCitizen): Promise<Citizen>;          // throws on dup
  findByNullifier(n: Nullifier): Promise<Citizen | null>;   // used by guard MW
  findByHandle(h: Handle): Promise<CitizenPublicView | null>; // PII-stripped
  // No `findById(uuid)` exposed outside the identity context — by design.
}
```

### Owning bounded context
**identity** (`apps/api/src/routes/identity/*`, `packages/db.citizens`).

### Anonymity invariants — MUST NOT contain
Name · Aadhaar number · DOB · gender · address · PIN · GPS · photo bytes ·
IP (post-Cloudflare scrub) · email · phone · device fingerprint · session
cookie value · user-agent string. Verified by ATID-IDENT-003 +
ATID-MOD-002 + the [[ADR-010]] adversarial test (`ATID-P5C6`).

---

## 2. `Complaint` aggregate

Owned by the **complaint** context. Root of the public artifact tree. A
complaint is the only S1 entity that produces public-readable user content.

### Aggregate root
- **Entity**: `Complaint`
- **PK**: `Slug` per [[ADR-012]] — URL-safe, stable, human-readable; format
  `<short-title>-<base36-suffix>` (e.g., `pothole-mg-road-7k3a`). Scope of
  uniqueness is global.
- **Surrogate `complaint_id` (UUID)** exists for FK convenience (photos,
  comments, moderation queue) but `Slug` is the canonical public identifier.

### Member entities
- `Photo` — `{ id, complaint_id, storage_path, sha256, processed_at, status }`.
  Lifecycle bound to the parent; deleting the complaint deletes its photos.
  At most 3 (ATID-COMPL-005). The `processed_at` flip is the only signal
  consumers should trust ([[ADR-004]] EXIF strip pipeline).

### Value objects
- `Slug` — see above.
- `Body` — `{ text: string }` with `text.length ≤ 5000` (ATID-COMPL-005);
  Zod-validated client + server.
- `CategorySlug` — FK into `Category` aggregate; one per complaint at S1.
- `ConstituencyRef` — `{ state, district, pc, ac }` quad; ALL four required
  (ATID-COMPL-004); hierarchy validated against `Constituency` aggregate.
- `PhotoEnvelope` — `{ path, sha256, mime }` (post-EXIF-strip). MUST NOT
  surface raw EXIF or device tags (ATID-COMPL-002).
- `Status` — `'draft' | 'published' | 'moderation_pending' | 'removed'`.
  Only `published` is visible to non-admins (ATID-DISC-005).
- `Disclaimer` — constant `'User-submitted; not verified by Factivist.'`
  injected into every public render (ATID-LEGAL-010).

### Invariants
- **I-COMPL-1** (ATID-COMPL-001): `author_id` MUST reference a `Citizen`
  whose `Nullifier` passed the on-chain check at write time (nullifier-guard
  middleware, see C4 §L3.1).
- **I-COMPL-2** (ATID-COMPL-004, [[ADR-013]]): Geo is set ONLY via the
  manual four-cascading-dropdown picker. No `Geolocation.getCurrentPosition`
  is permitted in any bundle; static grep is part of CI. The API rejects
  any `(state, district, pc, ac)` quad whose hierarchy does not validate
  against the `Constituency` aggregate.
- **I-COMPL-3** (ATID-COMPL-002, [[ADR-004]]): Every `Photo` MUST be
  re-encoded via Sharp before `processed_at` is set; GPS, device-serial,
  owner, datetime-original, software, maker-note tags MUST be absent.
- **I-COMPL-4** (ATID-COMPL-006): The row stores `author_id` (UUID) only —
  NEVER the raw `Nullifier`, IP, user-agent, or session cookie. Public
  reads return `author_handle`, not `author_id`.
- **I-COMPL-5** (ATID-COMPL-001): `tsvector` is populated atomically with
  the insert (`to_tsvector('english', title || ' ' || body)`) so that the
  discovery context's GIN index is always in sync.
- **I-COMPL-6** (ATID-LEGAL-012): If the constituency centroid is within
  1 km of a sensitive installation (`packages/db/data/eci/sensitive.csv`),
  status MUST start as `moderation_pending`.

### Commands
- `SubmitComplaint(authorId, body, categorySlug, constituencyRef, photos)
  → Complaint`
- `AttachPhotoGrant(complaintId) → SignedUploadUrl` (≤ 3 outstanding)
- `MarkPhotoProcessed(photoId, sha256)` (driven by Supabase Storage webhook)
- `RetireComplaint(complaintId, reason)` (admin-only; transitions to
  `removed` — atomically with `ModerationCase.decide`)

### Events
- `ComplaintSubmitted { slug, authorHandle, categorySlug, constituencyRef,
  status, submittedAt }`
- `ComplaintPhotoProcessed { complaintId, photoId, sha256, processedAt }`
- `ComplaintStatusChanged { slug, from, to, reason, changedAt }`

### Repository
```ts
interface ComplaintRepository {
  create(c: NewComplaint): Promise<Complaint>;
  findBySlug(s: Slug): Promise<Complaint | null>;
  findPublicPage(filter: BrowseFilter, cursor?: Cursor):
    Promise<Page<ComplaintPublicView>>;
  updateStatus(id: UUID, status: Status, actor: AdminId | 'system'):
    Promise<void>;
  // Photos via PhotoRepository injected into the aggregate's command handler.
}
```

### Owning bounded context
**complaint** (`apps/api/src/routes/complaint/*`, `packages/db.complaints`,
`packages/db.photos`).

### Anonymity invariants — MUST NOT contain
Author's `Nullifier` · author's IP · author's user-agent · author's GPS ·
EXIF GPS tags · device-serial tags · author's PIN · author's name ·
session cookie value. Public reads surface `author_handle` only.

---

## 3. `Comment` aggregate

Owned by the **comment** context. A `Comment` is its own aggregate (not a
member of `Complaint`) because its lifecycle, moderation, and write path
are independent of the parent complaint.

### Aggregate root
- **Entity**: `Comment`
- **PK**: UUID `comment_id`. (No slug — comments are not public landing
  pages.) Scope of uniqueness is global.

### Member entities
- None at S1. S2 may introduce `Reaction`.

### Value objects
- `Body` — `{ text: string }` with `text.length ≤ 1000` (ATID-COMMENT-001).
- `Status` — `'published' | 'moderation_pending' | 'removed'`.

### Invariants
- **I-COMM-1** (ATID-COMMENT-001): S1 comments are **flat**. `parent_id`
  does not exist in the schema; the API rejects any payload that supplies
  one. (The C4 §L3.6 diagram includes a `parent_id` placeholder for S2 —
  treat it as forward-looking only.)
- **I-COMM-2** (ATID-COMMENT-001): `author_id` MUST be a valid
  `Citizen.id`; unverified callers receive 401. The same nullifier-guard
  middleware as complaints.
- **I-COMM-3** (ATID-COMMENT-001): Public reads return `author_handle`,
  never `author_id`.
- **I-COMM-4**: A `Comment` cannot outlive its parent. Deleting a
  `Complaint` cascades to its comments via FK `ON DELETE CASCADE`.

### Commands
- `PostComment(authorId, complaintId, body) → Comment`
- `RetireComment(commentId, reason)` (admin-only, via moderation aggregate)

### Events
- `CommentPosted { commentId, complaintSlug, authorHandle, postedAt }`
- `CommentStatusChanged { commentId, from, to, reason, changedAt }`

### Repository
```ts
interface CommentRepository {
  create(c: NewComment): Promise<Comment>;
  findByComplaint(complaintId: UUID, cursor?: Cursor):
    Promise<Page<CommentPublicView>>;
  updateStatus(id: UUID, status: Status, actor: AdminId): Promise<void>;
}
```

### Owning bounded context
**comment** (`apps/api/src/routes/comment/*`, `packages/db.comments`).

### Anonymity invariants — MUST NOT contain
Same list as `Complaint`. The `Comment` table has the same blast radius —
any new column is treated as a citizen-PII risk by [[ADR-010]] review.

---

## 4. `ModerationCase` aggregate

Owned by the **moderation** context. A `ModerationCase` is the unit the
queue + decision UI operate on. `Flag` is a member entity; one case can
absorb multiple flags against the same target.

### Aggregate root
- **Entity**: `ModerationCase`
- **PK**: UUID `case_id`.
- **Natural key**: `(target_kind, target_id)` is **unique** per open case
  — new flags against an open case attach to it rather than creating a
  duplicate.

### Member entities
- `Flag` — see aggregate 7 below. One-to-many under `ModerationCase`.
- `ModerationAction` — `{ id, case_id, actor_admin_id, action, rationale,
  decided_at }`. Append-only audit row, one per decision step.

### Value objects
- `TargetRef` — `{ kind: 'complaint' | 'comment', id: UUID }`.
- `FlagReason` — `'defamation' | 'communal' | 'false' | 'doxxing' |
  'ncii' | 'pii-leak' | 'other'` (Phase 3 decision D4 adds `pii-leak`).
- `Decision` — `'keep' | 'remove' | 'shadow' | 'escalate'`.
- `SlaWindow` — derived from primary `FlagReason`:
  - `ncii` → 24 h ([[ADR-014]])
  - `pii-leak` → 24 h ([[ADR-020]], Phase 3 D4)
  - `defamation` → 24 h (Factivist house policy, ATID-LEGAL-013)
  - `communal` → 24 h (Factivist house policy)
  - all others → 36 h (Rule 3(1)(d) ceiling, ATID-MOD-003)
- `Status` — `'pending' | 'in_review' | 'decided' | 'escalated'`.

### Invariants
- **I-MOD-1** (ATID-MOD-001): Only Supabase-Auth users with claim
  `role=admin` may read or write `ModerationCase`. Supabase RLS enforces
  this at the row level — a leaked JWT without the claim returns 0 rows.
- **I-MOD-2** (ATID-MOD-002): No moderation row, response payload, or log
  line may expose a citizen's Aadhaar, photo, name, IP, device fingerprint,
  or raw nullifier. `reporter_handle` and `author_handle` are the only
  citizen-identifying fields permitted.
- **I-MOD-3** (ATID-MOD-003): A `Decision` and the corresponding target's
  `Status` update MUST be one atomic transaction. Half-applied states
  (decided case + still-published complaint, or vice versa) are not
  representable.
- **I-MOD-4** ([[ADR-014]], [[ADR-020]]): The `SlaWindow` for a case is
  set at flag-time from the *primary* reason and never relaxed. If a
  subsequent flag tightens the window (e.g., later `ncii` on a case opened
  for `defamation`), the case adopts the tighter window.
- **I-MOD-5** (ATID-MOD-004): A new `Flag` MUST surface in
  `GET /admin/moderation?status=pending` within 1 s of insert.
- **I-MOD-6** (ATID-LEGAL-013, ATID-MOD-003): SLA monitor MUST emit alerts
  at the boundary (24 h or 36 h depending on reason class) for any case
  still in `pending` or `in_review`.

### Commands
- `OpenCase(target, firstFlag) → ModerationCase`
- `AttachFlag(caseId, flag)` (idempotent for `(reporter_id, reason)` to
  prevent spam-flag inflation)
- `Decide(caseId, decision, rationale, actorAdminId)` — atomic with
  target's `Status`.
- `Escalate(caseId, toQueue, rationale)` — used for `actual-knowledge`
  legal escalations.

### Events
- `ContentFlagged { caseId, target, reason, reporterHandle, flaggedAt }`
- `ModerationDecisionMade { caseId, target, decision, actorAdminId,
  decidedAt, rationaleHash }`
- `ModerationSlaBreached { caseId, target, slaWindowH, openSinceH }`

### Repository
```ts
interface ModerationCaseRepository {
  upsertCaseFromFlag(target: TargetRef, flag: NewFlag):
    Promise<ModerationCase>;
  findById(id: UUID): Promise<ModerationCase | null>;
  findPending(cursor?: Cursor, reason?: FlagReason):
    Promise<Page<ModerationCaseAdminView>>;
  decide(id: UUID, decision: Decision, rationale: string,
    actor: AdminId): Promise<void>; // atomic with target.status
}
```

### Owning bounded context
**moderation** (`apps/api/src/routes/moderation/*`,
`packages/db.moderation_queue`, `packages/db.moderation_actions`).

### Anonymity invariants — MUST NOT contain
Same list as `Citizen`, PLUS: reporter's identity MUST NOT be visible to
non-admin readers (ATID-COMMENT-002). Admin reads expose
`reporter_handle` only — never `reporter_id` or `reporter_nullifier`.

---

## 5. `Constituency` aggregate

Owned by the **geo** context. Pure reference data ([[ADR-007]]). Loaded
once via Drizzle migration seed; never mutated at runtime in S1.

### Aggregate root
- **Entity**: `Constituency`
- **PK**: `ConstituencyCode` — string, format `<level>:<eci_code>` (e.g.,
  `pc:KA-19`, `ac:KA-152`). Scope of uniqueness is global.
- This aggregate is hierarchical: `State` → `District` → `PC` → `AC`. We
  model each hierarchy level as a *separate Drizzle table* (`states`,
  `districts`, `constituencies`, `pin_constituency`) but treat them as one
  aggregate because they share lifecycle, version, and seed transaction.

### Member entities
- `State` — `{ code, name, type: 'state' | 'ut' }` (28 + 8 rows).
- `District` — `{ code, state_code, name }`.
- `PinMapping` — `{ pin, constituency_code }` (many-to-many; PIN →
  constituency is **not 1:1** per the Phase 1 constituency research).

### Value objects
- `StateCode` — 2-char alpha (`KA`, `MH`, ...).
- `DistrictCode` — `<state>-<district_seq>`.
- `ConstituencyCode` — see PK.
- `ConstituencyLevel` — `'pc' | 'ac'` (Parliamentary / Assembly).
- `GeometryStaleness` — `{ stale: boolean, reason?: string }` (ATID-DISC-003
  flags J&K rows pending the 2022 Delimitation Order shapefiles).
- `Provenance` — `'eci-2008-order' | 'datameet-shapefile' | 'india-post-pin'`
  per the layered dataset documented in the Phase 1 constituency wiki.

### Invariants
- **I-GEO-1**: Read-only at runtime. The API exposes `GET` only; there is
  no `POST/PATCH/DELETE` route. Mutations happen via migrations.
- **I-GEO-2** (ATID-DISC-002): Hierarchy MUST validate:
  `District.state_code ∈ States`, `PC.district_code ∈ Districts`,
  `AC.district_code ∈ Districts`. Any query that violates the chain
  returns `400 invalid_constituency_hierarchy`.
- **I-GEO-3** (ATID-DISC-003): Rows with `geometry_stale=true` MUST be
  surfaced with a visible UI notice and a `meta.geometry_stale=true` flag
  in API responses.
- **I-GEO-4**: PIN-to-constituency lookups MUST return ALL matches (the
  many-to-many mapping is intentional); S1 always pairs the lookup with
  the manual picker fallback ([[ADR-013]]).

### Commands
- *(none at runtime — see I-GEO-1)*
- Build-time only: `SeedGeoFromOrder(orderTextPath, shapefileDir, pinCsv)`
  in `packages/db/seed/geo.ts`.

### Events
- *(none at runtime)*. The geo context is consulted, not subscribed to.

### Repository
```ts
interface ConstituencyRepository {
  listStates(): Promise<readonly State[]>;
  listDistricts(stateCode: StateCode): Promise<readonly District[]>;
  listConstituencies(districtCode: DistrictCode):
    Promise<readonly Constituency[]>;
  lookupByPin(pin: string): Promise<readonly Constituency[]>; // ≥ 0
  validateHierarchy(ref: ConstituencyRef): Promise<boolean>;
}
```

### Owning bounded context
**geo** (`apps/api/src/routes/geo/*`, `packages/db.states`,
`packages/db.districts`, `packages/db.constituencies`,
`packages/db.pin_constituency`).

### Anonymity invariants — MUST NOT contain
This aggregate is non-PII reference data; the constraint is inverted —
**it MUST NOT learn anything from a citizen**. Lookups are read-only;
the geo context never receives the requesting citizen's identity, only
the candidate `ConstituencyRef`.

---

## 6. `Category` aggregate

Owned by the **complaint** context as reference data. The Phase 1 user
decision locks the S1 set at **35 categories** (the title says "35", the
research listed 36 candidates with one merge — see Phase 1 backlog memory
and `s1-cost-drift` notes).

### Aggregate root
- **Entity**: `Category`
- **PK**: `CategorySlug` — `^[a-z0-9-]+$`, stable across deploys
  (ATID-COMPL-003). Scope of uniqueness is global.

### Member entities
- None. Single-row aggregate.

### Value objects
- `CategorySlug` — see PK.
- `CategoryLabel` — display string (i18n in S2; S1 is English-only).
- `SeverityFlag` — `'scandal' | null`. `'scandal'` marks the
  public-money-scandals taxonomy bucket that was merged into `corruption`
  per the Phase 1 decision (ATID-COMPL-003 asserts no separate
  `public-money-scandals` row exists).

### Invariants
- **I-CAT-1** (ATID-COMPL-003): Row count MUST equal 35 in production
  (verified by a startup assertion + a vitest fixture test).
- **I-CAT-2**: Read-only at runtime. Mutations via migrations only.
- **I-CAT-3**: Every `Complaint.category_slug` MUST FK-resolve to a row in
  `categories`. Database FK + Zod enum (generated from the seed).

### Commands
- *(none at runtime)*
- Build-time: `SeedCategories()` in `packages/db/seed/categories.ts`.

### Events
- *(none)*

### Repository
```ts
interface CategoryRepository {
  list(): Promise<readonly Category[]>;
  findBySlug(s: CategorySlug): Promise<Category | null>;
}
```

### Owning bounded context
**complaint** (reference subdomain). Lives in `apps/api/src/routes/complaint/`
because category UI + validation are complaint-scoped; the table is
`packages/db.categories`.

### Anonymity invariants — MUST NOT contain
N/A — non-PII reference data. Same inverted constraint as `Constituency`:
the category lookup never receives a citizen identity.

---

## 7. `Flag` entity (member of `ModerationCase`)

> `Flag` is **not its own aggregate root** — it is a member entity of
> `ModerationCase` (aggregate 4). It is listed separately here because the
> Phase 1 backlog and several ATIDs reference it as a first-class concept.
> Its repository surface is internal to the moderation context.

### Position in the aggregate
- Parent: `ModerationCase` (one open case per `(target_kind, target_id)`).
- A `Flag` cannot exist without a `ModerationCase`; submitting the first
  flag against a target implicitly creates the case (`upsertCaseFromFlag`).

### Value objects (within `Flag`)
- `TargetRef` — `{ kind: 'complaint' | 'comment', id: UUID }` (polymorphic
  pointer; the constraint is enforced at the application layer, not in the
  schema, because Postgres has no native polymorphic FK).
- `FlagReason` — see aggregate 4 (Phase 3 D4 promotes `pii-leak` to a
  first-class enum value).
- `ReporterRef` — `{ reporter_id: UUID }`. Resolves to a `Handle` for the
  admin UI; never to a `Nullifier`.
- `Note` — optional `string` (≤ 500 chars), free-text supplied by the
  reporting citizen.

### Invariants
- **I-FLAG-1** (ATID-COMMENT-002): Reporter's identity MUST NOT be
  surfaced to non-admin readers. The complaint's public flag *count* may
  be shown (`flag_count` aggregate column) but never `reporter_id` or
  `reporter_handle`.
- **I-FLAG-2**: `(reporter_id, target_ref, reason)` is unique — a citizen
  cannot stack the same reason on the same target. (Different reasons
  from the same reporter are permitted and stack as separate flags under
  one case.)
- **I-FLAG-3** ([[ADR-020]], Phase 3 D4): `pii-leak` reason MUST be
  selectable in the same UI as the other reasons; the moderation queue
  surface filters and sorts by it (ATID-MOD-001, surface 07).
- **I-FLAG-4**: A `Flag` write triggers the moderation context's case
  creation/attachment — it never writes directly to the target's
  `Status` field (cross-aggregate writes go via `Decide`, not `Flag`).

### Commands (handled by `ModerationCase` aggregate)
- `FlagContent(targetRef, reason, reporterId, note?) → ModerationCase`
  (creates or attaches to existing case)

### Events
- `ContentFlagged` (raised by the parent aggregate — see aggregate 4).

### Repository
Internal to `ModerationCaseRepository`; no separate public interface.

### Owning bounded context
**moderation** (`packages/db.moderation_queue` / `packages/db.flags`).

### Anonymity invariants — MUST NOT contain
Reporter's `Nullifier` · reporter's IP · reporter's user-agent. Reporter's
`Handle` is admin-visible only; never returned to the flagged author or
other public readers.

---

## 8. `Admin` aggregate

Owned by the **admin** context. The operator identity. **A distinct trust
root from `Citizen`** — admins do not have nullifiers and citizens never
have admin claims. The two never share a row.

### Aggregate root
- **Entity**: `Admin`
- **PK**: Supabase Auth `user_id` (UUID). Scope of uniqueness is the
  Supabase Auth users table.

### Member entities
- None in S1.

### Value objects
- `AdminId` — typed alias over the Supabase `user_id`.
- `AdminRole` — `'admin'` (S1 has only one role; `'super-admin'` is S2).
- `AdminEmail` — for grievance/legal correspondence only ([[ADR-014]]
  Grievance Officer designation); NEVER linked to or queryable from
  `Citizen`.
- `LastLoginAt` — `Date`.

### Invariants
- **I-ADM-1**: Admin auth is Supabase Auth JWT + `role=admin` claim
  (C4 §L3.7). Citizen sessions (nullifier-bound, cookie-scoped) MUST NOT
  satisfy admin guards.
- **I-ADM-2** ([[ADR-010]]): An admin cannot deanonymise a citizen. There
  is no admin command, query, or join that returns a citizen's
  `Nullifier`, name, Aadhaar, or photo. The adversarial test
  (ATID-MOD-002, `ATID-P5C6`) fails the build on any new column or log
  line that would.
- **I-ADM-3**: Every admin-side mutation (decide moderation case, toggle
  feature flag) MUST write a row to `audit_log` (append-only) via the
  `audit-log` middleware. No bypass.
- **I-ADM-4**: An `Admin` row never references `Citizen` and vice versa.
  The two tables share no FK and are owned by different bounded contexts.

### Commands
- `GrantAdmin(supabaseUserId, grantedBy)` — operations-time only, not an
  HTTP route; performed via Supabase Studio + audit log entry.
- `RevokeAdmin(supabaseUserId, revokedBy)`
- `LoginAdmin(supabaseUserId)` — implicit (Supabase Auth issues JWT);
  emits `AdminSessionStarted`.

### Events
- `AdminGranted { adminId, grantedBy, grantedAt }`
- `AdminRevoked { adminId, revokedBy, revokedAt }`
- `AdminSessionStarted { adminId, startedAt }`

### Repository
```ts
interface AdminRepository {
  findById(id: AdminId): Promise<Admin | null>;
  listActive(): Promise<readonly Admin[]>;
  // No `findByCitizen…` method — see I-ADM-4.
}
```

### Owning bounded context
**admin** (`apps/api/src/routes/admin/*`).

### Anonymity invariants — MUST NOT contain
Any field linking an `Admin` row to a `Citizen` row. No `nullifier`
column. No citizen `Handle`. No FK relationship to `citizens`.

---

## 9. `FeatureFlag` aggregate

Owned by the **admin** context. Enforces the S1 launch gates listed in
action plan §5.4 + C4 invariant C-5.

### Aggregate root
- **Entity**: `FeatureFlag`
- **PK**: `FlagKey` — string enum: `S1_PUBLIC_BROWSE` |
  `S1_COMPLAINT_SUBMIT` | `S1_COMMENT_POST` | `S1_FLAG_SUBMIT` |
  `S1_ADMIN_QUEUE` (extensible). Scope of uniqueness is the
  `feature_flags` table.

### Member entities
- None.

### Value objects
- `FlagKey` — see PK.
- `Enabled` — `boolean`.
- `UpdatedBy` — `AdminId` (FK to `Admin` aggregate).
- `UpdatedAt` — `Date`.
- `Reason` — `string` (required on every flip; written to `audit_log`).

### Invariants
- **I-FF-1**: Every write to `FeatureFlag` MUST be performed by an
  authenticated `Admin` (`role=admin`) and MUST include a non-empty
  `Reason`. The reason is persisted to `audit_log` alongside the change.
- **I-FF-2** (C4 §C-5): The complaint write path consults
  `S1_COMPLAINT_SUBMIT` on every request; the discovery + complaint read
  paths consult `S1_PUBLIC_BROWSE`. If a flag is `false`, the route
  returns `503 feature_disabled` (machine-readable code) without further
  side-effects.
- **I-FF-3**: Flag reads MUST be cached per-request (one DB hit per
  request, not per-handler); cache lifetime is the request scope only.
  This prevents toggling races and keeps the admin "flip" semantically
  atomic from the operator's POV.
- **I-FF-4**: `FeatureFlag` MUST NOT gate the identity context's
  nullifier-guard middleware. (Disabling onboarding via a flag is fine;
  bypassing the citizenship check is not.)

### Commands
- `EnableFlag(key, actorAdminId, reason)`
- `DisableFlag(key, actorAdminId, reason)`

### Events
- `FeatureFlagToggled { key, from, to, actorAdminId, reason, toggledAt }`

### Repository
```ts
interface FeatureFlagRepository {
  list(): Promise<readonly FeatureFlag[]>;
  isEnabled(key: FlagKey): Promise<boolean>;
  set(key: FlagKey, enabled: boolean, actor: AdminId,
    reason: string): Promise<FeatureFlag>;
}
```

### Owning bounded context
**admin** (`apps/api/src/routes/admin/flags`, consumed by every other
context via `apps/api/src/lib/flags.ts` shared util — see C4 §"Feature
flags" in cross-cutting concerns).

### Anonymity invariants — MUST NOT contain
A `FeatureFlag` row holds no citizen-derived data. The only PII risk is
the `Reason` free-text field — operators MUST NOT paste citizen handles,
nullifiers, or IDs into it; this is enforced by the
`aidefence_has_pii` scan on the admin form (`audit-log` middleware also
re-scans before persist).

---

## Cross-aggregate invariants

Rules that bind every aggregate above. Violating any of these is a
release-blocker.

| # | Invariant | Enforced by |
|---|-----------|-------------|
| **X-1** | No `Nullifier`, Aadhaar, name, DOB, gender, address, PIN, GPS, photo bytes, IP (post-Cloudflare), email, phone, or device fingerprint appears in any aggregate other than `Citizen` (and only the inputs explicitly listed under aggregate 1 there). | [[ADR-010]] adversarial test (`ATID-P5C6`, ATID-IDENT-003), `aidefence_has_pii` middleware on every write route, ATID-MOD-002 fail-fast. |
| **X-2** | Every write command (`SubmitComplaint`, `PostComment`, `FlagContent`, and the admin equivalents) MUST be preceded by a successful nullifier check (citizens) or admin-role JWT check (operators) in the same request. | C4 §L3.1 `id_check` middleware + C4 §L3.7 `a_auth` middleware. |
| **X-3** | DB access is single-source: `apps/api` is the ONLY container that may import from `packages/db` ([[ADR-001]]). `apps/web` and `apps/mobile` consume the API. Aggregates are therefore never split across HTTP boundaries. | Repo-level lint rule + monorepo dependency graph review. |
| **X-4** | Cross-aggregate writes go via repository calls in one transaction (where the aggregates share a context) OR via domain events (where they do not). No aggregate reaches into another aggregate's tables directly. Example: `ModerationCase.decide` updates `Complaint.status` via `ComplaintRepository.updateStatus`, never via raw `UPDATE complaints …`. | Code review + a `ddd-violations` static check in CI (Phase 6). |
| **X-5** | Every write that surfaces public-readable content is rendered with the literal `Disclaimer` value `'User-submitted; not verified by Factivist.'` (ATID-LEGAL-010) and the author identity is rendered as `Handle` only — never `citizen_id`, `nullifier`, or any external ID. | Public-view DTOs (`*PublicView` types) strip the surrogate ID at the repository boundary; Playwright tests assert the disclaimer string. |
| **X-6** | Reference aggregates (`Constituency`, `Category`) are read-only at runtime. Their tables are mutated only by migrations + seeds; their repositories expose no `create`/`update`/`delete`. | Schema lint + repository interface (no write methods). |
| **X-7** | Every admin-side mutation (`Decide`, `Enable/DisableFlag`, `Grant/RevokeAdmin`) writes one row to `audit_log` (append-only) via the `audit-log` middleware in the same transaction as the business write. No bypass. | C4 §L3.3 `m_audit_mw` + §L3.7 audit middleware. |
| **X-8** | Cross-context FKs are EXPLICIT and one-directional: `Complaint.author_id → citizens.id`, `Comment.author_id → citizens.id`, `Comment.complaint_id → complaints.id`, `Complaint.category_slug → categories.slug`, `Complaint.{state,district,pc,ac}_code → constituencies.*`. There is no FK from `Citizen` to anything (the identity aggregate is a sink, not a source, of relations). | Drizzle schema review. |
| **X-9** | `Admin` and `Citizen` aggregates NEVER share a row, FK, or join. Operators are a distinct trust root. | I-ADM-4 + schema review. |
| **X-10** | SLA timers are derived from the **primary** `FlagReason` at case-open time and tightened (never relaxed) by subsequent flags. Wall-clock SLA enforcement is a moderation-context concern, not a per-aggregate one. | I-MOD-4 + ATID-LEGAL-013, ATID-LEGAL-004 (NCII). |
| **X-11** | Domain events (`CitizenVerified`, `ComplaintSubmitted`, `CommentPosted`, `ContentFlagged`, `ModerationDecisionMade`, `FeatureFlagToggled`) are the ONLY cross-context communication mechanism. No aggregate reads another context's tables via a raw join from outside that context. | Per-context route module boundaries + code review. |

---

## Notes for downstream phases

- **Phase 5 (build)**: This file is the source of truth for the
  TypeScript domain types in `packages/shared/types/<context>/*` and the
  Drizzle table layouts in `packages/db/schema/*`. Every value object
  listed here MUST have a Zod schema in
  `packages/shared/validators/<context>/*` ([[ADR-002]]).
- **Phase 6 (QA)**: The ATIDs cited throughout (ATID-IDENT-*, ATID-COMPL-*,
  ATID-COMMENT-*, ATID-DISC-*, ATID-MOD-*, ATID-LEGAL-*) form the
  acceptance gate for the aggregates. Any aggregate without a matching
  ATID is a gap to be filed against Project #3.
- **Open ADR stubs referenced above**: `[[ADR-014]]` (SLA windows),
  `[[ADR-020]]` (`pii-leak` flag), `[[ADR-017]]`..`[[ADR-021]]` (Phase 3
  decisions, see `reference_s1_phase_3_decisions` memory). These are
  cited by anchor here so the spec doesn't drift when the ADR files
  land.
