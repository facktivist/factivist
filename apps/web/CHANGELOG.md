# Changelog

## [0.2.0](https://github.com/facktivist/factivist/compare/web-v0.1.0...web-v0.2.0) (2026-05-31)


### Features

* **agent-acl:** per-agent file ACLs with package overlays ([41b5c01](https://github.com/facktivist/factivist/commit/41b5c01313ab7926077b8452f791432e851867c5))
* **discovery:** mount Filter compound on web + mobile browse screens ([e0db333](https://github.com/facktivist/factivist/commit/e0db33352d28277eb9e06f2d81e24cda1eab4c49))
* **observability:** wire Sentry SDK (web + mobile) + sync skills-lock ([a58d527](https://github.com/facktivist/factivist/commit/a58d527e2b514b1d6f5943074b31cc3ec15d4281))
* phase 4 — web app (Next.js 16 + HeroUI v3 + Tailwind v4) ([2ad9e45](https://github.com/facktivist/factivist/commit/2ad9e458dd5d30c8ae7a1ee7742f65d36fb11dc5))
* **phase-5-wave-2:** production hardening — auth, storage webhook, retention, prove, session cookie ([9820478](https://github.com/facktivist/factivist/commit/9820478fea2525e9051c16f4a247300e6c1822f6))
* **phase-5-wave-3a:** auth callback, admin GET endpoints, categories seed, expo plugins, Bearer audit ([808405e](https://github.com/facktivist/factivist/commit/808405ea97b74d3ebb16a91862607ae5b8355c7f))
* **phase-5-wave-3b:** geo labels, web tab nav, JWKS verifier, dev_metrics IDENT-004 ([6435af1](https://github.com/facktivist/factivist/commit/6435af186728438ed5f89b2f37fcdb071349c258))
* **phase-5:** wave 1 — identity, complaint, moderation scaffolds + tests ([e685cbb](https://github.com/facktivist/factivist/commit/e685cbb0e06d5b679f6d00e18378169b1ed38ae6))
* **phase-8:** infrastructure cost & deployment settings ([612fc32](https://github.com/facktivist/factivist/commit/612fc32284997f55c977c5a0a04186e13c7f9868))
* **s1:** season 1 closeout — phases 2–8, design wave, post-S1 sweep ([#119](https://github.com/facktivist/factivist/issues/119)) ([07cb167](https://github.com/facktivist/factivist/commit/07cb167f7df9baf67bb64516ec4e0926ca8a5f42)), closes [#116](https://github.com/facktivist/factivist/issues/116)
* **search:** mount Search compound on web + mobile ([bb71023](https://github.com/facktivist/factivist/commit/bb710234a2bad6ccb451556d32dc9e6a9927188e))
* **web/complaint:** wire Complaint.PhotoTray to a real upload pipeline ([04422f7](https://github.com/facktivist/factivist/commit/04422f7d5f4d8224a69feaa16cededd485e52b46))
* **web/identity:** drive VerifyForm via the Onboarding step machine ([077978e](https://github.com/facktivist/factivist/commit/077978e2945bf4fc281bb553fc334e35e95bb76d))
* **web/legal:** mount Legal compound on /legal routes ([3c193f8](https://github.com/facktivist/factivist/commit/3c193f83ea19e788c52b0804574278857dbd36f3))
* **web/profile:** consume Profile compound on /profile ([e2a54fd](https://github.com/facktivist/factivist/commit/e2a54fdca212a46972b00807e09ff992b02017e3))
* **web:** align complaint card/shell with design-system tokens ([dc8cce1](https://github.com/facktivist/factivist/commit/dc8cce10b140d23299b441833972e7ea36ce1af6))
* **web:** migrate identity screen to @factivist/ui-web/onboarding compound ([2722c57](https://github.com/facktivist/factivist/commit/2722c573f22ae1db6e2793a0a255dda011d4549d))
* **web:** rewrite createcomplaintform onto complaint compound ([841d731](https://github.com/facktivist/factivist/commit/841d731a79aebd0acf4c07bacd45ba11fbe01fa3))
* **web:** rotate the Supabase admin session via edge middleware ([87355ff](https://github.com/facktivist/factivist/commit/87355ffc962992023b7913905ceb8a8d63b415e1))
* **web:** wire /complaints/[slug] onto Complaint + Comment compounds ([ac225a0](https://github.com/facktivist/factivist/commit/ac225a08ce832f88b316dccf337d848d6ac5b915))


### Tests

* **phase-6-wave-a:** E2E wiring + 5 web Playwright specs + 5 mobile Detox specs ([9295c2f](https://github.com/facktivist/factivist/commit/9295c2fd476f8426f8ff9fc7e2752ccb472e795b))
