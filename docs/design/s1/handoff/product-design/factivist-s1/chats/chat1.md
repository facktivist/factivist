# Product Screens Design

_Started 2026-05-23 05:22 UTC_

---

## User

Envision and Create Screens According to the Product Vision

## Assistant

_[tool: read_file]_

_[tool: list_files]_

_[tool: list_files]_

_[tool: list_files]_

_[tool: list_files]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: questions_v2]_

## Assistant

_[tool: questions_v2]_

## User

Questions answered:
- scope: Leader report cards (MLA/MP scorecards, promise tracking, attendance), Accused / Person-of-Interest profiles (linked complaints, timeline of accusations), Constituency explorer (heat map, browse by state/district/pincode), AI Chat (query complaints by keyword, region, category), Onboarding / ZKP verify flow (full multi-step, not just hero), Notifications inbox (status updates, area complaints, endorsement milestones), Decide for me — pick the highest-leverage 4-5, Comments / discussion view (threaded, AI-moderated)
- platform: Both
- presentation: Both — canvas of static screens + a couple of clickable hot paths
- variations: Decide for me
- vibe: Mostly by the book, but try novel layouts for the data-heavy screens (report cards, analytics)
- data_density: Use real, plausible Indian specifics (real constituencies, real ministries, real-sounding case numbers — fictional names)
- tweaks: Dark mode toggle, Density (compact vs comfortable), Variant switcher per screen (if I produce variations)
- hero_focus: Decide for me

## Assistant

_[tool: update_todos]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: copy_files]_

_[tool: copy_starter_component]_

_[tool: copy_starter_component]_

_[tool: grep]_

_[tool: read_file]_

_[tool: write_file]_

## Assistant

_[tool: write_file]_

Let me build out the screens. I'll start with extended mock data, then screens.

_[tool: write_file]_

Now let me build the shared helpers and the screens.

_[tool: write_file]_

Now the Accused / POI profile, Constituency explorer, AI Chat, Notifications, Comments, and Mobile Onboarding.

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: read_file]_

_[tool: grep]_

_[tool: write_file]_

Now the main file. I'll create mobile companion screens inline and wire everything in the canvas.

_[tool: grep]_

_[tool: grep]_

Now the main file.

_[tool: write_file]_

_[tool: show_html]_

_[tool: done]_

_[tool: fork_verifier_agent]_

I've built out Factivist's screen kit. Here's what's there:

**Web screens (design canvas):**
- **Leader Report Card** — Anant V. Kulkarni / Mumbai South MP — two switchable layouts: *Editorial* (dossier with hero grade, narrative summary, promise tracker with evidence rows) and *Dashboard* (scanner-grid with sparklines, donut, tighter density)
- **Accused / POI profile** — Pravin Rao / Powai Heights builder — risk badge, 6-metric strip, timeline of accusations, on-record responses, 5 linked complaints
- **Constituency explorer** — Indian hex map with brand-scaled density, click any state to drill in; Maharashtra constituency table with severity, MP grade, resolution rate
- **AI Chat** — three-column (history · thread · cited sources), inline data viz card showing RTI response times against the 30-day statutory line, follow-up suggestions
- **Notifications inbox** — filterable, unread accent, 7 notification types
- **Threaded comments** — verified-only, AI-moderation states (removed-by-Llama-Guard, pattern-detector system note), reply nesting, composer

**Mobile:**
- **ZKP onboarding** — 5 static steps shown side-by-side (Intro → Scan QR → Generate proof → Pick constituency → Done) **plus a clickable hot path** that walks through them tap-by-tap, with the proof generation animating to 100%
- **Mobile companions** — leader report card and inbox sized for the phone

**Tweaks panel** (toggle from toolbar):
- Dark mode
- Density (compact / comfortable)
- Report card variant (editorial / dashboard / both)

Real Indian specifics throughout — Mumbai South / Pune Cantonment / Powai station / JJ Hospital / section 154(3) CrPC / Lalita Kumari precedent / Llama Guard / Polygon tx hashes. Names are fictional.

**Caveats / next steps:**
- The hex map is stylized, not geographically precise — happy to swap in a real GeoJSON-driven SVG if you want
- Accused headshot is a placeholder gradient block — drop a real photo into `assets/` to replace
- Skipped Judicial case tracking and full Analytics dashboard from the original scope list; ping me if you want either added

