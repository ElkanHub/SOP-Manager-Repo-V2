import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "SOP-Guard Pro — Procedures in order. Audit ready.",
  description:
    "Manage SOPs, approvals, equipment PMs, and training in one controlled system. Real-time Pulse surfaces what needs attention next. Built for QA-led teams.",
}

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-background text-foreground">{children}</div>
}
