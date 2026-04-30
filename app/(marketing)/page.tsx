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
          <span className="text-[15px] font-semibold tracking-tight text-brand-navy dark:text-white">
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
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-navy px-4 text-sm font-medium text-white shadow-sm transition-all hover:bg-brand-navy/90 active:translate-y-px dark:bg-white dark:text-brand-navy dark:hover:bg-white/90"
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
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 50% at 75% 35%, rgba(2,132,199,0.12), transparent 60%), radial-gradient(40% 40% at 15% 80%, rgba(13,148,136,0.10), transparent 60%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.04] dark:opacity-[0.06]"
        style={{
          backgroundImage: "radial-gradient(currentColor 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />

      <div className="mx-auto grid max-w-7xl gap-12 px-6 pt-16 pb-24 lg:grid-cols-12 lg:gap-8 lg:px-8 lg:pt-24 lg:pb-32">
        <div className="lg:col-span-5 lg:pt-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-blue/20 bg-brand-blue/5 px-3 py-1 text-[11px] font-semibold tracking-[0.12em] text-brand-blue uppercase">
            <Sparkles className="size-3" />
            Quality management, reimagined
          </span>

          <h1 className="mt-6 font-sans text-5xl leading-[1.05] font-semibold tracking-tight text-balance text-brand-navy sm:text-6xl lg:text-[68px] dark:text-white">
            Your procedures, in&nbsp;order.
            <br />
            <span className="text-brand-blue">Your audit, ready.</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Manage SOPs, approvals, equipment PMs, and training from one place — with a real-time
            Pulse that surfaces what needs your attention next.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/signup"
              className="group inline-flex h-12 items-center gap-2 rounded-xl bg-brand-navy px-6 text-sm font-medium text-white shadow-[0_8px_24px_-8px_rgba(15,23,42,0.4)] transition-all hover:bg-brand-navy/90 active:translate-y-px dark:bg-white dark:text-brand-navy dark:shadow-[0_8px_24px_-8px_rgba(2,132,199,0.5)] dark:hover:bg-white/90"
            >
              Get started
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex h-12 items-center gap-2 rounded-xl border border-border bg-background px-6 text-sm font-medium text-foreground transition-colors hover:border-foreground/30 hover:bg-muted"
            >
              <Calendar className="size-4" />
              Book a demo
            </Link>
            <Link
              href="/login"
              className="inline-flex h-12 items-center px-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign in
            </Link>
          </div>

          <p className="mt-8 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">No credit card required.</span> Built for
            QA-led teams in pharma, biotech, and food manufacturing.
          </p>
        </div>

        <div className="relative lg:col-span-7">
          <Image
            src="/marketing/hero-dashboard.webp"
            alt="SOP-Guard Pro dashboard showing active SOPs, pending approvals, PM compliance, and change controls."
            width={2400}
            height={1416}
            priority
            sizes="(min-width: 1024px) 70vw, 100vw"
            className="w-full lg:absolute lg:top-1/2 lg:left-0 lg:w-[125%] lg:max-w-none lg:-translate-y-1/2"
          />
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
        <h2 className="mt-3 text-4xl font-semibold tracking-tight text-balance text-brand-navy sm:text-5xl dark:text-white">
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
                    : "grid size-11 place-items-center rounded-xl bg-brand-navy/5 text-brand-navy ring-1 ring-brand-navy/10 dark:bg-white/5 dark:text-white dark:ring-white/10"
                }
              >
                <Icon className="size-5" />
              </div>
              <h3 className="mt-6 text-lg font-semibold text-brand-navy dark:text-white">
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
        <h2 className="mt-3 text-4xl font-semibold tracking-tight text-balance text-brand-navy sm:text-5xl dark:text-white">
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
          <h2 className="text-4xl font-semibold tracking-tight text-balance text-brand-navy sm:text-5xl dark:text-white">
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
                      : "grid size-12 place-items-center rounded-xl bg-brand-navy/10 text-brand-navy dark:bg-white/10 dark:text-white"
                  }
                >
                  <Icon className="size-6" />
                </div>
                <h3 className="mt-6 text-xl font-semibold text-brand-navy dark:text-white">
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
              <span className="text-[15px] font-semibold tracking-tight text-brand-navy dark:text-white">
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
