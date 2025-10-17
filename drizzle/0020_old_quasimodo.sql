CREATE INDEX "idx_admin_actions_admin_id" ON "admin_actions" USING btree ("admin_id");--> statement-breakpoint
CREATE INDEX "idx_generations_source_image_id" ON "generations" USING btree ("source_image_id");--> statement-breakpoint
CREATE INDEX "idx_generations_user_id" ON "generations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_projects_user_id" ON "projects" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_sessions_user_id" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_source_images_user_id" ON "source_images" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_source_images_project_id" ON "source_images" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_users_email" ON "users" USING btree ("email");