import '@testing-library/jest-dom/vitest'

/**
 * Provide a `window.matchMedia` shim so any HeroUI / Uniwind hook that
 * peeks at color scheme during render doesn't blow up in jsdom.
 */
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })
}
