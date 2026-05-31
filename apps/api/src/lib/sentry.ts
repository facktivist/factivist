import { beforeSend, dropBreadcrumbCategories } from '@factivist/shared/observability'
import * as Sentry from '@sentry/node'

let initialized = false

export const isSentryEnabled = (): boolean => initialized

export const initSentry = (
  dsn: string | undefined = process.env.SENTRY_DSN,
  env: string = process.env.NODE_ENV ?? 'development',
): boolean => {
  if (initialized) return true
  if (!dsn) return false

  Sentry.init({
    dsn,
    environment: env,
    tracesSampleRate: env === 'production' ? 0.1 : 0,
    beforeSend: (event, hint) =>
      beforeSend(event as Record<string, unknown>, hint) as Sentry.ErrorEvent | null,
    beforeBreadcrumb: (crumb) => {
      if (
        crumb.category &&
        dropBreadcrumbCategories.includes(
          crumb.category as (typeof dropBreadcrumbCategories)[number],
        )
      ) {
        return null
      }
      return crumb
    },
  })

  initialized = true
  return true
}

export const resetSentryForTest = (): void => {
  initialized = false
}
