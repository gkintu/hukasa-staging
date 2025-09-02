-- Final cleanup: Make source_image_id NOT NULL and remove old columns
-- This completes the schema restructuring

-- Step 1: Ensure all generations have valid source_image_id before making it NOT NULL
-- (This should already be handled by the data migration, but double-check)
UPDATE generations 
SET source_image_id = NULL 
WHERE source_image_id IS NOT NULL 
AND NOT EXISTS (SELECT 1 FROM source_images WHERE id = generations.source_image_id);

-- Step 2: Remove any generations without valid source_image_id
DELETE FROM generations WHERE source_image_id IS NULL;

-- Step 3: Add the foreign key constraint
ALTER TABLE "generations" ADD CONSTRAINT "generations_source_image_id_source_images_id_fk" FOREIGN KEY ("source_image_id") REFERENCES "public"."source_images"("id") ON DELETE cascade ON UPDATE no action;

-- Step 4: Make the source_image_id column NOT NULL
ALTER TABLE generations ALTER COLUMN source_image_id SET NOT NULL;

-- Step 4: Remove the old columns that have been moved to source_images table
ALTER TABLE generations DROP COLUMN IF EXISTS original_image_path;
ALTER TABLE generations DROP COLUMN IF EXISTS original_file_name;
ALTER TABLE generations DROP COLUMN IF EXISTS display_name;
ALTER TABLE generations DROP COLUMN IF EXISTS file_size;
ALTER TABLE generations DROP COLUMN IF EXISTS is_favorited;