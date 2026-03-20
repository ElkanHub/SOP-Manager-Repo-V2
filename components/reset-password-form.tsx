"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { updatePassword } from "@/actions/auth"
import { CheckCircle2, ArrowRight } from "lucide-react"
import Link from "next/link"

export function ResetPasswordForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const result = await updatePassword(formData)

    if (result && result.error) {
      setError(result.error)
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className={cn("flex flex-col gap-6 border-1 border-brand-gray rounded-2xl rounded-tl-none border-t-8 py-6 px-4 text-center", className)}>
        <div className="flex justify-center">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
        </div>
        <h1 className="text-2xl font-bold">Password Reset Complete</h1>
        <p className="text-sm text-balance text-muted-foreground">
          Your password has been successfully updated. You can now log in with your new password.
        </p>
        <Link 
          href="/login"
          className={cn(buttonVariants({ variant: "default" }), "mt-4 bg-brand-teal hover:bg-teal-600")}
        >
            Go to Login
            <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className={cn("flex flex-col gap-6 border-1 border-brand-gray rounded-2xl rounded-tl-none border-t-8 py-6 px-4", className)} {...props}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Create New Password</h1>
          <p className="text-sm text-balance text-muted-foreground">
            Enter your new password below. It must be at least 12 characters long.
          </p>
        </div>

        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
            {error}
          </div>
        )}

        <Field>
          <FieldLabel htmlFor="password">New Password</FieldLabel>
          <Input id="password" name="password" type="password" required className="bg-background" />
        </Field>

        <Field>
          <FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
          <Input id="confirm-password" name="confirm-password" type="password" required className="bg-background" />
        </Field>
        
        <Field>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Updating password..." : "Reset Password"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  )
}
