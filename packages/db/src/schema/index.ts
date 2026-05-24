/**
 * Schema barrel. Add new tables here as the domain grows.
 */

export { createId } from './_helpers.ts'
export {
  AUDIT_LOG_RETENTION_DAYS,
  type AuditLogEntry,
  auditActionEnum,
  auditLog,
  auditTargetKindEnum,
  type NewAuditLogEntry,
} from './audit_log.ts'
export { type Category, categories, type NewCategory } from './categories.ts'
export { type Citizen, citizens, type NewCitizen } from './citizens.ts'
export {
  type ComplaintFlag,
  complaintFlags,
  flagReasonEnum,
  type NewComplaintFlag,
} from './complaint_flags.ts'
export {
  type Complaint,
  complaintStatusEnum,
  complaints,
  type NewComplaint,
} from './complaints.ts'
export {
  type AssemblyConstituency,
  assemblyConstituencies,
  type District,
  districts,
  type NewAssemblyConstituency,
  type NewDistrict,
  type NewParliamentaryConstituency,
  type NewState,
  type ParliamentaryConstituency,
  parliamentaryConstituencies,
  type State,
  states,
} from './constituencies.ts'
export {
  devMetricsSchema,
  type LlmCall,
  llmCalls,
  type NewLlmCall,
  type NewZkpRouteEvent,
  type ZkpRouteEvent,
  zkpRouteEvents,
} from './dev_metrics.ts'
export {
  FEATURE_FLAG_KEYS,
  type FeatureFlag,
  type FeatureFlagKey,
  featureFlags,
  type NewFeatureFlag,
} from './feature_flags.ts'
export {
  computeSlaDueAt,
  type ModerationQueueItem,
  moderationQueue,
  moderationReasonEnum,
  moderationStatusEnum,
  moderationTargetKindEnum,
  type NewModerationQueueItem,
} from './moderation_queue.ts'
export { type NewUser, type User, users } from './users.ts'