## User

Verifier agent check completed

## Assistant

_[tool: snip]_

Verifier confirmed all 7 sections, 14 artboards, hex map, animated ZKP progress, and the Tweaks panel all working. You're now viewing it in **compact + dashboard** mode — that's the more scanner-feel direction for the report card.

If you want next: judicial case tracking, an analytics dashboard for journalists, a real GeoJSON India map, or a landing page that funnels into the ZKP flow — just say which.

## User

Just fixed a chip issue in the design system can you reflect the same here

## Assistant

_[tool: grep]_

_[tool: grep]_

_[tool: list_files]_

_[tool: grep]_

_[tool: read_file]_

_[tool: copy_files]_

Pulled. The chip's flex/gap/border-radius/line-height/white-space defaults are now baked into the inline style (previously they relied on the `.fv-chip` class in `_preview.css`), so chips render correctly anywhere — including inside artboards that don't load the preview CSS. Reflected.

## User

Continue with the next.

## Assistant

_[tool: update_todos]_

_[tool: write_file]_

Picking judicial case tracking next — most unique-to-Factivist surface remaining.

_[tool: write_file]_

_[tool: str_replace_edit]_

_[tool: done]_

_[tool: fork_verifier_agent]_

Added **Judicial case tracking** as the next screen. Tracks `WP-CRL/4821/2024` — the writ that flows out of the Powai FIR-refusal case, before Justice Athawale at Bombay HC.

What's on the screen:
- Hero with parties, judge, section, 412-day age, and a "Next: 04 Jul 2026" callout
- KPI strip: age, adjournment count + %, substantive orders, bench median age
- **Hearing timeline** — every listing in order, color-coded by tag (Filed / Notice / Hearing / Adjourned / Order / Listed), with the adjournment reason on each one
- **Pendency on this bench** — 8,412 pending, 1,284 older than 2y, case-type mix bars
- **Judge analytics** — median disposal vs bench, adjournment rate vs bench, 12-mo sparkline (trending up), three notable orders
- **Related cases** — the disposed FIR-refusal writ that cites Lalita Kumari, the consumer forum matter against the same builder, the RERA challenge

Verifier is checking the render. Let me know the next pick — landing/marketing page, analytics dashboard for journalists, or a real GeoJSON India map.

## User

Verifier agent check completed

## Assistant

Verifier confirms it's clean. Pick the next: landing page, analytics dashboard, or real GeoJSON India map?

## User

1. Yes, do all.
2. For Constituency explorer, I am planning to use the attached json as data source. Update the design

## Assistant

_[tool: list_files]_

_[tool: run_script]_

_[tool: read_file]_

_[tool: copy_files]_

_[tool: update_todos]_

_[tool: run_script]_

Let me move the topojson in and build a real-map version of the explorer, plus the landing page and analytics dashboard.

_[tool: read_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: delete_file]_

_[tool: run_script]_

_[tool: write_file]_

_[tool: str_replace_edit]_

_[tool: show_html]_

_[tool: get_webview_logs]_

Now wire the map in and build the landing + analytics screens.

_[tool: write_file]_

_[tool: write_file]_

_[tool: str_replace_edit]_

_[tool: done]_

Now the landing page and analytics dashboard.

_[tool: fork_verifier_agent]_

Built all three. Summary:

**Constituency explorer (real map)**
- Loads the 4,182-AC pre-delimitation topojson once, decodes arcs, renders all polygons as SVG paths colored by state-level density
- Click a state → projection zooms to its bbox, ACs recolored by per-AC heat, side panel swaps to "Hot constituencies" with AC numbers + sitting MLA
- Hover shows a tooltip with the AC name + meta; click an AC in the list to pin a dossier card with "Open report card" CTA
- **Color By** toggle: Volume / Severity / Resolution — recolors map + ranking instantly
- 30 states, 4,102 ACs from the topojson, real ST_CODE / AC_NO keys, hand-tuned densities for the top 10 states + deterministic noise for the rest

