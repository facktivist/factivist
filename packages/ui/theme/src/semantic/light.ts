/**
 * Light-mode semantic tokens.
 *
 * Aliases over primitive scales — DO NOT inline literal oklch values here.
 * Mirrors the `:root` defaults in `tooling/tailwind-config/index.css`.
 *
 * Three-layer hierarchy (per packages/ui/CLAUDE.md):
 *   primitive (oklch scales) → semantic (this file) → component tokens
 *
 * Compound components (HeroUI v3 + HeroUI Native) consume semantic roles
 * only. Adding a new role requires a matching entry in `dark.ts` (the test
 * suite asserts key-set equality) and an update to the canonical vocabulary
 * list in `__tests__/semantic.test.ts`.
 */
import { brand, danger, gray, info, success, warning } from '../tokens/colors.ts'

export const lightSemantic = {
  // ── Core surface / text ───────────────────────────────────────────
  background: gray[50],
  foreground: gray[950],

  /** Surface — root content surface (page background). On light = gray[100]. */
  surface: gray[100],
  /** Surface elevated — cards/sheets sitting above `surface`. Brighter on light. */
  surfaceElevated: gray[50],

  /** Text — primary foreground; alias of `foreground` for compound clarity. */
  text: gray[950],
  /** Text muted — secondary copy, captions, helper text. */
  textMuted: gray[600],
  /** Text on brand — foreground when rendered on `brand` / `primary`. */
  textOnBrand: gray[50],

  // ── Card (HeroUI-compat) ──────────────────────────────────────────
  card: gray[50],
  cardForeground: gray[950],

  // ── Brand / primary ───────────────────────────────────────────────
  brand: brand[500],
  brandText: gray[50],
  primary: brand[500],
  primaryForeground: gray[50],

  // ── Secondary / muted / accent ────────────────────────────────────
  secondary: gray[200],
  secondaryForeground: gray[900],

  muted: gray[100],
  mutedForeground: gray[600],

  accent: brand[100],
  accentForeground: brand[900],

  // ── Status: danger ────────────────────────────────────────────────
  destructive: danger[500],
  destructiveForeground: gray[50],
  dangerBg: danger[100],
  dangerText: danger[700],

  // ── Status: success / warning / info ──────────────────────────────
  successBg: success[100],
  successText: success[700],

  warningBg: warning[100],
  warningText: warning[800],

  infoBg: info[100],
  infoText: info[700],

  // ── Borders / inputs / focus ring ─────────────────────────────────
  border: gray[200],
  borderStrong: gray[300],
  input: gray[200],
  ring: brand[500],
} as const

/** The role names every semantic theme must define. */
export type SemanticTokenName = keyof typeof lightSemantic

/**
 * Shape contract for any semantic theme. Loose-typed on value (every role
 * resolves to an oklch string) but strict on the key set — `darkSemantic`
 * (and any future theme) must define the same roles.
 */
export type SemanticTokens = Readonly<Record<SemanticTokenName, string>>
