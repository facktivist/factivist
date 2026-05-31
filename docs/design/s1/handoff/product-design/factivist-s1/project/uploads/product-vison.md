# FACTIVIST — Action Plan

## Vision
A decentralized, anonymous, tamper-proof civic accountability platform where verified Indian citizens can register complaints, track civic issues, rate elected representatives, and build a permanent public record that no government can erase or manipulate.

---

## 1. COMPLAINT CATEGORIES (35 Categories)

### Original Categories
1. **Infrastructure** — Roads, bridges, drainage, electricity, public buildings
2. **Women Safety** — Harassment, assault, stalking, dowry, domestic violence
3. **Police Incompetence, Intimidation & Brutality** — FIR refusal, custodial torture, encounter killings, corruption
4. **Mob Lynching** — Vigilante violence, communal attacks
5. **Customer Grievance (Private & Government Orgs)** — Service denial, fraud, exploitation
6. **Environmental Issues** — Pollution, illegal mining, deforestation, waste dumping
7. **Bad Civic Behaviour** — Public nuisance, encroachment, noise pollution
8. **Inter-Organization Employee Issues** — Workplace harassment, exploitation, unsafe conditions

### Expanded Categories
9. **Healthcare System Failures** — Negligence, overcharging, denial of emergency care, ambulance delays
10. **Education System Problems** — Paper leaks, teacher absenteeism, commercialization, digital divide
11. **Land & Property Disputes** — Land grabbing, title fraud, builder delays, encroachment
12. **Caste-Based Discrimination** — Untouchability, atrocities against Dalits, manual scavenging
13. **Religious & Communal Discrimination** — Anti-minority violence, hate speech, unlawful demolitions
14. **Child Labor & Exploitation** — Trafficking, child marriage, juvenile justice failures
15. **Digital Rights & Privacy Violations** — Surveillance, internet shutdowns, Aadhaar exclusion, cybercrime
16. **RTI Obstruction** — Delayed responses, attacks on RTI activists, commission vacancies
17. **Electoral Malpractice** — Vote buying, EVM concerns, criminal candidates, booth capturing
18. **Public Transport & Road Safety** — Accidents, overcrowding, accessibility gaps
19. **Water, Sanitation & Hygiene** — Water scarcity, contamination, open defecation, water mafia
20. **Food Safety & Adulteration** — Milk adulteration, pesticide residues, fake products
21. **Labor Rights Violations** — Bonded labor, gig worker exploitation, migrant worker abuse
22. **Housing & Homelessness** — Slum demolitions, builder fraud, rental discrimination
23. **Media Censorship & Press Freedom** — Journalist arrests, paid news, social media crackdowns
24. **Corruption (Systemic & Everyday)** — Bribery, nepotism, tender rigging, welfare leakage
25. **Judicial System Failures** — Case pendency, under-trial prisoners, access to justice
26. **Elderly Abuse & Senior Citizen Issues** — Abandonment, property fraud, pension delays
27. **Persons with Disabilities Rights** — Accessibility barriers, employment discrimination, education exclusion
28. **Migrant & Refugee Issues** — Inter-state discrimination, loss of entitlements, internal displacement
29. **Animal Cruelty & Stray Animal Menace** — Stray dog attacks, human-animal conflict
30. **Noise Pollution & Public Nuisance** — Loudspeakers, firecrackers, construction noise
31. **Government Bureaucracy & Red Tape** — Multiple approvals, dysfunctional e-governance, Aadhaar nightmares
32. **Mental Health & Substance Abuse** — Stigma, inadequate infrastructure, farmer/student suicides
33. **Shrinking Civic Space & Civil Liberties** — NGO crackdowns, UAPA misuse, protest restrictions
34. **Farmer Issues** — Agricultural distress, middlemen exploitation, crop insurance failures
35. **Consumer Financial Exploitation** — Predatory lending apps, banking fraud, Ponzi schemes
36. **Public Money Scandals** — Govt Officials taking bribes, giving tenders to people who bribe and public scandals

---

## 2. CORE FEATURES

### 2.1 Civic Complaint Registration
- Multi-format: text, images, video, audio, geolocation
- Category + sub-category tagging
- Constituency auto-mapping (from geolocation or manual selection)
- Severity levels (Low / Medium / High / Critical)
- Automatic metadata stripping from all uploaded media (EXIF, GPS, device info)
- AI moderation before publishing (hate speech, doxxing, false info detection)

### 2.2 Accused/Person-of-Interest Profiles
- Public profiles for civic accused (politicians, officers, corporate heads)
- Linked complaints aggregated under profiles
- Timeline of accusations
- Response tracking (did they respond? what action was taken?)
- Sources and evidence linking

