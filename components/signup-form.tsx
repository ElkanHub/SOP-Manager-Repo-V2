"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { signupUser, signInWithGoogle } from "@/actions/auth"

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

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

  async function handleGoogleLogin() {
    setGoogleLoading(true)
    setError(null)
    const result = await signInWithGoogle()
    if (result && result.error) {
      setError(result.error)
      setGoogleLoading(false)
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
              Sign up with Google
            </>
          )}
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground font-medium">Or continue with email</span>
          </div>
        </div>

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
          <Button type="submit" disabled={loading || googleLoading}>
            {loading ? "Creating..." : "Create Account"}
          </Button>
        </Field>


        {/* login */}
        <div className="flex items-center justify-center">
          <p className="text-sm text-balance text-muted-foreground">
            Already have an account? <Link href="/login" className="text-brand-teal hover:underline">Login</Link>
          </p>
        </div>
      </FieldGroup>
    </form>
  )
}