**Landing page**
- Editorial-civic, no marketing-deck cliches
- Hero with the privacy promise + a card stack (citizen complaint, leader report card, on-chain receipt at -2°/+1.5°/+2° rotations)
- 5-cell ticker (complaints / verified citizens / anchored / leaders graded / constituencies)
- "How it works" 4-step section
- Dark "Privacy promise" section with the ZKP flow diagram (6 steps, live indicator dots)
- 3 sample report-card cards
- CTA gradient + footer

**Analytics dashboard**
- Press-tier: 5-KPI strip, multi-line monthly chart (Infrastructure / Police / RTI / Healthcare / Environment over 12 months)
- Source mix bars, hottest cross-state ACs table, ministry pendency bar chart
- Methodology footer with the verification rule + IPFS column note

Verifier is checking the renders.

## User

Verifier agent check completed

## Assistant

_[tool: snip]_

Verifier confirmed: 4,182 paths render, Maharashtra click zoom works with Powai surfacing, landing + analytics + judicial all clean. You're now viewing it in dark + editorial mode.

What's next — a few candidates if useful:
- **Discovery / trending feed** (the missing "homepage" between landing and report cards)
- **Election-season shareable report card** (one-page export with QR, for WhatsApp circulation)
- **Mobile mocks** for the new screens (analytics, constituency drill-down, landing)
- **Promise-tracking detail** page (one promise deep-dive with evidence timeline)

Or pick your own.

## User

Some issues identified:

Dark Mode:
Chip color is not proper - Ex Leader Report Card - MP Lok Sabha Chip
The background gradients on certain cards are not looking good, keep it minimal
The Header is also a bit weird, the background is not supported in dark mode as the text are not visible

## Assistant

_[tool: snip]_

_[tool: read_file]_

_[tool: grep]_

_[tool: grep]_

Three fixes needed — let me address each.

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: done]_

_[tool: fork_verifier_agent]_

Fixed all three:

**1. Chip readability in dark mode** — Inverted the gray scale (`gray-100` → `gray-900`) inside `body.fv-dark`, and lightened the `700/800/900` text tones across brand/warning/danger/success. Default bordered chips like "MP · Lok Sabha" now resolve to light text on a dark gray border.

**2. Flattened gradients** — Replaced 8 multi-stop gradients with flat surface tokens:
- Report card editorial grade panel → `var(--color-muted)`
- Judicial hero status panel → `var(--color-muted)`
- Mobile leader card hero → `var(--color-muted)`
- Card `accent` prop → flat `var(--color-brand-50)`
- Notification preferences callout, AI chat composer fade, onboarding intro halo + ZKP done callout + step-3 progress panel → flat brand-50

Kept intentionally: landing-page CTA gradient (it's a brand moment), the dark camera viewfinder, the AI bot avatar gradient, the accused headshot.

**3. MiniHeader dark mode** — Added a `--fv-header-bg` token: `rgba(255,255,255,0.85)` in light, `oklch(0.18 0.005 270 / 0.85)` in dark. The blur stays; the surface now flips.

Verifier is checking both modes now.

## User

Verifier agent check completed

## Assistant

_[tool: snip]_

All clean in both modes. Ready for the next thing whenever you are.

## User

1. Suggest to keep the header bg dark in the dark mode, no gradient bg
2. Create the Complaint Registration and View Flow and Empty State
3. Create Endorse Complaint flow and comments add and view flow Empty state
4. Create Mobile screens for all the existing desktop screens and the above new screens.

Refer to product-vision.md for any clarification or ask me if not found in the doc

## Assistant

_[tool: read_file]_

_[tool: grep]_

_[tool: list_files]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: update_todos]_

_[tool: str_replace_edit]_

Got the scope. Big chunk but tractable. Let me tackle in order: header fix → complaint flows + empty states → endorse flow → mobile companions for everything.Now build the complaint registration flow, complaint view (with status workflow + endorsement), and endorse flow.

_[tool: write_file]_

## User

Save this design as a PDF: Factivist - Screens.html

## Assistant

## Assistant

_[tool: invoke_skill]_

_[tool: snip]_

_[tool: read_file]_

_[tool: read_file]_

