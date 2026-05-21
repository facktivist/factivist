# Tech Stack Evaluation Document

**Project:** Monorepo — Web, Mobile (iOS + Android), API, Agent Orchestration
**Package Manager:** Bun
**Date:** May 21, 2026
**Status:** Evaluation / Pre-Scaffold

---

## 1. Executive Summary

This document evaluates and finalizes the technology stack for a full-stack monorepo project spanning web, mobile, API, and agent orchestration layers. The architecture prioritizes type safety across boundaries, shared design tokens between platforms, minimal runtime overhead, and developer velocity through Bun-native tooling. Agent orchestration is handled by Ruflo (formerly Claude Flow), the leading open-source multi-agent platform for Claude Code.

A minimum **95% code coverage** target is enforced across all layers via a multi-tier testing strategy: Vitest for unit and integration tests, Playwright for web E2E, and Detox for mobile E2E.

---

## 2. Version Reference (as of May 2026)

| Technology | Version | Status |
|---|---|---|
| Next.js | 16.2.6 | Stable |
| TypeScript | 6.0.3 | Stable |
| HeroUI (web) | 3.0.5 | Stable |
| HeroUI Native | 1.x | Stable (v1.0.0 March 2026) |
| Hono | 4.12.21 | Stable |
| Drizzle ORM | 0.45.2 | Stable (1.0.0-beta.2 also available) |
| Expo SDK | 55 | Stable (SDK 56 in beta) |
| React | 19.x | Stable |
| React Native | 0.83 (SDK 55) | Stable |
| Tailwind CSS | 4.3.0 | Stable |
| Uniwind | Latest | Stable (Tailwind CSS v4.3 for React Native) |
| Bun | 1.2.x | Stable |
| Turborepo | Latest | Stable (Vercel-maintained) |
| Vitest | Latest | Stable |
| Playwright | Latest | Stable |
| Detox | Latest | Stable |
| Supabase | Managed | Cloud service |
| Biome | Latest | Stable |
| Ruflo | 3.7.x-alpha | Alpha (rapid release cadence) |

---

