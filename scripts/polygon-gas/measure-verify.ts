/**
 * Polygon ZKP verify gas measurement (Phase 2 / Issue #17 / #18)
 *
 * Measures the gas consumed by a Groth16 AnonAadhaar verifier on Polygon
 * (Amoy testnet or PoS mainnet) and translates it to USD using the live
 * gas oracle (gasstation.polygon.technology v2) and a configurable
 * POL/USD price.
 *
 * The script is intentionally read-only: it never broadcasts a tx. It uses
 * `publicClient.estimateContractGas` and `publicClient.simulateContract`
 * with an `eth_call` against a pre-deployed verifier, so it can be run
 * against any RPC (no funded EOA required).
 *
 * Phase 5 will run a sibling "submit" script that actually mines verify
 * transactions and records empirical gas distribution.
 *
 * Owner Agent: chain-cost-researcher (Phase 2)
 * Issue:       https://github.com/raveracker/factivist/issues/17
 *
 * Usage:
 *   bun run scripts/polygon-gas/measure-verify.ts \
 *     --rpc https://rpc-amoy.polygon.technology \
 *     --verifier 0x... \
 *     --proof scripts/polygon-gas/fixtures/sample-proof.json \
 *     --pol-usd 0.087677
 *
 * Output: JSON to stdout with { gas, gasPriceGwei, polUsd, usdPerVerify, oracle, chain }
 */

import { type Address, createPublicClient, type Hex, http, type PublicClient } from 'viem'
import { polygon, polygonAmoy } from 'viem/chains'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MeasureArgs {
  /** JSON-RPC endpoint URL */
  rpc: string
  /** Deployed verifier contract address */
  verifier: Address
  /** Path to JSON file containing { pA, pB, pC, pubSignals } */
  proofPath: string
  /** POL/USD price (e.g. from CoinGecko snapshot). Required. */
  polUsd: number
  /** Optional override for gas-price oracle URL (default = polygon mainnet v2) */
  oracleUrl?: string
  /** Optional explicit chainId, otherwise derived from RPC `eth_chainId` */
  chainId?: number
}

export interface MeasureResult {
  chainId: number
  chainName: string
  verifier: Address
  /** Gas units consumed by the simulated verifyProof eth_call. */
  gas: bigint
  /** Gas price (gwei) reported by the oracle at snapshot time. */
  gasPriceGwei: number
  /** Oracle scenario used ("safeLow" | "standard" | "fast"). */
  oracleScenario: 'safeLow' | 'standard' | 'fast'
  /** POL/USD at snapshot time (input). */
  polUsd: number
  /** USD cost of a single verify at this gas price. */
  usdPerVerify: number
  /** Raw oracle JSON for audit. */
  oracle: PolygonGasOracleV2
  /** ISO-8601 timestamp of the measurement. */
  measuredAt: string
}

/** Shape of the Polygon Gas Station v2 endpoint response. */
export interface PolygonGasOracleV2 {
  safeLow: { maxPriorityFee: number; maxFee: number }
  standard: { maxPriorityFee: number; maxFee: number }
  fast: { maxPriorityFee: number; maxFee: number }
  estimatedBaseFee: number
  blockTime: number
  blockNumber: number
}

/** Shape of the proof fixture JSON. */
export interface ProofFixture {
  pA: [Hex, Hex]
  pB: [[Hex, Hex], [Hex, Hex]]
  pC: [Hex, Hex]
  /** 9 public signals for anon-aadhaar (uint[9]). */
  pubSignals: [Hex, Hex, Hex, Hex, Hex, Hex, Hex, Hex, Hex]
}

// ─── ABI (anon-aadhaar Groth16Verifier.verifyProof view fn) ──────────────────

