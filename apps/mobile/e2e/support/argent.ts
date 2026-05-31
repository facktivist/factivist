/// <reference types="detox" />

/**
 * Argent-MCP-style helper for Phase 6 Detox specs.
 *
 * Why this exists
 * ---------------
 * Per the project `argent.md` rule, every mobile interaction MUST go
 * through an Argent MCP `describe` discovery step before a tap — never
 * derive coordinates from a screenshot, never tap blind. Detox runs in
 * its own Jest process and cannot invoke MCP tools at runtime, so the
 * Phase 6 specs follow the Argent discipline at the **author** level:
 *
 *   1. Spec authors run the flow once under Argent (`argent describe`
 *      → `gesture-tap`) to confirm elements are reachable.
 *   2. The same flow is then encoded here as Detox `by.id(...).tap()`
 *      calls, guarded by an `assertVisible()` step that emulates the
 *      Argent `describe` requirement — if the element is not in the
 *      view hierarchy, the spec fails fast with a helpful message
 *      rather than silently tapping the wrong coordinates.
 *
 * This helper is intentionally tiny — every method maps 1:1 onto a
 * Detox call so the runtime cost is zero. The value is the **enforced
 * ordering**: you must call `discover(testID)` before `tapDiscovered()`,
 * mirroring the Argent MCP discipline.
 *
 * For the manual run procedure (Argent describe → gesture-tap), see
 * `docs/operations/mobile-e2e-runbook.md`.
 */

export interface DiscoveredElement {
  readonly testID: string
  /** Detox element handle ready to be acted upon. */
  readonly handle: Detox.IndexableNativeElement
}

/**
 * Discover an element by testID. Fails the spec if the element is not
 * present within `timeoutMs` — mirrors `argent describe` returning a
 * structured tree (no tree, no tap).
 *
 * Uses `waitFor(...).toBeVisible().withTimeout(...)` rather than the
 * immediate `expect(...).toBeVisible()`. Screens often need a moment
 * to mount: Profile tab waits on a `useQuery('/me')` round-trip;
 * DiscoveryScreen waits on `useQuery('/complaints')`. An immediate
 * assertion races those promises and flakes the suite. The default
 * 10 s window matches the React Query retry budget plus simulator
 * jitter, and can be tightened per call site when needed.
 */
export const discover = async (testID: string, timeoutMs = 10_000): Promise<DiscoveredElement> => {
  const handle = element(by.id(testID))
  await waitFor(handle).toBeVisible().withTimeout(timeoutMs)
  return { testID, handle }
}

/**
 * Tap a previously-discovered element. The discovered-handle argument
 * makes it impossible to tap without discovery — exactly the invariant
 * the Argent rule enforces.
 */
export const tapDiscovered = async (el: DiscoveredElement): Promise<void> => {
  await el.handle.tap()
}

/**
 * Type into a previously-discovered text input.
 */
export const typeDiscovered = async (el: DiscoveredElement, text: string): Promise<void> => {
  await el.handle.typeText(text)
}

/**
 * Scroll a previously-discovered scroll container until a child testID
 * becomes visible. Useful for the constituency picker option list.
 */
export const scrollToDiscovered = async (
  el: DiscoveredElement,
  childTestID: string,
): Promise<DiscoveredElement> => {
  const child = element(by.id(childTestID))
  await waitFor(child).toBeVisible().whileElement(by.id(el.testID)).scroll(200, 'down')
  return { testID: childTestID, handle: child }
}

/**
 * Launch the app fresh. Centralised so each spec uses the same launch
 * config — and so we can attach permissions overrides in one place when
 * `permissions.spec.ts` needs them.
 *
 * Network sync blacklist: Detox treats any in-flight HTTP request as a
 * "busy" sync resource and waits for it before returning from
 * `launchApp` / progressing through actions. The S1 e2e build talks to
 * a local API on `localhost:<port>` that often is not running — without
 * a blacklist the React Query retries on `/categories`, `/complaints`,
 * `/me` etc. pin Detox in the busy state long enough to blow past the
 * test timeout. Blacklisting all localhost traffic (Metro + API) lets
 * Detox idle while those requests fail in the background; the specs
 * use explicit `waitFor(...).withTimeout(...)` to gate on UI state, so
 * losing the network sync resource is safe here.
 */
export const launchFresh = async (permissions?: Detox.DevicePermissions): Promise<void> => {
  await device.launchApp({
    newInstance: true,
    permissions,
  })
  await device.setURLBlacklist(['.*localhost.*', '.*127\\.0\\.0\\.1.*', '.*10\\.0\\.2\\.2.*'])

  // Defensive: a flaked permission spec can leave a SpringBoard alert
  // dangling. `newInstance: true` kills the app process but does NOT
  // dismiss system-owned alerts, so they overlay the next spec's UI
  // and every `discover()` times out. Probe for the most common
  // dialog button labels and tap whichever exists; the iOS-only path
  // is gated on platform so Android emulator runs are unaffected.
  if (device.getPlatform() === 'ios') {
    for (const label of ["Don't Allow", 'OK', 'Allow', 'Dismiss'] as const) {
      try {
        await system.element(by.system.label(label)).tap()
      } catch {
        // No such system element — expected on the clean-launch path.
      }
    }
  }
}
