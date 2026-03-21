"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { broadcastNotice } from "@/actions/pulse"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetFooter,
    SheetClose,
} from "@/components/ui/sheet"
import { Megaphone, Users, Building2, UserCircle, Loader2 } from "lucide-react"

export function NoticeComposer({ profile }: { profile: any }) {
    const [open, setOpen] = useState(false)
    const [content, setContent] = useState("")
    const [audience, setAudience] = useState("department")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function handleSubmit() {
        if (!content.trim()) return

        setLoading(true)
        setError(null)

        const formData = new FormData()
        formData.append('content', content)
        formData.append('audience', audience)

        const result = await broadcastNotice(formData)

        if (result.error) {
            setError(result.error)
            setLoading(false)
        } else {
            setLoading(false)
            setContent("")
            setOpen(false) // Close sheet on success
        }
    }

    // Check if user is an admin to broadcast to 'everyone'
    // For now, anyone can broadcast to their department, admins can hit everyone
    const canBroadcastEveryone = profile?.is_admin

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger render={
                <Button className="w-full text-xs h-9 bg-brand-navy hover:bg-brand-navy/90 text-white shadow-sm" />
            }>
                <Megaphone className="w-3.5 h-3.5 mr-2" /> Broadcast Notice
            </SheetTrigger>
            <SheetContent side="right" className="w-[400px] sm:w-[540px] flex flex-col p-0">
                <div className="pt-1 pb-2 px-2 bg-gradient-to-r from-brand-navy to-brand-blue relative flex flex-col justify-end border-b border-border/10">
                    <div className="absolute inset-0 bg-white/5 mix-blend-overlay"></div>
                    <SheetHeader className="relative z-10 text-left">
                        <SheetTitle className="flex items-center gap-2 text-white text-2xl tracking-tight">
                            <Megaphone className="w-6 h-6 text-brand-teal" />
                            Broadcast Notice
                        </SheetTitle>
                        <SheetDescription className="text-white/70">
                            Send a message to your team or the entire organisation. This will appear in their Pulse sidebar immediately.
                        </SheetDescription>
                    </SheetHeader>
                </div>

                {error && (
                    <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md mb-4">
                        {error}
                    </div>
                )}

                <div className="flex-1 space-y-6 p-6 overflow-y-auto">
                    <div className="space-y-3">
                        <Label>Audience</Label>
                        <RadioGroup defaultValue="department" value={audience} onValueChange={setAudience} className="grid gap-3 shadow-sm border border-border/50 rounded-lg p-1.5 bg-muted/20">
                            <Label
                                htmlFor="aud-dept"
                                className={`flex items-center gap-3 p-3 rounded-md cursor-pointer transition-colors border ${audience === 'department' ? 'bg-background border-brand-teal ring-1 ring-brand-teal shadow-sm' : 'border-transparent hover:bg-muted/50'}`}
                            >
                                <RadioGroupItem value="department" id="aud-dept" className="sr-only" />
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${audience === 'department' ? 'bg-brand-teal/10 text-brand-teal' : 'bg-muted text-muted-foreground'}`}>
                                    <Building2 className="w-4 h-4" />
                                </div>
                                <div className="flex-1">
                                    <div className="font-semibold text-sm">My Department</div>
                                    <div className="text-xs text-muted-foreground">{profile?.department || 'Your team'}</div>
                                </div>
                            </Label>

                            {canBroadcastEveryone && (
                                <Label
                                    htmlFor="aud-all"
                                    className={`flex items-center gap-3 p-3 rounded-md cursor-pointer transition-colors border ${audience === 'everyone' ? 'bg-background border-brand-navy dark:border-blue-400 ring-1 ring-brand-navy dark:ring-blue-400 shadow-sm' : 'border-transparent hover:bg-muted/50'}`}
                                >
                                    <RadioGroupItem value="everyone" id="aud-all" className="sr-only" />
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${audience === 'everyone' ? 'bg-brand-navy/10 dark:bg-brand-navy/30 text-brand-navy dark:text-blue-400' : 'bg-muted text-muted-foreground'}`}>
                                        <Users className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-semibold text-sm">Everyone</div>
                                        <div className="text-xs text-muted-foreground">All users across the company</div>
                                    </div>
                                </Label>
                            )}
                        </RadioGroup>
                    </div>

                    <div className="space-y-3">
                        <Label htmlFor="content">Message</Label>
                        <Textarea
                            id="content"
                            placeholder="Type your message here..."
                            className="min-h-[150px] resize-none focus-visible:ring-1 focus-visible:ring-brand-teal bg-background/50 backdrop-blur-sm"
                            value={content}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
                        />
                        <div className="text-xs text-right text-muted-foreground">
                            {content.length}/500 characters
                        </div>
                    </div>
                </div>

                <SheetFooter className="mt-auto border-t bg-muted/10 p-6">
                    <SheetClose render={<Button variant="outline" className="border-border/50" />}>
                        Cancel
                    </SheetClose>
                    <Button onClick={handleSubmit} disabled={loading || !content.trim()}>
                        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Broadcast Now
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    )
}
