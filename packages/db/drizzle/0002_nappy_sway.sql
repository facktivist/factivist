CREATE TYPE "public"."audit_action" AS ENUM('moderation.decide', 'moderation.escalate', 'moderation.claim', 'moderation.release', 'grievance.acknowledge', 'grievance.resolve', 'feature_flag.enable', 'feature_flag.disable', 'admin.grant', 'admin.revoke', 'identity.prove_attempt');--> statement-breakpoint
CREATE TYPE "public"."audit_target_kind" AS ENUM('complaint', 'comment', 'moderation_case', 'grievance', 'feature_flag', 'admin', 'session');--> statement-breakpoint
CREATE TYPE "public"."complaint_flag_reason" AS ENUM('pii-leak', 'harassment', 'misinformation', 'spam', 'off-topic');--> statement-breakpoint
CREATE TYPE "public"."complaint_status" AS ENUM('draft', 'published', 'moderation_pending', 'removed');--> statement-breakpoint
CREATE TYPE "public"."moderation_reason" AS ENUM('defamation', 'communal', 'false', 'doxxing', 'ncii', 'pii-leak', 'other');--> statement-breakpoint
CREATE TYPE "public"."moderation_status" AS ENUM('pending', 'approved', 'removed', 'escalated');--> statement-breakpoint
CREATE TYPE "public"."moderation_target_kind" AS ENUM('complaint', 'comment');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"actor" text NOT NULL,
	"action" "audit_action" NOT NULL,
	"target_kind" "audit_target_kind" NOT NULL,
	"target_id" text NOT NULL,
	"payload_hash" text NOT NULL,
	"rationale" text,
	"ts" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"slug" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"sort_order" text DEFAULT '999' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "citizens" (
	"id" text PRIMARY KEY NOT NULL,
	"nullifier" text NOT NULL,
	"state_code" text NOT NULL,
	"district_code" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "complaint_flags" (
	"id" text PRIMARY KEY NOT NULL,
	"complaint_slug" text NOT NULL,
	"reporter_id" text NOT NULL,
	"reason" "complaint_flag_reason" NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "complaints" (
	"slug" text PRIMARY KEY NOT NULL,
	"author_id" text NOT NULL,
	"category_slug" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"state_code" text NOT NULL,
	"district_code" text NOT NULL,
	"pc_code" text NOT NULL,
	"ac_code" text NOT NULL,
	"photo_urls" text[] DEFAULT '{}'::text[] NOT NULL,
	"status" "complaint_status" DEFAULT 'published' NOT NULL,
	"search_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(body, ''))) STORED,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assembly_constituencies" (
	"code" text PRIMARY KEY NOT NULL,
	"state_code" text NOT NULL,
	"district_code" text,
	"pc_code" text NOT NULL,
	"label" text NOT NULL,
	"reservation" text DEFAULT 'general' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "districts" (
	"code" text PRIMARY KEY NOT NULL,
	"state_code" text NOT NULL,
	"label" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parliamentary_constituencies" (
	"code" text PRIMARY KEY NOT NULL,
	"state_code" text NOT NULL,
	"district_code" text,
	"label" text NOT NULL,
	"reservation" text DEFAULT 'general' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "states" (
	"code" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"region" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feature_flags" (
	"key" text PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "moderation_queue" (
	"id" text PRIMARY KEY NOT NULL,
	"complaint_slug" text NOT NULL,
	"target_kind" "moderation_target_kind" DEFAULT 'complaint' NOT NULL,
	"reason" "moderation_reason" NOT NULL,
	"status" "moderation_status" DEFAULT 'pending' NOT NULL,
	"reviewer_id" text,
	"sla_due_at" timestamp with time zone NOT NULL,
	"decided_at" timestamp with time zone,
	"rationale" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "complaint_flags" ADD CONSTRAINT "complaint_flags_complaint_slug_complaints_slug_fk" FOREIGN KEY ("complaint_slug") REFERENCES "public"."complaints"("slug") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaint_flags" ADD CONSTRAINT "complaint_flags_reporter_id_citizens_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."citizens"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_author_id_citizens_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."citizens"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_category_slug_categories_slug_fk" FOREIGN KEY ("category_slug") REFERENCES "public"."categories"("slug") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_state_code_states_code_fk" FOREIGN KEY ("state_code") REFERENCES "public"."states"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_district_code_districts_code_fk" FOREIGN KEY ("district_code") REFERENCES "public"."districts"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_pc_code_parliamentary_constituencies_code_fk" FOREIGN KEY ("pc_code") REFERENCES "public"."parliamentary_constituencies"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_ac_code_assembly_constituencies_code_fk" FOREIGN KEY ("ac_code") REFERENCES "public"."assembly_constituencies"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assembly_constituencies" ADD CONSTRAINT "assembly_constituencies_state_code_states_code_fk" FOREIGN KEY ("state_code") REFERENCES "public"."states"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assembly_constituencies" ADD CONSTRAINT "assembly_constituencies_district_code_districts_code_fk" FOREIGN KEY ("district_code") REFERENCES "public"."districts"("code") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assembly_constituencies" ADD CONSTRAINT "assembly_constituencies_pc_code_parliamentary_constituencies_code_fk" FOREIGN KEY ("pc_code") REFERENCES "public"."parliamentary_constituencies"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "districts" ADD CONSTRAINT "districts_state_code_states_code_fk" FOREIGN KEY ("state_code") REFERENCES "public"."states"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parliamentary_constituencies" ADD CONSTRAINT "parliamentary_constituencies_state_code_states_code_fk" FOREIGN KEY ("state_code") REFERENCES "public"."states"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parliamentary_constituencies" ADD CONSTRAINT "parliamentary_constituencies_district_code_districts_code_fk" FOREIGN KEY ("district_code") REFERENCES "public"."districts"("code") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_by_actor" ON "audit_log" USING btree ("actor","ts");--> statement-breakpoint
CREATE INDEX "audit_log_by_target" ON "audit_log" USING btree ("target_kind","target_id","ts");--> statement-breakpoint
CREATE INDEX "audit_log_by_ts" ON "audit_log" USING btree ("ts");--> statement-breakpoint
CREATE UNIQUE INDEX "citizens_nullifier_unique" ON "citizens" USING btree ("nullifier");--> statement-breakpoint
CREATE INDEX "complaint_flags_by_complaint" ON "complaint_flags" USING btree ("complaint_slug");--> statement-breakpoint
CREATE UNIQUE INDEX "complaint_flags_one_per_reporter" ON "complaint_flags" USING btree ("complaint_slug","reporter_id");--> statement-breakpoint
CREATE INDEX "complaints_by_status_created" ON "complaints" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "complaints_by_state" ON "complaints" USING btree ("state_code");--> statement-breakpoint
CREATE INDEX "complaints_by_district" ON "complaints" USING btree ("district_code");--> statement-breakpoint
CREATE INDEX "complaints_by_pc" ON "complaints" USING btree ("pc_code");--> statement-breakpoint
CREATE INDEX "complaints_by_ac" ON "complaints" USING btree ("ac_code");--> statement-breakpoint
CREATE INDEX "complaints_by_category" ON "complaints" USING btree ("category_slug");--> statement-breakpoint
CREATE INDEX CONCURRENTLY "complaints_search_vector_gin" ON "complaints" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "acs_by_state" ON "assembly_constituencies" USING btree ("state_code");--> statement-breakpoint
CREATE INDEX "acs_by_district" ON "assembly_constituencies" USING btree ("district_code");--> statement-breakpoint
CREATE INDEX "acs_by_pc" ON "assembly_constituencies" USING btree ("pc_code");--> statement-breakpoint
CREATE INDEX "acs_by_label" ON "assembly_constituencies" USING btree ("label");--> statement-breakpoint
CREATE INDEX "districts_by_state" ON "districts" USING btree ("state_code");--> statement-breakpoint
CREATE INDEX "districts_by_label" ON "districts" USING btree ("label");--> statement-breakpoint
CREATE INDEX "pcs_by_state" ON "parliamentary_constituencies" USING btree ("state_code");--> statement-breakpoint
CREATE INDEX "pcs_by_district" ON "parliamentary_constituencies" USING btree ("district_code");--> statement-breakpoint
CREATE INDEX "pcs_by_label" ON "parliamentary_constituencies" USING btree ("label");--> statement-breakpoint
CREATE INDEX "states_by_label" ON "states" USING btree ("label");--> statement-breakpoint
CREATE INDEX "moderation_queue_by_status_sla" ON "moderation_queue" USING btree ("status","sla_due_at");--> statement-breakpoint
CREATE INDEX "moderation_queue_by_complaint_slug" ON "moderation_queue" USING btree ("complaint_slug");--> statement-breakpoint
CREATE UNIQUE INDEX "moderation_queue_open_case_unique" ON "moderation_queue" USING btree ("target_kind","complaint_slug") WHERE status = 'pending';