## 3. Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                        MONOREPO (Turborepo + Bun)            │
├──────────────┬──────────────┬──────────────┬─────────────────┤
│   apps/web   │ apps/mobile  │   apps/api   │  Agent Layer    │
│  (Next.js)   │   (Expo)     │   (Hono)     │   (Ruflo)       │
│  HeroUI v3   │ HeroUI Native│  Bun Runtime │  Claude Code    │
│  Tailwind CSS v4.3 │   Uniwind    │              │  Multi-Agent    │
├──────────────┴──────────────┴──────────────┴─────────────────┤
│                     SHARED PACKAGES                          │
│  ui/theme · ui/web · ui/native · shared · db                 │
├──────────────────────────────────────────────────────────────┤
│                     TESTING                                  │
│  Vitest (unit/integration) · Playwright (web E2E)            │
│  Detox (mobile E2E) · Istanbul/v8 (coverage)                 │
├──────────────────────────────────────────────────────────────┤
│                     TOOLING                                  │
│  tailwind-config · tsconfig · eslint-config · vitest-config  │
├──────────────────────────────────────────────────────────────┤
│                     INFRASTRUCTURE                           │
│  Supabase (Postgres) · Supabase Auth · Drizzle ORM          │
└──────────────────────────────────────────────────────────────┘
```

---

## 4. Monorepo Structure

```
monorepo/
├── apps/
│   ├── web/                      # Next.js + HeroUI + Tailwind v4
│   │   ├── src/
│   │   │   ├── app/              # Next.js App Router routes
│   │   │   ├── features/         # Feature modules
│   │   │   ├── components/       # Global components
│   │   │   └── lib/              # Web-specific utils
│   │   ├── __tests__/            # Unit + integration tests
│   │   ├── e2e/                  # Playwright E2E tests
│   │   ├── vitest.config.ts
│   │   ├── playwright.config.ts
│   │   └── package.json
│   │
│   ├── api/                      # Hono on Bun runtime
│   │   ├── src/
│   │   │   ├── routes/           # Hono route handlers
│   │   │   ├── middleware/       # Auth, CORS, rate limiting
│   │   │   └── lib/              # API-specific utils
│   │   ├── __tests__/            # Unit + integration tests
│   │   ├── vitest.config.ts
│   │   └── package.json
│   │
│   ├── mobile/                   # Expo + HeroUI Native + Uniwind
│   │   ├── src/
│   │   │   ├── screens/          # Screen components
│   │   │   ├── features/         # Feature modules
│   │   │   └── components/       # Mobile components
│   │   ├── __tests__/            # Unit + integration tests
│   │   ├── e2e/                  # Detox E2E tests
│   │   ├── vitest.config.ts
│   │   ├── .detoxrc.js
│   │   └── package.json
│
├── packages/
│   ├── ui/                       # Shared design system
│   │   ├── theme/                # HSL/oklch tokens, typography, spacing
│   │   ├── web/                  # HeroUI web wrappers
│   │   ├── native/               # HeroUI Native wrappers
│   │   ├── __tests__/            # Component unit tests
│   │   └── vitest.config.ts
│   │
│   ├── shared/                   # Types, Zod validators, constants
│   │   ├── src/
│   │   ├── __tests__/
│   │   └── vitest.config.ts
│   │
│   ├── db/                       # Drizzle ORM + Supabase schema
│   │   ├── src/
│   │   │   ├── schema/           # Table definitions
│   │   │   ├── migrations/       # Generated migrations
│   │   │   └── seed/             # Seed data for testing
│   │   ├── __tests__/            # Schema + query tests
│   │   └── vitest.config.ts
│
├── tooling/
│   ├── tailwind-config/          # Shared Tailwind CSS v4.3 preset + HeroUI plugin
│   ├── tsconfig/                 # Shared TypeScript configurations
│   ├── eslint-config/            # Shared lint rules
│   └── vitest-config/            # Shared Vitest preset + coverage config
│       ├── base.ts               # Base config all packages extend
│       ├── react.ts              # React-specific (jsdom, testing-library)
│       ├── node.ts               # Node/Bun-specific (API, DB)
│       └── package.json
│
├── .claude/                      # Ruflo / Claude Code agent config
│   ├── skills/
│   ├── commands/
│   └── settings.json
│
├── turbo.json
├── bun.lock
├── package.json
└── CLAUDE.md
```

---

## 5. Layer-by-Layer Evaluation

### 4.1 Monorepo Orchestration — Turborepo + Bun Workspaces

| Criterion | Assessment |
|---|---|
| **Why Turborepo** | Native Bun workspace support, task orchestration with dependency graph awareness, remote caching (including test result caching), minimal config overhead. Vercel-maintained, same ecosystem as Next.js. |
| **Why not Nx** | Heavier setup, plugin-driven architecture adds complexity for this project size. Nx's strength is enterprise monorepos with 50+ packages — overkill here. |
| **Why Bun** | Native TypeScript execution (no transpile step), fastest package install times, built-in bundler for the API layer, native test runner. Entire toolchain stays in one runtime. |
| **Risk** | Some npm packages may have Node.js-specific assumptions. Mitigation: Bun's Node.js compatibility layer handles 99%+ of cases. Pin Bun version in CI. |

### 4.2 Web — Next.js + HeroUI v3 + Tailwind CSS v4

| Criterion | Assessment |
|---|---|
| **Framework** | Next.js (App Router). SSR/SSG for SEO, React Server Components for performance, API routes for lightweight backend needs. |
| **Bundler** | Turbopack (built-in). Rust-based, default in Next.js. No separate config required. |
| **UI Library** | HeroUI v3. Built on React Aria (Adobe) for accessibility, Tailwind CSS v4.3 for styling, compound component API (dot notation). Zero runtime CSS — all styles resolved at build time. Design tokens via CSS custom properties in `@theme` directives. |
| **Styling** | Tailwind CSS v4.3. Utility-first, oklch color space, CSS-native theming. Shared preset in `tooling/tailwind-config/`. |
| **Testing** | Vitest (unit/integration for components, hooks, server actions, Zod schemas) + Playwright (E2E for async server components, auth flows, full user journeys). |
| **Risk** | HeroUI v3 is relatively new (2026). Mitigation: built on mature foundations (React Aria, Tailwind v4), YC S24 backed, 27.7k GitHub stars. |

### 4.3 Mobile — Expo + HeroUI Native + Uniwind

| Criterion | Assessment |
|---|---|
| **Framework** | Expo (React Native) with Expo Router for typed file-based navigation. EAS Build/Submit for managed iOS/Android deployment. |
| **Bundler** | Metro (Expo default). Required for React Native module resolution. |
| **UI Library** | HeroUI Native v1.0.0 (stable March 2026). Built on Tailwind CSS v4.3 via Uniwind. Same design language and component API as HeroUI web. |
| **Uniwind** | Tailwind CSS for React Native. Enables utility-first styling with same class vocabulary as web. |
| **Key Dependencies** | `react-native-reanimated`, `react-native-gesture-handler`, `react-native-safe-area-context`, `@gorhom/bottom-sheet`, `react-native-svg`, `tailwind-merge`, `tailwind-variants`. |
| **Testing** | Vitest (unit/integration for components, hooks, business logic) + Detox (E2E for full native app flows on iOS/Android simulators). |
| **Risk** | HeroUI Native just hit v1.0.0. Mitigation: production-ready status confirmed, Apache 2.0 license. |

### 4.4 API — Hono on Bun Runtime

| Criterion | Assessment |
|---|---|
| **Framework** | Hono. Lightweight, edge-first web framework. Express-like API with Bun-native performance. Typed RPC via `hono/client` for end-to-end type safety. |
| **Bundler** | Bun's built-in bundler (`bun build`). Zero config. |
| **Middleware** | Composable Hono middlewares for auth, CORS, rate limiting, logging. |
| **Contract-First** | API contracts defined with Zod in `packages/shared/`. Validated on both client and server. |
| **Testing** | Vitest (unit tests for route handlers, middleware, business logic) + Hono's `app.request()` test helper for integration tests (no HTTP server needed). |

### 4.5 Database — Supabase (Postgres) + Drizzle ORM

| Criterion | Assessment |
|---|---|
| **Database** | Supabase (managed Postgres). Auth, Realtime, Storage, Edge Functions included. Row-Level Security for multi-tenant scenarios. |
| **ORM** | Drizzle ORM. Schema-as-TypeScript-code, ~7.4KB bundle, zero dependencies, SQL-first query builder. No codegen step. |
| **Why Drizzle over Prisma** | Bun-native (no WASM engine), 7.4KB vs 1.6MB bundle, faster cold starts (20–50ms vs 80–150ms), SQL transparency, schema-as-code. |
| **Testing** | Vitest with a dedicated test database. Schema validation tests, query result type tests, migration rollback tests. Seed data in `packages/db/src/seed/`. |
| **Supabase India Concern** | Blocked Feb 24 – Mar 3, 2026 via DNS poisoning under Section 69A. Resolved after Supabase engaged with MeitY. **Mitigation:** Use Supabase custom domains. |
| **Agent Skill** | `honra-io/drizzle-best-practices` — Install: `npx skills add honra-io/drizzle-best-practices`. |

### 4.6 Authentication — Supabase Auth

| Criterion | Assessment |
|---|---|
| **Provider** | Supabase Auth. Email/password, magic link, OAuth (Google, GitHub, etc.), phone OTP. |
| **Cross-Platform** | Works on web (Next.js SSR-compatible) and mobile (Expo). |
| **RLS Integration** | Auth tokens integrate directly with Postgres Row-Level Security policies. |
| **Testing** | Auth flows tested via Playwright E2E (web) and Detox E2E (mobile). Unit tests mock Supabase Auth client. |

### 4.7 Agent Orchestration — Ruflo

| Criterion | Assessment |
|---|---|
| **Platform** | Ruflo (formerly Claude Flow) v3.5+. Open-source multi-agent orchestration for Claude Code. 33.6k+ GitHub stars, 52k weekly npm downloads. |
| **Architecture** | Hive-mind pattern with queens (coordinators) and workers (specialized agents). Neural routing engine, TypeScript + Rust/WASM core. |
| **Integration** | Native Claude Code and MCP integration. MCP servers become first-class agent tools. |
| **Performance** | 84.8% solve rate on SWE-bench. 75% API cost savings vs single Claude Code usage. |
| **Use Cases** | Code generation orchestration, automated migration agents, CI/CD coordination, cross-package refactoring, parallel test execution. |
| **Risk** | Rapid release churn. Mitigation: pin versions, test agent workflows in CI. |

---

## 6. Testing Strategy

### 5.1 Coverage Target

**Minimum 95% code coverage** across all packages and apps, measured by lines covered. Coverage is enforced in CI — builds fail below threshold.

| Metric | Threshold |
|---|---|
| Lines | ≥ 95% |
| Branches | ≥ 90% |
| Functions | ≥ 95% |
| Statements | ≥ 95% |

### 5.2 Testing Pyramid

```
          ┌─────────┐
          │  E2E    │   ~10% of tests
          │Playwright│   Full user journeys, auth flows
          │ + Detox  │   Cross-browser, cross-device
          ├─────────┤
          │Integration│  ~30% of tests
          │  Vitest   │  API routes, DB queries,
          │           │  component interactions
          ├───────────┤
          │   Unit    │  ~60% of tests
          │  Vitest   │  Functions, hooks, utils,
          │           │  validators, business logic
          └───────────┘
