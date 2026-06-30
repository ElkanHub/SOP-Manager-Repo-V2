-- 057_audit_signature_hardening.sql
-- Spec v2.2 alignment — Phase 1: compliance hardening (ALCOA+ / 21 CFR Part 11).
-- Low-risk, additive. No behaviour change to existing flows; only strengthens the
-- audit trail and electronic-signature records so they are inspector-defensible.
--
-- Covers gap-register items #18 (audit completeness) and the §12.5 signature-meaning
-- requirement. Idempotent (ADD COLUMN IF NOT EXISTS / CREATE OR REPLACE / guarded policies).

-- 1. Audit trail: first-class old/new value + reason ------------------------
-- Today reason/old/new live opportunistically inside metadata jsonb. ALCOA+ wants
-- the before/after and the "why" for discretionary actions as structured columns.
ALTER TABLE audit_log
  ADD COLUMN IF NOT EXISTS old_value jsonb,
  ADD COLUMN IF NOT EXISTS new_value jsonb,
  ADD COLUMN IF NOT EXISTS reason text;

-- 2. Signature certificates: capture the MEANING of the signature -----------
-- Part 11 requires the signed meaning (what the signature attests) be recorded
-- and permanently linked to the record. Default 'approved' is the historical
-- meaning of every existing CC signature, so the backfill is correct.
ALTER TABLE signature_certificates
  ADD COLUMN IF NOT EXISTS meaning text NOT NULL DEFAULT 'approved'
    CHECK (meaning IN ('authored','reviewed','approved','released'));

-- Bind a signature to the specific document version it attests, where known.
-- Nullable: package-level signatures (the current model) leave it NULL.
ALTER TABLE signature_certificates
  ADD COLUMN IF NOT EXISTS document_version_id uuid;

-- 3. Signature immutability (mirror the audit_log lockdown from 040) ----------
-- A signature, once applied, must not be edited or deleted (only waived via the
-- logged admin path). RESTRICTIVE UPDATE/DELETE = false; INSERT/SELECT unaffected.
DROP POLICY IF EXISTS "signature_certificates no updates" ON signature_certificates;
CREATE POLICY "signature_certificates no updates"
  ON signature_certificates AS RESTRICTIVE FOR UPDATE
  USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "signature_certificates no deletes" ON signature_certificates;
CREATE POLICY "signature_certificates no deletes"
  ON signature_certificates AS RESTRICTIVE FOR DELETE
  USING (false);

-- 4. System actor for unattributed transitions ------------------------------
-- check_cc_completion (a trigger-driven transition) logs actor_id = NULL, which
-- breaks ALCOA "attributable". A reusable helper resolves the acting QA owner of a
-- CC so signature-completion can be attributed instead of NULL.
CREATE OR REPLACE FUNCTION cc_system_actor(p_cc_id uuid)
RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT COALESCE(qa_owner_id, issued_by, requester_id)
  FROM change_controls WHERE id = p_cc_id;
$$;

COMMENT ON COLUMN audit_log.old_value IS 'Structured before-value for state/field changes (ALCOA+).';
COMMENT ON COLUMN audit_log.new_value IS 'Structured after-value for state/field changes (ALCOA+).';
COMMENT ON COLUMN audit_log.reason IS 'Required rationale for discretionary actions (waiver, override, reject, dispute).';
COMMENT ON COLUMN signature_certificates.meaning IS 'Part 11 — what the signature attests: authored/reviewed/approved/released.';
