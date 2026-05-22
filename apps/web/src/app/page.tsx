import { Card } from '@factivist/ui-web/components'

import { CtaButton } from './_components/CtaButton.tsx'

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col items-center justify-center gap-8 p-8">
      <Card className="w-full p-8">
        <h1 className="text-4xl font-bold tracking-tight">Welcome to Factivist</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          A monorepo scaffold for fact-driven publishing — Next.js 16, HeroUI v3, Tailwind v4.
        </p>
        <div className="mt-6">
          <CtaButton />
        </div>
      </Card>
    </main>
  )
}
