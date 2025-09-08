-- Create storage buckets for user avatars and space images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES 
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']),
  ('spaces', 'spaces', true, 10485760, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

-- Create storage policies for avatars
CREATE POLICY "Avatar images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create storage policies for space images
CREATE POLICY "Space images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'spaces');

CREATE POLICY "Admins can upload space images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'spaces' AND is_admin());

CREATE POLICY "Admins can update space images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'spaces' AND is_admin());

CREATE POLICY "Admins can delete space images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'spaces' AND is_admin());

-- Add avatar_url column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN avatar_url TEXT;

-- Create function to generate signed URL for uploads
CREATE OR REPLACE FUNCTION public.get_upload_url(bucket_name TEXT, file_path TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This is a placeholder - in practice you'd generate a signed URL
  -- For now, we'll return a constructed public URL
  RETURN 'https://fpnlwuvewndcbhcodixd.supabase.co/storage/v1/object/public/' || bucket_name || '/' || file_path;
END;
$$;