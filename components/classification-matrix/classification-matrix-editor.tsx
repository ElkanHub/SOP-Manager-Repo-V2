"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Loader2, Save, Signature, Info } from "lucide-react"
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardFooter,
} from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { updateClassificationMatrixRow } from "@/actions/document-lifecycle"
import type { ClassificationMatrixRow } from "@/types/app.types"

type FlagKey =
    | "require_qa"
    | "require_owning_managers"
    | "require_site_quality_head"
    | "require_revalidation"
    | "require_regulatory_notification"

const FLAGS: { key: FlagKey; label: string; help: string }[] = [
    {
        key: "require_qa",
        label: "QA sign-off",
        help: "A QA manager must always sign a change of this class. (No SOP goes Active without QA.)",
    },
    {
        key: "require_owning_managers",
        label: "Owning managers sign",
        help: "Managers of every affected department are added to the signature set.",
    },
    {
        key: "require_site_quality_head",
        label: "Site Quality Head sign-off",
        help: "Escalates the change to the Site Quality Head for an additional signature.",
    },
    {
        key: "require_revalidation",
        label: "Revalidation required",
        help: "The change cannot close until affected processes/equipment are revalidated.",
    },
    {
        key: "require_regulatory_notification",
        label: "Regulatory notification",
        help: "Flags the change as filing-relevant — regulatory authorities must be notified.",
    },
]

const CLASS_META: Record<
    ClassificationMatrixRow["classification"],
    { title: string; blurb: string; accent: string }
> = {
    minor: {
        title: "Minor",
        blurb: "Typo, formatting, clarification with no procedural effect — reduced signing path.",
        accent: "text-brand-teal",
    },
    major: {
        title: "Major",
        blurb: "Procedural step / role / form change — full review and training-on-change.",
        accent: "text-brand-blue",
    },
    critical: {
        title: "Critical",
        blurb: "Validated-parameter / safety / filing-relevant change — heaviest signing path.",
        accent: "text-destructive",
    },
}

function RowCard({ row }: { row: ClassificationMatrixRow }) {
    const meta = CLASS_META[row.classification]
    const [flags, setFlags] = useState<Record<FlagKey, boolean>>({
        require_qa: row.require_qa,
        require_owning_managers: row.require_owning_managers,
        require_site_quality_head: row.require_site_quality_head,
        require_revalidation: row.require_revalidation,
        require_regulatory_notification: row.require_regulatory_notification,
    })
    const [description, setDescription] = useState(row.description ?? "")
    const [saving, setSaving] = useState(false)

    async function handleSave() {
        setSaving(true)
        const res = await updateClassificationMatrixRow(row.classification, {
            ...flags,
            description,
        })
        setSaving(false)
        if (res.success) {
            toast.success(`${meta.title} classification saved`)
        } else {
            toast.error(res.error)
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${meta.accent}`}>
                    {meta.title}
                </CardTitle>
                <CardDescription>{meta.blurb}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
                <div className="space-y-3">
                    {FLAGS.map((flag) => (
                        <div
                            key={flag.key}
                            className="flex items-start justify-between gap-4 rounded-xl border border-border bg-card p-4"
                        >
                            <div className="space-y-0.5">
                                <Label
                                    htmlFor={`${row.classification}-${flag.key}`}
                                    className="cursor-pointer font-medium"
                                >
                                    {flag.label}
                                </Label>
                                <p className="text-xs text-muted-foreground">{flag.help}</p>
                            </div>
                            <Switch
                                id={`${row.classification}-${flag.key}`}
                                checked={flags[flag.key]}
                                onCheckedChange={(checked) =>
                                    setFlags((prev) => ({ ...prev, [flag.key]: checked }))
                                }
                                disabled={saving}
                            />
                        </div>
                    ))}
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor={`${row.classification}-description`}>Description</Label>
                    <Textarea
                        id={`${row.classification}-description`}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        maxLength={500}
                        rows={3}
                        placeholder="When does a change fall into this class?"
                        disabled={saving}
                    />
                </div>
            </CardContent>
            <CardFooter className="justify-end">
                <Button onClick={handleSave} disabled={saving}>
                    {saving ? (
                        <Loader2 className="size-4 animate-spin" />
                    ) : (
                        <Save className="size-4" />
                    )}
                    Save {meta.title}
                </Button>
            </CardFooter>
        </Card>
    )
}

export function ClassificationMatrixEditor({ rows }: { rows: ClassificationMatrixRow[] }) {
    return (
        <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
            <header className="space-y-2">
                <h1 className="flex items-center gap-2 text-xl font-semibold text-foreground">
                    <Signature className="size-5 text-brand-blue" />
                    Classification Matrix
                </h1>
                <p className="text-sm text-muted-foreground">
                    This matrix <strong className="text-foreground">drives who must sign</strong> a
                    Change Control of each class. When QA classifies a change as minor, major, or
                    critical, the rules below are snapshotted into that change&rsquo;s required
                    signatory set.
                </p>
                <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                    <Info className="mt-0.5 size-4 shrink-0" />
                    <p>
                        The seeded values are <strong>placeholders</strong>. Your organisation&rsquo;s
                        QA must review and ratify each row before relying on it for live changes.
                    </p>
                </div>
            </header>

            {rows.map((row) => (
                <RowCard key={row.classification} row={row} />
            ))}
        </div>
    )
}
