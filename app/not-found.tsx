import Link from "next/link"
import { Logo } from "@/components/ui/logo"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background px-6 text-center">
      <Logo className="h-12 opacity-90" />
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">404</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Page not found</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          The page you’re looking for doesn’t exist or may have been moved.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Button render={<Link href="/dashboard" />}>Go to dashboard</Button>
        <Button variant="outline" render={<Link href="/" />}>
          Go home
        </Button>
      </div>
    </div>
  )
}
