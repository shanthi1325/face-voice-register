
-- Visitor types enum
CREATE TYPE public.visitor_type AS ENUM ('faculty', 'student', 'guest', 'other');

-- Visitors table
CREATE TABLE public.visitors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_type visitor_type NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  -- Faculty fields
  department TEXT,
  -- Student fields
  branch TEXT,
  college TEXT,
  -- Guest fields
  organization TEXT,
  -- Face photo
  photo_url TEXT,
  face_captured_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;

-- Public insert (visitors register themselves without auth)
CREATE POLICY "Anyone can register as visitor" ON public.visitors
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view visitors" ON public.visitors
  FOR SELECT USING (true);

-- Team members table
CREATE TABLE public.team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT,
  email TEXT,
  phone TEXT,
  department TEXT,
  photo_url TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view team members" ON public.team_members
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert team members" ON public.team_members
  FOR INSERT WITH CHECK (true);

-- Video reviews table
CREATE TABLE public.video_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id UUID REFERENCES public.visitors(id) ON DELETE CASCADE,
  video_url TEXT,
  review_text TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  photo_at_review TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.video_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert reviews" ON public.video_reviews
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view reviews" ON public.video_reviews
  FOR SELECT USING (true);

-- Storage bucket for photos and videos
INSERT INTO storage.buckets (id, name, public) VALUES ('expo-media', 'expo-media', true);

CREATE POLICY "Anyone can upload expo media" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'expo-media');

CREATE POLICY "Anyone can view expo media" ON storage.objects
  FOR SELECT USING (bucket_id = 'expo-media');
