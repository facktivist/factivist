/**
 * Dark-mode semantic tokens.
 *
 * Aliases over primitive scales — DO NOT inline literal oklch values here.
 * Mirrors the `.dark` block in `tooling/tailwind-config/index.css`.
 *
 * Must export the same key set as `lightSemantic`; the test suite asserts
 * key-set equality so light/dark cannot drift.
 */
import { brand, danger, gray, info, success, warning } from '../tokens/colors.ts'
import type { SemanticTokens } from './light.ts'

export const darkSemantic = {
  // ── Core surface / text ───────────────────────────────────────────
  background: gray[950],
  foreground: gray[50],

  /** Surface — root content surface. On dark = gray[950]. */
  surface: gray[950],
  /** Surface elevated — cards/sheets sitting above `surface`. Brighter on dark. */
  surfaceElevated: gray[900],

  text: gray[50],
  textMuted: gray[400],
  textOnBrand: gray[950],

  // ── Card (HeroUI-compat) ──────────────────────────────────────────
  card: gray[900],
  cardForeground: gray[50],

  // ── Brand / primary ───────────────────────────────────────────────
  brand: brand[400],
  brandText: gray[950],
  primary: brand[400],
  primaryForeground: gray[950],

  // ── Secondary / muted / accent ────────────────────────────────────
  secondary: gray[800],
  secondaryForeground: gray[50],

  muted: gray[900],
  mutedForeground: gray[400],

  accent: brand[900],
  accentForeground: brand[100],

  // ── Status: danger ────────────────────────────────────────────────
  destructive: danger[400],
  destructiveForeground: gray[950],
  dangerBg: danger[900],
  dangerText: danger[200],

  // ── Status: success / warning / info ──────────────────────────────
  successBg: success[900],
  successText: success[200],

  warningBg: warning[900],
  warningText: warning[200],

  infoBg: info[900],
  infoText: info[200],

  // ── Borders / inputs / focus ring ─────────────────────────────────
  border: gray[800],
  borderStrong: gray[700],
  input: gray[800],
  ring: brand[400],
} as const satisfies SemanticTokens
