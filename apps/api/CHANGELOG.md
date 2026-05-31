# Changelog

## [0.2.0](https://github.com/facktivist/factivist/compare/api-v0.1.0...api-v0.2.0) (2026-05-31)


### Features

* **agent-acl:** per-agent file ACLs with package overlays ([41b5c01](https://github.com/facktivist/factivist/commit/41b5c01313ab7926077b8452f791432e851867c5))
* **api,db:** wire /db/ping probe and materialize initial migration ([1de2ee2](https://github.com/facktivist/factivist/commit/1de2ee21fdc60da4a414e428bf34732f214484fe))
* **api:** cap the Supabase JWKS cache TTL inside the verifier ([514c1bd](https://github.com/facktivist/factivist/commit/514c1bd5d99c588665bd68281d19d44b723ae14c))
* **api:** wave 4b — GET + POST /comments routes ([53e15de](https://github.com/facktivist/factivist/commit/53e15dee1f73b6853429afee4eb17407bff158c4))
* **mobile,api:** wave 4d — profile tab + GET /me endpoint ([45958b1](https://github.com/facktivist/factivist/commit/45958b1265d6d0b7a657663b23ac60f59ee3446a))
* phase 3 — API server and design tokens ([5cecb47](https://github.com/facktivist/factivist/commit/5cecb47681862bf4f19983f45938534119cd2d09))
* phase 3 — API server and design tokens ([00bb979](https://github.com/facktivist/factivist/commit/00bb979751ea4c3e3a7870f5ed76edb5b5aebc58))
* **phase-5-wave-2:** production hardening — auth, storage webhook, retention, prove, session cookie ([9820478](https://github.com/facktivist/factivist/commit/9820478fea2525e9051c16f4a247300e6c1822f6))
* **phase-5-wave-3a:** auth callback, admin GET endpoints, categories seed, expo plugins, Bearer audit ([808405e](https://github.com/facktivist/factivist/commit/808405ea97b74d3ebb16a91862607ae5b8355c7f))
* **phase-5-wave-3b:** geo labels, web tab nav, JWKS verifier, dev_metrics IDENT-004 ([6435af1](https://github.com/facktivist/factivist/commit/6435af186728438ed5f89b2f37fcdb071349c258))
* **phase-5:** wave 1 — identity, complaint, moderation scaffolds + tests ([e685cbb](https://github.com/facktivist/factivist/commit/e685cbb0e06d5b679f6d00e18378169b1ed38ae6))
* **phase-8:** infrastructure cost & deployment settings ([612fc32](https://github.com/facktivist/factivist/commit/612fc32284997f55c977c5a0a04186e13c7f9868))
* **phase-9:** dpdp grievance pii split + rapidsnark docker layer ([1542642](https://github.com/facktivist/factivist/commit/15426420eff55203062b547e7a3f932c15761dd1))
* **phase-9:** upstash redis rate limiter ([7b61ea7](https://github.com/facktivist/factivist/commit/7b61ea75b7b44d1ed5225eeed8ccb52f40e1599c))
* **s1:** season 1 closeout — phases 2–8, design wave, post-S1 sweep ([#119](https://github.com/facktivist/factivist/issues/119)) ([07cb167](https://github.com/facktivist/factivist/commit/07cb167f7df9baf67bb64516ec4e0926ca8a5f42)), closes [#116](https://github.com/facktivist/factivist/issues/116)


### Bug Fixes

* **atid:** add ATID-ADMIN-001 row + admin feature to registry union ([edcaeab](https://github.com/facktivist/factivist/commit/edcaeab00c8f85a4ba96a294e8dace4ea5e60b16))


### Refactors

* **api:** rate limiter behind interface for KV/Upstash swap ([64a66ec](https://github.com/facktivist/factivist/commit/64a66ecf0992a5f0b2e8fbbbc11372c5937154e3))


### Documentation

* **e2:** fix stale admin-guard test reference in threat-model + rbac.ts ([36d3fa9](https://github.com/facktivist/factivist/commit/36d3fa9d28fee3c262775941c3d62d3f9169d5ea))