```

### 5.3 Test Runner Selection

| Runner | Scope | Why |
|---|---|---|
| **Vitest** | Unit + Integration (all layers) | Jest-compatible API, native TypeScript, HMR watch mode (~40ms re-run), Turborepo cache integration, 7M+ weekly downloads. Dominant test framework for new projects in 2026. |
| **Playwright** | E2E (web) | Microsoft-maintained, multi-browser (Chromium, Firefox, WebKit), auto-wait, trace viewer, Next.js official recommendation. |
| **Detox** | E2E (mobile) | Grey-box testing for React Native, runs on real iOS/Android simulators, synchronization with native animations. Expo-compatible. |

**Why Vitest over bun:test:** Vitest has deeper ecosystem integration (Testing Library, Storybook, Turborepo caching), HMR-based watch mode, UI mode for visual debugging, and browser mode via Playwright. bun:test is faster in raw execution (3–10x) but lacks these features. Vitest is the documented recommendation in Next.js, Expo, and Hono.

### 5.4 Testing Matrix by Layer

| Layer | Unit (Vitest) | Integration (Vitest) | E2E |
|---|---|---|---|
| **packages/shared** | Zod schemas, validators, type guards, utility functions | Cross-schema validation, complex transformations | — |
| **packages/db** | Schema type inference, column definitions | Query builders against test DB, migration up/down, seed integrity | — |
| **packages/ui/theme** | Token value correctness, dark/light token completeness | — | — |
| **packages/ui/web** | Component render, props, variants, accessibility (React Aria) | Component composition, theme integration | — |
| **packages/ui/native** | Component render, props, variants | Theme integration with Uniwind | — |
| **apps/web** | Hooks, server actions, Zod form schemas, utility functions | Page component render with mocked data, API client integration | Playwright: auth flows, full page navigation, form submissions, responsive breakpoints |
| **apps/api** | Route handler logic, middleware functions, business logic | Full request/response via `app.request()`, DB integration with test database | — (covered by web E2E hitting API) |
| **apps/mobile** | Hooks, screen logic, business logic | Component render with mocked navigation | Detox: native app flows, deep linking, push notification handling, gesture interactions |

### 5.5 Coverage Configuration

Shared Vitest coverage config in `tooling/vitest-config/base.ts`:

```typescript
// tooling/vitest-config/base.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'lcov', 'html', 'json-summary'],
      reportsDirectory: './coverage',
      thresholds: {
        lines: 95,
        branches: 90,
        functions: 95,
        statements: 95,
      },
      exclude: [
        'node_modules/',
        '**/*.config.*',
        '**/*.d.ts',
        '**/types/**',
        '**/__tests__/**',
        '**/e2e/**',
        '**/coverage/**',
        '**/dist/**',
        '**/seed/**',
        '**/migrations/**',
      ],
    },
    globals: true,
    passWithNoTests: false,
  },
});
```

### 5.6 Test File Conventions

| Convention | Rule |
|---|---|
| File naming | `*.test.ts` / `*.test.tsx` for unit/integration, `*.spec.ts` for E2E |
| Location | `__tests__/` directory mirroring `src/` structure |
| Setup files | `__tests__/setup.ts` for global mocks and test utilities |
| Fixtures | `__tests__/fixtures/` for test data |
| Mocks | `__tests__/mocks/` for shared mock implementations |
| E2E | `e2e/` directory at app root |

---

## 7. Design System Architecture

### 6.1 Token Hierarchy

```
┌─────────────────────────────────────┐
│        PRIMITIVE TOKENS             │
│  Raw values, no semantic meaning    │
│  blue-500: oklch(0.65 0.19 255)     │
│  spacing-4: 16px                    │
│  font-size-lg: 18px                 │
├─────────────────────────────────────┤
│        SEMANTIC TOKENS              │
│  Purpose-driven aliases             │
│  --color-primary: var(--blue-500)   │
│  --color-surface: var(--gray-50)    │
│  --radius-md: 8px                   │
├─────────────────────────────────────┤
│        COMPONENT TOKENS             │
│  Scoped per-component overrides     │
│  --button-primary-bg                │
│  --card-border-radius               │
│  (use sparingly)                    │
└─────────────────────────────────────┘
```

### 6.2 Component Patterns

**Compound Components** — Parent components expose sub-components via dot notation (HeroUI's core pattern).

**Composition over Configuration** — Compose from HeroUI primitives rather than mega-components.

**Semantic Variants** — Use built-in variant system (primary, secondary, danger, ghost, outline). Extend via theme plugin.

### 6.3 Layout Patterns

4px base grid: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128.

Core primitives: Stack, Cluster, Sidebar, Switcher, Grid.

### 6.4 State Management

| State Type | Tool | Scope |
|---|---|---|
| Server state | TanStack Query | Web + Mobile |
| Client state | Zustand | Web + Mobile |
| Form state | React Hook Form + Zod | Web + Mobile |
| Validation | Zod (`packages/shared/`) | All layers |

---

## 8. Bundler Matrix

| App | Bundler | Config Required |
|---|---|---|
| Web (Next.js) | Turbopack (built-in) | None |
| API (Hono) | Bun built-in (`bun build`) | Minimal |
| Mobile (Expo) | Metro (Expo default) | None |

Shared packages use `"exports"` field for multi-bundler resolution:

```json
{
  "name": "@repo/ui",
  "exports": {
    "./web": "./src/web/index.ts",
    "./native": "./src/native/index.ts",
    "./theme": "./src/theme/index.ts"
  }
}
```

---

## 9. Cross-Platform Sharing Strategy

| Share Across Platforms | Keep Platform-Specific |
|---|---|
| Design tokens (colors, spacing, type scale) | Component implementations |
| Zod schemas + TypeScript types | Navigation / routing |
| API client (Hono RPC typed client) | Animations / transitions |
| Business logic / utility functions | Platform-specific interactions |
| Auth state management | Push notifications |
| Drizzle ORM schema + queries | Gesture handling |
| Vitest config presets | E2E test implementations |
| Test fixtures + mock factories | Platform-specific test utilities |

---

## 10. Developer Tooling

### 9.1 Agent Skills

| Skill | Source | Purpose |
|---|---|---|
| Drizzle Best Practices | `honra-io/drizzle-best-practices` | Schema design, query patterns, migrations |
| Drizzle ERD | `hiroppy/drizzle-erd` | Schema visualization |
| Drizzle Pitfalls | `BarisSozen/pitfalls-drizzle-orm` | Common mistakes, migration safety |

### 9.2 Dev Environment

| Tool | Purpose |
|---|---|
| Bun | Package management, script execution, API runtime |
| Turborepo | Task orchestration, caching (including test results) |
| Vitest | Unit + integration test runner |
| Playwright | Web E2E test runner |
| Detox | Mobile E2E test runner |
| Drizzle Studio | Visual database browser |
| Ruflo CLI | Agent orchestration, swarm management |
| TypeScript (strict) | Type safety across all layers |
| Biome | Linting + formatting (single binary, replaces ESLint + Prettier) |

---

## 11. Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|---|---|---|---|
| Supabase ISP block in India | High | Low | Use Supabase custom domains |
| HeroUI Native immaturity | Medium | Medium | v1.0.0 stable, fallback to Tamagui/Gluestack |
| HeroUI v3 breaking changes | Medium | Medium | Pin versions, test UI in CI |
| Bun compatibility gaps | Low | Low | Bun Node.js compat 99%+, pin version |
| Ruflo rapid release churn | Medium | High | Pin versions, test workflows in CI |
| 95% coverage slowing velocity | Medium | Medium | Enforce from day one, use mock factories, test shared packages first |
| Vitest async RSC limitation | Low | High | Unit test data functions, push async RSC testing to Playwright E2E |
| Detox flaky tests on CI | Medium | Medium | Use dedicated macOS CI runners, retry strategy, screenshot-on-failure |

---

## 12. Decision Log

| Decision | Chosen | Rejected | Rationale |
|---|---|---|---|
| Monorepo tool | Turborepo | Nx | Bun-native, lighter config |
| Package manager | Bun | pnpm, npm | Fastest installs, native TS |
| Web framework | Next.js | Remix, Astro | SSR/SSG, RSC, Turbopack |
| Mobile framework | Expo | Flutter, Capacitor | Shared TS/React, HeroUI Native |
| UI library | HeroUI v3 + Native | shadcn/ui, MUI | Cross-platform, React Aria a11y |
| API framework | Hono | Express, Elysia | Bun-native, typed RPC |
| ORM | Drizzle | Prisma | 7.4KB, schema-as-TS, SQL-first |
| Database | Supabase | PlanetScale, Neon | Auth + DB + Realtime in one |
| Auth | Supabase Auth | Better Auth, Clerk | Tight Supabase integration |
| Agent orchestration | Ruflo | LangGraph, CrewAI | Claude native, MCP, hive-mind |
| Unit/Integration tests | Vitest | bun:test, Jest | HMR watch, Turborepo cache, ecosystem |
| Web E2E | Playwright | Cypress | Multi-browser, Next.js official |
| Mobile E2E | Detox | Maestro, Appium | Grey-box RN testing, Expo compatible |
| Coverage provider | v8 | Istanbul | Faster, built into Vitest |
| Linting/Formatting | Biome | ESLint + Prettier | Single binary, faster, one config |

---

## 13. Step-by-Step Setup Guide

### Phase 1 — Monorepo Foundation

#### Step 1.1: Initialize Bun + Turborepo

```bash
# Install Bun (if not installed)
curl -fsSL https://bun.sh/install | bash

