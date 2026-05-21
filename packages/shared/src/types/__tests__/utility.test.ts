import { describe, expect, it } from 'vitest';

import { hasMorePages } from '../utility.ts';

describe('hasMorePages', () => {
  it('returns true when more pages remain', () => {
    expect(hasMorePages(1, 20, 100)).toBe(true);
    expect(hasMorePages(4, 20, 100)).toBe(true);
  });

  it('returns false on the final page', () => {
    expect(hasMorePages(5, 20, 100)).toBe(false);
    expect(hasMorePages(1, 20, 20)).toBe(false);
  });

  it('returns false past the final page', () => {
    expect(hasMorePages(6, 20, 100)).toBe(false);
  });

  it('returns false for invalid inputs', () => {
    expect(hasMorePages(0, 20, 100)).toBe(false);
    expect(hasMorePages(1, 0, 100)).toBe(false);
    expect(hasMorePages(1, 20, -1)).toBe(false);
  });

  it('handles an empty result set', () => {
    expect(hasMorePages(1, 20, 0)).toBe(false);
  });
});
