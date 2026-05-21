import { describe, expect, it } from 'vitest';

import {
  APP_NAME,
  DEFAULT_PAGE_SIZE,
  ENVIRONMENTS,
  HTTP_STATUS,
  MAX_PAGE_SIZE,
  MIN_PAGE_SIZE,
  isHttpStatus,
} from '../app.ts';

describe('app constants', () => {
  it('exposes the canonical app name', () => {
    expect(APP_NAME).toBe('factivist');
  });

  it('uses sane pagination bounds', () => {
    expect(MIN_PAGE_SIZE).toBeLessThan(DEFAULT_PAGE_SIZE);
    expect(DEFAULT_PAGE_SIZE).toBeLessThanOrEqual(MAX_PAGE_SIZE);
    expect(MIN_PAGE_SIZE).toBeGreaterThan(0);
  });

  it('enumerates the four supported environments', () => {
    expect(ENVIRONMENTS).toEqual(['development', 'staging', 'production', 'test']);
  });

  it('maps known HTTP statuses to their numeric codes', () => {
    expect(HTTP_STATUS.OK).toBe(200);
    expect(HTTP_STATUS.NOT_FOUND).toBe(404);
    expect(HTTP_STATUS.INTERNAL_SERVER_ERROR).toBe(500);
  });
});

describe('isHttpStatus', () => {
  it('returns true for every code defined in HTTP_STATUS', () => {
    for (const code of Object.values(HTTP_STATUS)) {
      expect(isHttpStatus(code)).toBe(true);
    }
  });

  it('returns false for arbitrary numbers not in the map', () => {
    expect(isHttpStatus(999)).toBe(false);
    expect(isHttpStatus(0)).toBe(false);
  });

  it('returns false for non-number inputs', () => {
    expect(isHttpStatus('200')).toBe(false);
    expect(isHttpStatus(null)).toBe(false);
    expect(isHttpStatus(undefined)).toBe(false);
    expect(isHttpStatus({})).toBe(false);
  });
});
