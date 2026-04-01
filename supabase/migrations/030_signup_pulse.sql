-- Update handle_new_user to also notify admins via Pulse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  admin_record RECORD;
BEGIN
  -- 1. Create the profile
  INSERT INTO public.profiles (id, full_name, avatar_url, department, role, is_active, onboarding_complete, signup_status)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data->>'full_name', 
    NEW.raw_user_meta_data->>'avatar_url',
    NULL, NULL, true, false, 'pending'
  );

  -- 2. Notify all admins via Pulse
  FOR admin_record IN (SELECT id FROM public.profiles WHERE is_admin = true) LOOP
    INSERT INTO public.pulse_items (recipient_id, type, title, body, audience)
    VALUES (
      admin_record.id, 
      'notice', 
      'New Access Request', 
      (NEW.raw_user_meta_data->>'full_name') || ' has requested access and is awaiting approval.', 
      'self'
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