Building a print-ready version that lays each artboard out one-per-page (the design canvas itself doesn't print).

_[tool: write_file]_

_[tool: show_html]_

_[tool: show_html]_

_[tool: sleep]_

_[tool: get_webview_logs]_

Clean load. Now adding auto-print and opening it.

_[tool: str_replace_edit]_

_[tool: open_for_print]_

Print tab opened — the dialog should fire automatically once the India map finishes painting (~2s after load). If the popup is blocked, open it here: [Factivist — Screens (print)](https://000dee9b-9fa1-478d-bdb1-bde383ba7c8d.claudeusercontent.com/v1/design/projects/000dee9b-9fa1-478d-bdb1-bde383ba7c8d/serve/Factivist%20%E2%80%94%20Screens-print.html?t=bbacd58f2dad30f4d21ba609172e5ab557f8471fa85096760a4e9b9f0fb2c169.de914094-7ac4-4680-bae9-5789d200ecde.77f979d9-de22-4244-bbf4-2e3b2483e70b.1779716141&direct=1). 16 pages: cover + 5 part dividers + 11 screen pages.

## User

1. Suggest to keep the header bg dark in the dark mode, no gradient bg
2. Create the Complaint Registration and View Flow and Empty State
3. Create Endorse Complaint flow and comments add and view flow Empty state
4. Create Mobile screens for all the existing desktop screens and the above new screens.

Refer to product-vision.md for any clarification or ask me if not found in the doc

## Assistant

_[tool: snip]_

_[tool: set_project_title]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

Header dark mode is already fixed. Building the rest now.Now the mobile companions — one file with all of them since we need so many.

_[tool: write_file]_

Now wire everything into the canvas.

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: done]_

_[tool: grep]_

_[tool: str_replace_edit]_

_[tool: grep]_

_[tool: grep]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: show_html]_

_[tool: sleep]_

_[tool: get_webview_logs]_

_[tool: str_replace_edit]_

_[tool: done]_

_[tool: fork_verifier_agent]_

Now to add the four desktop sections that didn't make it in the earlier atomic edit:Done. New surfaces wired in:

