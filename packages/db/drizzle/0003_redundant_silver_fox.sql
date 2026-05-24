CREATE TABLE "dev_metrics"."zkp_route_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purpose" text NOT NULL,
	"route" text NOT NULL,
	"platform" text NOT NULL,
	"outcome" text NOT NULL,
	"duration_ms" integer,
	"metadata" jsonb,
	"ts" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "zkp_route_events_by_purpose" ON "dev_metrics"."zkp_route_events" USING btree ("purpose","ts");--> statement-breakpoint
CREATE INDEX "zkp_route_events_by_outcome" ON "dev_metrics"."zkp_route_events" USING btree ("outcome","ts");