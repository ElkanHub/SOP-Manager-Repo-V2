CREATE OR REPLACE FUNCTION has_any_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE is_admin = true AND is_active = true);
$$;
