
-- Drop restrictive admin-only SELECT policies
DROP POLICY IF EXISTS "Admins can view visitors" ON public.visitors;
DROP POLICY IF EXISTS "Admins can view reviews" ON public.video_reviews;
DROP POLICY IF EXISTS "Admins can view team members" ON public.team_members;

-- Allow anyone to read these tables
CREATE POLICY "Anyone can view visitors" ON public.visitors FOR SELECT USING (true);
CREATE POLICY "Anyone can view reviews" ON public.video_reviews FOR SELECT USING (true);
CREATE POLICY "Anyone can view team members" ON public.team_members FOR SELECT USING (true);
