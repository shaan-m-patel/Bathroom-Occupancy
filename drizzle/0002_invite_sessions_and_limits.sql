CREATE TABLE "rate_limit_buckets" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"reset_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "households" ADD COLUMN "session_version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "login_code_hash" text;--> statement-breakpoint
CREATE INDEX "reservations_household_end_idx" ON "reservations" USING btree ("household_id","end_at");--> statement-breakpoint
CREATE INDEX "reservations_active_series_idx" ON "reservations" USING btree ("household_id") WHERE "reservations"."recurrence_days" IS NOT NULL;