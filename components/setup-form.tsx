"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { createFirstAdmin } from "@/actions/auth"

export function SetupForm({
    className,
    ...props
}: React.ComponentProps<"form">) {
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const formData = new FormData(e.currentTarget)
        const result = await createFirstAdmin(formData)

        if (result && result.error) {
            setError(result.error)
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className={cn("flex flex-col gap-6", className)} {...props}>
            <FieldGroup>
                <div className="flex flex-col items-center gap-1 text-center">
                    <h1 className="text-2xl font-bold">Initial Setup</h1>
                    <p className="text-sm text-balance text-muted-foreground">
                        Create the first administrator account
                    </p>
                </div>

                {error && (
                    <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                        {error}
                    </div>
                )}

                <Field>
                    <FieldLabel htmlFor="name">Full Name</FieldLabel>
                    <Input id="name" name="name" type="text" placeholder="John Doe" required className="bg-background" />
                </Field>
                <Field>
                    <FieldLabel htmlFor="email">Email</FieldLabel>
                    <Input id="email" name="email" type="email" placeholder="admin@example.com" required className="bg-background" />
                </Field>
                <Field>
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <Input id="password" name="password" type="password" required className="bg-background" />
                    <FieldDescription>Must be at least 12 characters long.</FieldDescription>
                </Field>
                <Field>
                    <FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
                    <Input id="confirm-password" name="confirm-password" type="password" required className="bg-background" />
                </Field>
                <Field>
                    <Button type="submit" disabled={loading}>
                        {loading ? "Creating..." : "Create Admin Account"}
                    </Button>
                </Field>
            </FieldGroup>
        </form>
    )
}
