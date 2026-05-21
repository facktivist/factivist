import { createApp } from './app.ts'

const port = Number(process.env.PORT ?? 3001)
const corsOrigin = process.env.CORS_ORIGIN

const app = createApp({ corsOrigin })

if (import.meta.main) {
  // biome-ignore lint/suspicious/noConsole: server bootstrap log
  console.log(`API listening on :${port}`)
}

export default {
  port,
  fetch: app.fetch,
}
