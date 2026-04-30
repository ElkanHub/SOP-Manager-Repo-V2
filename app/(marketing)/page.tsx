import Image from "next/image"
import Link from "next/link"
import {
  ArrowRight,
  Calendar,
  ChevronDown,
  ClipboardCheck,
  FileCheck2,
  FlaskConical,
  Sparkles,
  ShieldCheck,
  UserCog,
  Wrench,
} from "lucide-react"

import TabbedBenefits from "@/components/marketing/tabbed-benefits"
import TourTabs from "@/components/marketing/tour-tabs"
import PricingSection from "@/components/marketing/pricing-section"

export default function LandingPage() {
  return (
    <>
      <SiteNav />
      <Hero />
      <TrustStrip />
      <TabbedBenefits />
      <TourTabs />
      <RolesGrid />
      <PricingSection />
      <FAQ />
      <FinalCTAGrid />
      <SiteFooter />
    </>
  )
}

/* ---------------------------------------------------------------- Top nav */

function SiteNav() {
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

/* ------------------------------------------------------------------ Hero */

function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-brand-navy">
      <Image
        src="/marketing/hero-dashboard.webp"
        alt="SOP-Guard Pro dashboard showing active SOPs, pending approvals, PM compliance, and change controls."
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-r from-brand-navy via-brand-navy/85 to-brand-navy/10 sm:via-brand-navy/70 sm:to-transparent lg:from-brand-navy/95 lg:via-brand-navy/55 lg:to-transparent"
      />

      <div className="relative mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8 lg:py-44 xl:py-52">
        <div className="max-w-xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold tracking-[0.12em] uppercase text-white/85 backdrop-blur-sm">
            <Sparkles className="size-3" />
            Quality management, reimagined
          </span>

          <h1 className="mt-6 text-5xl leading-[1.05] font-semibold tracking-tight text-balance text-white sm:text-6xl lg:text-[68px]">
            Your procedures, in&nbsp;order.
            <br />
            <span className="text-brand-teal">Your audit, ready.</span>
          </h1>

          <p className="mt-6 max-w-lg text-lg leading-relaxed text-white/75">
            Manage SOPs, approvals, equipment PMs, and training from one place — with a real-time
            Pulse that surfaces what needs your attention next.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/signup"
              className="group inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 text-sm font-semibold text-brand-navy shadow-[0_12px_30px_-10px_rgba(0,0,0,0.5)] transition-all hover:bg-white/90 active:translate-y-px"
            >
              Get started
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/30 bg-white/5 px-6 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:border-white/50 hover:bg-white/10"
            >
              <Calendar className="size-4" />
              Book a demo
            </Link>
            <Link
              href="/login"
              className="inline-flex h-12 items-center px-2 text-sm font-medium text-white/75 transition-colors hover:text-white"
            >
              Sign in
            </Link>
          </div>

          <p className="mt-8 text-sm text-white/65">
            <span className="font-medium text-white">No credit card required.</span> Built for QA-led
            teams in pharma, biotech, and food manufacturing.
          </p>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------ Trust strip */

function TrustStrip() {
  return (
    <section className="border-y border-border/60 bg-muted/30">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-6 text-center md:flex-row md:text-left lg:px-8">
        <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
          Trusted by quality-led teams
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-sm font-medium text-muted-foreground/80">
          <span>Pharmaceutical</span>
          <span className="hidden size-1 rounded-full bg-muted-foreground/40 md:inline-block" />
          <span>Biotech</span>
          <span className="hidden size-1 rounded-full bg-muted-foreground/40 md:inline-block" />
          <span>Food &amp; Beverage</span>
          <span className="hidden size-1 rounded-full bg-muted-foreground/40 md:inline-block" />
          <span>Medical Devices</span>
          <span className="hidden size-1 rounded-full bg-muted-foreground/40 md:inline-block" />
          <span>Cosmetics</span>
        </div>
      </div>
    </section>
  )
}

/* ----------------------------------------------------------------- Roles */

function RolesGrid() {
  const roles = [
    {
      icon: ShieldCheck,
      title: "QA Manager",
      body: "Approval authority, signature audits, deviation visibility — all in one queue. The role the system was built around.",
      accent: "navy",
    },
    {
      icon: Wrench,
      title: "Manufacturing Lead",
      body: "Active SOPs at the line, equipment PMs on the calendar, training compliance tracked per operator.",
      accent: "blue",
    },
    {
      icon: FlaskConical,
      title: "Lab Tech / Operator",
      body: "Quick search, mobile sign-offs, training assignments. The interface stays out of your way.",
      accent: "teal",
    },
    {
      icon: ClipboardCheck,
      title: "Auditor / Inspector",
      body: "Full audit trail, signature certificates, immutable history. Pull a report and walk into the inspection cold.",
      accent: "navy",
    },
  ] as const

  return (
    <section id="roles" className="mx-auto max-w-7xl px-6 py-24 lg:px-8 lg:py-32">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold tracking-[0.18em] text-brand-blue uppercase">
          Built for every role
        </p>
        <h2 className="mt-3 text-4xl font-semibold tracking-tight text-balance text-brand-navy sm:text-5xl">
          One workspace. Every team on the floor.
        </h2>
        <p className="mt-4 text-lg text-muted-foreground">
          Tailored views for the people doing the work — and an immutable audit trail for the
          people checking it.
        </p>
      </div>

      <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {roles.map((role) => {
          const Icon = role.icon
          return (
            <div
              key={role.title}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card p-7 transition-all hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-soft"
            >
              <div
                className={
                  role.accent === "blue"
                    ? "grid size-11 place-items-center rounded-xl bg-brand-blue/10 text-brand-blue ring-1 ring-brand-blue/20"
                    : role.accent === "teal"
                    ? "grid size-11 place-items-center rounded-xl bg-brand-teal/10 text-brand-teal ring-1 ring-brand-teal/20"
                    : "grid size-11 place-items-center rounded-xl bg-brand-navy/5 text-brand-navy ring-1 ring-brand-navy/10"
                }
              >
                <Icon className="size-5" />
              </div>
              <h3 className="mt-6 text-lg font-semibold text-brand-navy">
                {role.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{role.body}</p>
            </div>
          )
        })}
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------- FAQ */

function FAQ() {
  const items = [
    {
      q: "How does SOP-Guard handle versioning and version control?",
      a: "SOPs follow a major-minor pattern (e.g., v3.2 → v3.3 for revisions, v4.0 for major rewrites). When a Change Control opens against an SOP, the document is locked until completion — no parallel edits, no race conditions. Every version is preserved with its approval signatures, so you can always see what was effective at any point in time.",
    },
    {
      q: "Can multiple departments share the same SOP library?",
      a: "Yes — one library, scoped per department. The default Library view filters to your department's SOPs. Search exposes all active SOPs across the organization (so nothing gets lost), but cross-department SOPs render read-only — your team can't accidentally modify someone else's work. RLS enforces this at the database layer, not just the UI.",
    },
    {
      q: "What happens during a regulatory inspection? How fast can we pull records?",
      a: "Every SOP version, every approval signature, every training acknowledgment, and every Change Control has an immutable audit trail. Reports can be pulled in seconds — not days. Signature certificates reference stored signature images and live in tables with no UPDATE/DELETE policies, so the audit trail can't be tampered with.",
    },
    {
      q: "Is signature capture compliant with 21 CFR Part 11?",
      a: "Yes. Signatures are user-authenticated, time-stamped, and bound to specific records via immutable certificates. Mobile signing uses one-time tokens — no shared logins. The combination of authenticated capture, immutable storage, and full audit trail satisfies Part 11 requirements for closed systems.",
    },
    {
      q: "Can we import existing SOPs from Word documents?",
      a: "Yes — upload .docx and SOP-Guard renders them read-only in-app via Mammoth.js, sanitized with DOMPurify. There's no in-app editor by design: what you upload is what your team sees, every time. Versioning and approval workflows run on top of the uploaded document.",
    },
    {
      q: "How do you handle user offboarding without breaking the audit trail?",
      a: "Profiles are never hard-deleted. Offboarding sets the user inactive, but their FK references in audit logs, signatures, acknowledgments, and Pulse items stay valid forever. The signature on a 2019 SOP will still resolve to the same person 10 years later — even if they've left the company.",
    },
  ]

  return (
    <section id="faq" className="mx-auto max-w-3xl px-6 py-24 lg:px-8 lg:py-32">
      <div className="text-center">
        <p className="text-xs font-semibold tracking-[0.18em] text-brand-blue uppercase">
          Frequently asked questions
        </p>
        <h2 className="mt-3 text-4xl font-semibold tracking-tight text-balance text-brand-navy sm:text-5xl">
          Answers, not corporate fog.
        </h2>
        <p className="mt-4 text-lg text-muted-foreground">
          Real questions from QA managers we&apos;ve talked to. Real answers from how the system
          actually works.
        </p>
      </div>

      <div className="mt-12 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
        {items.map((item, i) => (
          <details
            key={i}
            className="group [&_summary::-webkit-details-marker]:hidden"
          >
            <summary className="flex cursor-pointer items-center justify-between gap-4 p-6 transition-colors hover:bg-muted/40">
              <span className="text-base font-semibold text-foreground">{item.q}</span>
              <ChevronDown className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <div className="px-6 pb-6">
              <p className="text-[15px] leading-relaxed text-muted-foreground">{item.a}</p>
            </div>
          </details>
        ))}
      </div>

      <p className="mt-10 text-center text-sm text-muted-foreground">
        Have a question we didn&apos;t answer?{" "}
        <Link href="/contact" className="font-medium text-brand-blue hover:underline">
          Talk to our compliance team
        </Link>
        .
      </p>
    </section>
  )
}

/* ---------------------------------------------------------- Final CTA grid */

function FinalCTAGrid() {
  const cards = [
    {
      icon: Sparkles,
      title: "Try free for 14 days",
      body: "Full access. No credit card. No call required.",
      cta: "Start trial",
      href: "/signup",
      accent: "blue" as const,
    },
    {
      icon: Calendar,
      title: "Book a guided demo",
      body: "See your workflows in action with a compliance specialist.",
      cta: "Schedule a call",
      href: "/contact",
      accent: "teal" as const,
    },
    {
      icon: UserCog,
      title: "Talk to compliance",
      body: "Pharma, biotech, medical devices — let's discuss validation packages.",
      cta: "Contact sales",
      href: "/contact",
      accent: "navy" as const,
    },
  ]

  return (
    <section className="border-t border-border/60 bg-background py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-4xl font-semibold tracking-tight text-balance text-brand-navy sm:text-5xl">
            Get started.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Pick the path that fits — they all lead to a tighter, calmer floor.
          </p>
        </div>
        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {cards.map((card) => {
            const Icon = card.icon
            return (
              <Link
                key={card.title}
                href={card.href}
                className="group relative overflow-hidden rounded-3xl border border-border bg-card p-8 transition-all hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-soft"
              >
                <div
                  className={
                    card.accent === "blue"
                      ? "grid size-12 place-items-center rounded-xl bg-brand-blue/10 text-brand-blue"
                      : card.accent === "teal"
                      ? "grid size-12 place-items-center rounded-xl bg-brand-teal/10 text-brand-teal"
                      : "grid size-12 place-items-center rounded-xl bg-brand-navy/10 text-brand-navy"
                  }
                >
                  <Icon className="size-6" />
                </div>
                <h3 className="mt-6 text-xl font-semibold text-brand-navy">
                  {card.title}
                </h3>
                <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{card.body}</p>
                <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-blue transition-all group-hover:gap-2">
                  {card.cta}
                  <ArrowRight className="size-4" />
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ Footer */

function SiteFooter() {
  const cols = [
    {
      title: "Product",
      links: [
        { label: "Features", href: "#features" },
        { label: "Tour", href: "#tour" },
        { label: "Pricing", href: "#pricing" },
        { label: "FAQ", href: "#faq" },
        { label: "Changelog", href: "/docs/changelog" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "About", href: "/about" },
        { label: "Customers", href: "/customers" },
        { label: "Careers", href: "/careers" },
        { label: "Contact", href: "/contact" },
      ],
    },
    {
      title: "Resources",
      links: [
        { label: "Documentation", href: "/docs" },
        { label: "Help center", href: "/help" },
        { label: "Templates", href: "/templates" },
        { label: "Webinars", href: "/webinars" },
      ],
    },
    {
      title: "Legal",
      links: [
        { label: "Privacy", href: "/privacy" },
        { label: "Terms", href: "/terms" },
        { label: "Security", href: "/security" },
        { label: "GDPR", href: "/gdpr" },
      ],
    },
  ]
  return (
    <footer className="border-t border-border bg-muted/30 pt-16 pb-8">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
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
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:col-span-8">
            {cols.map((col) => (
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
          <div className="flex items-center gap-6">
            <Link
              href="/privacy"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Terms
            </Link>
            <Link
              href="/security"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Security
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
