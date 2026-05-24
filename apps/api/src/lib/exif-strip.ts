/**
 * Server-side EXIF + GPS metadata stripper.
 *
 * Why: [[ADR-004]] + aggregates §2 I-COMPL-3 require that every photo
 * attached to a complaint be re-encoded server-side before any URL is
 * returned to the citizen or stored on `complaints.photo_urls`. Stripping
 * happens here, in a single pure function, so the upload flow + tests +
 * future re-encode workers share one implementation.
 *
 * What "strip" means in S1:
 *   - All EXIF tags removed (GPS, datetime-original, owner, device-serial,
 *     software, maker-note, etc.).
 *   - IPTC + XMP sidecars discarded.
 *   - ICC profile preserved (color fidelity matters; ICC carries no PII).
 *   - Re-encoded to JPEG q=82 OR PNG (lossless) depending on input —
 *     animated WebP and HEIC are normalised to JPEG.
 *
 * Implementation:
 *   - Uses Sharp via dynamic import so the rest of the API surface
 *     (health, identity, moderation) is not coupled to Sharp's native
 *     binary at import time. Bun resolves the native module at runtime.
 *   - Pure function — no I/O. Storage write happens in `lib/upload.ts`,
 *     which calls `stripExif()` before persisting.
 */

/**
 * Allowed input MIME types. Anything else is rejected by `stripExif`
 * before we burn CPU on Sharp.
 *
 * `image/heic` is in the list because iOS Safari uploads HEIC by default;
 * Sharp transcodes to JPEG on output regardless of input.
 */
export const ALLOWED_PHOTO_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
] as const

export type AllowedPhotoMime = (typeof ALLOWED_PHOTO_MIME)[number]

/**
 * Maximum input photo size before rejection (8 MB). Larger files are
 * routinely device-dumps with PII-heavy sidecars; the citizen UI compresses
 * before upload so legitimate complaint photos stay well under this.
 */
export const MAX_PHOTO_BYTES = 8 * 1024 * 1024

export class ExifStripError extends Error {
  constructor(
    message: string,
    readonly code: 'UNSUPPORTED_MIME' | 'TOO_LARGE' | 'DECODE_FAILED' | 'SHARP_UNAVAILABLE',
  ) {
    super(message)
    this.name = 'ExifStripError'
  }
}

/**
 * Subset of the Sharp interface we depend on. Declared locally so the
 * module type-checks even when `sharp` is not yet installed (Bun resolves
 * it at runtime).
 */
interface SharpLike {
  metadata(): Promise<{ format?: string }>
  jpeg(options?: { quality?: number; mozjpeg?: boolean }): SharpLike
  png(): SharpLike
  withMetadata(options?: { exif?: Record<string, unknown> }): SharpLike
  toBuffer(): Promise<Buffer>
  rotate(): SharpLike
}

type SharpFactory = (input: Buffer) => SharpLike

/**
 * Lazy Sharp loader. Returns the module's default export on first call
 * and caches the resolved factory for subsequent calls. Throws a typed
 * `ExifStripError` when Sharp is not installed so callers fail loudly
 * rather than silently re-emitting EXIF-laden buffers.
 */
let _sharp: SharpFactory | undefined
const loadSharp = async (): Promise<SharpFactory> => {
  if (_sharp) return _sharp
  try {
    const mod = (await import('sharp')) as { default: SharpFactory }
    _sharp = mod.default
    return _sharp
  } catch (err) {
    throw new ExifStripError(
      `sharp is not installed — install it via 'bun add sharp' in apps/api: ${
        err instanceof Error ? err.message : String(err)
      }`,
      'SHARP_UNAVAILABLE',
    )
  }
}

/**
 * Test-only escape hatch — lets unit tests inject a Sharp mock without
 * shelling out to the real native binary.
 */
export const __setSharpForTests = (factory: SharpFactory | undefined): void => {
  _sharp = factory
}

export interface StripExifResult {
  readonly buffer: Buffer
  readonly outputMime: 'image/jpeg' | 'image/png'
  readonly bytes: number
}

/**
 * Strip EXIF + sidecar metadata from `input` and return a re-encoded
 * buffer. The output is JPEG by default; PNG inputs stay PNG to preserve
 * transparency. ICC profile is retained.
 *
 * @throws ExifStripError when the input MIME is unsupported, too large,
 *   undecodable, or when Sharp is unavailable.
 */
export const stripExif = async (input: Buffer, inputMime: string): Promise<StripExifResult> => {
  if (!isAllowedMime(inputMime)) {
    throw new ExifStripError(`Unsupported photo MIME: ${inputMime}`, 'UNSUPPORTED_MIME')
  }
  if (input.byteLength > MAX_PHOTO_BYTES) {
    throw new ExifStripError(`Photo exceeds ${MAX_PHOTO_BYTES} bytes`, 'TOO_LARGE')
  }

  const sharp = await loadSharp()
  let pipeline: SharpLike
  try {
    pipeline = sharp(input)
  } catch (err) {
    throw new ExifStripError(
      `Failed to decode photo: ${err instanceof Error ? err.message : String(err)}`,
      'DECODE_FAILED',
    )
  }

  let metadata: Awaited<ReturnType<SharpLike['metadata']>>
  try {
    metadata = await pipeline.metadata()
  } catch (err) {
    throw new ExifStripError(
      `Failed to read photo metadata: ${err instanceof Error ? err.message : String(err)}`,
      'DECODE_FAILED',
    )
  }

  // Preserve transparent PNGs; everything else becomes JPEG (smaller +
  // strips animation tracks like animated WebP).
  const keepPng = metadata.format === 'png'

  // `.rotate()` honours the EXIF orientation tag before we strip it; not
  // calling this would leave portrait shots rendered sideways.
  // `withMetadata({ exif: {} })` is Sharp's idiom for "drop all EXIF" —
  // we still get the ICC profile because that lives outside the EXIF tag.
  const stripped = pipeline.rotate().withMetadata({ exif: {} })
  const finalised = keepPng ? stripped.png() : stripped.jpeg({ quality: 82, mozjpeg: true })

  let outBuf: Buffer
  try {
    outBuf = await finalised.toBuffer()
  } catch (err) {
    throw new ExifStripError(
      `Failed to re-encode photo: ${err instanceof Error ? err.message : String(err)}`,
      'DECODE_FAILED',
    )
  }

  return {
    buffer: outBuf,
    outputMime: keepPng ? 'image/png' : 'image/jpeg',
    bytes: outBuf.byteLength,
  }
}

/** Narrow string → `AllowedPhotoMime` at runtime. */
export const isAllowedMime = (mime: string): mime is AllowedPhotoMime =>
  (ALLOWED_PHOTO_MIME as readonly string[]).includes(mime)
