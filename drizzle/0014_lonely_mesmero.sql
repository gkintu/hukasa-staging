CREATE TABLE "source_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"project_id" uuid NOT NULL,
	"original_image_path" text NOT NULL,
	"original_file_name" text NOT NULL,
	"display_name" text,
	"file_size" integer,
	"is_favorited" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "generations" ADD COLUMN "source_image_id" uuid;--> statement-breakpoint
ALTER TABLE "source_images" ADD CONSTRAINT "source_images_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_images" ADD CONSTRAINT "source_images_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Foreign key constraint will be added after data migration
-- Column drops will be done in final cleanup migration (0017)
-- ALTER TABLE "generations" ADD CONSTRAINT "generations_source_image_id_source_images_id_fk" FOREIGN KEY ("source_image_id") REFERENCES "public"."source_images"("id") ON DELETE cascade ON UPDATE no action;
-- ALTER TABLE "generations" DROP COLUMN "original_image_path";
-- ALTER TABLE "generations" DROP COLUMN "original_file_name";  
-- ALTER TABLE "generations" DROP COLUMN "display_name";
-- ALTER TABLE "generations" DROP COLUMN "file_size";
-- ALTER TABLE "generations" DROP COLUMN "is_favorited";