**Desktop**
- **Complaint registration** — 4 artboards, one per step. Sticky progress rail, 18-category grid (real Indian context — RTI obstruction, caste discrimination, electoral malpractice, etc.), 4-tier severity scale, evidence list with EXIF-stripping state per file, location auto-routing from pincode, accused-party tagging with POI linkage, anchor checklist + on-chain receipt preview
- **Complaint view** — full detail page (#4820 Powai station refusal): status pill, severity, 7-stage lifecycle rail with the current "Under review" pulsing, evidence tiles (audio/PDF/image), endorsement progress bar to Critical threshold, linked POI card, linked court case (`WP-CRL/4821/2024`), on-chain anchor receipt
- **Endorse flow** — two modals on one artboard: confirm-with-reason (4 reason chips) and anchored-receipt (tx hash, block number, "you're the 413th citizen")
- **Empty states** — 6 patterns: first-time feed (with chip suggestions), search no-results (with "file this as a complaint" fallback), comments empty (accent variant), inbox-zero, already-endorsed, no-drafts. Each has one concrete primary action

**Mobile (14 new screens)**
- All desktop screens now have phone companions: Landing, Leader card, Accused, Constituency (with embedded India map), Ask AI, Judicial, Comments, Analytics, Notifications
- New flows: Complaint register (with bottom CTA), Complaint view (sticky endorse footer), Endorse bottom-sheet (confirm + done), Empty states (3 stacked)

Verifier is checking. Light/dark are both tokenised so the new screens follow the existing theme.

## User

Verifier agent check completed

## Assistant

_[tool: snip]_

All 26 new artboards are live and verifier-clean across light and dark. Let me know what's next.

## User

/clear

## Assistant

## User

Can you check the product vision and see what other flows are pending and mention here. Both mobile and desktop

## Assistant

_[tool: snip]_

_[tool: read_file]_

Audit done. Against the product vision, here's what's still missing — grouped by priority.

---

**Tier 1 — Core flows you'll bump into on day one (web + mobile each)**

1. **Discovery feed / Trending** — section 2.7. The primary post-login surface. We have the Landing page but no scrollable, filterable feed (by state / district / pincode / category + trending sort). The UI kit's `feed.jsx` was inherited but not surfaced as a screen.
2. **Search results** — populated state. We have the empty/no-results pattern; the actual keyword-search results listing with filters doesn't exist.
3. **Profile / "Me" tab** — section referenced throughout. User's own complaints + endorsements + civic score + handle + preferences. The mobile bottom tabs already include "Me" but it routes nowhere.
4. **Issue resolution attestation flow** — section 2.4. *"To move to resolved, marked by minimum 15 citizens."* The 15-citizen attestation surface (verify the fix is real, sign on-chain) — distinct from endorse, and currently missing.
5. **Evidence viewer (lightbox)** — image lightbox, audio scrubber, PDF inline reader. The complaint view shows tiles; tapping one needs a viewer.
6. **Notification preferences** — categories, quiet hours, geographic filters. Settings screen.

**Tier 2 — Growth surfaces from §8 of the vision**

7. **Critical Issue escalation moment** — the 1,000-endorsement threshold transition (currently shown as progress bar; the celebratory + sober "now Critical" state is missing).
8. **Shareable complaint card** — Instagram/Twitter optimised 1080×1080 + 1080×1920 export views.
9. **Shareable leader report card** — election-season WhatsApp/Twitter share card (single page, QR, summary grade).
10. **Constituency Shame Index** — ranked national leaderboard of worst-performing constituencies (the public-facing "naming" surface).
11. **Promise tracking deep view** — manifesto-vs-delivery as a standalone screen with full evidence per promise (currently embedded in the report card).

**Tier 3 — Trust, governance, scale (phase 3-4 in the vision)**

12. **Citizen Charter / Terms of Service** — referenced in landing and onboarding, no screen exists.
13. **Trust report / open audit page** — security audits, transparency report, who runs the foundation.
14. **Language picker** — 10+ Indian languages per phase 4.
15. **Moderation appeal flow** — "Read the moderation note" link in comments has no destination.
16. **Community moderator dashboard** — phase 4, the queue of flagged content with appeal context.
17. **Data export tools** — RTI activists / journalists export interface (analytics dashboard has a CSV button; the export builder doesn't exist).
18. **DAO governance** — phase 4 voting UI for platform decisions.
19. **API docs / developer portal** — phase 3 deliverable.
20. **Offline / low-connectivity state** — PWA / poor-connection indicators on mobile.

---

**Quick recommendations:**
- Top 3 to do next: **Discovery feed** + **Profile/Me** + **Issue resolution attestation** — these complete the daily-use loop.
- Top 2 for press/launch impact: **Shareable report card** + **Constituency Shame Index**.

Pick a batch and I'll build.

## User

Pick the top 3, implement for both mobile and desktop

## Assistant

_[tool: snip]_

_[tool: write_file]_

Building Discovery feed, Profile/Me, and Issue Resolution Attestation now.

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

Now the mobile companions for these three:

_[tool: write_file]_

_[tool: str_replace_edit]_

_[tool: done]_

_[tool: fork_verifier_agent]_

Three new flows shipped, both platforms.

**Discovery feed (desktop + mobile)** — filters left, 7-card feed centre, trending + 3-attestation-callouts right. Cards include severity stripe, status pill, "16 to Critical" warning when near threshold, "Attested by 17 citizens" green callout when resolved. Mobile gets sort-pill row + bottom tabs.

**Profile · Me (desktop + mobile)** — identity + civic score (612, "Engaged" tier) with visible progress to "Trusted", my-complaints list, mixed activity feed (filed / endorsed / attested / commented), badge grid, and a **privacy report** card showing literally what's stored (name: none, phone: none, Aadhaar: never stored, location: constituency only, plus the nullifier hash). Mobile uses segmented tabs.

**Resolution attestation (desktop + mobile)** — the 15-citizen consensus surface. Hero shows the claim, a 15-slot ring fills as attestations land (showing 13/15), evidence carousel, three-way Attest/Dispute/Abstain panel with optional note, and the live attester roll with notes — including waiting slots for the remaining 2. The "how it works" panel makes the rule visible: 3 disputes freeze, filer can't self-attest, immutable once anchored.

Verifier is checking both modes.

## User

Verifier agent check completed

## Assistant

_[tool: grep]_

_[tool: read_file]_

_[tool: grep]_

_[tool: read_file]_

_[tool: grep]_

_[tool: grep]_

_[tool: grep]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: done]_

_[tool: fork_verifier_agent]_

Fixed — swapped 4 missing icons:
- `Clock` → `Calendar` in both feed sort filters (desktop + mobile)
- `User` → `ShieldFill` in the mobile "Me" bottom tab and the empty attester slot placeholder

Verifier is checking.

## User

Verifier agent check completed

## Assistant

_[tool: snip]_

All three Tier-1 flows live and verifier-clean. Ready for the next batch.

## User

1. The Landing.Marketing header bg is still weird in dark mode, fix it and keep it dark
2 Start the next batch both mobile and desktop

## Assistant

_[tool: snip]_

_[tool: snip]_

_[tool: snip]_

_[tool: grep]_

Now I'll fix the landing nav and build the next batch (Shareable Report Card + Constituency Shame Index + Critical Issue Escalation, each on desktop + mobile).

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: write_file]_

