import { Button } from '@factivist/ui-native/components'
import { useState } from 'react'

/**
 * Primary call-to-action on the Home screen.
 *
 * Mirrors `apps/web/src/app/_components/CtaButton.tsx` — toggles label + a11y
 * state on press so a screen reader announces the change. Native uses
 * `onPress` (not `onClick`) and `accessibilityState.selected` (not
 * `aria-pressed`); both surface the same semantics to assistive tech.
 */
export function CtaButton() {
  const [clicked, setClicked] = useState(false)

  return (
    <Button
      variant="primary"
      onPress={() => setClicked(true)}
      testID="cta-button"
      accessibilityRole="button"
      accessibilityState={{ selected: clicked }}
      accessibilityLabel={clicked ? 'Thanks!' : 'Get started'}
    >
      {clicked ? 'Thanks!' : 'Get started'}
    </Button>
  )
}