# Create project directory
mkdir my-project && cd my-project

# Initialize root package.json
bun init -y

# Install Turborepo
bun add -d turbo

# Create workspace structure
mkdir -p apps/web apps/api apps/mobile
mkdir -p packages/ui/theme packages/ui/web packages/ui/native
mkdir -p packages/shared/src packages/db/src
mkdir -p tooling/tailwind-config tooling/tsconfig tooling/eslint-config tooling/vitest-config
```

#### Step 1.2: Configure Bun Workspaces

Edit root `package.json`:

```json
{
  "name": "my-project",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*",
    "tooling/*"
  ],
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "test": "turbo test",
    "test:coverage": "turbo test:coverage",
    "test:e2e": "turbo test:e2e",
    "lint": "turbo lint",
    "format": "bunx @biomejs/biome format --write .",
    "check": "turbo lint test:coverage build",
    "db:generate": "turbo db:generate --filter=@repo/db",
    "db:migrate": "turbo db:migrate --filter=@repo/db",
    "db:studio": "turbo db:studio --filter=@repo/db"
  },
  "devDependencies": {
    "turbo": "latest",
    "@biomejs/biome": "latest",
    "typescript": "latest"
  }
}
```

#### Step 1.3: Configure Turborepo

Create `turbo.json`:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**", "!dist/**/*.map"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"],
      "cache": true
    },
    "test:coverage": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"],
      "cache": true
    },
    "test:e2e": {
      "dependsOn": ["build"],
      "cache": false
    },
    "lint": {
      "dependsOn": ["^build"],
      "cache": true
    },
    "db:generate": { "cache": false },
    "db:migrate": { "cache": false },
    "db:studio": { "cache": false, "persistent": true }
  }
}
```

