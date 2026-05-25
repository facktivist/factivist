import * as Sentry from '@sentry/nextjs'

import {
  resolveDsn,
  resolveEnv,
  resolveTracesSampleRate,
  sentryBeforeBreadcrumb,
  sentryBeforeSend,
} from './sentry.shared.ts'

const dsn = resolveDsn()

if (dsn) {
  const env = resolveEnv()
  Sentry.init({
    dsn,
    environment: env,
    tracesSampleRate: resolveTracesSampleRate(env),
    beforeSend: sentryBeforeSend as Parameters<typeof Sentry.init>[0]['beforeSend'],
    beforeBreadcrumb: sentryBeforeBreadcrumb as Parameters<
      typeof Sentry.init
    >[0]['beforeBreadcrumb'],
  })
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
