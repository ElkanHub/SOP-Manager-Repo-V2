"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
    AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
    AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog"
import { Loader2, Plus, Pencil, Trash2, ShieldCheck, AlertCircle } from "lucide-react"
import { addDepartment, updateDepartmentColour, deleteDepartment } from "@/actions/settings"
import type { Department } from "@/types/app.types"

const COLOUR_SWATCHES = [
    { label: "blue", value: "blue", hex: "#1A5EA8" },
    { label: "teal", value: "teal", hex: "#00C2A8" },
    { label: "orange", value: "orange", hex: "#EA580C" },
    { label: "green", value: "green", hex: "#059669" },
    { label: "purple", value: "purple", hex: "#7C3AED" },
    { label: "red", value: "red", hex: "#DC2626" },
    { label: "amber", value: "amber", hex: "#D97706" },
    { label: "slate", value: "slate", hex: "#475569" },
]

function ColourDot({ colour }: { colour: string }) {
    const swatch = COLOUR_SWATCHES.find((s) => s.value === colour)
    return (
        <span
            className="inline-block w-4 h-4 rounded-full border border-border"
            style={{ backgroundColor: swatch?.hex ?? "#64748b" }}
        />
    )
}

interface DepartmentsTabProps {
    initialDepts: Department[]
}

