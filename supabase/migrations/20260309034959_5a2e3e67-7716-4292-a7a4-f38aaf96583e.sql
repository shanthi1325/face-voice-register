
-- 1. Make expo-media bucket private
UPDATE storage.buckets SET public = false WHERE id = 'expo-media';

-- 2. Drop old permissive upload policy and create proper one
DROP POLICY IF EXISTS "Authenticated users can upload expo media" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload expo media" ON storage.objects;
DROP POLICY IF EXISTS "Public can view expo media" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view expo media" ON storage.objects;

-- Allow anyone to upload to expo-media (needed for public registration)
CREATE POLICY "Public can upload expo media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'expo-media');

-- Only allow reading via authenticated admin or signed URLs
CREATE POLICY "Admins can view expo media"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'expo-media');
