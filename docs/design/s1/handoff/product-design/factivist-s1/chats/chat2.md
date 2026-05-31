# Pending Items Tracker

_Started 2026-05-25 18:45 UTC_

---

## User

List pending items

## Assistant

_[tool: list_files]_

_[tool: list_files]_

_[tool: list_files]_

There's no active task list in this session — nothing pending on my end.

Could you clarify what "pending items" you mean?

1. **Pending design work** on Factivist — e.g. new screens, revisions to existing ones, or tweaks to `Factivist - Screens.html`
2. **Pending complaints / items inside the Factivist UI** — e.g. you want a screen or section showing all "In review" / "Queued" complaints
3. **Something else** — a checklist from a doc, a TODO scattered in the code, etc.

If it's #2, I can build a "Pending" view (queue of complaints in review, awaiting endorsements, awaiting official response) using the existing data files. Just say the word.

## User

List pending items from the design based on product-vision.md

## Assistant

_[tool: read_file]_

_[tool: list_files]_

_[tool: grep]_

_[tool: github_list_repos]_

_[tool: github_read_file]_

_[tool: read_file]_

Here are the gaps between **product-vison.md** and what currently exists in `Factivist - Screens.html`. I've separated outright missing surfaces from partials.

## Clear gaps — not yet designed

| # | Feature | Source | Note |
|---|---|---|---|
| 1 | **Under-trial prisoner tracking** | §2.6 | Called out explicitly as a sub-feature of judicial. Today we only have the case-tracking screen. |
| 2 | **Web ZKP onboarding / verify** | §2.5, §3.3 | We have mobile-only (5 steps). Desktop verify flow is missing. |
| 3 | **AI moderation queue + appeal** | §2.1, ai-systems | "Llama Guard flagged" copy appears in chips, but no moderator review queue or citizen appeal surface exists. |
| 4 | **Community moderator system** | Phase 4 | Moderator dashboard, dispute queue, appeals — none. |
| 5 | **Audio/video complaint capture** | §2.1 | Registration step shows photos. Voice recorder and video capture UI not represented. |
| 6 | **Multi-language switcher (10+ languages)** | Phase 4 | No language picker anywhere — verify, feed, register, or settings. |
| 7 | **Data export / journalist API console** | Phase 3 + §2.7 | RSS feeds, API keys, query builder, CSV export — none. |
| 8 | **Account settings (beyond notifications)** | implied | Identity/credentials management, sessions, delete account, recovery — only Notification prefs exists. |
| 9 | **Asset-declaration timeline** for leaders | §2.3 | Report card mentions promises and attendance, but asset-change tracking has no dedicated view. |
| 10 | **Before/after-election comparison view** | §2.3 | Side-by-side leader performance against their previous tenure. |
| 11 | **IPFS / mirror access page** ("if we're blocked") | §7, §9 | No fallback-access surface — backup domains, gateway list, how to verify a hash. |
| 12 | **Sub-category tagging UI** | §2.1 | Registration picks a category; the 36-cat → sub-cat drill-down isn't shown. |

## Partial — exists but thin

| Feature | Where today | What's missing |
|---|---|---|
| **Constituency-level consensus metrics** (§2.5) | Constituency explorer + Shame Index | A pure "consensus health" view — endorse rate, citizen participation, no-shows — isn't broken out. |
| **EXIF/GPS strip confirmation** (§2.1, §9 risks) | Mentioned in voice copy | No upload-time UI showing "GPS stripped · EXIF stripped" diff against the original. |
| **Trending / heat map** (§2.7) | Constituency explorer choropleth | No time-based heat map (week/month/quarter), no "issues spiking" rail. |
| **Notification: status updates on filed complaints** (Phase 3) | Inbox exists | But there's no per-complaint subscription toggle on Complaint view. |
| **Promise tracking — manifesto upload/ingest** (§2.3) | PromiseTrackingDeep displays | No origin/ingestion surface — where the manifesto came from, RTI receipts attached. |

## My suggestion

