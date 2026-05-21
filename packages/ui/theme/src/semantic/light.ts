/**
 * Light-mode semantic tokens.
 *
 * Aliases over primitive scales — DO NOT inline literal oklch values here.
 * Mirrors the `:root` defaults in `tooling/tailwind-config/index.css`.
 */
import { brand, danger, gray } from '../tokens/colors.ts'

export const lightSemantic = {
  background: gray[50],
  foreground: gray[950],

  card: gray[50],
  cardForeground: gray[950],

  primary: brand[500],
  primaryForeground: gray[50],

  secondary: gray[200],
  secondaryForeground: gray[900],

  muted: gray[100],
  mutedForeground: gray[600],

  accent: brand[100],
  accentForeground: brand[900],

  destructive: danger[500],
  destructiveForeground: gray[50],

  border: gray[200],
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
