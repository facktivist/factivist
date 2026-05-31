/**
 * ModerationDecisionForm — client component tests.
 *
 * Covers:
 *   - submit-with-no-decision → `err-decision` rendered, action NOT called.
 *   - submit-with-empty-rationale → `err-rationale` rendered, action NOT called.
 *   - successful submit forwards parsed payload to the bound action.
 *   - `already_decided` failure path renders `decision-submit-error`.
 *   - `validation` failure path renders the message in `err-rationale`.
 */

import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { DecideAction } from '../../../features/admin/ModerationDecisionForm.tsx'
import { ModerationDecisionForm } from '../../../features/admin/ModerationDecisionForm.tsx'

const CASE_ID = 'mq_bdf6fdbe-ee1b-410e-84b5-1928b2833a82'

// jsdom does not implement `HTMLFormElement.requestSubmit` — patch it to
// dispatch a real submit event so React's delegated handler fires.
// Without this, fireEvent.submit on a form whose submit button has a
// click handler can infinite-recurse through requestSubmit.
if (typeof HTMLFormElement.prototype.requestSubmit !== 'function') {
  HTMLFormElement.prototype.requestSubmit = function (this: HTMLFormElement) {
    fireEvent.submit(this)
  } as HTMLFormElement['requestSubmit']
}

const setup = (action: DecideAction) => {
  const utils = render(<ModerationDecisionForm caseId={CASE_ID} action={action} />)
  const form = utils.container.querySelector('form') as HTMLFormElement
  const submitForm = () => {
    fireEvent.submit(form)
  }
  return { ...utils, form, submitForm }
}

describe('<ModerationDecisionForm />', () => {
  it('renders three decision options + rationale + submit', () => {
    const action = vi.fn(async () => ({ ok: true as const }))
    const { getByTestId } = setup(action)
    expect(getByTestId('decision-option-approve')).toBeInTheDocument()
    expect(getByTestId('decision-option-remove')).toBeInTheDocument()
    expect(getByTestId('decision-option-escalate')).toBeInTheDocument()
    expect(getByTestId('decision-rationale')).toBeInTheDocument()
    expect(getByTestId('decision-submit')).toBeInTheDocument()
  })

  it('refuses submit with no decision picked', () => {
    const action = vi.fn(async () => ({ ok: true as const }))
    const { submitForm, container } = setup(action)
    submitForm()
    expect(container.querySelector('#err-decision')).not.toBeNull()
    expect(container.querySelector('#err-rationale')).toBeNull()
    expect(action).not.toHaveBeenCalled()
  })

  it('refuses submit with empty rationale', () => {
    const action = vi.fn(async () => ({ ok: true as const }))
    const { submitForm, getByTestId, container } = setup(action)
    fireEvent.click(getByTestId('decision-input-approve'))
    submitForm()
    expect(container.querySelector('#err-rationale')).not.toBeNull()
    expect(container.querySelector('#err-decision')).toBeNull()
    expect(action).not.toHaveBeenCalled()
  })

  it('forwards the parsed payload to the bound action on success', async () => {
    const action = vi.fn(async () => ({ ok: true as const }))
    const { submitForm, getByTestId } = setup(action)
    fireEvent.click(getByTestId('decision-input-approve'))
    fireEvent.change(getByTestId('decision-rationale'), {
      target: { value: 'all good' },
    })
    submitForm()
    // Allow the useTransition microtask to flush.
    await Promise.resolve()
    await Promise.resolve()
    expect(action).toHaveBeenCalledTimes(1)
    expect(action).toHaveBeenCalledWith({ decision: 'approve', rationale: 'all good' })
  })

  it('renders `decision-submit-error` when the action returns code=already_decided', async () => {
    const action = vi.fn(async () => ({
      ok: false as const,
      code: 'already_decided' as const,
      message: 'This case has already been decided by another operator.',
    }))
    const { submitForm, getByTestId, findByTestId } = setup(action)
    fireEvent.click(getByTestId('decision-input-remove'))
    fireEvent.change(getByTestId('decision-rationale'), {
      target: { value: 'ncii — take down' },
    })
    submitForm()
    const err = await findByTestId('decision-submit-error')
    expect(err.textContent).toMatch(/already been decided/i)
  })

  it('renders the rationale message when the action returns code=validation', async () => {
    const action = vi.fn(async () => ({
      ok: false as const,
      code: 'validation' as const,
      message: 'Rationale must be ≤ 500 characters',
    }))
    const { submitForm, getByTestId, container } = setup(action)
    fireEvent.click(getByTestId('decision-input-escalate'))
    fireEvent.change(getByTestId('decision-rationale'), {
      target: { value: 'route to GO' },
    })
    submitForm()
    // The validation error path runs inside startTransition; wait for it.
    for (let i = 0; i < 20; i += 1) {
      if (container.querySelector('#err-rationale')) break
      await new Promise((r) => setTimeout(r, 10))
    }
    const err = container.querySelector('#err-rationale') as HTMLElement | null
    expect(err).not.toBeNull()
    expect(err?.textContent).toContain('Rationale')
  })

  it('renders the generic submit error when the action returns code=network', async () => {
    const action = vi.fn(async () => ({
      ok: false as const,
      code: 'network' as const,
      message: 'Network error while submitting decision.',
    }))
    const { submitForm, getByTestId, findByTestId } = setup(action)
    fireEvent.click(getByTestId('decision-input-approve'))
    fireEvent.change(getByTestId('decision-rationale'), {
      target: { value: 'looks fine' },
    })
    submitForm()
    const err = await findByTestId('decision-submit-error')
    expect(err.textContent).toMatch(/network/i)
  })

  it('renders the generic submit error when the action returns code=unauthorized', async () => {
    const action = vi.fn(async () => ({
      ok: false as const,
      code: 'unauthorized' as const,
      message: 'Your session was rejected by the API.',
    }))
    const { submitForm, getByTestId, findByTestId } = setup(action)
    fireEvent.click(getByTestId('decision-input-approve'))
    fireEvent.change(getByTestId('decision-rationale'), {
      target: { value: 'looks fine' },
    })
    submitForm()
    const err = await findByTestId('decision-submit-error')
    expect(err.textContent).toMatch(/rejected/i)
  })
})
