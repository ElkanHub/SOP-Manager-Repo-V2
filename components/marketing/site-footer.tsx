import Link from "next/link"
import { FileCheck2 } from "lucide-react"

const COLS = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "Tour", href: "#tour" },
      { label: "Pricing", href: "#pricing" },
      { label: "FAQ", href: "#faq" },
      { label: "Documentation", href: "/docs" },
    ],
  },
  {
    title: "Get started",
    links: [
      { label: "Contact sales", href: "/contact" },
      { label: "Sign in", href: "/login" },
      { label: "Create account", href: "/signup" },
    ],
  },
]

export default function SiteFooter() {
  return (
    <footer className="border-t border-border bg-muted/30 pt-16 pb-8">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Link href="/" className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg bg-brand-navy text-white">
                <FileCheck2 className="size-4" />
              </span>
              <span className="text-[15px] font-semibold tracking-tight text-brand-navy">
                SOP-Guard Pro
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Quality management for QA-led teams. Procedures in order. Audit ready.
            </p>
            <p className="mt-6 text-xs text-muted-foreground">
              Made for pharma, biotech, and regulated manufacturing.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 lg:col-span-7">
            {COLS.map((col) => (
              <div key={col.title}>
                <p className="text-xs font-semibold tracking-[0.16em] uppercase text-foreground">
                  {col.title}
                </p>
                <ul className="mt-4 space-y-3">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link
                        href={l.href}
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 md:flex-row">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} SOP-Guard Pro. All rights reserved.
          </p>
          <Link
            href="/contact"
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Contact
          </Link>
        </div>
      </div>
    </footer>
  )
}
