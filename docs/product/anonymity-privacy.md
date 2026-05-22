# Factivist — Anonymity & Privacy Infrastructure

How the platform protects user and operator identity at the infrastructure
level. This document is intentionally separate from the [product
vision](./product-vison.md) because most of it is operational and changes
on its own cadence (hosting providers, jurisdictions, OPSEC procedures)
without changing the product.

User-level anonymity (ZKP citizen verification, nullifier sets, anonymous
credentials) lives in the vision doc under §3.3 because it is part of the
product architecture, not infrastructure.

---

## 1. Privacy-First Hosting Services

### Server Hosting (Privacy-Focused)

| Provider | Jurisdiction | Payment | Notes |
|----------|-------------|---------|-------|
| **Njalla** | Nevis (Caribbean) | BTC, Monero, Cash | Run by Peter Sunde (Pirate Bay). Registers domains in THEIR name. Best privacy. |
| **1984 Hosting** | Iceland | BTC | Strong free speech protections, Icelandic law |
| **Bahnhof** | Sweden | Crypto | Hosts WikiLeaks. Nuclear bunker datacenter. |
| **FlokiNET** | Iceland/Romania/Finland | BTC, Monero | Explicitly anti-censorship |
| **Privex** | Belize | BTC, Monero | Privacy-focused VPS provider |
| **Kyun.host** | Netherlands | BTC | Privacy-focused, affordable |

### Domain Registration (Anonymous)

| Provider | Privacy | Payment |
|----------|---------|---------|
| **Njalla** | Domain registered in THEIR name, you have usage rights | BTC/Monero |
| **Orangewebsite** | Iceland-based, privacy-focused | BTC |
| **Namesilo** | Free WHOIS privacy, accepts BTC | BTC |

### Recommended Setup
1. **Domain:** Register via Njalla (paid with Monero) — they are the legal owner, you control it.
2. **Primary servers:** FlokiNET Iceland (2–3 VPS instances).
3. **Fallback servers:** 1984 Hosting Iceland.
4. **CDN:** Cloudflare (free tier) with proxy enabled to hide origin IP.
5. **Tor Hidden Service:** run a `.onion` mirror so the platform is reachable even if clearnet is blocked.
6. **DNS:** Cloudflare DNS (hides origin) or self-hosted authoritative DNS.

---

## 2. Operational Security (for the Founder & Maintainers)

**Critical OPSEC Rules:**
1. **Never** access admin infrastructure from your home IP or personal devices.
2. Use a dedicated laptop (bought with cash) running Tails OS or Qubes OS for all admin work.
3. All admin access through Tor → VPN → Server (never direct).
4. Use PGP-encrypted email (e.g. Tutanota) for all project communication.
5. Pay for all services with Monero (more private than Bitcoin).
6. Code contributions through anonymous GitHub/Codeberg accounts (over Tor).
7. No metadata in any public documents (strip all files before publishing).
8. Use Signal (with disappearing messages) for any team communication.
9. Register a separate anonymous identity for this project — never link to your real identity.
10. Consider a public-facing "organization" registered in a privacy-friendly jurisdiction rather than an individual.

---

## 3. Network Architecture for Anonymity

```
Users → Tor/VPN → Cloudflare (CDN/DDoS) → Origin Servers (Iceland/Romania)
                                                    ↓
                                              PostgreSQL (encrypted at rest)
                                              IPFS Nodes (distributed)
                                              Blockchain (Polygon - public)
```

- **No server logs of user IPs** — configure Nginx/Caddy to not log IPs.
- **End-to-end encryption** for any user-identifiable data.
- **Canary page** — publish a warrant canary; remove it if you receive a legal order.
- **Dead man's switch** — automated system to release all data publicly if platform is seized.

---

## 4. User-Side Hardening

These are the recommendations surfaced to citizens inside the app:

- Use Tor Browser or a no-log VPN when submitting complaints.
- Strip media client-side first (the server strips again; defense in depth).
- Never include your real name, phone number, or full address in complaint
  text — the platform redacts on best effort, but the citizen is the first
  line of defense.
- Use a burner Aadhaar QR scanner (offline-only) for the ZKP step if your
  device is compromised.

---

## 5. Adversary Model

We assume the adversary can:
- Subpoena clearnet hosting providers in their jurisdiction.
- Force ISP-level DNS and IP blocks within India.
- Mount DDoS attacks against the origin servers.
- Submit fraudulent complaints to discredit the platform.
- Compromise community moderators (selectively).

We assume the adversary cannot:
- Compel disclosure from privacy-friendly hosts outside their jurisdiction.
- Break SHA-256 or Groth16/PLONK proving systems.
- Roll back the public Polygon ledger.

The architecture above is designed against this threat model. Anything
outside it (e.g., nation-state-level cryptographic break) is out of scope.