The three I'd build next, in order:

1. **Web ZKP onboarding** — every web journey today assumes you're already verified. It's a glaring funnel hole.
2. **AI moderation queue + citizen appeal** — central to the product's claim of being fair, and currently invisible.
3. **Under-trial prisoner tracker** — strongest editorial hook for press/advocacy (Phase 3 goal), and fits the existing judicial surface.

Want me to scope and design any of these? If so, tell me which and whether you want desktop + mobile, and how many variations.

## User

1. Build the suggestion, both mobile and web
2. Build 2.1 Audio/video complaint capture too both mobile and web
3. The Dark Mode in Critical Issue Escalation Screen for web is not right, fix that too

## Assistant

_[tool: update_todos]_

_[tool: read_file]_

_[tool: list_files]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: grep]_

_[tool: grep]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: grep]_

_[tool: grep]_

_[tool: read_file]_

_[tool: grep]_

_[tool: grep]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: grep]_

_[tool: str_replace_edit]_

Now I have what I need. Let me start building.

_[tool: write_file]_

Now the new data file and screens. Let me build all of them:Now the **Web ZKP onboarding** screen:

_[tool: write_file]_

## Assistant

_[tool: write_file]_

Now the **Moderation queue + appeal** (desktop):

_[tool: write_file]_

Now the **Under-trial prisoner tracker** (desktop):

_[tool: write_file]_

Now the **Audio/Video capture** (desktop):

_[tool: write_file]_

Now the **mobile versions** for moderation appeal, under-trial, and media capture:

_[tool: write_file]_

Now wire everything into the main HTML file:

_[tool: str_replace_edit]_

Now add the new sections to the design canvas:

_[tool: str_replace_edit]_

_[tool: done]_

_[tool: update_todos]_

_[tool: fork_verifier_agent]_

Done. Added four new sections to the design canvas, plus the dark-mode fix:

- **Web ZKP onboarding** — 5 desktop artboards (verify → scan → ZKP → constituency → done), each with the same on-device privacy contract the mobile flow has.
- **AI moderation queue + appeal** — moderator-only desktop queue with model rationale and decision panel; citizen-facing appeal screen (desktop + mobile) for when Llama Guard 3 holds a complaint.
- **Under-trial prisoner tracker** — one detainee's record (desktop + mobile), days-held bar against the §436A CrPC benchmark, every bail rejection and adjournment, alongside the nationwide aggregate.
- **Audio / video / photo capture** — 3-mode evidence capture surface (desktop + mobile) with the metadata-strip pipeline visible the whole time.
- **Critical Issue escalation dark mode** — hardcoded the oklch dark values so the takeover stays dark in both themes (the gray scale was flipping to white).

Pending on my side: the verifier subagent is running a directed sweep now and will ping if anything's off. The remaining gaps from the earlier pending list (e.g. multi-language switcher, journalist API console, settings beyond notifications) are still open — say the word for any of them.

## User

Verifier agent check completed

## Assistant

_[tool: snip]_

All four new sections render cleanly, no unresolved CSS tokens, and the Critical Escalation dark-mode fix is confirmed.

## User

Can you finish up the Partial - exists but thin screens. Both Web and Mobile

Also the screens.html, I can't see all the developed screens in the canvas. Fix that also.

## Assistant

_[tool: read_file]_

_[tool: read_file]_

_[tool: grep]_

_[tool: show_html]_

Let me first check the canvas to see what the user is experiencing:

_[tool: eval_js_user_view]_

_[tool: eval_js_user_view]_

_[tool: eval_js_user_view]_

_[tool: grep]_

_[tool: eval_js_user_view]_

_[tool: read_file]_

_[tool: eval_js_user_view]_

Found the bug: the user's canvas pan position is stuck at `y=-22032` (panned past the end of all content). Let me clear it and patch the canvas to validate restored viewports:

_[tool: str_replace_edit]_

_[tool: grep]_

Now the partial-fill screens. Let me check the existing constituency screen briefly for shared patterns:

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

