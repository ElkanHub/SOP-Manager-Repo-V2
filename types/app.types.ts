export interface NotificationPrefs {
    email: boolean;
    pulse: boolean;
    notice_sound: boolean;
    message_sound: boolean;
}

export interface Profile {
    id: string;
    full_name: string;
    department: string | null;
    role: ('manager' | 'employee') | null;
    is_admin: boolean;
    is_active: boolean;
    employee_id?: string;
    job_title: string;
    phone?: string;
    avatar_url?: string;
    signature_url?: string;
    initials_url?: string;
    onboarding_complete: boolean;
    signup_status: 'pending' | 'approved' | 'rejected';
    notification_prefs: NotificationPrefs;
    created_at: string;
    updated_at: string;
}

export interface Department {
    id: string;
    name: string;
    colour: string;
    is_qa: boolean;
    created_at: string;
}

export interface SopRecord {
    id: string;
    sop_number: string;
    title: string;
    department: string;
    secondary_departments: string[];
    version: string;
    status: 'draft' | 'pending_qa' | 'active' | 'superseded' | 'pending_cc';
    locked: boolean;
    file_url?: string;
    date_listed?: string;
    date_revised?: string;
    due_for_revision?: string;
    submitted_by?: string;
    approved_by?: string;
    created_at: string;
    updated_at: string;
}

export interface SopVersion {
    id: string;
    sop_id: string;
    version: string;
    file_url: string;
    diff_json?: any;
    delta_summary?: string;
    uploaded_by?: string;
    change_type?: 'minor' | 'significant';
    created_at: string;
}

export interface SopApprovalRequest {
    id: string;
    sop_id: string;
    submitted_by: string;
    type: 'new' | 'update';
    status: 'pending' | 'changes_requested' | 'approved' | 'rejected';
    file_url: string;
    version_label: string;
    change_type?: 'minor' | 'significant';
    notes_to_qa?: string;
    created_at: string;
    updated_at: string;
}

export interface SopApprovalComment {
    id: string;
    request_id: string;
    author_id: string;
    comment: string;
    action?: 'comment' | 'changes_requested' | 'approved' | 'resubmitted';
    quoted_text?: string | null;
    quote_context?: string | null;
    anchor_hash?: string | null;
    created_at: string;
}

export interface SopAnnotationDraft {
    comment: string;
    quoted_text?: string;
    quote_context?: string;
    anchor_hash?: string;
}

export interface SopAcknowledgement {
    id: string;
    sop_id: string;
    user_id: string;
    version: string;
    acknowledged_at: string;
}

export interface CcSignatory {
    user_id: string;
    full_name: string;
    role: 'manager';
    department: string;
    waived: boolean;
}

export interface ChangeControl {
    id: string;
    sop_id: string;
    old_version: string;
    new_version: string;
    old_file_url: string;
    new_file_url: string;
    diff_json?: any;
    delta_summary?: string;
    status: 'pending' | 'complete' | 'waived';
    required_signatories: CcSignatory[];
    deadline: string;
    issued_by?: string;
    created_at: string;
    completed_at?: string;
}

export interface SignatureCertificate {
    id: string;
    change_control_id: string;
    user_id: string;
    signature_url: string;
    ip_address?: string;
    signed_at: string;
}

export interface Equipment {
    id: string;
    asset_id: string;
    name: string;
    department: string;
    secondary_departments: string[];
    serial_number?: string;
    model?: string;
    photo_url?: string;
    linked_sop_id?: string;
    frequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'custom';
    custom_interval_days?: number;
    last_serviced?: string;
    next_due?: string;
    status: 'pending_qa' | 'active' | 'inactive';
    initial_assignee_id?: string;
    submitted_by?: string;
    approved_by?: string;
    created_at: string;
    updated_at: string;
}

export interface PmTask {
    id: string;
    equipment_id: string;
    assigned_to: string;
    due_date: string;
    status: 'pending' | 'complete' | 'overdue';
    completed_by?: string;
    completed_at?: string;
    notes?: string;
    photo_url?: string;
    created_at: string;
}

export interface PulseAcknowledgement {
    id: string;
    pulse_item_id: string;
    user_id: string;
    acknowledged_at: string;
}

export interface PulseItem {
    id: string;
    recipient_id?: string;
    sender_id?: string;
    type: 'notice' | 'approval_request' | 'approval_update' | 'cc_signature' | 'cc_deadline' | 'pm_due' | 'pm_overdue' | 'sop_active' | 'system' | 'todo' | 'message';
    title: string;
    body?: string;
    entity_type?: string;
    entity_id?: string;
    parent_id?: string;
    audience: 'self' | 'department' | 'everyone';
    target_department?: string;
    is_read: boolean;
    is_acknowledged: boolean;
    thread_depth: number;
    created_at: string;
    sender?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>;
    acknowledgements?: PulseAcknowledgement[];
    total_recipients?: number;
}

