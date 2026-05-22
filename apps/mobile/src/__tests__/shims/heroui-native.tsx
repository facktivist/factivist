/**
 * Vitest shim for `heroui-native`.
 *
 * Mirrors the compound-component anatomy the app actually uses (Button +
 * Card.{Header,Title,Body,Description,Footer}) with semantic HTML so RTL
 * queries by role and testID work. Behavioural correctness of the real
 * components is exercised via Detox on simulator/device.
 *
 * Why a shim and not the upstream package? `heroui-native` imports
 * Reanimated worklets at module load, which require Babel's worklet
 * plugin + Metro. Neither exists in the Vitest pipeline.
 */
import type { ReactNode } from 'react'

type ButtonProps = {
  children?: ReactNode
  variant?: 'primary' | 'secondary' | 'tertiary' | 'danger' | 'ghost' | 'outline'
  onPress?: () => void
  testID?: string
  accessibilityLabel?: string
  accessibilityRole?: string
  accessibilityState?: { selected?: boolean; disabled?: boolean }
}

export const Button = ({
  children,
  variant = 'primary',
  onPress,
  testID,
  accessibilityLabel,
  accessibilityState,
}: ButtonProps) => (
  <button
    type="button"
    data-testid={testID}
    data-variant={variant}
    aria-label={accessibilityLabel}
    aria-pressed={
      accessibilityState?.selected !== undefined ? String(accessibilityState.selected) : undefined
    }
    aria-disabled={accessibilityState?.disabled ? 'true' : undefined}
    onClick={onPress}
  >
    {children}
  </button>
)

type WrapperProps = { children?: ReactNode; testID?: string }

const CardRoot = ({ children, testID }: WrapperProps) => (
  <div data-testid={testID ?? 'card'}>{children}</div>
)
const CardHeader = ({ children }: WrapperProps) => <header>{children}</header>
const CardTitle = ({ children }: WrapperProps) => <h2>{children}</h2>
const CardBody = ({ children }: WrapperProps) => <div>{children}</div>
const CardDescription = ({ children }: WrapperProps) => <p>{children}</p>
const CardFooter = ({ children }: WrapperProps) => <footer>{children}</footer>

export const Card = Object.assign(CardRoot, {
  Header: CardHeader,
  Title: CardTitle,
  Body: CardBody,
  Description: CardDescription,
  Footer: CardFooter,
})

export const TextField = ({ children, testID }: WrapperProps) => (
  <div data-testid={testID}>{children}</div>
)

export const HeroUINativeProvider = ({ children }: WrapperProps) => <>{children}</>
