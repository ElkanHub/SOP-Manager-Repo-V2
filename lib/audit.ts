import { createServiceClient } from "@/lib/supabase/server"

// NOTE: server-only module. createServiceClient pulls next/headers transitively,
// which makes any accidental client import fail at build time.

export type AuditEntityType =
  | "sop"
  | "change_control"
  | "equipment"
  | "pm_task"
  | "training_module"
  | "training_assignment"
  | "profile"
  | "department"
  | "event"
  | "pulse_item"
  | "conversation"
  | "document_request"
  | "request_form"
  | "request_form_submission"
  | "report"
  | "system"

export interface AuditEntry {
  action: string
  entityType: AuditEntityType
  entityId?: string | null
  metadata?: Record<string, unknown> | null
  actorId?: string | null
}

/**
 * Append a single row to audit_log via the service client.
 *
 * Intentionally fire-and-forget: audit failures must never break the user flow
 * they follow (e.g. creating an event shouldn't fail because auditing failed).
 * Errors are logged to the server console and swallowed.
 *
 * Must only be called from server code (actions/, api routes, server components).
 */
export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    const service = await createServiceClient()
    const { error } = await service.from("audit_log").insert({
      actor_id: entry.actorId ?? null,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId ?? null,
      metadata: entry.metadata ?? {},
    })
    if (error) {
      // eslint-disable-next-line no-console
      console.error("[audit] insert failed", {
        action: entry.action,
        entity_type: entry.entityType,
        error: error.message,
      })
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[audit] unexpected failure", err)
  }
}

/**
 * Convenience wrapper for report export auditing. Returns void; failures are
 * swallowed the same way as logAudit.
 */
export async function logReportExport({
  actorId,
  reportType,
  rowCount,
  filters,
}: {
  actorId: string
  reportType: string
  rowCount: number
  filters?: Record<string, unknown>
}): Promise<void> {
  await logAudit({
    actorId,
    action: "report_exported",
    entityType: "report",
    metadata: {
      report_type: reportType,
      row_count: rowCount,
      filters: filters ?? {},
    },
  })
}
