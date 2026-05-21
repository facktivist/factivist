/**
 * HeroUI Native component re-exports.
 *
 * Keep this surface intentionally narrow — only the primitives we currently
 * use across the Expo app. Same convention as the web wrapper: re-export the
 * component *and* its prop type so consumers get typed extension points.
 *
 * heroui-native is a peer dependency — consumers must install it in the
 * Expo app, where Metro can resolve its native modules. See the
 * `heroui-native` skill for current export names; if the upstream API
 * changes shape, update both the value and type re-exports here in lockstep.
 */

export type {
  ButtonRootProps,
  CardRootProps,
  TextFieldRootProps,
} from 'heroui-native'
export { Button, Card, TextField } from 'heroui-native'
