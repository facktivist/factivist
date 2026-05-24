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
 * present — mirrors `argent describe` returning a structured tree (no
 * tree, no tap).
 */
export const discover = async (testID: string): Promise<DiscoveredElement> => {
  const handle = element(by.id(testID))
  // Detox `toBeVisible` throws if the element is not in the hierarchy.
  await expect(handle).toBeVisible()
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
 */
export const launchFresh = async (permissions?: Detox.DevicePermissions): Promise<void> => {
  await device.launchApp({
    newInstance: true,
    permissions,
  })
}
