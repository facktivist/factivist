import { beforeSend, dropBreadcrumbCategories } from '@factivist/shared/observability'
import * as Sentry from '@sentry/react-native'

type SentryInitOptions = NonNullable<Parameters<typeof Sentry.init>[0]>

let initialized = false

export const isSentryEnabled = (): boolean => initialized

const resolveDsn = (): string | undefined => {
  return process.env.EXPO_PUBLIC_SENTRY_DSN ?? undefined
}

const resolveEnv = (): string => {
  return process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development'
}

export const initSentry = (
  dsn: string | undefined = resolveDsn(),
  env: string = resolveEnv(),
): boolean => {
  if (initialized) return true
  if (!dsn) return false

  Sentry.init({
    dsn,
    environment: env,
    tracesSampleRate: env === 'production' ? 0.1 : 0,
    beforeSend: ((event, hint) =>
      beforeSend(event as Record<string, unknown>, hint)) as SentryInitOptions['beforeSend'],
    beforeBreadcrumb: ((crumb) => {
      if (
        crumb?.category &&
        dropBreadcrumbCategories.includes(
          crumb.category as (typeof dropBreadcrumbCategories)[number],
        )
      ) {
        return null
      }
      return crumb
    }) as SentryInitOptions['beforeBreadcrumb'],
  })

  initialized = true
  return true
}

export const resetSentryForTest = (): void => {
  initialized = false
}
