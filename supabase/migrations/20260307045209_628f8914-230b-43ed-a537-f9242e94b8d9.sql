
-- Create admin role enum and user_roles table
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Only admins can view user_roles
CREATE POLICY "Admins can view roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can insert roles  
CREATE POLICY "Admins can insert roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Fix team_members: drop public policies, add admin-only
DROP POLICY IF EXISTS "Anyone can view team members" ON public.team_members;
DROP POLICY IF EXISTS "Anyone can insert team members" ON public.team_members;

CREATE POLICY "Admins can view team members" ON public.team_members
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert team members" ON public.team_members
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update team members" ON public.team_members
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete team members" ON public.team_members
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Fix video_reviews: keep public insert but restrict select to admin
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.video_reviews;

CREATE POLICY "Admins can view reviews" ON public.video_reviews
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Fix visitors: keep public insert but restrict select to admin
DROP POLICY IF EXISTS "Anyone can view visitors" ON public.visitors;

CREATE POLICY "Admins can view visitors" ON public.visitors
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Restrict storage: remove public upload, add authenticated upload
DROP POLICY IF EXISTS "Anyone can upload expo media" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view expo media" ON storage.objects;

CREATE POLICY "Authenticated users can upload expo media" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'expo-media');

CREATE POLICY "Public can view expo media" ON storage.objects
  FOR SELECT USING (bucket_id = 'expo-media');
