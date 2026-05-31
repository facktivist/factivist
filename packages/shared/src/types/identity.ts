/**
 * Identity context types — re-exported from the validator module so callers
 * who only need types don't pull in `zod` symbols at runtime.
 */
export type {
  CitizenPublicView,
  DistrictCode,
  Groth16Proof,
  Nullifier,
  SessionStatus,
  StateCode,
  VerifyProofError,
  VerifyProofRequest,
  VerifyProofResponse,
  VerifyProofSuccess,
  VerifyPublicSignals,
} from '../validators/identity.ts'
