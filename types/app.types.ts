export interface NotificationPrefs {
    email: boolean;
    pulse: boolean;
    notice_sound: boolean;
    message_sound: boolean;
}

export interface Profile {
    id: string;
    full_name: string;
    department: string;
    role: 'manager' | 'employee';
    is_admin: boolean;
    is_active: boolean;
    employee_id?: string;
    job_title: string;
    phone?: string;
    avatar_url?: string;
    signature_url?: string;
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
    created_at: string;
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
