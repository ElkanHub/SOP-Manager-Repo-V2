"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { FileText, Search, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface SopReference {
  type: "sop"
  id: string
  sop_number: string
  title: string
  status: string
  version: string
  department: string
}

export function ReferencePicker({
  isOpen,
  onClose,
  onSelect,
}: {
  isOpen: boolean
  onClose: () => void
  onSelect: (ref: SopReference) => void
}) {
  const [search, setSearch] = useState("")
  const [results, setResults] = useState<SopReference[]>([])
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (!isOpen) return
    let active = true
    setLoading(true)

    const run = async () => {
      let query = supabase
        .from("sops")
        .select("id, sop_number, title, status, version, department")
        .eq("status", "active")
        .order("sop_number", { ascending: true })
        .limit(25)

      if (search.trim()) {
        const term = `%${search.trim()}%`
        query = query.or(`title.ilike.${term},sop_number.ilike.${term}`)
      }

      const { data } = await query
      if (!active) return
      setResults(
        (data || []).map((s) => ({
          type: "sop" as const,
          id: s.id,
          sop_number: s.sop_number,
          title: s.title,
          status: s.status,
          version: s.version,
          department: s.department,
        }))
      )
      setLoading(false)
    }

    const timeout = setTimeout(run, 200)
    return () => {
      active = false
      clearTimeout(timeout)
    }
  }, [isOpen, search, supabase])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[420px] p-0 overflow-hidden border-border/40 shadow-2xl bg-gradient-to-b from-background to-background/95">
        <DialogHeader className="p-6 pb-4 bg-gradient-to-r from-brand-teal/10 via-brand-navy/5 to-transparent border-b border-border/50">
          <DialogTitle className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <div className="p-2 rounded-lg bg-brand-teal/10">
              <FileText className="w-5 h-5 text-brand-teal" />
            </div>
            Attach SOP Reference
          </DialogTitle>
        </DialogHeader>
        <div className="p-6 pt-4 space-y-6">
          <div className="relative group">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground/60 group-focus-within:text-brand-teal transition-colors" />
            <Input
              placeholder="Search SOPs by title or number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-muted/30 border-border/50 focus:border-brand-teal/50 focus:ring-brand-teal/20 transition-all pl-10 h-11 font-medium"
            />
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">
              {loading ? "Searching..." : "Active SOPs"}
            </label>
            <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-2 -mr-2 custom-scrollbar">
              {loading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 text-brand-teal animate-spin" />
                </div>
              )}
              {!loading &&
                results.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center gap-4 p-4 rounded-2xl border border-border/40 bg-card/30 hover:bg-brand-teal/[0.03] hover:border-brand-teal/30 cursor-pointer transition-all group relative overflow-hidden"
                    onClick={() => onSelect(r)}
                  >
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-brand-teal/20 to-brand-navy/10 text-brand-teal group-hover:scale-105 transition-transform border border-brand-teal/10">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-brand-navy bg-brand-navy/5 px-1.5 py-0.5 rounded-sm">
                          {r.sop_number}
                        </span>
                        <span className="text-[9px] font-bold text-brand-teal/70 uppercase tracking-widest">
                          {r.version}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-foreground truncate group-hover:text-brand-teal transition-colors tracking-tight mt-1">
                        {r.title}
                      </h4>
                      <div className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest mt-0.5">
                        {r.department}
                      </div>
                    </div>
                  </div>
                ))}
              {!loading && results.length === 0 && (
                <div className="text-center py-12 flex flex-col items-center gap-3">
                  <div className="p-4 rounded-full bg-muted/50">
                    <Search className="w-6 h-6 text-muted-foreground/30" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">No SOPs Found</p>
                    <p className="text-[10px] text-muted-foreground/50 tracking-tight">Try adjusting your search</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
