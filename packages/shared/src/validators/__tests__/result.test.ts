import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { resultSchema } from '../result.ts';

const schema = resultSchema(z.object({ value: z.number() }), z.string());

describe('resultSchema', () => {
  it('accepts a success variant', () => {
    const parsed = schema.parse({ ok: true, data: { value: 42 } });
    expect(parsed).toEqual({ ok: true, data: { value: 42 } });
  });

  it('accepts a failure variant', () => {
    const parsed = schema.parse({ ok: false, error: 'boom' });
    expect(parsed).toEqual({ ok: false, error: 'boom' });
  });

  it('rejects mismatched success payloads', () => {
    const result = schema.safeParse({ ok: true, data: { value: 'nope' } });
    expect(result.success).toBe(false);
  });

  it('rejects mismatched failure payloads', () => {
    const result = schema.safeParse({ ok: false, error: 123 });
    expect(result.success).toBe(false);
  });

  it('rejects missing discriminator', () => {
    const result = schema.safeParse({ data: { value: 1 } });
    expect(result.success).toBe(false);
  });
});
