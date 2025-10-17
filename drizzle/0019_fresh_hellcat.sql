ALTER TYPE "public"."room_type" ADD VALUE 'kids_room';--> statement-breakpoint
ALTER TYPE "public"."room_type" ADD VALUE 'home_office';--> statement-breakpoint
ALTER TABLE "generations" ALTER COLUMN "staging_style" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."staging_style";--> statement-breakpoint
CREATE TYPE "public"."staging_style" AS ENUM('modern', 'midcentury', 'scandinavian', 'luxury', 'coastal', 'industrial', 'minimalist', 'standard');--> statement-breakpoint
ALTER TABLE "generations" ALTER COLUMN "staging_style" SET DATA TYPE "public"."staging_style" USING "staging_style"::"public"."staging_style";--> statement-breakpoint
ALTER TABLE "generations" ALTER COLUMN "source_image_id" SET NOT NULL;