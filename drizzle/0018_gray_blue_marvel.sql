ALTER TABLE "generations" ALTER COLUMN "staging_style" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."staging_style";--> statement-breakpoint
CREATE TYPE "public"."staging_style" AS ENUM('modern', 'midcentury', 'scandinavian', 'luxury', 'coastal', 'farmhouse', 'industrial', 'bohemian', 'minimalist', 'traditional');--> statement-breakpoint
ALTER TABLE "generations" ALTER COLUMN "staging_style" SET DATA TYPE "public"."staging_style" USING "staging_style"::"public"."staging_style";