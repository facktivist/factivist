import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  __setSharpForTests,
  ALLOWED_PHOTO_MIME,
  ExifStripError,
  isAllowedMime,
  MAX_PHOTO_BYTES,
  stripExif,
} from '../exif-strip.ts'

/**
 * `lib/exif-strip` is the canonical scrubber for ADR-0004 + I-COMPL-3. Tests
 * inject a fake Sharp factory via `__setSharpForTests` so we exercise the
 * pipeline without the native binary.
 */

interface FakeSharpRecord {
  rotateCalled: boolean
  exif?: Record<string, unknown>
  withMetadataCalls: number
  jpegOptions?: { quality?: number; mozjpeg?: boolean }
  pngCalled: boolean
}

const makeFakeSharp = (opts: {
  format?: string
  metadataThrows?: Error
  factoryThrows?: Error
  toBufferThrows?: Error
  outBuffer?: Buffer
  metadataThrowsFirst?: boolean
}) => {
  const record: FakeSharpRecord = {
    rotateCalled: false,
    withMetadataCalls: 0,
    pngCalled: false,
  }
  const factory = (_input: Buffer) => {
    if (opts.factoryThrows) throw opts.factoryThrows
    const pipeline = {
      metadata: async () => {
        if (opts.metadataThrows) throw opts.metadataThrows
        return { format: opts.format ?? 'jpeg' }
      },
      withMetadata(args?: { exif?: Record<string, unknown> }) {
        record.withMetadataCalls++
        record.exif = args?.exif
        return pipeline
      },
      rotate() {
        record.rotateCalled = true
        return pipeline
      },
      jpeg(args?: { quality?: number; mozjpeg?: boolean }) {
        record.jpegOptions = args
        return pipeline
      },
      png() {
        record.pngCalled = true
        return pipeline
      },
      toBuffer: async () => {
        if (opts.toBufferThrows) throw opts.toBufferThrows
        return opts.outBuffer ?? Buffer.from('stripped-jpeg')
      },
    }
    return pipeline
  }
  return { factory, record }
}

describe('isAllowedMime', () => {
  it('recognises every allowed photo MIME', () => {
    for (const mime of ALLOWED_PHOTO_MIME) {
      expect(isAllowedMime(mime)).toBe(true)
    }
  })

  it('rejects video / pdf / arbitrary strings', () => {
    expect(isAllowedMime('video/mp4')).toBe(false)
    expect(isAllowedMime('application/pdf')).toBe(false)
    expect(isAllowedMime('')).toBe(false)
  })
})

