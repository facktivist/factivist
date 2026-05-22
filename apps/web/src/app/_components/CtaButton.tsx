'use client'

import { Button } from '@factivist/ui-web/components'
import { useState } from 'react'

export function CtaButton() {
  const [clicked, setClicked] = useState(false)

  return (
    <div data-testid="cta-wrap">
      <Button
        variant="primary"
        onPress={() => setClicked(true)}
        data-testid="cta-button"
        aria-pressed={clicked}
      >
        {clicked ? 'Thanks!' : 'Get started'}
      </Button>
    </div>
  )
}
