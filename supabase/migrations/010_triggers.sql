CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, department, role, is_active, onboarding_complete)
  VALUES (NEW.id, NULL, NULL, NULL, true, false);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

CREATE OR REPLACE FUNCTION public.trigger_check_cc_completion()
RETURNS trigger AS $$
BEGIN
  PERFORM check_cc_completion(NEW.change_control_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER signature_inserted
  AFTER INSERT ON public.signature_certificates
  FOR EACH ROW EXECUTE PROCEDURE public.trigger_check_cc_completion();

CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.trigger_set_updated_at();

CREATE TRIGGER set_sops_updated_at
  BEFORE UPDATE ON public.sops
  FOR EACH ROW EXECUTE PROCEDURE public.trigger_set_updated_at();

CREATE TRIGGER set_equipment_updated_at
  BEFORE UPDATE ON public.equipment
  FOR EACH ROW EXECUTE PROCEDURE public.trigger_set_updated_at();