### 2.3 Leader Report Cards
- Constituency-level scorecards for MLAs, MPs, Corporators, Municipal Employees
- Metrics: complaint volume, resolution rate, citizen satisfaction
- Promise tracking (manifesto vs delivery)
- Attendance records (assembly/parliament)
- Asset declaration changes over tenure
- Comparison view (before/after election)

### 2.4 Complaint Issue Tracking
- Status workflow: Submitted → Verified → Published → Resolved / Unresolved
- Any issue to move to resolved should be marked by minimum 15 citizens.
- Community verification (other citizens support)
- Evidence chain on blockchain
- Timeline view of all actions

### 2.5 Civic Consensus
- Upvote/endorse system (verified citizens only)
- Threshold-based escalation (e.g., 1000 endorsements = "Critical Issue")
- Constituency-level consensus metrics
- Prevent Sybil attacks via ZKP-verified unique citizens

### 2.6 Judicial Injustice & Case Tracking
- Court case status tracking
- Delay metrics (how long pending, how many adjournments)
- Judge-level analytics (anonymized case throughput)
- Under-trial prisoner tracking
- Comparison with legal timelines

### 2.7 Listing & Discovery
- Filter by State / District / City / Constituency / Pincode
- Search by category, keyword, accused name
- Heat maps of complaint density
- Trending issues
- RSS/API for journalists and researchers

### 2.8 Comment Section
- Threaded comments on complaints
- AI-moderated (see [ai-systems.md](./ai-systems.md))
- Dissent and criticism are allowed as it is part of the constitution
- Verified citizen badge on comments
- Upvote/downvote

### 2.9 Analytics
- Analytics based on a public official
- Analytics based on a city, state, district, constituency, pincode
- Any other analytics criteria if possible

### 2.10 AI Chat
- Fetch any complaint based on keyword references
- Fetch any complaint based state wise, district wise, constituency wise, by pincode
- Any other questions asked by people.

See [ai-systems.md](./ai-systems.md) for the catalog of AI systems backing these features.

---

## 3. ARCHITECTURE

### 3.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐   │
│  │ Web App  │  │ Mobile   │  │ Progressive Web App  │   │
│  │(Next.js  │  │ (Expo +  │  │ (Offline-first)      │   │
│  │ 16)      │  │ Expo Rtr)│  │                      │   │
│  └──────────┘  └──────────┘  └──────────────────────┘   │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS
┌────────────────────────┴────────────────────────────────┐
│                  API GATEWAY LAYER                       │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Hono on Bun (rate limiting, DDoS protection)    │   │
│  │  + Supabase custom domain (India ISP mitigation) │   │
│  └──────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────┐
│                  SERVICE LAYER                           │
│  ┌─────────────┐ ┌──────────────┐ ┌─────────────────┐   │
│  │ Complaint   │ │ Identity &   │ │ Moderation      │   │
│  │ Service     │ │ ZKP Service  │ │ Service (LLM)   │   │
│  └─────────────┘ └──────────────┘ └─────────────────┘   │
│  ┌─────────────┐ ┌──────────────┐ ┌─────────────────┐   │
│  │ Profile     │ │ Report Card  │ │ Consensus       │   │
│  │ Service     │ │ Service      │ │ Service         │   │
│  └─────────────┘ └──────────────┘ └─────────────────┘   │
│  ┌─────────────┐ ┌──────────────┐ ┌─────────────────┐   │
│  │ Judicial    │ │ Media        │ │ Notification    │   │
│  │ Tracker     │ │ Processing   │ │ Service         │   │
│  └─────────────┘ └──────────────┘ └─────────────────┘   │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────┐
│                  DATA LAYER                              │
│  ┌──────────────┐ ┌────────────────────┐ ┌────────────┐ │
│  │ IPFS/Arweave │ │ Supabase Postgres  │ │ Redis      │ │
│  │ (media)      │ │ + Apache AGE       │ │ (cache /   │ │
│  │              │ │ (canonical store,  │ │  sessions) │ │
│  │              │ │  Drizzle ORM)      │ │            │ │
│  └──────────────┘ └────────────────────┘ └────────────┘ │
│  ┌──────────────────────────────────────────────────┐   │
│  │ BLOCKCHAIN (public ledger — mirrors complaint    │   │
│  │ hashes, state transitions, ZKP proofs)           │   │
│  │ Polygon PoS, anchored to Ethereum L1             │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**Data layer model.** The canonical store is the relational + graph
database (Supabase Postgres with Apache AGE, accessed only through Drizzle
ORM). The blockchain is a public ledger that mirrors complaint hashes,
state transitions, and ZKP proofs so that the record is tamper-evident and
independently verifiable even if the database is lost or seized. Reads are
served from the database; writes are double-written — once to Postgres
(source of truth for the app) and once to the chain (audit trail).

