/**
 * HeroUI v3 web component re-exports.
 *
 * Keep this surface intentionally narrow — only the primitives we currently
 * use across the app. New surfaces should be opt-in: add the re-export here
 * and ship the prop type alongside it so consumers get typed extension points.
 *
 * Convention: re-export the component *and* the matching prop type. HeroUI v3
 * exposes both as named exports (`Button` + `ButtonProps`), so we forward the
 * pair verbatim and rely on its declaration-merged subcomponent slots
 * (`Card.Header`, `AlertDialog.Trigger`, etc.) to stay attached.
 */

export type {
  AlertDialogProps,
  ButtonProps,
  CardProps,
  InputProps,
  SpinnerProps,
} from '@heroui/react'
export {
  AlertDialog,
  Button,
  Card,
  Input,
  Spinner,
} from '@heroui/react'
