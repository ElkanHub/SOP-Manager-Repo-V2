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
import { signupUser } from "@/actions/auth"

export function SignupForm({
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
    setSuccess(false)

    const formData = new FormData(e.currentTarget)
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirm-password') as string

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      setLoading(false)
      return
    }

    const result = await signupUser(formData)

    if (result && result.error) {
      setError(result.error)
      setLoading(false)
    } else if (result && result.success) {
      setSuccess(true)
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className={cn("flex flex-col gap-6 text-center", className)}>
        <h1 className="text-2xl font-bold">Check your email</h1>
        <p className="text-muted-foreground">
          We've sent you an email with a link to confirm your account.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className={cn("flex flex-col gap-6 border-1 border-brand-gray rounded-2xl rounded-tl-none border-t-8  py-6 px-2 shadow-md", className)} {...props}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Create your account</h1>
          <p className="text-sm text-balance text-muted-foreground">
            Fill in the form below to create your account
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
          <Input id="email" name="email" type="email" placeholder="m@example.com" required className="bg-background" />
        </Field>
        <Field>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input id="password" name="password" type="password" required className="bg-background" />
          <FieldDescription>Must be at least 8 characters long.</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
          <Input id="confirm-password" name="confirm-password" type="password" required className="bg-background" />
        </Field>
        <Field>
          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Account"}
          </Button>
        </Field>
        {/* login */}
        <div className="flex items-center justify-center">
          <p className="text-sm text-balance text-muted-foreground">
            Already have an account? <a href="/login" className="text-brand-teal hover:underline">Login</a>
          </p>
        </div>
      </FieldGroup>
    </form>
  )
}
