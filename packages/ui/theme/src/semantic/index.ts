/**
 * Semantic tokens barrel — exposes per-mode token bags plus a `Themes`
 * registry keyed by mode name for consumers that switch at runtime.
 */
import { darkSemantic } from './dark.ts'
import { lightSemantic } from './light.ts'

export { darkSemantic } from './dark.ts'
export type { SemanticTokenName, SemanticTokens } from './light.ts'
export { lightSemantic } from './light.ts'

/** Active theme registry. Key is the theme name (light, dark). */
export const Themes = {
  light: lightSemantic,
  dark: darkSemantic,
} as const

/** Supported theme name (extend by adding to the {@link Themes} registry). */
export type ThemeName = keyof typeof Themes