#### Step 1.4: Configure Shared TypeScript

Create `tooling/tsconfig/base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noUncheckedIndexedAccess": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "exclude": ["node_modules", "dist", "coverage"]
}
```

Create `tooling/tsconfig/react.json`:

```json
{
  "extends": "./base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "lib": ["ES2022", "DOM", "DOM.Iterable"]
  }
}
```

Create `tooling/tsconfig/node.json`:

```json
{
  "extends": "./base.json",
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "types": ["bun-types"]
  }
}
```

#### Step 1.5: Configure Biome

Create `biome.json` at root:

```json
{
  "$schema": "https://biomejs.dev/schemas/latest/schema.json",
  "organizeImports": { "enabled": true },
  "linter": {
    "enabled": true,
    "rules": { "recommended": true }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "semicolons": "always",
      "trailingCommas": "all"
    }
  }
}
```

---

### Phase 2 — Testing Infrastructure

#### Step 2.1: Install Vitest + Testing Libraries

```bash
# Root dev dependencies
bun add -d vitest @vitest/coverage-v8 @vitest/ui

# React testing (for web + UI packages)
bun add -d @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom

# React Native testing (for mobile)
bun add -d @testing-library/react-native

# Playwright (web E2E)
bun add -d @playwright/test
bunx playwright install --with-deps

# Detox (mobile E2E) — install in mobile app
cd apps/mobile
bun add -d detox @types/detox jest-circus
cd ../..
```

