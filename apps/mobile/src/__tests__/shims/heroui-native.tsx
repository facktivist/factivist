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
  /** HeroUI Native uses `isDisabled`; we map it to `aria-disabled`. */
  isDisabled?: boolean
}

const ButtonRoot = ({
  children,
  variant = 'primary',
  onPress,
  testID,
  accessibilityLabel,
  accessibilityState,
  isDisabled,
}: ButtonProps) => (
  <button
    type="button"
    data-testid={testID}
    data-variant={variant}
    aria-label={accessibilityLabel}
    aria-pressed={
      accessibilityState?.selected !== undefined ? String(accessibilityState.selected) : undefined
    }
    aria-disabled={isDisabled || accessibilityState?.disabled ? 'true' : undefined}
    disabled={isDisabled || undefined}
    onClick={isDisabled ? undefined : onPress}
  >
    {children}
  </button>
)

// Mobile composers call <Button.Label>label</Button.Label>; declaration-merge
// so RTL can see the rendered text and tests can press the root by testID.
const ButtonLabel = ({ children }: { children?: ReactNode }) => <>{children}</>
export const Button = Object.assign(ButtonRoot, { Label: ButtonLabel })

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

// Minimal Input / TextArea shims so feature tests can mount the mobile
// composer without pulling Reanimated worklets through Vitest. The RN
// `onChangeText` prop is mapped to the DOM `onChange` event so RTL's
// `userEvent.type` works on jsdom inputs/textareas.
type InputLikeProps = {
  value?: string
  onChangeText?: (next: string) => void
  onBlur?: () => void
  placeholder?: string
  testID?: string
  accessibilityLabel?: string
  accessibilityRole?: string
  maxLength?: number
  numberOfLines?: number
}

export const Input = ({
  value,
  onChangeText,
  onBlur,
  placeholder,
  testID,
  accessibilityLabel,
  maxLength,
}: InputLikeProps) => (
  <input
    type="text"
    value={value ?? ''}
    onChange={(e) => onChangeText?.(e.target.value)}
    onBlur={onBlur}
    placeholder={placeholder}
    data-testid={testID}
    aria-label={accessibilityLabel}
    maxLength={maxLength}
  />
)

export const TextArea = ({
  value,
  onChangeText,
  onBlur,
  placeholder,
  testID,
  accessibilityLabel,
  maxLength,
  numberOfLines,
}: InputLikeProps) => (
  <textarea
    value={value ?? ''}
    onChange={(e) => onChangeText?.(e.target.value)}
    onBlur={onBlur}
    placeholder={placeholder}
    data-testid={testID}
    aria-label={accessibilityLabel}
    maxLength={maxLength}
    rows={numberOfLines}
  />
)

export const HeroUINativeProvider = ({ children }: WrapperProps) => <>{children}</>