### 3.2 Blockchain Strategy

**Recommended: Polygon (Matic) or Arbitrum as Layer 2 on Ethereum**

Why not a custom blockchain:
- Building a custom chain requires massive network effects to ensure decentralization
- A custom chain with few validators is actually MORE vulnerable than using an established L2
- Bitcoin's model works because of PoW + massive hashrate — you won't replicate this

What goes on-chain:
- Complaint hash (SHA-256 of complaint content + metadata)
- Timestamp
- Category + constituency codes
- ZKP proof of verified citizen
- Endorsement counts (via smart contract)
- Status transitions

What stays off-chain (Postgres canonical, IPFS/Arweave for permanence):
- Full complaint text (Postgres canonical; IPFS/Arweave for permanence)
- Media files (images, videos) on IPFS/Arweave
- Comments (Postgres canonical)

**Smart Contracts Needed:**
1. `ComplaintRegistry.sol` — Register complaint hashes, status updates
2. `CitizenVerifier.sol` — Verify ZKP proofs, maintain nullifier set
3. `ConsensusVoting.sol` — Endorsement/consensus logic
4. `ProfileRegistry.sol` — Accused person profiles linked to complaints
5. `ReportCard.sol` — Leader scoring aggregation

### 3.3 Identity Verification via Zero-Knowledge Proofs

**The Problem:** You need to prove a user is a real, unique Indian citizen without storing any PII.