#### Step 2.2: Create Shared Vitest Presets

Create `tooling/vitest-config/package.json`:

```json
{
  "name": "@repo/vitest-config",
  "private": true,
  "exports": {
    "./base": "./base.ts",
    "./react": "./react.ts",
    "./node": "./node.ts"
  }
}
```

Create `tooling/vitest-config/base.ts`:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    passWithNoTests: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'lcov', 'html', 'json-summary'],
      reportsDirectory: './coverage',
      thresholds: {
        lines: 95,
        branches: 90,
        functions: 95,
        statements: 95,
      },
      exclude: [
        'node_modules/**',
        '**/*.config.*',
        '**/*.d.ts',
        '**/types/**',
        '**/__tests__/**',
        '**/e2e/**',
        '**/coverage/**',
        '**/dist/**',
        '**/seed/**',
        '**/migrations/**',
      ],
    },
  },
});
```

Create `tooling/vitest-config/react.ts`:

```typescript
import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from './base';

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/__tests__/setup.ts'],
      css: true,
    },
  }),
);
```

Create `tooling/vitest-config/node.ts`:

```typescript
import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from './base';

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      environment: 'node',
    },
  }),
);
```

#### Step 2.3: Configure Playwright (Web E2E)

Create `apps/web/playwright.config.ts`:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'e2e/results.json' }],
    process.env.CI ? ['github'] : ['list'],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    // Auth setup — runs once, stores session state
    {
      name: 'auth-setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['auth-setup'],
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['auth-setup'],
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['auth-setup'],
    },
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 7'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['auth-setup'],
    },
    {
      name: 'mobile-safari',
      use: {
        ...devices['iPhone 14'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['auth-setup'],
    },
  ],
  webServer: {
    command: 'bun run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
```

#### Step 2.4: Configure Detox (Mobile E2E)

Create `apps/mobile/.detoxrc.js`:

```javascript
/** @type {Detox.DetoxConfig} */
module.exports = {
  testRunner: {
    args: {
      $0: 'jest',
      config: 'e2e/jest.config.js',
    },
    jest: {
      setupTimeout: 120000,
    },
  },
  apps: {
    'ios.debug': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/MyApp.app',
      build: 'xcodebuild -workspace ios/MyApp.xcworkspace -scheme MyApp -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build',
    },
    'android.debug': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
      build: 'cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug',
      reversePorts: [8081],
    },
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: { type: 'iPhone 15' },
    },
    emulator: {
      type: 'android.emulator',
      device: { avdName: 'Pixel_7_API_34' },
    },
  },
  configurations: {
    'ios.sim.debug': {
      device: 'simulator',
      app: 'ios.debug',
    },
    'android.emu.debug': {
      device: 'emulator',
      app: 'android.debug',
    },
  },
};
```

#### Step 2.5: Add Test Scripts to Each Package

Every `package.json` in apps and packages gets:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest watch",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui"
  }
}
```

Web app adds:

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:headed": "playwright test --headed"
  }
}
```

Mobile app adds:

```json
{
  "scripts": {
    "test:e2e:ios": "detox test --configuration ios.sim.debug",
    "test:e2e:android": "detox test --configuration android.emu.debug",
    "test:e2e:build:ios": "detox build --configuration ios.sim.debug",
    "test:e2e:build:android": "detox build --configuration android.emu.debug"
  }
}
```

---

### Phase 3 — Database Layer

#### Step 3.1: Set Up Supabase

