---
name: factivist-design
description: Use this skill to generate well-branded interfaces and assets for Factivist — a decentralized, anonymous, tamper-proof civic accountability platform for Indian citizens. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping or production work.
user-invocable: true
---

Read `README.md` in this skill first — it covers content tone, visual
foundations, and iconography rules. Then explore:

- `colors_and_type.css` — every design token (color, type, space, radius,
  shadow, motion). Drop a `<link>` to it and the system is wired.
- `fonts/` — Inter (variable) + JetBrains Mono (variable).
- `preview/` — small specimens of each token / component cluster. Useful
  to see what "correct" looks like before producing new screens.
- `ui_kits/web/` — high-fidelity, click-through Factivist web app
  (feed → detail → submit → profile). Lift components into new mocks.
- `ui_kits/mobile/` — Android-first mobile screens in M3 device frames
  (verify → feed → detail).

If you're producing **visual artifacts** (slides, mocks, throwaway
prototypes): copy assets out of this skill into your output directory
and write static HTML files that the user can open. Inline the Lucide
icon paths from `ui_kits/web/components.jsx` rather than importing a new
icon library.

If you're working on **production code** in
[`raveracker/factivist`](https://github.com/raveracker/factivist): read
the rules here and apply them to the real components in
`packages/ui/web` and `packages/ui/native`. The tokens in
`colors_and_type.css` are a mirror of `tooling/tailwind-config/index.css`
and `packages/ui/theme/src/tokens/*` — keep them in lockstep.

Hard rules to remember:

- **Voice:** sober, exact, sentence-cased, no emoji, no marketing voice.
- **Citizen identity:** anonymous handles only (e.g. `citizen-7K3F4P`);
  never invent real names or avatars.
- **Status verbs:** Submitted · Verified · In review · Resolved ·
  Rejected. Don't invent new ones.
- **Severity:** Low · Medium · High · Critical. Reserve Critical for
  life-or-death.
- **Brand colour:** `oklch(0.55 0.20 250)` (`--color-brand-500`). One
  brand hue. Status colours carry the rest.
- **Icons:** Solar Bold (filled, geometric) via inlined data: URIs in
  `ui_kits/web/icons.js`. Same energy as Vuesax/Iconsax, actually
  CDN-available. No icon font, no emoji, no hand-drawn art.

If the user invokes this skill without other guidance, ask them what
they want to build or design, then act as an expert Factivist designer
who outputs HTML artifacts or production code depending on the need.
Suggested clarifying questions:

1. Web or mobile (or both)?
2. Which surface — feed, detail, submission, identity onboarding, leader
   report card, AI chat, constituency map?
3. Production code in the monorepo, or a static HTML artifact?
4. Are they iterating on an existing screen (link it) or building new?