**Solution: ZKP-based Aadhaar Verification ([anoncitizen](https://github.com/raveracker/anoncitizen) pattern)**


Flow:
```
1. User uploads/scans Aadhaar QR from UIDAI (on their device)
2. Client-side ZKP circuit extracts:
   - "Is this a valid UIDAI-signed Aadhaar?" → Yes/No
   - "Is the holder 18+?" → Yes/No
   - "State code" → (for constituency mapping)
   - Generates a NULLIFIER (deterministic hash of Aadhaar number)
     so the same Aadhaar can't register twice
3. ZKP proof is submitted to the platform
4. Smart contract verifies the proof on-chain
5. User receives a CITIZEN_TOKEN (anonymous credential)
6. No Aadhaar number, name, address, or photo ever leaves the device
```

**Technology: Semaphore Protocol + Circom/SnarkJS**

- [Semaphore](https://semaphore.pse.dev/) — privacy framework for anonymous signaling
- [anoncitizen](https://github.com/raveracker/anoncitizen) — existing ZKP circuits for Aadhaar verification (by PSE/Ethereum Foundation)
    - https://www.npmjs.com/package/@anoncitizen/contracts
    - https://www.npmjs.com/package/@anoncitizen/react
    - https://www.npmjs.com/package/@anoncitizen/core
- Circom for ZKP circuit design
- Groth16 or PLONK proving system

**Nullifier Mechanism:**
```
nullifier = hash(aadhaar_number + platform_secret)
```
- If nullifier exists → reject (duplicate user)
- If nullifier is new → accept (new unique citizen)
- Cannot reverse nullifier to get Aadhaar number

---

## 4. TECHNOLOGY STACK

The implementation tracks the monorepo described in the [README](../../README.md)
and [docs/setup.md](../setup.md). Anything not listed below is "to be
selected" and will be added as it lands.

### Monorepo & Tooling
| Component | Technology | Reason |
|-----------|-----------|--------|
| Runtime / Package Manager | Bun ≥ 1.3.14 | One fast toolchain for installs, scripts, and `apps/api` |
| Build Orchestration | Turborepo | Cached, dependency-aware builds across the workspace |
| Lint / Format | Biome | One tool for lint + format; replaces ESLint + Prettier |
| Tests | Vitest (unit/integration), Playwright (web E2E), Detox (mobile E2E) | 95% coverage gate enforced in CI |

### Frontend (Web)
| Component | Technology | Reason |
|-----------|-----------|--------|
| Framework | Next.js 16 (App Router, Server Components) | SSR, edge-ready, Indian-ISP-friendly |
| Language | TypeScript (strict, no `any`) | Type safety across the monorepo |
| UI Library | HeroUI v3 (compound components, dot notation) | Accessible, semantic-variant component library |
| Styling | Tailwind CSS v4.3 + oklch design tokens | Shared `packages/ui/theme` |
| Server State | TanStack Query | Server-cache for API |
| Client State | Zustand | Small client state stores |
| Forms | React Hook Form + Zod | Schema-validated forms, isomorphic with API |
| Blockchain | ethers.js v6 / wagmi | Web3 wallet interaction |
| ZKP Client | snarkjs | Client-side proof generation |
| Maps | Leaflet / MapLibre | Open source, no Google dependency |
| PWA | next-pwa | Offline-first for low connectivity areas |

### Mobile
| Component | Technology | Reason |
|-----------|-----------|--------|
| Framework | Expo 56 + Expo Router | Typed file-based navigation, OTA updates |
| UI | HeroUI Native + Uniwind (Tailwind v4) | Shared design language with web |
| Bundler | Metro (Expo default) | Required for React Native |
| E2E | Detox | iOS + Android simulator tests |

### Backend (API)
| Component | Technology | Reason |
|-----------|-----------|--------|
| Server | Hono on Bun | Ultra-low overhead, edge-portable |
| Validation | Zod (shared `packages/shared`) | Same schema validates client + server |
| Database | Supabase Postgres (with Apache AGE extension) | Relational + property-graph in one engine |
| ORM | Drizzle | Type-safe SQL, no raw SQL, no Prisma |
| Cache | Redis | Session tokens, rate limiting |
| Search | Meilisearch | Fast full-text search, easy to self-host |
| Queue | BullMQ (Redis-backed) | Media processing, blockchain tx jobs |
| Media Storage | IPFS (via Pinata/web3.storage) + Arweave (permanent) | Decentralized, censorship-resistant |
| Media Processing | Sharp (images) + FFmpeg (video) | Metadata stripping, compression |
| File Upload | tus protocol | Resumable uploads for poor connections |
| Custom Domain | Supabase custom domains for all API endpoints | India ISP mitigation |

### Blockchain
| Component | Technology | Reason |
|-----------|-----------|--------|
| Network | Polygon PoS (primary) + Ethereum L1 (anchor) | Low gas fees, fast finality, EVM compatible |
| Smart Contracts | Solidity + Hardhat | Industry standard |
| ZKP | Circom + SnarkJS + Semaphore | Aadhaar ZKP verification |
| Indexing | The Graph (subgraph) | Query blockchain data efficiently |
| Wallet | MetaMask / WalletConnect or embedded wallet (Privy) | User-friendly, no crypto knowledge needed |

### AI / ML
See [ai-systems.md](./ai-systems.md) for the full AI catalog (moderation,
multilingual hate-speech detection, NER, location extraction, RAG chat,
analytics, promise tracking).

---

## 5. DEVELOPMENT PHASES

### Phase 1: Foundation (Months 1-3)
**Goal:** Core platform with complaint registration + anonymous identity

- [ ] Design database schema (Postgres + AGE knowledge graph via Drizzle)
- [ ] Build ZKP identity verification (anon-aadhaar integration)
- [ ] Build complaint submission flow (text + category + constituency)
- [ ] Deploy smart contracts (ComplaintRegistry + CitizenVerifier) to Polygon testnet
- [ ] Basic web app (Next.js 16) — submit + browse complaints
- [ ] Media upload with metadata stripping
- [ ] Set up IPFS for media storage
- [ ] Basic moderation with Llama Guard 3

### Phase 2: Core Features (Months 4-6)
**Goal:** Full complaint lifecycle + profiles + search

- [ ] Complaint status tracking and workflow
- [ ] Accused/Person-of-Interest profile pages
- [ ] Comment system with moderation
- [ ] Consensus/endorsement system
- [ ] Full-text search (Meilisearch)
- [ ] Geographic browsing (state → district → constituency)
- [ ] Heat maps and data visualization
- [ ] Deploy to Polygon mainnet
- [ ] Expo mobile app (Android first — 95%+ market share in India)

### Phase 3: Advanced Features (Months 7-9)
**Goal:** Report cards + judicial tracking + analytics

- [ ] Leader report card generation
- [ ] Promise/manifesto tracking
- [ ] Judicial case tracking module
- [ ] Advanced analytics dashboard
- [ ] API for journalists and researchers
- [ ] Notification system (new complaints in your area, status updates)
- [ ] iOS app
- [ ] PWA for low-end devices

### Phase 4: Scale & Resilience (Months 10-12)
**Goal:** Hardening, decentralization, community governance

- [ ] Fine-tune moderation models on collected data
- [ ] Community moderator system
- [ ] Multi-language support (10+ Indian languages)
- [ ] DAO governance for platform decisions
- [ ] Multiple IPFS pinning nodes across jurisdictions
- [ ] Stress testing and security audits
- [ ] Public API documentation
- [ ] Data export tools (for RTI activists, journalists)

---

## 6. BUDGET

Operating cost depends heavily on user scale. See
[cost-at-scale.md](./cost-at-scale.md) for monthly cost projections from
pilot (≈1k MAU) up through mass scale (≈50M MAU), plus per-component
breakdowns and the levers that move cost most.

### One-Time Costs

| Item | Estimated Cost (USD), 2026 market |
|------|---------------------|
| Smart contract audit (single small contract, boutique reviewer) | $3,000–$10,000 |
| Smart contract audit bundle (3–5 contracts, boutique or contest) | $15,000–$40,000 |
| Combined web + mobile + API pen test (mid-size scope, per round) | $20,000–$45,000 |
| Legal consultation (international) | $2,000–$5,000 |

See [cost-at-scale.md §6](./cost-at-scale.md#6-one-time-costs) for the
full table.

---

## 7. LEGAL CONSIDERATIONS

### Risk Mitigation
1. **No entity in India** — Register any legal entity in a privacy-friendly jurisdiction (Iceland, Estonia e-residency, or Seychelles)
2. **Section 230 equivalent** — Platform hosts user-generated content; ensure terms clearly state platform is not the publisher
3. **IT Act compliance** — The Indian IT Act 2000 and intermediary guidelines require content takedown on government orders. Hosting outside India limits direct enforcement; domain blocking remains possible.
4. **Backup domains** — Register multiple domains across different TLDs (.org, .io, .is)
5. **IPFS mirrors** — Even if the web frontend is blocked, data on IPFS/blockchain remains accessible

### Terms of Service
- Users agree they are submitting truthful complaints to the best of their knowledge
- Platform is not responsible for accuracy of individual complaints
- Complaints are public records on a decentralized ledger
- No PII of private citizens in complaints (public officials are fair game)

---

## 8. GROWTH STRATEGY

### Phase 1: Seed (Stealth Launch)
- Launch in 2-3 specific constituencies where civic issues are most visible
- Partner with anonymous RTI activists and citizen journalism networks
- Word-of-mouth through encrypted Telegram/Signal groups

### Phase 2: Viral Mechanics
- Shareable complaint cards (Instagram/Twitter optimized)
- "Constituency Shame Index" — ranked list of worst-performing constituencies
- Election season report cards that media will pick up
- WhatsApp-friendly complaint sharing (huge in India)

### Phase 3: Institutional Adoption
- API access for journalists and media houses
- Data feeds for election monitoring organizations
- Research partnerships with universities
- International advocacy groups (Transparency International, etc.)

---

## 9. KEY RISKS & MITIGATIONS

| Risk | Mitigation |
|------|-----------|
| Government blocks the platform | Multiple domains, IPFS gateways, content-addressable mirrors |
| DDoS attacks | Cloudflare, multiple origin servers, rate limiting |
| Fake/spam complaints | ZKP verification ensures unique real citizens |
| Smart contract vulnerabilities | Professional security audit before mainnet |
| Low adoption | Focus on specific high-impact constituencies first |
| Media metadata leaking user identity | Mandatory server-side metadata stripping |
| Blockchain gas fee spikes | Use Polygon L2 (fractions of a cent per tx); batch via Merkle roots |
| Model bias in content moderation | Human review queue + community appeals |
| Database loss or seizure | Blockchain public ledger preserves complaint hashes + state |

---

## 10. IMMEDIATE NEXT STEPS

1. **Initialize the monorepo** — Bun + Turborepo, Next.js 16 web, Hono-on-Bun API, Expo mobile, shared packages (already in flight; see README)
2. **Design the database schema** — Postgres + Apache AGE via Drizzle: complaints, profiles, constituencies, categories
3. **Prototype the ZKP identity system** — anon-aadhaar integration
4. **Write and test smart contracts** — ComplaintRegistry on Polygon Amoy testnet
5. **Build complaint submission MVP** — Text complaint + category + constituency, double-writing to Postgres + chain
6. **Deploy Llama Guard 3** — Basic moderation pipeline (see [ai-systems.md](./ai-systems.md))
7. **Set up IPFS node** — Media storage with metadata stripping
8. **Register domain and deploy** — Pilot deployment on a privacy-friendly host

---

*This document is the strategic blueprint. Each section will be expanded into detailed technical specifications as development progresses.*