```bash
# Install Supabase CLI
bun add -d supabase

# Initialize Supabase locally
bunx supabase init

# Start local Supabase (Docker required)
bunx supabase start

# Note the local credentials output:
#   API URL: http://localhost:54321
#   anon key: eyJ...
#   service_role key: eyJ...
```

#### Step 3.2: Configure Supabase Custom Domain (Production)

```bash
# In Supabase dashboard:
# 1. Go to Project Settings → Custom Domains
# 2. Add your domain: api.yourdomain.com
# 3. Configure DNS CNAME record
# 4. Verify domain ownership
# 5. Update all client configs to use custom domain
```

#### Step 3.3: Set Up Drizzle ORM

```bash
cd packages/db

# Install Drizzle
bun add drizzle-orm postgres
bun add -d drizzle-kit

# Initialize package
cat > package.json << 'EOF'
{
  "name": "@repo/db",
  "private": true,
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio",
    "db:seed": "bun run src/seed/index.ts",
    "test": "vitest run",
    "test:coverage": "vitest run --coverage"
  },
  "exports": {
    ".": "./src/index.ts",
    "./schema": "./src/schema/index.ts"
  }
}
EOF
```

Create `packages/db/drizzle.config.ts`:

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schema/index.ts',
  out: './src/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

#### Step 3.4: Install Drizzle Agent Skill

```bash
npx skills add honra-io/drizzle-best-practices
```

---

### Phase 4 — Web App

#### Step 4.1: Create Next.js App

```bash
cd apps/web

# Initialize Next.js with Bun
bunx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

# Install HeroUI
bun add @heroui/react

# Install testing dependencies
bun add -d vitest @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @playwright/test

# Install state management + forms
bun add @tanstack/react-query zustand react-hook-form @hookform/resolvers zod

# Install Hono client for typed API calls
bun add hono
```

#### Step 4.2: Configure HeroUI Theme

Add HeroUI plugin to Tailwind config in `apps/web/tailwind.config.ts`:

```typescript
import { heroui } from '@heroui/react';

export default {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {},
  },
  darkMode: 'class',
  plugins: [
    heroui({
      themes: {
        light: {
          colors: {
            // Your brand tokens here (oklch values)
          },
        },
        dark: {
          colors: {
            // Dark mode tokens
          },
        },
      },
    }),
  ],
};
```

#### Step 4.3: Configure Vitest for Web

Create `apps/web/vitest.config.ts`:

```typescript
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from '@repo/vitest-config/react';

export default mergeConfig(
  baseConfig,
  defineConfig({
    plugins: [react(), tsconfigPaths()],
    test: {
      setupFiles: ['./src/__tests__/setup.ts'],
    },
  }),
);
```

Create `apps/web/src/__tests__/setup.ts`:

```typescript
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});
```

---

### Phase 5 — API

#### Step 5.1: Create Hono API

```bash
cd apps/api

# Initialize
cat > package.json << 'EOF'
{
  "name": "@repo/api",
  "private": true,
  "scripts": {
    "dev": "bun run --hot src/index.ts",
    "build": "bun build src/index.ts --outdir dist --target bun",
    "start": "bun run dist/index.js",
    "test": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest watch"
  }
}
EOF

# Install Hono
bun add hono

# Install testing
bun add -d vitest @vitest/coverage-v8
```

Create `apps/api/src/index.ts`:

```typescript
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

const app = new Hono();

app.use('*', logger());
app.use('*', cors());

app.get('/health', (c) => c.json({ status: 'ok' }));

export default app;
export type AppType = typeof app;
```

#### Step 5.2: Configure Vitest for API

Create `apps/api/vitest.config.ts`:

```typescript
import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from '@repo/vitest-config/node';

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      setupFiles: ['./__tests__/setup.ts'],
    },
  }),
);
```

Create API test example `apps/api/__tests__/health.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import app from '../src/index';

describe('Health endpoint', () => {
  it('returns 200 with status ok', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok' });
  });
});
```

---

### Phase 6 — Mobile App

#### Step 6.1: Create Expo App

```bash
cd apps/mobile

# Initialize Expo
bunx create-expo-app . --template tabs

# Install HeroUI Native
bun add heroui-native uniwind tailwindcss
bun add react-native-reanimated react-native-gesture-handler react-native-safe-area-context @gorhom/bottom-sheet react-native-svg react-native-worklets tailwind-merge tailwind-variants

# Install testing
bun add -d vitest @vitest/coverage-v8 @testing-library/react-native detox @types/detox

# Install state management
bun add @tanstack/react-query zustand react-hook-form @hookform/resolvers zod
```

#### Step 6.2: Configure Uniwind

Create `apps/mobile/global.css`:

```css
@import "tailwindcss";
@import "uniwind";
@import "heroui-native/styles";
@source "./node_modules/heroui-native/lib";
```

---

### Phase 7 — Shared Packages

#### Step 7.1: Set Up packages/shared

