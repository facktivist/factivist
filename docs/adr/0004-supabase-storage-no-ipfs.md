# ADR-004: Supabase Storage for photos, no IPFS in S1, mandatory server-side EXIF strip

## Status
Accepted

## Context
Complaints carry up to N photos. IPFS pinning was considered for censorship-resistance, but (a) pinning-service costs and reliability at S1 scale are unjustified, (b) India ISP behaviour with IPFS gateways is hostile, and (c) IPFS does not solve the dominant photo risk — embedded EXIF GPS coordinates that re-identify the citizen.

## Decision
**Photos are stored in Supabase Storage in S1.** No IPFS. **EXIF metadata is stripped server-side** in the upload handler (`apps/api`) using `sharp`'s `.withMetadata({})` or equivalent before the file is persisted. The original (with EXIF) is never written to disk or returned to the client. Storage bucket policy restricts public reads to processed files only.

## Consequences

### Positive
- One storage backend → simpler ops, simpler signed-URL flow.
- Server-side EXIF strip is the single chokepoint — no client trust required.
- India-friendly: Supabase custom domain (per [[ADR-009]]) handles ISP routing.

### Negative
- If Supabase deplatforms us, photo URLs break; mitigation is the daily Postgres backup which contains pointers, and a re-upload script if needed in S2.
- No content-addressed storage means duplicate detection is application-level (hash on upload).

### Neutral
- S2 may re-add IPFS as a redundant pin; the storage abstraction in `apps/api/storage.ts` is designed to swap backends.

## Alternatives considered
- **IPFS + Pinata**: rejected for S1 cost/latency.
- **S3 + CloudFront**: rejected — adds a second vendor; Supabase Storage is already in the stack for auth.
- **Client-side EXIF strip**: rejected — untrusted; malicious or modified clients bypass it.

## References
- Action plan §4.3 ADR-004
- Phase 1 sec-architect findings on EXIF leak
- Related: [[ADR-009]] (custom domain), [[ADR-010]] (anonymity floor)