export interface CalendarEvent {
    id: string;
    title: string;
    description?: string;
    start_date: string;
    end_date?: string;
    type: 'manual' | 'pm_auto';
    visibility: 'public' | 'department';
    department?: string;
    created_by?: string;
    created_at: string;
}

export interface AuditLog {
    id: string;
    actor_id?: string;
    action: string;
    entity_type: string;
    entity_id?: string;
    metadata?: any;
    created_at: string;
}

export interface Conversation {
    id: string;
    type: 'direct' | 'group';
    name: string | null;
    created_by: string;
    last_message_at: string | null;
    last_message_body: string | null;
    is_archived: boolean;
    created_at: string;
    members?: ConversationMember[];
    unread_count?: number;
}

export interface ConversationMember {
    conversation_id: string;
    user_id: string;
    last_read_at: string;
    notify_setting: 'all' | 'mentions_only' | 'muted';
    joined_at: string;
    profile?: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'department' | 'role'>;
}

export interface Message {
    id: string;
    conversation_id: string;
    sender_id: string;
    body: string;
    mentions: string[];
    reference_type: 'sop' | 'equipment' | 'change_control' | null;
    reference_id: string | null;
    reply_to_id: string | null;
    is_edited: boolean;
    edited_at: string | null;
    deleted_at: string | null;
    created_at: string;
    sender?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>;
    reply_to?: Pick<Message, 'id' | 'body' | 'sender_id'>;
    reference?: MessageReference | null;
}

export interface MessageReference {
    type: 'sop' | 'equipment' | 'change_control';
    id: string;
    title: string;
    status: string;
    department?: string;
    version?: string;
}

// ─── Document Requests ────────────────────────────────────────────────────────

export type RequestStatus = 'submitted' | 'received' | 'approved' | 'fulfilled'

export interface DocumentRequest {
  id:                    string
  requester_id:          string
  requester_name:        string
  requester_email:       string
  requester_department:  string
  requester_role:        string
  requester_job_title:   string | null
  requester_employee_id: string | null
  request_body:          string
  status:                RequestStatus
  reference_number:      string
  submitted_at:          string
  received_at:           string | null
  approved_at:           string | null
  fulfilled_at:          string | null
  received_by:           string | null
  approved_by:           string | null
  fulfilled_by:          string | null
  qa_notes:              string | null
  created_at:            string
  updated_at:            string
  // Joined fields (populated in queries)
  received_by_profile?:  Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null
  approved_by_profile?:  Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null
  fulfilled_by_profile?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null
}

// ─── Training ────────────────────────────────────────────────────────

export type TrainingModuleStatus = 'draft' | 'published' | 'archived'
export type TrainingAssignmentStatus = 'not_started' | 'in_progress' | 'completed'
export type QuestionnaireStatus = 'draft' | 'published'
export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer' | 'fill_blank'
export type CompletionMethod = 'digital' | 'paper_recorded'

export interface QuestionOption {
  id:         string    // 'a' | 'b' | 'c' | 'd' or 'true' | 'false'
  text:       string
  is_correct: boolean
}

export interface TrainingModule {
  id:                       string
  title:                    string
  description:              string | null
  created_by:               string
  department:               string
  sop_id:                   string
  sop_version:              string
  status:                   TrainingModuleStatus
  needs_review:             boolean
  is_mandatory:             boolean
  deadline:                 string | null
  slide_deck:               TrainingSlide[] | null
  slide_deck_generated_at:  string | null
  created_at:               string
  updated_at:               string
  // Joined
  sop?:                     Pick<SopRecord, 'id' | 'sop_number' | 'title' | 'version' | 'status'>
  creator?:                 Pick<Profile, 'id' | 'full_name' | 'avatar_url'>
  assignee_count?:          number
  completion_count?:        number
  questionnaire_count?:     number
}

export interface TrainingSlide {
  id:        string           // uuid generated client-side
  type:      'title' | 'objectives' | 'content' | 'summary' | 'edge_cases' | 'resources'
  title:     string
  body:      string           // plain text, may contain \n for line breaks
  notes?:    string           // presenter notes (optional)
  order:     number
}

