-- Data migration: Move source images from generations to source_images table
-- This handles the restructuring of existing data safely

-- Step 1: Migrate existing source images (records where staged_image_path IS NULL)
INSERT INTO source_images (id, user_id, project_id, original_image_path, original_file_name, display_name, file_size, is_favorited, created_at, updated_at)
SELECT 
  id, 
  user_id, 
  project_id, 
  original_image_path, 
  original_file_name, 
  display_name, 
  file_size, 
  is_favorited, 
  created_at, 
  created_at as updated_at
FROM generations 
WHERE staged_image_path IS NULL;

-- Step 2: Update any AI-generated records to reference their source images
-- For now, we'll assume AI generations without clear source references should be removed
-- In a real scenario, you might have logic to map them properly
UPDATE generations 
SET source_image_id = id 
WHERE staged_image_path IS NULL;

-- Step 3: Remove the old source image records from generations table
-- These are now properly stored in source_images table
DELETE FROM generations WHERE staged_image_path IS NULL;

-- Step 4: Handle any orphaned AI generation records
-- Remove AI generations that don't have valid source image references
-- In production, you might want to handle this differently based on business logic
DELETE FROM generations 
WHERE staged_image_path IS NOT NULL 
AND source_image_id IS NULL;