Now the three desktop screens:

_[tool: write_file]_

_[tool: write_file]_

Now the Critical Issue escalation moment + mobile companions for all three:

_[tool: write_file]_

_[tool: write_file]_

_[tool: str_replace_edit]_

_[tool: done]_

_[tool: fork_verifier_agent]_

Batch 2 shipped. Highlights:

**Landing nav** — now backed by `--fv-landing-nav-bg` which flips to a solid `oklch(0.155 …)` in dark mode (no light tint surviving).

**Shareable Report Card (desktop + mobile)** — both an Instagram-story-shaped portrait (540×960) and a Twitter/OG landscape (1080×608), generated from the anchored record. Each carries a stylized QR back to the live page, the grade badge at oversized scale, attendance/response/broken-promise KPIs, and the manifesto delivery bar. Mobile version is a true share-sheet UX (scaled card preview + 8-channel share grid).

**Constituency Shame Index (desktop + mobile)** — dark editorial hero ("The 10 constituencies their citizens are failing in"), pill-toggle to flip to the Honour Index (top 5 best), national sector-mix bar showing where failures cluster, ranked list with delta badges (▼ -12, ▲ +1), and a methodology card. Top-3 cells are danger-red.

**Critical Issue Escalation Moment (desktop + mobile)** — full dark takeover when a complaint crosses 1,000 endorsements. 240px filled ring, "1,000 verified citizens just refused to look away" headline, complaint capsule, 12-hour velocity area chart showing the 22× acceleration with the 1000th endorser identified, on-chain receipt, and a 5-card cascade grid showing what unlocks (Critical Issues board, press pack auto-gen, priority review, pinned to leader's report card, routed to state feed).

Verifier is checking everything in both modes.

## User

Verifier agent check completed

## Assistant

_[tool: snip]_

All clean in both modes. Ready when you are.

## User

1. Finish the Pending Tier 1, both mobile and desktop. 2. For evidence upload and viewer. I only see audio, image and doc (pdf), I also want the option of video, and basic doc formats that are supported
3. After Tier 1 finishes, implement Tier 2, both mobile and desktop

## Assistant

_[tool: write_file]_

Now the screens — Search Results, Evidence Viewer, Notification Prefs (desktop), then mobile companions, then Shareable Complaint Card + Promise Tracking (Tier 2 finishers).

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

Now Tier 2 finishers (shareable complaint card + promise tracking) and the mobile companions.

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: str_replace_edit]_

_[tool: done]_

Now mobile companions for all five finishers + wire it all in.

_[tool: fork_verifier_agent]_

Tier 1 + Tier 2 finishers shipped — Search, Evidence viewer (with all 9 formats: image / video / audio / PDF / DOCX / XLSX / PPTX / TXT / CSV), Notification prefs, Shareable complaint card, Promise tracking deep view, plus all 5 mobile companions. Verifier is checking.

## User

Verifier agent check completed

## Assistant

_[tool: str_replace_edit]_

_[tool: done]_

_[tool: fork_verifier_agent]_

_[tool: grep]_

_[tool: str_replace_edit]_

Fix applied — leading whitespace was the issue.

## User

Verifier agent check completed

## Assistant

_[tool: snip]_

All Tier 1 + Tier 2 surfaces complete and verifier-clean. Ready for the next batch (Tier 3 — Citizen Charter, Trust report, Language picker, Moderation appeal, Community mod dashboard, Data export, DAO governance, API docs, Offline state) or whatever else you want.

