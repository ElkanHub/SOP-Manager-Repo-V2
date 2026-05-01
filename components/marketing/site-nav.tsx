import Link from "next/link"
import { ArrowRight, FileCheck2 } from "lucide-react"

export default function SiteNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-transparent bg-background/75 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-lg bg-brand-navy text-white">
            <FileCheck2 className="size-4" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-brand-navy">
            SOP-Guard Pro
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <a href="#features" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Features
          </a>
          <a href="#tour" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Tour
          </a>
          <a href="#pricing" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Pricing
          </a>
          <a href="#faq" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            FAQ
          </a>
          <Link href="/docs" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Docs
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-navy px-4 text-sm font-medium text-white shadow-sm transition-all hover:bg-brand-navy/90 active:translate-y-px"
          >
            Get started
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </header>
  )
}
