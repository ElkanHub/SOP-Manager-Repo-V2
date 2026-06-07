CREATE TABLE IF NOT EXISTS pwa_push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  expiration_time timestamptz,
  user_agent text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pwa_push_subscriptions_user_idx
  ON pwa_push_subscriptions(user_id)
  WHERE is_active = true;

CREATE OR REPLACE FUNCTION set_pwa_push_subscription_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pwa_push_subscriptions_updated_at ON pwa_push_subscriptions;
CREATE TRIGGER trg_pwa_push_subscriptions_updated_at
BEFORE UPDATE ON pwa_push_subscriptions
FOR EACH ROW EXECUTE FUNCTION set_pwa_push_subscription_updated_at();

ALTER TABLE pwa_push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own push subscriptions" ON pwa_push_subscriptions;
CREATE POLICY "Users can view own push subscriptions"
ON pwa_push_subscriptions FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own push subscriptions" ON pwa_push_subscriptions;
CREATE POLICY "Users can delete own push subscriptions"
ON pwa_push_subscriptions FOR DELETE
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view push subscriptions" ON pwa_push_subscriptions;
CREATE POLICY "Admins can view push subscriptions"
ON pwa_push_subscriptions FOR SELECT
USING (is_admin(auth.uid()));
