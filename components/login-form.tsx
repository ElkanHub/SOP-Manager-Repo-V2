"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
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
import { Separator } from "@/components/ui/separator"
import { loginUser, signInWithGoogle } from "@/actions/auth"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const searchParams = useSearchParams()
  const reason = searchParams.get('reason')
  const setup = searchParams.get('setup')

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

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

  async function handleGoogleLogin() {
    setGoogleLoading(true)
    setError(null)
    const result = await signInWithGoogle()
    if (result && result.error) {
      setError(result.error)
      setGoogleLoading(false)
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
            <Link
              href="/forgot-password"
              className="ml-auto text-sm underline-offset-4 hover:underline"
            >
              Forgot your password?
            </Link>
          </div>
          <Input id="password" name="password" type="password" required className="bg-background" />
        </Field>
        <Field>
          <Button type="submit" disabled={loading || googleLoading}>
            {loading ? "Logging in..." : "Login"}
          </Button>
        </Field>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground font-medium">Or continue with</span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full bg-background"
          onClick={handleGoogleLogin}
          disabled={loading || googleLoading}
        >
          {googleLoading ? (
            "Connecting..."
          ) : (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-2 h-4 w-4"
              >
                <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.96 3.12-2.12 4.08-1.28 1.04-3.12 1.84-5.72 1.84-4.8 0-8.72-3.84-8.72-8.64s3.92-8.64 8.72-8.64c2.56 0 4.4 1.04 5.8 2.32L20.6 3.08C18.64 1.2 15.6 0 12.48 0 6.6 0 1.6 4.8 1.6 11.12S6.6 22.24 12.48 22.24c3.28 0 5.68-1.12 7.6-3.12 1.96-1.92 2.6-4.68 2.6-7.08 0-.64-.04-1.28-.12-1.84h-10.08z" fill="currentColor" />
              </svg>
              Google
            </>
          )}
        </Button>
        {/* create account */}
        <div className="flex items-center justify-center">
          <p className="text-sm text-balance text-muted-foreground">
            Don't have an account? <Link href="/signup" className="text-brand-teal hover:underline">Create an account</Link>
          </p>
        </div>
      </FieldGroup>
    </form>
  )
}
