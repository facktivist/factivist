CREATE SCHEMA "dev_metrics";
--> statement-breakpoint
CREATE TABLE "dev_metrics"."llm_calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent" text NOT NULL,
	"model" text NOT NULL,
	"prompt_tokens" integer NOT NULL,
	"completion_tokens" integer NOT NULL,
	"cache_read_tokens" integer DEFAULT 0 NOT NULL,
	"cost_usd" numeric(10, 6) NOT NULL,
	"batched" boolean DEFAULT false NOT NULL,
	"task_id" text,
	"ts" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "llm_calls_by_agent" ON "dev_metrics"."llm_calls" USING btree ("agent","ts");--> statement-breakpoint
CREATE INDEX "llm_calls_by_task_id" ON "dev_metrics"."llm_calls" USING btree ("task_id");