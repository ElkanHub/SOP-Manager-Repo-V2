ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sops ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_approval_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_acknowledgements ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE signature_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulse_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "Profiles are viewable by self if active" ON profiles FOR SELECT USING (id = auth.uid() AND is_active = true);
CREATE POLICY "Profiles are viewable by QA Manager" ON profiles FOR SELECT USING (is_qa_manager(auth.uid()));
CREATE POLICY "Profiles are viewable by Admin" ON profiles FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Profiles are viewable by any active user" ON profiles FOR SELECT USING (is_active_user(auth.uid()));
CREATE POLICY "Profiles are updatable by self if active" ON profiles FOR UPDATE USING (id = auth.uid() AND is_active = true);
CREATE POLICY "Profiles are updatable by Admin" ON profiles FOR UPDATE USING (is_admin(auth.uid()));

-- departments
CREATE POLICY "Departments are viewable by any active user" ON departments FOR SELECT USING (is_active_user(auth.uid()));
CREATE POLICY "Departments are insertable by Admin" ON departments FOR INSERT WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Departments are updatable by Admin" ON departments FOR UPDATE USING (is_admin(auth.uid()));
CREATE POLICY "Departments are deletable by Admin" ON departments FOR DELETE USING (is_admin(auth.uid()));

-- sops
CREATE POLICY "SOPs (active) are viewable by Employee or Manager" ON sops FOR SELECT USING (status = 'active' AND is_active_user(auth.uid()));
CREATE POLICY "SOPs (draft/pending) are viewable by Manager" ON sops FOR SELECT USING (
  status IN ('draft','pending_qa','pending_cc') AND 
  department = (SELECT department FROM profiles WHERE id = auth.uid() AND is_active = true) AND
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager' AND is_active = true)
);
CREATE POLICY "SOPs are viewable by QA Manager" ON sops FOR SELECT USING (is_qa_manager(auth.uid()));
CREATE POLICY "SOPs are insertable by Manager" ON sops FOR INSERT WITH CHECK (submitted_by = auth.uid() AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager' AND is_active = true));

-- sop_versions
CREATE POLICY "sop_versions are viewable by Employee or Manager if active" ON sop_versions FOR SELECT USING (
  EXISTS (SELECT 1 FROM sops WHERE id = sop_id AND status = 'active') AND is_active_user(auth.uid())
);
CREATE POLICY "sop_versions are viewable by Manager if own dept" ON sop_versions FOR SELECT USING (
  EXISTS (SELECT 1 FROM sops WHERE id = sop_id AND department = (SELECT department FROM profiles WHERE id = auth.uid() AND is_active = true)) AND
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager' AND is_active = true)
);
CREATE POLICY "sop_versions are viewable by QA Manager" ON sop_versions FOR SELECT USING (is_qa_manager(auth.uid()));

-- sop_approval_requests
CREATE POLICY "sop_approval_requests are insertable by Manager" ON sop_approval_requests FOR INSERT WITH CHECK (submitted_by = auth.uid() AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager' AND is_active = true));
CREATE POLICY "sop_approval_requests are viewable by Submitter" ON sop_approval_requests FOR SELECT USING (submitted_by = auth.uid() AND is_active_user(auth.uid()));
CREATE POLICY "sop_approval_requests are viewable by QA Manager" ON sop_approval_requests FOR SELECT USING (is_qa_manager(auth.uid()));

-- sop_approval_comments
CREATE POLICY "sop_approval_comments are insertable by Submitter or QA" ON sop_approval_comments FOR INSERT WITH CHECK ((author_id = auth.uid()) AND (
  EXISTS (SELECT 1 FROM sop_approval_requests WHERE id = request_id AND submitted_by = auth.uid()) OR is_qa_manager(auth.uid())
) AND is_active_user(auth.uid()));
CREATE POLICY "sop_approval_comments are viewable by Submitter or QA" ON sop_approval_comments FOR SELECT USING (
  EXISTS (SELECT 1 FROM sop_approval_requests WHERE id = request_id AND submitted_by = auth.uid()) OR is_qa_manager(auth.uid())
);

-- sop_acknowledgements
CREATE POLICY "sop_acknowledgements insertable by Employee/Manager" ON sop_acknowledgements FOR INSERT WITH CHECK (user_id = auth.uid() AND is_active_user(auth.uid()));
CREATE POLICY "sop_acknowledgements viewable by self" ON sop_acknowledgements FOR SELECT USING (user_id = auth.uid() AND is_active_user(auth.uid()));
CREATE POLICY "sop_acknowledgements viewable by Manager" ON sop_acknowledgements FOR SELECT USING (
  EXISTS (SELECT 1 FROM sops WHERE id = sop_id AND department = (SELECT department FROM profiles WHERE id = auth.uid() AND is_active = true)) AND
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager' AND is_active = true)
);

-- change_controls
CREATE POLICY "change_controls viewable by Manager" ON change_controls FOR SELECT USING (
  (EXISTS (SELECT 1 FROM sops WHERE id = sop_id AND department = (SELECT department FROM profiles WHERE id = auth.uid() AND is_active = true)) OR 
   required_signatories @> jsonb_build_array(jsonb_build_object('user_id', auth.uid()::text))) AND
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager' AND is_active = true)
);
CREATE POLICY "change_controls viewable by QA Manager" ON change_controls FOR SELECT USING (is_qa_manager(auth.uid()));

-- signature_certificates
CREATE POLICY "signature_certificates insertable by Manager or QA" ON signature_certificates FOR INSERT WITH CHECK (user_id = auth.uid() AND is_active_user(auth.uid()));
CREATE POLICY "signature_certificates viewable by Manager" ON signature_certificates FOR SELECT USING (
  EXISTS (SELECT 1 FROM change_controls cc JOIN sops s ON s.id = cc.sop_id WHERE cc.id = change_control_id AND s.department = (SELECT department FROM profiles WHERE id = auth.uid() AND is_active = true)) AND
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager' AND is_active = true)
);
CREATE POLICY "signature_certificates viewable by QA Manager" ON signature_certificates FOR SELECT USING (is_qa_manager(auth.uid()));

-- equipment
CREATE POLICY "equipment viewable by Employee" ON equipment FOR SELECT USING (
  status = 'active' AND
  (department = (SELECT department FROM profiles WHERE id = auth.uid() AND is_active = true) OR ((SELECT department FROM profiles WHERE id = auth.uid() AND is_active = true) = ANY(secondary_departments))) AND
  is_active_user(auth.uid())
);
CREATE POLICY "equipment viewable by Manager" ON equipment FOR SELECT USING (
  (department = (SELECT department FROM profiles WHERE id = auth.uid() AND is_active = true) OR ((SELECT department FROM profiles WHERE id = auth.uid() AND is_active = true) = ANY(secondary_departments)))  AND
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager' AND is_active = true)
);
CREATE POLICY "equipment viewable by QA Manager" ON equipment FOR SELECT USING (is_qa_manager(auth.uid()));
CREATE POLICY "equipment insertable by Manager" ON equipment FOR INSERT WITH CHECK (submitted_by = auth.uid() AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager' AND is_active = true));

-- pm_tasks
CREATE POLICY "pm_tasks viewable by Employee/Manager" ON pm_tasks FOR SELECT USING (
  EXISTS (SELECT 1 FROM equipment WHERE id = equipment_id AND (department = (SELECT department FROM profiles WHERE id = auth.uid() AND is_active = true) OR ((SELECT department FROM profiles WHERE id = auth.uid() AND is_active = true) = ANY(secondary_departments)))) AND
  is_active_user(auth.uid())
);
CREATE POLICY "pm_tasks viewable by QA Manager" ON pm_tasks FOR SELECT USING (is_qa_manager(auth.uid()));

-- pulse_items
CREATE POLICY "pulse_items viewable by any active user" ON pulse_items FOR SELECT USING (
  (recipient_id = auth.uid() OR (audience = 'department' AND target_department = (SELECT department FROM profiles WHERE id = auth.uid() AND is_active = true)) OR audience = 'everyone') AND
  is_active_user(auth.uid())
);
CREATE POLICY "pulse_items insertable by active user" ON pulse_items FOR INSERT WITH CHECK (
  sender_id = auth.uid() AND type NOT IN ('system','cc_deadline','pm_overdue') AND thread_depth <= 1 AND
  is_active_user(auth.uid())
);
CREATE POLICY "pulse_items updatable by Recipient" ON pulse_items FOR UPDATE USING (
  (recipient_id = auth.uid() OR (audience = 'department' AND target_department = (SELECT department FROM profiles WHERE id = auth.uid() AND is_active = true)) OR audience = 'everyone') AND
  is_active_user(auth.uid())
);

-- events
CREATE POLICY "events viewable by active user" ON events FOR SELECT USING (
  (visibility = 'public' OR department = (SELECT department FROM profiles WHERE id = auth.uid() AND is_active = true)) AND
  is_active_user(auth.uid())
);
CREATE POLICY "events insertable by active user" ON events FOR INSERT WITH CHECK (created_by = auth.uid() AND is_active_user(auth.uid()));
CREATE POLICY "events updatable by Creator" ON events FOR UPDATE USING (created_by = auth.uid() AND is_active_user(auth.uid()));
CREATE POLICY "events deletable by Creator" ON events FOR DELETE USING (created_by = auth.uid() AND is_active_user(auth.uid()));

-- audit_log
CREATE POLICY "audit_log viewable by QA Manager" ON audit_log FOR SELECT USING (is_qa_manager(auth.uid()));
CREATE POLICY "audit_log viewable by Admin" ON audit_log FOR SELECT USING (is_admin(auth.uid()));
