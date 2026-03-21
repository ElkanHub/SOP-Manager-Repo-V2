"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { FileText, Wrench, ShieldAlert } from "lucide-react"

export function ReferencePicker({ isOpen, onClose, onSelect }: { isOpen: boolean, onClose: () => void, onSelect: (ref: any) => void }) {
  const [search, setSearch] = useState("")

  // Stub for UI, actual search would dynamically fetch from supabaase
  const results = [
    { type: "sop", id: "550e8400-e29b-41d4-a716-446655440000", title: "SOP-100: Cleanroom Gowning", status: "active", version: "v1.2", department: "QA" }
  ].filter(r => r.title.toLowerCase().includes(search.toLowerCase()))

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Attach Reference</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 mt-2">
           <Input 
             placeholder="Search SOPs, Equipment, Change Controls..." 
             value={search}
             onChange={(e) => setSearch(e.target.value)}
           />
           <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto">
             {results.map(r => (
               <div 
                 key={r.id} 
                 className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer"
                 onClick={() => onSelect(r)}
               >
                 <FileText className="w-5 h-5 text-brand-teal" />
                 <div className="flex-1 min-w-0">
                    <h4 className="text-[13px] font-semibold text-foreground truncate">{r.title}</h4>
                    <p className="text-[11px] text-muted-foreground uppercase">{r.type} · {r.status} · {r.department}</p>
                 </div>
               </div>
             ))}
             {results.length === 0 && (
                 <div className="text-center p-4 text-sm text-muted-foreground">No matches found.</div>
             )}
           </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
