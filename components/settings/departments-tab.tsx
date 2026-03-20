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
import { Loader2, Plus, Pencil, Trash2, ShieldCheck } from "lucide-react"
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
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-semibold text-foreground">Departments</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{depts.length} department(s) configured</p>
                </div>
                <Button size="sm" onClick={handleAddOpen}>
                    <Plus className="w-4 h-4 mr-1" /> Add Department
                </Button>
            </div>

            <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-muted-foreground">
                        <tr>
                            <th className="text-left px-4 py-3 font-medium">Name</th>
                            <th className="text-left px-4 py-3 font-medium">Colour</th>
                            <th className="text-left px-4 py-3 font-medium">Type</th>
                            <th className="text-left px-4 py-3 font-medium">Created</th>
                            <th className="px-4 py-3" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {depts.map((dept) => (
                            <tr key={dept.id} className="bg-background hover:bg-muted/30 transition-colors">
                                <td className="px-4 py-3 font-medium text-foreground">{dept.name}</td>
                                <td className="px-4 py-3">
                                    {editingId === dept.id ? (
                                        <div className="flex items-center gap-2">
                                            <div className="flex gap-1">
                                                {COLOUR_SWATCHES.map((s) => (
                                                    <button
                                                        key={s.value}
                                                        type="button"
                                                        className={`w-5 h-5 rounded-full border-2 transition-all ${editColour === s.value ? 'border-foreground scale-125' : 'border-transparent'}`}
                                                        style={{ backgroundColor: s.hex }}
                                                        onClick={() => setEditColour(s.value)}
                                                        aria-label={s.label}
                                                    />
                                                ))}
                                            </div>
                                            <Button size="sm" variant="outline" onClick={() => handleEditColour(dept.id)} disabled={isPending}>
                                                {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
                                            </Button>
                                            <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <ColourDot colour={dept.colour} />
                                            <span className="capitalize text-muted-foreground text-xs">{dept.colour}</span>
                                        </div>
                                    )}
                                </td>
                                <td className="px-4 py-3">
                                    {dept.is_qa ? (
                                        <Badge variant="outline" className="border-brand-teal text-brand-teal gap-1">
                                            <ShieldCheck className="w-3 h-3" /> QA
                                        </Badge>
                                    ) : (
                                        <Badge variant="secondary">Standard</Badge>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-muted-foreground text-xs">
                                    {new Date(dept.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-1 justify-end">
                                        <Button
                                            variant="ghost" size="icon" className="h-7 w-7"
                                            onClick={() => { setEditingId(dept.id); setEditColour(dept.colour) }}
                                            disabled={editingId === dept.id}
                                            aria-label={`Edit ${dept.name} colour`}
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button
                                            variant="ghost" size="icon"
                                            className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                            onClick={() => { setDeleteError(null); setDeleteTarget(dept) }}
                                            aria-label={`Delete ${dept.name}`}
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {depts.length === 0 && (
                    <div className="py-10 text-center text-muted-foreground text-sm">No departments configured.</div>
                )}
            </div>

            {/* Add Department Dialog */}
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader><DialogTitle>Add Department</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="new-dept-name">Name <span className="text-red-500">*</span></Label>
                            <Input id="new-dept-name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Engineering" />
                        </div>
                        <div className="space-y-2">
                            <Label>Colour</Label>
                            <div className="flex gap-2 flex-wrap">
                                {COLOUR_SWATCHES.map((s) => (
                                    <button
                                        key={s.value}
                                        type="button"
                                        className={`w-7 h-7 rounded-full border-2 transition-all ${newColour === s.value ? 'border-foreground scale-110 shadow-sm' : 'border-transparent'}`}
                                        style={{ backgroundColor: s.hex }}
                                        onClick={() => setNewColour(s.value)}
                                        aria-label={s.label}
                                    />
                                ))}
                            </div>
                        </div>
                        {addError && <p className="text-sm text-red-600 dark:text-red-400">{addError}</p>}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
                        <Button onClick={handleAdd} disabled={isPending}>
                            {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            Add Department
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
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            {deleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
