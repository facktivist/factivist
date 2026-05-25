# Factivist Design System

> A decentralized, anonymous, tamper-proof civic accountability platform
> where verified Indian citizens can register complaints, track civic
> issues, rate elected representatives, and build a permanent public
> record that no government can erase or manipulate.

This is the design system for **Factivist** — the brand, the visual
language, the React component vocabulary, and the screen-level UI kits.
It exists so any design agent can produce a Factivist screen, slide,
mock, or production code change that looks like it shipped from the
team.

---

## Sources

| Source | Notes |
|---|---|
| **GitHub** [`raveracker/factivist`](https://github.com/raveracker/factivist) | The monorepo. Bun + Turbo. Next.js 16 web, Hono-on-Bun API, Expo mobile, `packages/ui` design tokens. Token values copied from `packages/ui/theme/src/tokens` and `tooling/tailwind-config/index.css` (commit on `main`). |
| Figma — **HeroUI Figma Kit (Community)** | Mounted virtually during build. Source for component patterns (Button, Card, Input, Alert, etc.). Factivist's `packages/ui/web` re-exports HeroUI v3 verbatim, so the kit's visuals ARE the implementation. |
| `docs/product/product-vison.md` | Strategic blueprint — 36 complaint categories, ZKP-via-Aadhaar identity, blockchain anchoring, leader report cards, AI moderation. Drives copy and feature framing. |
| `docs/product/ai-systems.md` | Catalog of moderation, NER, RAG-chat, promise-tracking models. Drives the AI Chat surfaces and timeline copy. |

**Reader access tip.** If you have access to the repo, browse those four
files first — they define the product. If you don't, this folder
preserves all the system-level decisions you need to design against
Factivist without them.

---

## Index

| File | What it's for |
|---|---|
| `colors_and_type.css` | All design tokens — `--color-*`, `--text-*`, `--space-*`, `--radius-*`, `--shadow-*`, `--font-sans/mono`. Drop a `<link>` to this and you have the system. |
| `fonts/` | Inter (variable) + JetBrains Mono (variable, latin subset). |
| `assets/` | Logo placeholders, brand marks. |
| `preview/` | Cards rendered in the Design System tab — typography, color, spacing, components, brand. |
| `ui_kits/web/` | High-fidelity, click-through web app: feed → detail → submit → profile. |
| `ui_kits/mobile/` | Android-first mobile screens — verify (ZKP), feed, detail. |
| `SKILL.md` | Agent-Skill manifest. |

---

## Content Fundamentals

Factivist talks like a Gen-Z civic publication run by people who grew up
filing RTIs on their phones. Direct, dry, witty when it earns the wit,
unromantic about institutions. The platform addresses a 19–32-year-old
who can read a bank balance and a Lok Sabha attendance record with the
same skepticism. Reads in English, code-switches comfortably with
Hindi, Tamil, Marathi nouns. Treats civic engagement as default
behaviour, not as a heroic act.

**Tone.** Sharp, plain-spoken, slightly skeptical. Owns its position
without performing it. The voice has bite when the content earns it
("FIR refused", "94 days pending"), gets concrete when it pays off
("Three potholes, 8–12 inches deep"), and stays clinical when describing
state ("Verified", "In review", "Anchored on Polygon"). Avoid four
voices in particular:

- **Marketing voice** — "supercharge", "the future of", "transforming"
- **Startup voice** — "ship", "magic", "delight"
- **Activist-cosplay voice** — "expose them", "smash the regime", "speak truth to power" *(we are activist; we don't have to announce it)*
- **Bureaucratic voice** — "kindly note that your submission has been received"

Find the middle: alive, factual, unflinching, occasionally funny.

**The wit rule.** Dry, never wisecracky. A line earns humour by being
true, not by being clever. "Lok Sabha attendance: 38%. Tweets per
week: 41." lands because it's accurate. "Our MPs are slacking 😅" is
banned because it's just noise.

**Person.** Second-person ("you") for affordances ("Verify, but stay
anonymous"). Third-person passive for system state ("Anchored on
Polygon", "Queued for community review"). First-person plural is rare —
Factivist is a record, not a "we" — but acceptable in onboarding where
the platform takes a promise on itself ("We never see your Aadhaar
number"). Never "I". Never "our community"; say "verified citizens".

**Casing.** Sentence case everywhere — body, headlines, buttons, chips,
nav. "New complaint", "In review", "File a complaint". Title Case
strictly for proper nouns: Polygon, Aadhaar, Lok Sabha, RTI, FIR,
Llama Guard.

**Specificity over completeness.** Always prefer a real, dated, located
example over a generic one. Sections of code (IPC 415, section 154(3)),
addresses (Powai station, JJ Hospital), pincodes, rupees. From live
copy in this kit:

> Three potholes 8–12 inches deep on the service road near JJ Hospital.
> Two two-wheeler accidents reported in the last week. Drainage overflow
> has eroded the patches done in February.

That's the voice — measurable, located, time-bounded, traceable. Never:

> ❌ Roads are bad in our area.

**Civic vocabulary, used without explanation.** *Constituency, MLA, MP,
FIR, IPC section, gram panchayat, ward, RTI, Lok Sabha, Aadhaar, EXIF,
nullifier, ZKP, anchor, mirror.* Never anglicise these. Never gloss
them. The user knows — that's why they're here.

**Verbs of moderation.** Use the platform's own verbs: *Submitted,
verified, in review, resolved, rejected, anchored, flagged, stripped*.
These are terms of art; chips and timeline labels MUST use these and
nothing else. Don't reach for "approved" / "processed" / "completed".

**Emoji.** **Never** in the product UI. Factivist content shows up in
court, press, election advocacy, and FIR exhibits — emoji break that
authority and turn the platform into Twitter. The youth energy comes
from *type weight, icon density, and pace*, not from emoji shortcuts.
(Caveat: marketing/social channels off-platform may use emoji. The
product itself does not.)

**Pronouns and labels.** Citizens are *citizens* or *verified citizens*,
not *users*. Government actors are *officials*, *MLAs*, *MPs*,
*officers* — not *leaders* unless the platform is grading them
("leader report cards"). Police are *police*, not *cops*. We respect
the language even when we're not respecting the conduct.

**A taste of the voice in long form.** Hero copy on the verify screen:

> Verify, but stay anonymous. Your Aadhaar never leaves this phone.
> We use a zero-knowledge proof to attest you're 18+ and a unique
> Indian citizen — nothing more.

Onboarding microcopy on the same screen:

> Browse anonymously · No phone number, no email, no name. Identity
> happens on your device, not on our servers.

Empty-state on a constituency page:

> No complaints in this constituency yet. Be the first — or open the
> nearest one.

Notification headline:

> Your complaint hit 100 endorsements. The Powai station is now on
> review.

These do the work: set the promise, name the technology, refuse the
spin, leave room to breathe.

**Side-by-side examples to lift.**

| ✅ Use | ❌ Don't say |
|---|---|
| "FIR refused at Powai station for complaint against local builder" | "Cops being terrible at Powai 😤" |
| "Identity verified · No Aadhaar number left your device" | "You're in! Welcome aboard 🎉" |
| "Queued for community review — Llama Guard flagged for caste/communal language" | "Hmm, we caught something funky" |
| "RTI request pending 94 days · statutory limit is 30" | "Govt being slow as usual" |
| "Critical" (severity) | "Super urgent!!" |
| "Anchored on Polygon · tx 0x4ae…" | "Saved on the blockchain forever ⛓️" |
| "File a complaint" (button) | "Get started 🚀" |
| "Open the record." (hero tagline) | "Speak truth to power!" |
| "Browse anonymously" | "Skip for now" |
| "Be the first — or open the nearest one." (empty state) | "Nothing here yet 🤷" |

---

## Visual Foundations

**Brand hue.** `oklch(0.55 0.20 250)` — an indigo-blue. Hue 250 is the
WCAG-friendly blue band, chroma 0.20 stays inside the sRGB gamut at
L=0.55, and it harmonises with the cool-tinted neutral grays (also
hue 250). One brand colour, eleven steps; no secondary brand hue —
status colours (success/warning/danger) carry the rest of the meaning.

**Backgrounds.** Solid, flat. Light mode = `gray-50`, cards = pure
white. Dark mode = `gray-950`, cards = `gray-900`. No textures, no
images bleeding behind text, no full-bleed photography in chrome. One
allowed gradient: a low-saturation brand wash on hero cards
(`linear-gradient(140deg, brand-50 → card)`), used sparingly — Verified
card on the right rail, ZKP onboarding hero.

**Imagery.** Citizen-supplied only. The system itself ships no stock
photography, no illustrations, no marketing photos. When images appear,
they are evidence — and they enter the platform via the upload pipeline
that strips EXIF, GPS, and device metadata before display.

**Type.** Inter for everything; JetBrains Mono for code, file names,
citizen handles, transaction hashes, kbd. No serif, no display face, no
hand-drawn anything. Display sizes (4xl/3xl) get `-0.02em` to `-0.015em`
tracking; body and below sit at `0`.

**Spacing.** 4 px grid (`space.0_5` to `space.24`). Page gutters at
24 px on desktop, 14–16 px on mobile. Card padding 20–24 px. Internal
gaps 12–16 px.

**Corners.** Generous. Cards `xl` (12 px) → `2xl` (16 px) → `3xl`
(24 px) for hero. Buttons 12 px at medium, 14 px at large. Pills and
status chips fully rounded (`full` = 9999 px). Inputs 12 px. Avatars
50%.

**Borders.** 1 px hairlines on every card, input, and chip. `border-200`
in light mode, `gray-800` in dark. We rarely use 2 px borders — focus
ring is the exception.

**Shadows.** Black at low opacity (`oklch(0 0 0 / 0.04…0.10)`). Five
steps. `sm` for cards at rest, `md` on hover, `lg` for floating UI
(toasts, popovers, sticky endorse pill), `xl` reserved for modals. The
brand-coloured shadow (`0 8px 20px -8px brand-500`) is **only** on the
primary FAB and on the "shadow" button variant — never elsewhere.

**Animation.** Reserved and short. 150 ms for opacity/colour, 200 ms
for transforms, 300 ms for layout. Easing: `cubic-bezier(0.4, 0, 0.2, 1)`
for standard, `(0.32, 0.72, 0, 1)` for emphasised (toast in, panel
open). No spring bounce, no parallax, no scroll-triggered reveals. The
system is sober.

**Hover states.** Opacity 0.92 on buttons; cards lift to
`shadow-sm` + `border-300`. No colour shift — colour stays the same.

**Press states.** `transform: scale(0.97)` on buttons. No background
flash, no colour darkening.

**Focus.** Solid 2 px ring in brand-500, offset 2 px from the element
via the `--shadow-focus-ring` token. Never the browser default.

**Transparency & blur.** Used in exactly two places: the sticky header
(`backdropFilter: saturate(180%) blur(8px)` over the page background)
and the sticky action pill at the bottom of complaint detail. Nowhere
else.

**Layout rules.** Web app = sticky 220 / 1fr / 280 three-column grid,
1280 px max width, 24 px outer padding. Mobile = single column,
14–16 px gutters. Bottom nav fixed; FAB anchored bottom-right; sticky
action pill 16 px above bottom nav.

**Image vibe.** When citizen evidence is shown (in detail view, profile
view), it's shown as-is — no filter, no warm/cool grade, no grain. We
present evidence; we do not aestheticise it.

---

## Iconography

Factivist uses **[Solar Icons](https://solar-icons.vercel.app/) — Bold
style**. Solar is a 1,246-icon set by 480 Design (the Figma original is
CC BY 4.0), with six matched styles (`Bold`, `Linear`, `Outline`,
`BoldDuotone`, `LineDuotone`, `Broken`); we use `Bold` because the
filled-geometric weight matches Vuesax/Iconsax (the visual reference in
the HeroUI Figma kit) and reads loud enough for the activist visual
register the brand wants.

**Why Solar Bold over Vuesax.** Iconsax is not addressable on the
Iconify CDN (we checked: 0 results for `iconsax` in the collections
endpoint). Solar Bold is a visually faithful drop-in — same fill, same
geometric construction, same density — and it's actually CDN-available.
Six raw Vuesax SVGs from the source Figma file ship in
`assets/icons/vuesax/` if you ever want to bridge by hand.

**How we ship them.** 27 Solar Bold icons are pre-inlined as data: URIs
in `ui_kits/web/icons.js` (mounted onto `window.FV_ICONS`). The web kit
renders each icon as a `<span>` with `background-color: currentColor`
and a CSS `mask-image: url(<data:>)` cutout. This means **color
inherits via `currentColor`** — chip text colors, button colors, hover
colors all flow through. Sizes via `style.width / height`. No icon font,
no sprite sheet, no runtime CDN dependency.

**Stroke weight.** N/A — these are filled icons (the Bold variant). The
"weight" comes from the geometric fill itself, not a stroke. Sizes:
14 px in chips and inline badges, 16–18 px in buttons, 20–24 px in
empty-state hero illustrations.

**Emoji.** Never. (See Content Fundamentals.)

**Unicode-as-icons.** Avoided. Use a real Solar Bold glyph instead. The
one allowed informal mark is the brand period-stamp baked into the logo
(see Logo lockup) — a typographic device, not an icon.

**Logo placeholder.** The codebase has no logo asset committed yet. The
mark used throughout the kit is a bold italic **F** in Inter Black 900
inside a brand-500 rounded square, with a white "period stamp" baked
into the bottom-right corner — civic + activist, reads like a zine
print. **Flag to the user**: drop a real logo into `assets/` and update
`preview/brand-logo.html` + `Logo` in `ui_kits/web/layout.jsx`.

**Adding new icons.** Browse [solar-icons.vercel.app/icons](https://solar-icons.vercel.app/icons),
pick a slug from the **Bold** column, then either:

1. Add the raw SVG to `assets/icons/solar/<slug>.svg` and re-run the
   data-URI inliner to refresh `ui_kits/web/icons.js`, or
2. Drop in `ui_kits/web/components.jsx` an `I.Foo = Ix('slug')` line and
   add the slug → URI entry in `ui_kits/web/icons.js` by hand.

Solar publishes 1,246 unique icons across 30+ categories — there's
almost always a match.

---

## Quick reference

```css
/* Use the tokens directly. */
.my-button {
  background: var(--color-primary);
  color: var(--color-primary-foreground);
  border-radius: var(--radius-xl);
  padding: 0 var(--space-4);
  font: var(--weight-medium) var(--text-sm)/1 var(--font-sans);
  box-shadow: var(--shadow-sm);
}
```

```html
<!-- Or copy whole components from the UI kit. -->
<link rel="stylesheet" href="colors_and_type.css">
<script src="ui_kits/web/data.js"></script>
<script type="text/babel" src="ui_kits/web/components.jsx"></script>
```

---

## Caveats

- **Logo:** placeholder. The chunky-F-in-square stamp works, but no
  official mark is committed in the repo.
- **Fonts:** Inter and JetBrains Mono ship variable. Swap them out if
  the brand later picks something more distinctive.
- **Icons:** Solar Bold (filled, geometric). Vuesax/Iconsax (the user's
  preference and the HeroUI Figma reference) is not on the Iconify CDN,
  so Solar is the closest CDN-available analog. Document set: 27 icons
  inlined as data: URIs in `ui_kits/web/icons.js`.
- **Native parity:** the mobile UI kit reuses the web `components.jsx`
  for visual demonstration only. Production code lives in `apps/mobile`
  and routes through `heroui-native`.
