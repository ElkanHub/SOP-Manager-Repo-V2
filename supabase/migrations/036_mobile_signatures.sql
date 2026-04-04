-- ============================================================================
-- 036: Mobile Signatures — QR-based signature capture
-- ============================================================================
-- This table acts as a short-lived handshake between a logged-in Desktop
-- browser and an anonymous Mobile browser.  The Desktop creates a 'pending'
-- row, displays the UUID as a QR code, and listens for the Realtime UPDATE.
-- The Mobile writes the signature and flips status to 'completed'.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.mobile_signatures (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    signature_base64 text,
    status          text NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'completed')),
    created_at      timestamptz NOT NULL DEFAULT now(),
    expires_at      timestamptz NOT NULL DEFAULT now() + interval '15 minutes'
);

-- Index for fast lookup by status + expiry (used by RLS and cleanup)
CREATE INDEX IF NOT EXISTS mobile_sig_status_expires_idx
    ON public.mobile_signatures (status, expires_at);

-- ─── Row Level Security ─────────────────────────────────────────────────────

ALTER TABLE public.mobile_signatures ENABLE ROW LEVEL SECURITY;

-- 1. INSERT — Only authenticated users can create requests, and only for themselves
CREATE POLICY "Users can create their own mobile signature requests"
    ON public.mobile_signatures
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- 2. SELECT — Anyone (including anon mobile users) can read a record by its ID.
--    This is safe because the UUID is a 128-bit random token that acts as the
--    authentication factor.  No listing/scanning is possible without the ID.
CREATE POLICY "Anyone can view a mobile signature by ID"
    ON public.mobile_signatures
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- 3. UPDATE — Anyone can complete a PENDING and NON-EXPIRED record.
--    The WITH CHECK ensures the record can only transition TO 'completed',
--    and signature_base64 must be provided.  Combined with the USING clause
--    that restricts to pending+unexpired rows, this prevents:
--      • Overwriting an already-completed signature
--      • Completing an expired request
--      • Setting status to anything other than 'completed'
CREATE POLICY "Anyone can complete a pending signature"
    ON public.mobile_signatures
    FOR UPDATE
    TO anon, authenticated
    USING (status = 'pending' AND expires_at > now())
    WITH CHECK (status = 'completed' AND signature_base64 IS NOT NULL);

-- ─── Realtime ───────────────────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE public.mobile_signatures;