```bash
cd packages/shared

cat > package.json << 'EOF'
{
  "name": "@repo/shared",
  "private": true,
  "scripts": {
    "test": "vitest run",
    "test:coverage": "vitest run --coverage"
  },
  "exports": {
    ".": "./src/index.ts",
    "./validators": "./src/validators/index.ts",
    "./types": "./src/types/index.ts",
    "./constants": "./src/constants/index.ts"
  }
}
EOF

# Install Zod
bun add zod
bun add -d vitest @vitest/coverage-v8
```

#### Step 7.2: Set Up packages/ui

```bash
cd packages/ui

cat > package.json << 'EOF'
{
  "name": "@repo/ui",
  "private": true,
  "scripts": {
    "test": "vitest run",
    "test:coverage": "vitest run --coverage"
  },
  "exports": {
    "./web": "./src/web/index.ts",
    "./native": "./src/native/index.ts",
    "./theme": "./src/theme/index.ts"
  }
}
EOF
```

---

### Phase 8 — Agent Orchestration

#### Step 8.1: Install Ruflo

```bash
# Install Claude Flow CLI (Ruflo)
npm install -g claude-flow@alpha

# Verify installation
claude-flow --version

# Initialize in project root
cd /path/to/monorepo
claude-flow init
```

#### Step 8.2: Configure Agent Topology

```bash
# Initialize a hierarchical swarm
claude-flow hive init --topology hierarchical --agents 5
```

#### Step 8.3: Set Up CLAUDE.md

Create `CLAUDE.md` at project root with project context, coding standards, testing requirements (95% coverage), and references to skills and commands.

#### Step 8.4: Configure Agent Skills Directory

```bash
mkdir -p .claude/skills .claude/commands

# Install Drizzle skill
npx skills add honra-io/drizzle-best-practices
```

---

### Phase 9 — CI/CD Pipeline

#### Step 9.1: GitHub Actions Workflow

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  BUN_VERSION: "1.2"
  DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: ${{ env.BUN_VERSION }}
      - run: bun install --frozen-lockfile
      - run: bun run lint

  test:
    runs-on: ubuntu-latest
    needs: lint
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: ${{ env.BUN_VERSION }}
      - run: bun install --frozen-lockfile
      - run: bun run test:coverage
      - name: Upload coverage
        uses: actions/upload-artifact@v4
        with:
          name: coverage-reports
          path: "**/coverage/"
      - name: Check coverage thresholds
        run: |
          # Vitest exits non-zero if thresholds not met
          echo "Coverage thresholds enforced by Vitest config"

  e2e-web:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: ${{ env.BUN_VERSION }}
      - run: bun install --frozen-lockfile
      - run: bunx playwright install --with-deps
      - run: bun run build --filter=@repo/web
      - run: cd apps/web && bunx playwright test
      - name: Upload Playwright report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: apps/web/playwright-report/

  e2e-mobile:
    runs-on: macos-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: ${{ env.BUN_VERSION }}
      - run: bun install --frozen-lockfile
      - name: Build iOS app
        run: cd apps/mobile && bun run test:e2e:build:ios
      - name: Run Detox tests
        run: cd apps/mobile && bun run test:e2e:ios
      - name: Upload Detox artifacts
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: detox-artifacts
          path: apps/mobile/artifacts/

  build:
    runs-on: ubuntu-latest
    needs: [test, e2e-web]
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: ${{ env.BUN_VERSION }}
      - run: bun install --frozen-lockfile
      - run: bun run build
```

---

### Phase 10 — Verification

#### Step 10.1: Validate Full Stack

```bash
# From monorepo root

# 1. Install all dependencies
bun install

# 2. Run linting
bun run lint

# 3. Run all unit + integration tests with coverage
bun run test:coverage

# 4. Verify coverage thresholds (95% lines, 90% branches, 95% functions)
# Vitest will exit non-zero if thresholds not met

# 5. Build all packages and apps
bun run build

# 6. Run web E2E tests
cd apps/web && bun run test:e2e

# 7. Run mobile E2E tests (requires simulator)
cd apps/mobile && bun run test:e2e:ios

# 8. Full CI check (lint → test → build)
bun run check
```

#### Step 10.2: Verify Turborepo Caching

```bash
# Run tests twice — second run should be cached
bun run test:coverage
bun run test:coverage  # Should say "FULL TURBO" for all cached packages
```

---

## 14. Next Steps

1. **Execute Phase 1** — Scaffold monorepo, configure Bun workspaces + Turborepo.
2. **Execute Phase 2** — Set up Vitest presets, Playwright, and Detox configs.
3. **Execute Phase 3** — Initialize Supabase, configure custom domain, set up Drizzle schema.
4. **Execute Phase 4–6** — Scaffold web, API, and mobile apps with HeroUI integration.
5. **Execute Phase 7** — Build shared packages (tokens, types, validators).
6. **Execute Phase 8** — Initialize Ruflo, install agent skills, configure CLAUDE.md.
7. **Execute Phase 9** — Set up GitHub Actions CI pipeline.
8. **Build first vertical slice** — One feature end-to-end (web + API + DB + tests) to validate full integration.
9. **Reach 95% coverage baseline** — Start with `packages/shared` and `packages/db` (easiest to test), then expand.