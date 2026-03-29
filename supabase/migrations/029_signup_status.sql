-- Add the column with a default of 'approved' so all existing users are automatically admitted
ALTER TABLE public.profiles 
ADD COLUMN signup_status text NOT NULL DEFAULT 'approved' 
CHECK (signup_status IN ('pending', 'approved', 'rejected'));

-- Now that existing users are safe, change the default to 'pending' for all future signups
ALTER TABLE public.profiles 
ALTER COLUMN signup_status SET DEFAULT 'pending';

-- Update the handle_new_user trigger to explicitly insert 'pending'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, department, role, is_active, onboarding_complete, signup_status)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data->>'full_name', 
    NEW.raw_user_meta_data->>'avatar_url',
    NULL, NULL, true, false, 'pending'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