export interface TrainingAssignment {
  id:           string
  module_id:    string
  assignee_id:  string
  assigned_by:  string
  assigned_at:  string
  status:       TrainingAssignmentStatus
  completed_at: string | null
  // Joined
  assignee?:    Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'department' | 'role'>
  module?:      Pick<TrainingModule, 'id' | 'title' | 'sop_id' | 'is_mandatory' | 'deadline'>
}

export interface TrainingQuestionnaire {
  id:             string
  module_id:      string
  title:          string
  description:    string | null
  passing_score:  number
  status:         QuestionnaireStatus
  version:        number
  created_at:     string
  updated_at:     string
  // Joined
  questions?:     TrainingQuestion[]
  attempt_count?: number
}

export interface TrainingQuestion {
  id:               string
  questionnaire_id: string
  question_text:    string
  question_type:    QuestionType
  options:          QuestionOption[] | null
  correct_answer:   string | null
  sop_section_ref:  string | null
  display_order:    number
}

export interface TrainingAttempt {
  id:                     string
  questionnaire_id:       string
  questionnaire_version:  number
  respondent_id:          string
  module_id:              string
  sop_id:                 string
  sop_version:            string
  started_at:             string
  submitted_at:           string | null
  score:                  number | null
  passed:                 boolean | null
  completion_method:      CompletionMethod
  paper_scan_url:         string | null
  created_at:             string
  // Joined
  respondent?:            Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'department'>
  answers?:               TrainingAnswer[]
}

export interface TrainingAnswer {
  id:           string
  attempt_id:   string
  question_id:  string
  answer_value: string | null
  is_correct:   boolean | null
}

export interface TrainingLogEntry {
  id:               string
  actor_id:         string
  action:           string
  module_id:        string | null
  questionnaire_id: string | null
  attempt_id:       string | null
  target_user_id:   string | null
  metadata:         Record<string, unknown> | null
  created_at:       string
  // Joined
  actor?:           Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'department'>
  target_user?:     Pick<Profile, 'id' | 'full_name' | 'department'>
  module?:          Pick<TrainingModule, 'id' | 'title'>
}

// ─── Request Forms ─────────────────────────────────────────────────────────────

export type RequestFieldType =
  | 'short_text'
  | 'long_text'
  | 'number'
  | 'date'
  | 'dropdown'
  | 'radio'
  | 'checkbox_single'
  | 'checkbox_multi'
  | 'note_display'

export interface RequestFieldConfig {
  options?: string[]
  min?: number
  max?: number
  placeholder?: string
}

export interface RequestFormField {
  id:          string
  form_id:     string
  position:    number
  label:       string
  helper_text: string | null
  field_type:  RequestFieldType
  is_required: boolean
  config:      RequestFieldConfig
  created_at:  string
}

export interface RequestForm {
  id:                       string
  title:                    string
  description:              string | null
  target_department:        string | null
  is_published:             boolean
  is_archived:              boolean
  version:                  number
  created_by:               string
  created_by_name:          string
  created_by_department:    string
  created_by_role:          string
  created_by_job_title:     string | null
  created_by_employee_id:   string | null
  last_modified_by:         string | null
  last_modified_by_name:    string | null
  published_at:             string | null
  published_by:             string | null
  archived_at:              string | null
  archived_by:              string | null
  created_at:               string
  updated_at:               string
  fields?:                  RequestFormField[]
}

export type RequestSubmissionStatus =
  | 'submitted'
  | 'received'
  | 'approved'
  | 'fulfilled'
  | 'rejected'

export interface RequestFormSubmission {
  id:                     string
  form_id:                string
  form_snapshot:          {
    title:       string
    description: string | null
    fields:      Array<Pick<RequestFormField, 'id' | 'position' | 'label' | 'helper_text' | 'field_type' | 'is_required' | 'config'>>
  }
  answers:                Record<string, unknown>
  requester_id:           string
  requester_name:         string
  requester_email:        string
  requester_department:   string
  requester_role:         string
  requester_job_title:    string | null
  requester_employee_id:  string | null
  status:                 RequestSubmissionStatus
  submitted_at:           string
  received_at:            string | null
  approved_at:            string | null
  fulfilled_at:           string | null
  rejected_at:            string | null
  received_by:            string | null
  approved_by:            string | null
  fulfilled_by:           string | null
  rejected_by:            string | null
  qa_notes:               string | null
  reference_number:       string
  created_at:             string
  updated_at:             string
  // Joined
  form?:                  Pick<RequestForm, 'id' | 'title'>
  received_by_profile?:   Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null
  approved_by_profile?:   Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null
  fulfilled_by_profile?:  Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null
  rejected_by_profile?:   Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null
}