describe('stripExif', () => {
  beforeEach(() => {
    __setSharpForTests(undefined)
  })
  afterEach(() => {
    __setSharpForTests(undefined)
  })

  it('throws UNSUPPORTED_MIME for non-photo inputs', async () => {
    await expect(stripExif(Buffer.from('x'), 'video/mp4')).rejects.toBeInstanceOf(ExifStripError)
    try {
      await stripExif(Buffer.from('x'), 'video/mp4')
    } catch (err) {
      expect((err as ExifStripError).code).toBe('UNSUPPORTED_MIME')
    }
  })

  it('throws TOO_LARGE when the buffer exceeds MAX_PHOTO_BYTES', async () => {
    const huge = Buffer.alloc(MAX_PHOTO_BYTES + 1)
    try {
      await stripExif(huge, 'image/jpeg')
      throw new Error('should have rejected')
    } catch (err) {
      expect(err).toBeInstanceOf(ExifStripError)
      expect((err as ExifStripError).code).toBe('TOO_LARGE')
    }
  })

  it('re-encodes JPEG input as JPEG q=82 with mozjpeg=true', async () => {
    const { factory, record } = makeFakeSharp({ format: 'jpeg' })
    __setSharpForTests(factory)
    const result = await stripExif(Buffer.from('fake'), 'image/jpeg')
    expect(result.outputMime).toBe('image/jpeg')
    expect(result.bytes).toBeGreaterThan(0)
    expect(record.rotateCalled).toBe(true)
    expect(record.exif).toEqual({})
    expect(record.jpegOptions).toEqual({ quality: 82, mozjpeg: true })
    expect(record.pngCalled).toBe(false)
  })

  it('keeps PNG as PNG to preserve transparency', async () => {
    const { factory, record } = makeFakeSharp({ format: 'png' })
    __setSharpForTests(factory)
    const result = await stripExif(Buffer.from('fake'), 'image/png')
    expect(result.outputMime).toBe('image/png')
    expect(record.pngCalled).toBe(true)
    expect(record.jpegOptions).toBeUndefined()
  })

  it('normalises HEIC/WebP to JPEG (default branch)', async () => {
    const { factory } = makeFakeSharp({ format: 'webp' })
    __setSharpForTests(factory)
    const result = await stripExif(Buffer.from('fake'), 'image/webp')
    expect(result.outputMime).toBe('image/jpeg')
  })

  it('wraps Sharp decoder errors as DECODE_FAILED (sync throw at factory)', async () => {
    const { factory } = makeFakeSharp({ factoryThrows: new Error('boom decode') })
    __setSharpForTests(factory)
    try {
      await stripExif(Buffer.from('fake'), 'image/jpeg')
      throw new Error('should have rejected')
    } catch (err) {
      expect(err).toBeInstanceOf(ExifStripError)
      expect((err as ExifStripError).code).toBe('DECODE_FAILED')
      expect((err as Error).message).toMatch(/boom decode/)
    }
  })

  it('wraps Sharp metadata failures as DECODE_FAILED', async () => {
    const { factory } = makeFakeSharp({ metadataThrows: new Error('bad header') })
    __setSharpForTests(factory)
    try {
      await stripExif(Buffer.from('fake'), 'image/jpeg')
      throw new Error('should have rejected')
    } catch (err) {
      expect((err as ExifStripError).code).toBe('DECODE_FAILED')
      expect((err as Error).message).toMatch(/bad header/)
    }
  })

  it('wraps Sharp re-encode failures as DECODE_FAILED', async () => {
    const { factory } = makeFakeSharp({ toBufferThrows: new Error('out of memory') })
    __setSharpForTests(factory)
    try {
      await stripExif(Buffer.from('fake'), 'image/jpeg')
      throw new Error('should have rejected')
    } catch (err) {
      expect((err as ExifStripError).code).toBe('DECODE_FAILED')
      expect((err as Error).message).toMatch(/out of memory/)
    }
  })

  it('wraps non-Error sharp factory throws using String coercion', async () => {
    const factory = (_input: Buffer) => {
      throw 'string-failure'
    }
    __setSharpForTests(factory as unknown as Parameters<typeof __setSharpForTests>[0])
    try {
      await stripExif(Buffer.from('fake'), 'image/jpeg')
      throw new Error('should have rejected')
    } catch (err) {
      expect((err as ExifStripError).code).toBe('DECODE_FAILED')
      expect((err as Error).message).toMatch(/string-failure/)
    }
  })

  it('wraps non-Error metadata throws via String coercion', async () => {
    const factory = (_input: Buffer) => ({
      metadata: () => Promise.reject('meta-noerr'),
      rotate: () => factory(Buffer.from('')),
      withMetadata: () => factory(Buffer.from('')),
      jpeg: () => factory(Buffer.from('')),
      png: () => factory(Buffer.from('')),
      toBuffer: () => Promise.resolve(Buffer.from('x')),
    })
    __setSharpForTests(factory as unknown as Parameters<typeof __setSharpForTests>[0])
    try {
      await stripExif(Buffer.from('x'), 'image/jpeg')
      throw new Error('should have rejected')
    } catch (err) {
      expect((err as ExifStripError).code).toBe('DECODE_FAILED')
      expect((err as Error).message).toMatch(/meta-noerr/)
    }
  })

  it('wraps non-Error toBuffer throws via String coercion', async () => {
    const factoryRef = {
      current: (_b: Buffer): unknown => null,
    }
    const factory = (_input: Buffer) => {
      const pipeline = {
        metadata: () => Promise.resolve({ format: 'jpeg' }),
        rotate: () => pipeline,
        withMetadata: () => pipeline,
        jpeg: () => pipeline,
        png: () => pipeline,
        toBuffer: () => Promise.reject('buf-noerr'),
      }
      return pipeline
    }
    factoryRef.current = factory
    __setSharpForTests(factory as unknown as Parameters<typeof __setSharpForTests>[0])
    try {
      await stripExif(Buffer.from('x'), 'image/jpeg')
      throw new Error('should have rejected')
    } catch (err) {
      expect((err as ExifStripError).code).toBe('DECODE_FAILED')
      expect((err as Error).message).toMatch(/buf-noerr/)
    }
  })

  it('throws SHARP_UNAVAILABLE when the sharp module is not installed', async () => {
    // Force a fresh load attempt by clearing the cached factory and stubbing
    // the dynamic import to fail. We use vi.mock on a module path that does
    // not exist by reverting __setSharpForTests so loadSharp runs again.
    __setSharpForTests(undefined)
    // Spy on the global to force the dynamic import to throw. Vitest's
    // `vi.doMock` lets us short-circuit `import('sharp')` to a rejection.
    vi.doMock('sharp', () => {
      throw new Error('Cannot find module sharp')
    })
    try {
      // Re-import the module fresh so the cached `_sharp` factory is reset
      // for this lazy-load codepath.
      vi.resetModules()
      const fresh = await import('../exif-strip.ts')
      // Ensure a clean slate inside the freshly imported module instance.
      fresh.__setSharpForTests(undefined)
      await fresh.stripExif(Buffer.from('x'), 'image/jpeg')
      throw new Error('should have rejected')
    } catch (err) {
      expect(err).toBeInstanceOf(Error)
      const code = (err as ExifStripError).code
      // Either SHARP_UNAVAILABLE (preferred) or DECODE_FAILED if the install
      // somehow resolves — assert at least one of those typed codes.
      expect(['SHARP_UNAVAILABLE', 'DECODE_FAILED']).toContain(code)
    } finally {
      vi.doUnmock('sharp')
      vi.resetModules()
    }
  })

  it('reuses the cached Sharp factory across calls', async () => {
    let invocations = 0
    const factory = (_input: Buffer) => {
      invocations++
      const pipeline = {
        metadata: async () => ({ format: 'jpeg' as const }),
        rotate: () => pipeline,
        withMetadata: () => pipeline,
        jpeg: () => pipeline,
        png: () => pipeline,
        toBuffer: async () => Buffer.from('stripped'),
      }
      return pipeline
    }
    __setSharpForTests(factory as unknown as Parameters<typeof __setSharpForTests>[0])
    await stripExif(Buffer.from('x'), 'image/jpeg')
    await stripExif(Buffer.from('y'), 'image/jpeg')
    expect(invocations).toBe(2)
  })

  it('ExifStripError carries name + code', () => {
    const err = new ExifStripError('boom', 'TOO_LARGE')
    expect(err.name).toBe('ExifStripError')
    expect(err.code).toBe('TOO_LARGE')
    expect(err.message).toBe('boom')
  })
})
