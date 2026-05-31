# Factivist — Web UI kit

A click-through, high-fidelity recreation of the Factivist web app. Brings
the HeroUI v3 design language to life on top of the Factivist token system
(`packages/ui/theme`), with the chrome and screens a verified citizen would
actually move through.

## Open the kit

`open index.html` (or via the project preview). Click through:

| Route | What it shows |
|---|---|
| **Feed** (default) | Top-of-app: category sidebar, complaint cards with severity / status / endorse, trending constituencies, AI Chat teaser |
| **Detail** (click any feed card) | Full complaint: evidence files (EXIF stripped), Polygon-anchored timeline, threaded comments, sticky action bar |
| **Submit** (header "New complaint") | 4-step flow: Category → Details → Evidence → Review → Publish |
| **Profile** (header avatar) | Anonymous citizen handle, ZKP-verified badge, constituency report card with letter grade and category breakdown |

## Files

```
index.html        App shell + router. Mounts Header / Sidebar / RightRail.
data.js           Mock corpus: 5 complaints, 8 categories, 3 trending, full detail with timeline + evidence + comments.
components.jsx    Icons (Lucide), Btn, Chip, Avatar, SeverityPill, StatusChip.
layout.jsx        Logo, Header (sticky, frosted), Sidebar (category filter), RightRail (verified + trending + AI teaser).
feed.jsx          FeedCard, FeedScreen, DetailScreen.
submit.jsx        Stepper, SubmitScreen (4-step), ProfileScreen (report card).
```

Conventions:
- Every globally-shared component is `Object.assign(window, {…})`'d at the
  end of its file (Babel scopes `<script type="text/babel">` per file).
- Style objects are named per-component (`btnInlineStyle`, `catBtnStyle`)
  to avoid the `const styles` collision rule.
- Icons are inline Lucide outlines — no icon library dependency. Strokes
  fixed at 1.7 px to match the brand iconography card.

## What it deliberately doesn't include

- Real Web3 wiring (no wagmi, no snarkjs)
- Wallet connect / on-chain endorsement signatures
- Actual moderation calls (the timeline pretends Llama Guard already passed)
- Constituency map, AI chat thread, full leader report — these surface a
  stub card so the nav doesn't dead-end

These are scoped out because the kit's job is pixel fidelity for the
**design**, not the cryptography. Lift components into a real Next.js
app and replace the mock data with `@factivist/shared` Zod-validated types.