export function DepartmentsTab({ initialDepts }: DepartmentsTabProps) {
    const [depts, setDepts] = useState<Department[]>(initialDepts)
    const [addOpen, setAddOpen] = useState(false)
    const [newName, setNewName] = useState("")
    const [newColour, setNewColour] = useState("blue")
    const [addError, setAddError] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()

    // Edit colour
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editColour, setEditColour] = useState("blue")

    // Delete
    const [deleteTarget, setDeleteTarget] = useState<Department | null>(null)
    const [deleteError, setDeleteError] = useState<string | null>(null)
    const [deleting, setDeleting] = useState(false)

    function handleAddOpen() {
        setNewName("")
        setNewColour("blue")
        setAddError(null)
        setAddOpen(true)
    }

    function handleAdd() {
        if (!newName.trim()) { setAddError("Name is required."); return }
        startTransition(async () => {
            setAddError(null)
            const result = await addDepartment(newName.trim(), newColour)
            if (!result.success) { setAddError(result.error); return }
            // optimistic: re-fetch would need a router.refresh() call but we just close and let page revalidate
            setAddOpen(false)
            setDepts((prev) => [
                ...prev,
                { id: crypto.randomUUID(), name: newName.trim(), colour: newColour, is_qa: false, created_at: new Date().toISOString() }
            ])
        })
    }

    function handleEditColour(id: string) {
        startTransition(async () => {
            const result = await updateDepartmentColour(id, editColour)
            if (!result.success) return
            setDepts((prev) => prev.map((d) => d.id === id ? { ...d, colour: editColour } : d))
            setEditingId(null)
        })
    }

    async function handleDelete() {
        if (!deleteTarget) return
        setDeleting(true)
        setDeleteError(null)
        const result = await deleteDepartment(deleteTarget.id)
        setDeleting(false)
        if (!result.success) { setDeleteError(result.error); return }
        setDepts((prev) => prev.filter((d) => d.id !== deleteTarget.id))
        setDeleteTarget(null)
    }

    return (
        <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:justify-between border-b border-border/40 pb-6">
                <div>
                    <h3 className="text-2xl font-bold tracking-tight text-foreground">Departmental Infrastructure</h3>
                    <p className="text-xs font-bold uppercase tracking-widest text-brand-teal/80 mt-1">{depts.length} Active Segment(s) Configured</p>
                </div>
                <Button size="sm" onClick={handleAddOpen} className="bg-brand-navy hover:bg-brand-navy/90 text-white shadow-xl font-bold px-6 transition-all active:scale-95">
                    <Plus className="w-4 h-4 mr-2" /> Provision New Department
                </Button>
            </div>

            <div className="rounded-2xl border border-border/40 overflow-hidden shadow-sm bg-background/50 backdrop-blur-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[650px]">
                        <thead className="bg-muted/30 text-muted-foreground border-b border-border/40">
                            <tr>
                                <th className="text-left px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em]">Department Name</th>
                                <th className="text-left px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em]">Visual Identifier</th>
                                <th className="text-left px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em]">Segment Class</th>
                                <th className="text-left px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em]">Provisioned Date</th>
                                <th className="px-6 py-4" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/20">
                            {depts.map((dept) => (
                                <tr key={dept.id} className="group hover:bg-muted/10 transition-colors">
                                    <td className="px-6 py-4">
                                        <span className="font-bold text-foreground text-sm tracking-tight">{dept.name}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {editingId === dept.id ? (
                                            <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2 duration-200">
                                                <div className="flex gap-1.5 p-1.5 rounded-lg bg-muted/30 border border-border/40">
                                                    {COLOUR_SWATCHES.map((s) => (
                                                        <button
                                                            key={s.value}
                                                            type="button"
                                                            className={`w-5 h-5 rounded-full border-2 ring-offset-2 ring-offset-background transition-all hover:scale-110 ${editColour === s.value ? 'border-foreground ring-1 ring-foreground/20' : 'border-transparent opacity-60 hover:opacity-100'}`}
                                                            style={{ backgroundColor: s.hex }}
                                                            onClick={() => setEditColour(s.value)}
                                                            aria-label={s.label}
                                                        />
                                                    ))}
                                                </div>
                                                <div className="flex gap-1">
                                                    <Button size="sm" variant="outline" onClick={() => handleEditColour(dept.id)} disabled={isPending} className="h-8 font-bold text-[10px] uppercase tracking-widest px-3 border-brand-teal/30 text-brand-teal hover:bg-brand-teal/5">
                                                        {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save Changes"}
                                                    </Button>
                                                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-8 font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Cancel</Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2.5">
                                                <div className="relative">
                                                    <ColourDot colour={dept.colour} />
                                                    <div className="absolute inset-0 rounded-full animate-pulse-slow opacity-20" style={{ backgroundColor: COLOUR_SWATCHES.find(s => s.value === dept.colour)?.hex }} />
                                                </div>
                                                <span className="capitalize font-bold text-muted-foreground text-[10px] tracking-widest">{dept.colour}</span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {dept.is_qa ? (
                                            <Badge className="bg-brand-teal/10 hover:bg-brand-teal/15 text-brand-teal border-brand-teal/20 gap-1.5 px-2.5 py-0.5 h-6 font-bold text-[10px] rounded-full">
                                                <ShieldCheck className="w-3 h-3" /> COMPLIANCE (QA)
                                            </Badge>
                                        ) : (
                                            <Badge variant="secondary" className="bg-muted hover:bg-muted/80 text-muted-foreground border-border/40 font-bold text-[10px] rounded-full px-2.5 py-0.5 h-6">
                                                OPERATIONAL
                                            </Badge>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-muted-foreground font-mono text-[10px] font-bold">
                                            {new Date(dept.created_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                                variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                onClick={() => { setEditingId(dept.id); setEditColour(dept.colour) }}
                                                disabled={editingId === dept.id}
                                            >
                                                <Pencil className="w-3.5 h-3.5" />
                                            </Button>
                                            <Button
                                                variant="ghost" size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                                                onClick={() => { setDeleteError(null); setDeleteTarget(dept) }}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {depts.length === 0 && (
                    <div className="py-10 text-center text-muted-foreground text-sm">No departments configured.</div>
                )}
            </div>

            {/* Add Department Dialog */}
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogContent className="sm:max-w-md p-0 overflow-hidden border-border/40 shadow-2xl bg-gradient-to-b from-background to-background/95">
                    <DialogHeader className="p-6 pb-4 bg-gradient-to-r from-brand-teal/10 via-brand-navy/5 to-transparent border-b border-border/50">
                        <DialogTitle className="text-xl font-bold tracking-tight text-foreground">Provision Department</DialogTitle>
                    </DialogHeader>
                    <div className="p-6 space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="new-dept-name" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Department Nomenclature <span className="text-red-500">*</span></Label>
                            <Input id="new-dept-name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Clinical Research & Development" className="bg-muted/30 border-border/50 focus:border-brand-teal/50 focus:ring-brand-teal/20 transition-all" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Identity Colour Assignment</Label>
                            <div className="flex gap-2.5 flex-wrap p-3 rounded-2xl border border-dashed border-border/50 bg-muted/10">
                                {COLOUR_SWATCHES.map((s) => (
                                    <button
                                        key={s.value}
                                        type="button"
                                        className={`w-8 h-8 rounded-full border-2 ring-offset-2 ring-offset-background transition-all hover:scale-110 ${newColour === s.value ? 'border-foreground ring-2 ring-foreground/20 shadow-md' : 'border-transparent opacity-80 hover:opacity-100'}`}
                                        style={{ backgroundColor: s.hex }}
                                        onClick={() => setNewColour(s.value)}
                                        aria-label={s.label}
                                    />
                                ))}
                            </div>
                        </div>
                        {addError && (
                            <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 text-destructive text-xs font-bold animate-in fade-in slide-in-from-top-1">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                {addError}
                            </div>
                        )}
                    </div>
                    <DialogFooter className="p-6 pt-2 border-t border-border/40 bg-muted/10 flex-col-reverse sm:flex-row gap-3">
                        <Button variant="ghost" onClick={() => setAddOpen(false)} className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground">Cancel</Button>
                        <Button onClick={handleAdd} disabled={isPending} className="bg-brand-navy hover:bg-brand-navy/90 text-white shadow-xl font-bold px-8 rounded-lg transition-all active:scale-95 disabled:opacity-30 disabled:grayscale">
                            {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "PROVISION SEGMENT"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirm Alert */}
            <AlertDialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null) }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete &quot;{deleteTarget?.name}&quot;?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the department. This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    {deleteError && <p className="text-sm text-red-600 dark:text-red-400 px-4">{deleteError}</p>}
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={deleting}
                            className="bg-red-600 hover:bg-red-700 text-white shadow-lg transition-all active:scale-95 disabled:opacity-30 disabled:grayscale"
                        >
                            {deleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            Delete Segment
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
