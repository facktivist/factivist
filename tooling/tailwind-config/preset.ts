/**
 * Minimal Tailwind v4 JS preset bridge for consumers that still need a
 * `tailwind.config.{ts,js}` shape (e.g., Expo / Uniwind on mobile).
 *
 * For Tailwind v4 web apps, prefer the CSS-first entrypoint:
 *
 *     @import "@factivist/tailwind-config";
 *
 * which loads ./index.css and pulls in HeroUI v3's prebuilt stylesheet
 * (HeroUI v3 ships CSS, not a Tailwind plugin).
 *
 * This file only declares the `content` globs and dark-mode strategy so
 * mobile/legacy bundlers can resolve a config object. All design tokens
 * live in index.css — do not duplicate them here.
 */

import type { Config } from 'tailwindcss'

const preset = {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    '../../packages/ui/**/src/**/*.{ts,tsx}',
    '../../node_modules/@heroui/react/dist/**/*.{js,mjs}',
  ],
} satisfies Partial<Config>

export default preset
