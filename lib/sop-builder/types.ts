export type SopBuilderStatus =
  | "intake"
  | "awaiting_clarification"
  | "outline_ready"
  | "drafting"
  | "draft_ready"
  | "revising"
  | "word_generated"
  | "completed"
  | "cancelled"

export type SopBuilderDraftStatus =
  | "generating"
  | "ready"
  | "superseded"
  | "word_generated"
  | "exported"

export type SopSection =
  | {
      heading: string
      type: "text"
      content: string
    }
  | {
      heading: string
      type: "steps"
      steps: string[]
    }
  | {
      heading: string
      type: "table"
      rows: string[][]
    }

export type SopStructuredContent = {
  title: string
  ai_draft_warning: string
  department?: string | null
  sections: SopSection[]
}

export type SopOutline = {
  title: string
  sections: Array<{
    heading: string
    intent: string
  }>
  questions?: string[]
}

export type SopBuilderSession = {
  id: string
  created_by: string
  organization_id?: string | null
  title: string
  department?: string | null
  purpose: string
  objective?: string | null
  scope_text?: string | null
  intended_users?: string | null
  equipment?: string | null
  risks?: string | null
  records_forms?: string | null
  regulatory_refs?: string | null
  selected_template_id?: string | null
  status: SopBuilderStatus
  active_draft_id?: string | null
  created_at: string
  updated_at: string
}

export type SopBuilderDraft = {
  id: string
  session_id: string
  version: number
  outline_json?: SopOutline | null
  structured_content_json: SopStructuredContent
  markdown_content: string
  docx_path?: string | null
  preview_url?: string | null
  change_summary?: string | null
  model_used?: string | null
  status: SopBuilderDraftStatus
  created_at: string
}

export type SopBuilderComment = {
  id: string
  session_id: string
  draft_id: string
  created_by: string
  comment_text: string
  quoted_text?: string | null
  section_heading?: string | null
  status: "open" | "resolved" | "dismissed"
  resolved_by_draft_id?: string | null
  created_at: string
}

export type SopBuilderTemplate = {
  id: string
  name: string
  file_path: string
  file_size_bytes: number
  version?: string | null
  is_default: boolean
  status: "active" | "archived"
  validation_status: "pending" | "valid" | "invalid"
  validation_notes?: string | null
  uploaded_by: string
  created_at: string
  updated_at: string
}

export type SopBuilderProfile = {
  id: string
  is_active: boolean
  is_admin: boolean
  role: "manager" | "employee" | null
  department: string | null
  full_name?: string | null
}