Now the partial screens (desktop):

_[tool: write_file]_

Now mobile versions:

_[tool: write_file]_

Now wire everything into the main HTML:

_[tool: str_replace_edit]_

_[tool: done]_

_[tool: fork_verifier_agent]_

Done. Two pieces:

**Five partial-fill sections added — desktop + mobile each:**
- **Constituency consensus health** — verified→active→contributor funnel, no-show rate, weekly endorse velocity, category participation, sybil/moderation health signals
- **Evidence strip confirmation** — side-by-side diff of the 11 metadata fields stripped/rounded/renamed before the file gets anchored
- **Trending heat** — 24h/7d/30d/90d switcher, per-window normalised state heat grid, spiking + cooling rails with sparklines
- **Subscriptions manager** — one row per complaint/leader/case/POI/constituency with granular triggers, push/email toggles, quiet hours
- **Promise ingest & provenance** — every promise source (manifesto, rally, TV, X) hash-anchored on ingest, plus the 5-step evidence chain for one promise

**Canvas viewport bug fixed:** your saved pan/zoom had drifted past the end of all content, so the canvas restored to empty space on load. I cleared the stuck localStorage entry and added a defensive check to `design-canvas.jsx` — after restoring a saved viewport, it confirms at least one section is actually on-screen; if not, it resets to origin. Future regenerations (more sections added → bigger canvas) won't strand the user in dead space anymore.

Verifier is running a directed check on both. Pending list still has: web ZKP onboarding done, AI moderation + appeal done, under-trial done, audio/video capture done, and now the five partials. Open items remaining from the original audit: multi-language switcher, journalist API console, full account settings, under-trial bulk dashboard (vs single case), and asset-declaration timeline. Say the word for any of them.

## User

Verifier agent check completed

## Assistant

_[tool: snip]_

All five partials render with desktop + mobile artboards, all 10 new components are exposed on window, and the canvas viewport fallback is confirmed working (busted localStorage state now self-recovers instead of stranding the user off-canvas).

## User

Can you attach mobile screens to the web screens already present in the existing web design counterpart. So that all designs are aligned properly.

## Assistant

_[tool: snip]_

_[tool: grep]_

_[tool: grep]_

_[tool: read_file]_

Let me see the rest of the canvas structure and understand the mobile screen mapping:

_[tool: read_file]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

I'll rewrite the design canvas block to fold mobile artboards inside each matching web section, then drop the catch-all mobile sections. One large structural edit:

_[tool: str_replace_edit]_

## Assistant

_[tool: snip]_

_[tool: str_replace_edit]_

Now delete the catch-all mobile sections and merge into the remaining sections:

_[tool: str_replace_edit]_

Now move the mobile-zkp content into the web-onboarding section and delete all the catch-all mobile sections:

_[tool: str_replace_edit]_

_[tool: grep]_

Now delete all the catch-all mobile sections:

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

Now delete the seven catch-all mobile sections:

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: done]_

_[tool: eval_js_user_view]_

Done. The canvas is now aligned — **32 sections, every one has both web and mobile artboards (no more catch-all mobile sections)**:

- 23 product sections with desktop + mobile artboards side-by-side (discovery, me, attestation, landing, hero, accused, constituency, ai-chat, analytics, judicial, complaint-view, empty, shareable, shame, critical, search, evidence-viewer, notif-prefs, shareable-complaint, promise-deep, plus the consensus/strip/trending/subscriptions/promise-ingest set already aligned earlier)
- 9 multi-artboard sections (complaint-flow has 4 web steps + mobile, endorse has web + 2 mobile stages, discussion has both inboxes + both thread views, web-onboarding now holds 5 web steps + 5 mobile steps + clickable hot path, moderation has internal queue + citizen appeal + mobile appeal)

Deleted the catch-all "Mobile · companions / all desktop surfaces / new flows / Tier 1 / Tier 2 / finishers / ZKP" sections — every mobile screen now lives directly next to its web counterpart.

