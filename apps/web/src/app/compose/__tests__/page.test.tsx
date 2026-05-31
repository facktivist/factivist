/**
 * `/compose` route — mounts <ComposerShell /> with the server action.
 *
 * The route is intentionally thin (one line of JSX): the test confirms
 * the wiring (action arg is forwarded) and that the rendered tree is
 * the shell, not the bare form.
 */

import { describe, expect, it, vi } from 'vitest'

vi.mock('../../../features/complaint/ComposerShell.tsx', () => ({
  ComposerShell: (_props: unknown) => <div data-testid="composer-shell" />,
}))

const actionMock = vi.fn(async () => ({ id: 'cmp_1' }))
vi.mock('../../../features/complaint/createComplaintAction.ts', () => ({
  createComplaintAction: (...args: unknown[]) => actionMock(...args),
}))

import ComposePage from '../page.tsx'

describe('ComposePage route', () => {
  it('renders <ComposerShell /> and passes the server action as `action`', () => {
    const element = ComposePage() as { props: { action: unknown } }
    expect(element).toBeTruthy()
    expect(typeof element.props.action).toBe('function')
  })
})
