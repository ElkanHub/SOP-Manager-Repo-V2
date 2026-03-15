"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { loginUser } from "@/actions/auth"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const searchParams = useSearchParams()
  const reason = searchParams.get('reason')
  const setup = searchParams.get('setup')

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const result = await loginUser(formData)

    if (result && result.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={cn("flex flex-col gap-6 border-1 border-brand-gray rounded-2xl rounded-tl-none border-t-8  py-6 px-2", className)} {...props}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Login to your account</h1>
          <p className="text-sm text-balance text-muted-foreground">
            Enter your email below to login to your account
          </p>
        </div>

        {reason === 'inactive' && (
          <div className="p-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md">
            Your account has been deactivated. Contact your administrator.
          </div>
        )}

        {setup === 'success' && (
          <div className="p-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md">
            Admin account created successfully. Please log in to complete onboarding.
          </div>
        )}

        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
            {error}
          </div>
        )}

        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input id="email" name="email" type="email" placeholder="m@example.com" required className="bg-background" />
        </Field>
        <Field>
          <div className="flex items-center">
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <a
              href="#"
              className="ml-auto text-sm underline-offset-4 hover:underline"
            >
              Forgot your password?
            </a>
          </div>
          <Input id="password" name="password" type="password" required className="bg-background" />
        </Field>
        <Field>
          <Button type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </Button>
        </Field>
        {/* create account */}
        <div className="flex items-center justify-center">
          <p className="text-sm text-balance text-muted-foreground">
            Don't have an account? <a href="/signup" className="text-brand-teal hover:underline">Create an account</a>
          </p>
        </div>
      </FieldGroup>
    </form>
  )
}
