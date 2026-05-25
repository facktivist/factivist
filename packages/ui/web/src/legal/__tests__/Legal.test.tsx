import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { Legal } from '../Legal.tsx'

describe('Legal.Page', () => {
  it('renders title + last-updated stamp + children', () => {
    render(
      <Legal.Page kind="tos" title="Terms of Service" lastUpdated="2026-05-15T00:00:00.000Z">
        <p>Body text</p>
      </Legal.Page>,
    )
    expect(screen.getByRole('heading', { name: 'Terms of Service' })).toBeInTheDocument()
    expect(screen.getByText(/Last updated/)).toBeInTheDocument()
    expect(screen.getByText('Body text')).toBeInTheDocument()
  })

  it('tags the article with data-page-kind for analytics', () => {
    const { container } = render(
      <Legal.Page kind="privacy" title="Privacy" lastUpdated="2026-05-15T00:00:00.000Z" />,
    )
    expect(container.querySelector('article[data-page-kind="privacy"]')).toBeInTheDocument()
  })

  it('falls back to a date-slice when lastUpdated is unparseable', () => {
    render(
      <Legal.Page kind="cookie" title="Cookies" lastUpdated="not-a-date">
        body
      </Legal.Page>,
    )
    expect(screen.getByText(/Last updated not-a-date/)).toBeInTheDocument()
  })
})

describe('Legal.GrievanceContact', () => {
  const officer = {
    name: 'Procedure Officer',
    designation: 'IT Rules 2021 Grievance Officer',
    email: 'grievance@factivist.example',
    addressLines: ['Line 1', 'Line 2'],
  }

  it('renders name + designation + email link + address lines', () => {
    render(<Legal.GrievanceContact officer={officer} slaHours={24} />)
    expect(screen.getByRole('heading', { name: 'Procedure Officer' })).toBeInTheDocument()
    expect(screen.getByText('IT Rules 2021 Grievance Officer')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: officer.email })).toHaveAttribute(
      'href',
      `mailto:${officer.email}`,
    )
    expect(screen.getByText('Line 1')).toBeInTheDocument()
    expect(screen.getByText('Line 2')).toBeInTheDocument()
  })

  it('shows the SLA hours in the footer', () => {
    render(<Legal.GrievanceContact officer={officer} slaHours={24} />)
    expect(screen.getByText(/Acknowledged within 24 h/)).toBeInTheDocument()
  })

  it('omits the phone row when phone is undefined', () => {
    render(<Legal.GrievanceContact officer={officer} slaHours={24} />)
    expect(screen.queryByText('Phone')).toBeNull()
  })

  it('renders the phone row when phone is supplied', () => {
    render(
      <Legal.GrievanceContact officer={{ ...officer, phone: '+91 80 0000 0000' }} slaHours={24} />,
    )
    expect(screen.getByText('Phone')).toBeInTheDocument()
    expect(screen.getByText('+91 80 0000 0000')).toBeInTheDocument()
  })
})

describe('Legal.ConsentBox', () => {
  const purposes = [
    {
      id: 'essential',
      label: 'Essential operations',
      description: 'Required to operate the platform',
      required: true,
    },
    {
      id: 'analytics',
      label: 'Anonymous analytics',
      description: 'Optional aggregate-only telemetry',
      required: false,
    },
  ]

  it('renders one checkbox per purpose + marks required ones disabled', () => {
    render(
      <Legal.ConsentBox purposes={purposes} value={{ analytics: false }} onChange={() => {}} />,
    )
    const essential = screen.getByRole('checkbox', { name: /Essential operations/ })
    const analytics = screen.getByRole('checkbox', { name: /Anonymous analytics/ })
    expect(essential).toBeDisabled()
    expect(essential).toBeChecked()
    expect(analytics).not.toBeChecked()
  })

  it('emits onChange with the merged record when an optional purpose is toggled', () => {
    const onChange = vi.fn()
    render(
      <Legal.ConsentBox purposes={purposes} value={{ analytics: false }} onChange={onChange} />,
    )
    fireEvent.click(screen.getByRole('checkbox', { name: /Anonymous analytics/ }))
    expect(onChange).toHaveBeenCalledWith({ analytics: true })
  })
})

describe('Legal compound', () => {
  it('exposes Page, GrievanceContact, ConsentBox', () => {
    expect(typeof Legal.Page).toBe('function')
    expect(typeof Legal.GrievanceContact).toBe('function')
    expect(typeof Legal.ConsentBox).toBe('function')
  })
})
