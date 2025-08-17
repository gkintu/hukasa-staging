CREATE TYPE "public"."operation_type" AS ENUM('stage_empty', 'remove_furniture');--> statement-breakpoint
CREATE TYPE "public"."room_type" AS ENUM('living_room', 'bedroom', 'kitchen', 'bathroom', 'office', 'dining_room');--> statement-breakpoint
CREATE TYPE "public"."staging_style" AS ENUM('modern', 'luxury', 'traditional', 'scandinavian', 'industrial', 'bohemian');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TABLE "generations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"original_image_path" text NOT NULL,
	"staged_image_path" text,
	"room_type" "room_type" NOT NULL,
	"staging_style" "staging_style" NOT NULL,
	"operation_type" "operation_type" NOT NULL,
	"status" "status" DEFAULT 'pending' NOT NULL,
	"is_favorited" boolean DEFAULT false NOT NULL,
	"job_id" text,
	"error_message" text,
	"processing_time_ms" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "generations" ADD CONSTRAINT "generations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;