/**
 * Dark-mode semantic tokens.
 *
 * Aliases over primitive scales — DO NOT inline literal oklch values here.
 * Mirrors the `.dark` block in `tooling/tailwind-config/index.css`.
 *
 * Must export the same key set as `lightSemantic`; the test suite asserts
 * key-set equality so light/dark cannot drift.
 */
import { brand, danger, gray } from '../tokens/colors.ts'
import type { SemanticTokens } from './light.ts'

export const darkSemantic = {
  background: gray[950],
  foreground: gray[50],

  card: gray[900],
  cardForeground: gray[50],

  primary: brand[400],
  primaryForeground: gray[950],

  secondary: gray[800],
  secondaryForeground: gray[50],

  muted: gray[900],
  mutedForeground: gray[400],

  accent: brand[900],
  accentForeground: brand[100],

  destructive: danger[400],
  destructiveForeground: gray[950],

  border: gray[800],
  input: gray[800],
  ring: brand[400],
} as const satisfies SemanticTokens
