import { beforeSend, dropBreadcrumbCategories } from '@factivist/shared/observability'

export const sentryBeforeSend = (event: unknown, hint: unknown): unknown => {
  return beforeSend(
    event as Record<string, unknown>,
    hint as { originalException?: unknown } | undefined,
  )
}

export const sentryBeforeBreadcrumb = (crumb: {
  category?: string
}): { category?: string } | null => {
  if (
    crumb.category &&
    dropBreadcrumbCategories.includes(crumb.category as (typeof dropBreadcrumbCategories)[number])
  ) {
    return null
  }
  return crumb
}

export const resolveDsn = (): string | undefined => {
  return process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN ?? undefined
}

export const resolveEnv = (): string => {
  return process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development'
}

export const resolveTracesSampleRate = (env: string = resolveEnv()): number => {
  return env === 'production' ? 0.1 : 0
}
