-- Fix security warning: Set search_path for functions
CREATE OR REPLACE FUNCTION public.get_upload_url(bucket_name TEXT, file_path TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- This is a placeholder - in practice you'd generate a signed URL
  -- For now, we'll return a constructed public URL
  RETURN 'https://fpnlwuvewndcbhcodixd.supabase.co/storage/v1/object/public/' || bucket_name || '/' || file_path;
END;
$$;