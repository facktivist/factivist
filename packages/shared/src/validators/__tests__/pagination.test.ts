import { describe, expect, it } from 'vitest';

import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../../constants/app.ts';
import { environmentSchema, paginationSchema } from '../pagination.ts';

describe('paginationSchema', () => {
  it('applies defaults when no fields are provided', () => {
    const result = paginationSchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(DEFAULT_PAGE_SIZE);
    expect(result.cursor).toBeUndefined();
  });

  it('coerces numeric strings (typical query-string input)', () => {
    const result = paginationSchema.parse({ page: '3', limit: '50' });
    expect(result.page).toBe(3);
    expect(result.limit).toBe(50);
  });

  it('accepts an explicit cursor', () => {
    const result = paginationSchema.parse({ cursor: 'abc123' });
    expect(result.cursor).toBe('abc123');
  });

  it('rejects an empty cursor string', () => {
    const result = paginationSchema.safeParse({ cursor: '' });
    expect(result.success).toBe(false);
  });

  it('rejects page <= 0', () => {
    expect(paginationSchema.safeParse({ page: 0 }).success).toBe(false);
    expect(paginationSchema.safeParse({ page: -1 }).success).toBe(false);
  });

  it('rejects non-integer page', () => {
    expect(paginationSchema.safeParse({ page: 1.5 }).success).toBe(false);
  });

  it('rejects limit above MAX_PAGE_SIZE', () => {
    const result = paginationSchema.safeParse({ limit: MAX_PAGE_SIZE + 1 });
    expect(result.success).toBe(false);
  });

  it('rejects limit below MIN_PAGE_SIZE', () => {
    expect(paginationSchema.safeParse({ limit: 0 }).success).toBe(false);
  });
});

describe('environmentSchema', () => {
  it.each(['development', 'staging', 'production', 'test'] as const)(
    'accepts %s',
    (env) => {
      expect(environmentSchema.parse(env)).toBe(env);
    },
  );

  it('rejects unknown environments', () => {
    expect(environmentSchema.safeParse('preview').success).toBe(false);
    expect(environmentSchema.safeParse('').success).toBe(false);
  });
});
