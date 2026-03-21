"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { FileText, Wrench, ShieldAlert, Search } from "lucide-react"

export function ReferencePicker({ isOpen, onClose, onSelect }: { isOpen: boolean, onClose: () => void, onSelect: (ref: any) => void }) {
  const [search, setSearch] = useState("")

  // Stub for UI, actual search would dynamically fetch from supabaase
  const results = [
    { type: "sop", id: "550e8400-e29b-41d4-a716-446655440000", title: "SOP-100: Cleanroom Gowning", status: "active", version: "v1.2", department: "QA" }
  ].filter(r => r.title.toLowerCase().includes(search.toLowerCase()))

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[420px] p-0 overflow-hidden border-border/40 shadow-2xl bg-gradient-to-b from-background to-background/95">
        <DialogHeader className="p-6 pb-4 bg-gradient-to-r from-brand-teal/10 via-brand-navy/5 to-transparent border-b border-border/50">
          <DialogTitle className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <div className="p-2 rounded-lg bg-brand-teal/10">
               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-teal"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.51a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
            </div>
            Attach Protocol Reference
          </DialogTitle>
        </DialogHeader>
        <div className="p-6 pt-4 space-y-6">
           <div className="relative group">
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground/60 group-focus-within:text-brand-teal transition-colors" />
              <Input 
                placeholder="Search SOPs, Equipment, Reports..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-muted/30 border-border/50 focus:border-brand-teal/50 focus:ring-brand-teal/20 transition-all pl-10 h-11 font-medium"
              />
           </div>
           
           <div className="space-y-3">
             <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">Search Results</label>
             <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-2 -mr-2 custom-scrollbar">
               {results.map(r => (
                 <div 
                   key={r.id} 
                   className="flex items-center gap-4 p-4 rounded-2xl border border-border/40 bg-card/30 hover:bg-brand-teal/[0.03] hover:border-brand-teal/30 cursor-pointer transition-all group relative overflow-hidden"
                   onClick={() => onSelect(r)}
                 >
                   <div className="absolute top-0 right-0 p-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-teal/40 group-hover:bg-brand-teal transition-colors" />
                   </div>
                   <div className="p-2.5 rounded-xl bg-gradient-to-br from-brand-teal/20 to-brand-navy/10 text-brand-teal group-hover:scale-105 transition-transform border border-brand-teal/10">
                     <FileText className="w-5 h-5" />
                   </div>
                   <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-foreground truncate group-hover:text-brand-teal transition-colors tracking-tight">{r.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest bg-muted/50 px-1.5 py-0.5 rounded-md">{r.type}</span>
                        <span className="text-[9px] font-bold text-brand-teal/60 uppercase tracking-widest">{r.version} · {r.department}</span>
                      </div>
                   </div>
                 </div>
               ))}
               {results.length === 0 && (
                   <div className="text-center py-12 flex flex-col items-center gap-3">
                       <div className="p-4 rounded-full bg-muted/50">
                          <Search className="w-6 h-6 text-muted-foreground/30" />
                       </div>
                       <div className="space-y-1">
                           <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">No Matches Found</p>
                           <p className="text-[10px] text-muted-foreground/50 tracking-tight">Try adjusting your search parameters</p>
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