export const VERIFIER_ABI = [
  {
    type: 'function',
    name: 'verifyProof',
    stateMutability: 'view',
    inputs: [
      { name: '_pA', type: 'uint256[2]' },
      { name: '_pB', type: 'uint256[2][2]' },
      { name: '_pC', type: 'uint256[2]' },
      { name: '_pubSignals', type: 'uint256[9]' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const

// ─── Pure helpers (covered by unit tests) ────────────────────────────────────

/**
 * Compute USD-per-verify given gas units, gas price in gwei, and POL/USD.
 *
 * gasCost_POL = gas * gasPriceGwei * 1e-9
 * gasCost_USD = gasCost_POL * polUsd
 */
export function computeUsdPerVerify(gas: bigint, gasPriceGwei: number, polUsd: number): number {
  if (gas < 0n) throw new Error('gas must be non-negative')
  if (gasPriceGwei < 0) throw new Error('gasPriceGwei must be non-negative')
  if (polUsd < 0) throw new Error('polUsd must be non-negative')
  const gasN = Number(gas)
  return gasN * gasPriceGwei * 1e-9 * polUsd
}

/**
 * Pick a gas-price scenario from the oracle.
 *
 * Returns the `maxFee` in gwei for the chosen tier. Phase 2 default = "standard".
 */
export function pickOracleScenario(
  oracle: PolygonGasOracleV2,
  scenario: 'safeLow' | 'standard' | 'fast' = 'standard',
): number {
  const tier = oracle[scenario]
  if (!tier || typeof tier.maxFee !== 'number') {
    throw new Error(`Invalid oracle response: missing ${scenario}.maxFee`)
  }
  return tier.maxFee
}

/**
 * Compute the *effective* gas price actually paid: min(maxFee, baseFee + priorityFee).
 *
 * On Polygon PoS this is what Bor charges per tx. Useful for honest cost
 * reporting because `maxFee` is an *upper bound*, not what gets billed.
 */
export function effectiveGasPrice(baseFee: number, priorityFee: number, maxFee: number): number {
  return Math.min(maxFee, baseFee + priorityFee)
}

/**
 * Resolve chain config from a numeric chainId. Returns null for unknown chains
 * so callers can keep going (we only need a human-readable name for logs).
 */
export function resolveChain(chainId: number): { id: number; name: string } | null {
  if (chainId === polygon.id) return { id: polygon.id, name: polygon.name }
  if (chainId === polygonAmoy.id) return { id: polygonAmoy.id, name: polygonAmoy.name }
  return null
}

/**
 * Validate that a proof fixture has the expected shape for anon-aadhaar
 * (9 public signals, hex-encoded uint256s for groth16 A/B/C). Throws on bad input.
 */
export function validateProofFixture(input: unknown): ProofFixture {
  if (!input || typeof input !== 'object') throw new Error('proof must be an object')
  const p = input as Record<string, unknown>
  if (!Array.isArray(p.pA) || p.pA.length !== 2) throw new Error('proof.pA must be uint256[2]')
  if (!Array.isArray(p.pB) || p.pB.length !== 2) throw new Error('proof.pB must be uint256[2][2]')
  if (!Array.isArray(p.pC) || p.pC.length !== 2) throw new Error('proof.pC must be uint256[2]')
  if (!Array.isArray(p.pubSignals) || p.pubSignals.length !== 9)
    throw new Error('proof.pubSignals must be uint256[9] (anon-aadhaar)')
  return p as unknown as ProofFixture
}

// ─── I/O layer (thin, kept separately so the pure layer is fully testable) ──

/**
 * Fetch the Polygon gas-station v2 oracle. Defaults to mainnet endpoint
 * because Amoy does not publish a public gas oracle — Phase 5 reconciliation
 * uses mainnet oracle pricing against Amoy gas_used measurements.
 */
export async function fetchPolygonGasOracle(
  url = 'https://gasstation.polygon.technology/v2',
): Promise<PolygonGasOracleV2> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`gas oracle HTTP ${res.status} from ${url}`)
  return (await res.json()) as PolygonGasOracleV2
}

/**
 * Estimate gas for a verifyProof eth_call (no broadcast). Uses a zero `from`
 * address because verifyProof is `view` and has no msg.sender dependency.
 */
export async function estimateVerifyGas(
  client: PublicClient,
  verifier: Address,
  proof: ProofFixture,
): Promise<bigint> {
  return client.estimateContractGas({
    address: verifier,
    abi: VERIFIER_ABI,
    functionName: 'verifyProof',
    args: [proof.pA, proof.pB, proof.pC, proof.pubSignals],
    // zero account → eth_call from 0x0 (verifier is view)
    account: '0x0000000000000000000000000000000000000000',
  })
}

// ─── Top-level orchestrator ──────────────────────────────────────────────────

/**
 * Run a full measurement. Pure inputs, single async unit, returns a typed result.
 * Designed for both CLI invocation (see `main`) and integration testing.
 */
export async function measureVerify(
  args: MeasureArgs,
  /** Injected for tests; defaults to real network calls. */
  deps: {
    fetchOracle?: typeof fetchPolygonGasOracle
    estimateGas?: (client: PublicClient, verifier: Address, proof: ProofFixture) => Promise<bigint>
    readProof?: (path: string) => Promise<unknown>
    makeClient?: (rpc: string) => PublicClient
  } = {},
): Promise<MeasureResult> {
  const fetchOracle = deps.fetchOracle ?? fetchPolygonGasOracle
  const estimateGas = deps.estimateGas ?? estimateVerifyGas
  const readProof =
    deps.readProof ??
    (async (path: string) => {
      const file = Bun.file(path)
      return file.json()
    })
  const makeClient =
    deps.makeClient ??
    ((rpc: string) => createPublicClient({ transport: http(rpc) }) as PublicClient)

  const proof = validateProofFixture(await readProof(args.proofPath))
  const client = makeClient(args.rpc)
  const chainId = args.chainId ?? (await client.getChainId())
  const oracle = await fetchOracle()
  const gasPriceGwei = pickOracleScenario(oracle, 'standard')
  const gas = await estimateGas(client, args.verifier, proof)
  const usdPerVerify = computeUsdPerVerify(gas, gasPriceGwei, args.polUsd)
  const chain = resolveChain(chainId)

  return {
    chainId,
    chainName: chain?.name ?? `chainId:${chainId}`,
    verifier: args.verifier,
    gas,
    gasPriceGwei,
    oracleScenario: 'standard',
    polUsd: args.polUsd,
    usdPerVerify,
    oracle,
    measuredAt: new Date().toISOString(),
  }
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

export function parseArgs(argv: string[]): MeasureArgs {
  const get = (flag: string): string | undefined => {
    const idx = argv.indexOf(flag)
    if (idx === -1 || idx === argv.length - 1) return undefined
    return argv[idx + 1]
  }
  const rpc = get('--rpc')
  const verifier = get('--verifier')
  const proofPath = get('--proof')
  const polUsdRaw = get('--pol-usd')
  if (!rpc || !verifier || !proofPath || !polUsdRaw) {
    throw new Error(
      'usage: measure-verify --rpc <url> --verifier 0x... --proof <path> --pol-usd <number>',
    )
  }
  const polUsd = Number.parseFloat(polUsdRaw)
  if (!Number.isFinite(polUsd) || polUsd <= 0)
    throw new Error('--pol-usd must be a positive number')
  return {
    rpc,
    verifier: verifier as Address,
    proofPath,
    polUsd,
  }
}

// Allow direct execution via `bun run`. `import.meta.main` is Bun-native.
if (import.meta.main) {
  const args = parseArgs(Bun.argv.slice(2))
  measureVerify(args)
    .then((result) => {
      // BigInt → string for JSON serialisation
      const serialised = {
        ...result,
        gas: result.gas.toString(),
      }
      console.log(JSON.stringify(serialised, null, 2))
    })
    .catch((err) => {
      console.error(err instanceof Error ? err.message : err)
      process.exit(1)
    })
}
