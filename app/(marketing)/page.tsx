import Image from "next/image"
import Link from "next/link"
import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  ClipboardSignature,
  FileCheck2,
  GraduationCap,
  History,
  Radar,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react"

export default function LandingPage() {
  return (
    <>
      <SiteNav />
      <Hero />
      <TrustStrip />
      <Pillars />
      <CapabilityGrid />
      <ComplianceBand />
      <FinalCTA />
      <SiteFooter />
    </>
  )
}

/* ---------------------------------------------------------------- Top nav */

function SiteNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-transparent bg-background/70 backdrop-blur-md">
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
          <a href="#pillars" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Features
          </a>
          <a href="#capabilities" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Capabilities
          </a>
          <a href="#compliance" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Compliance
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
      {/* Ambient background */}
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
          backgroundImage:
            "radial-gradient(currentColor 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />

      <div className="mx-auto grid max-w-7xl gap-12 px-6 pt-16 pb-24 lg:grid-cols-12 lg:gap-8 lg:px-8 lg:pt-24 lg:pb-32">
        {/* Copy */}
        <div className="lg:col-span-6 lg:pt-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-blue/20 bg-brand-blue/5 px-3 py-1 text-[11px] font-semibold tracking-[0.12em] text-brand-blue uppercase">
            <Sparkles className="size-3" />
            Quality management, reimagined
          </span>

          <h1 className="mt-6 font-sans text-5xl leading-[1.05] font-semibold tracking-tight text-brand-navy sm:text-6xl lg:text-[68px] dark:text-white">
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
              href="/login"
              className="inline-flex h-12 items-center gap-2 rounded-xl border border-border bg-background px-6 text-sm font-medium text-foreground transition-colors hover:border-foreground/30 hover:bg-muted"
            >
              Sign in
            </Link>
          </div>

          <p className="mt-8 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">No credit card required.</span> Built for
            QA-led teams in pharma, biotech, and food manufacturing.
          </p>
        </div>

        {/* Visual */}
        <div className="relative lg:col-span-6">
          <div className="relative lg:-mr-24 xl:-mr-40">
            <div
              aria-hidden
              className="absolute -inset-8 -z-10 rounded-[40px] bg-gradient-to-br from-brand-blue/10 via-transparent to-brand-teal/10 blur-2xl"
            />
            <Image
              src="/marketing/hero-dashboard.webp"
              alt="SOP-Guard Pro dashboard showing active SOPs, pending approvals, PM compliance, and change controls."
              width={2000}
              height={1180}
              priority
              sizes="(min-width: 1024px) 60vw, 100vw"
              className="relative w-full rounded-2xl"
            />
          </div>
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

/* ----------------------------------------------------------------- Pillars */

function Pillars() {
  const pillars = [
    {
      icon: BookOpenCheck,
      eyebrow: "Library",
      title: "One library, every procedure.",
      body:
        "Versioned SOPs, locked during change control, with department visibility built in. Upload .docx and render read-only — no risk of accidental edits.",
      accent: "brand-navy",
    },
    {
      icon: ClipboardSignature,
      eyebrow: "Approvals",
      title: "Sign-offs without surprises.",
      body:
        "QA-routed approvals with snapshot signatories, mobile signature capture, and immutable signature certificates. Every signature accounted for.",
      accent: "brand-blue",
    },
    {
      icon: Radar,
      eyebrow: "Pulse",
      title: "The Pulse never sleeps.",
      body:
        "Real-time alerts for pending approvals, equipment PMs due, expiring training, and open change controls — surfaced the moment they happen.",
      accent: "brand-teal",
    },
  ]

  return (
    <section id="pillars" className="mx-auto max-w-7xl px-6 py-24 lg:px-8 lg:py-32">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold tracking-[0.18em] text-brand-blue uppercase">
          Built around the work
        </p>
        <h2 className="mt-3 text-4xl font-semibold tracking-tight text-brand-navy sm:text-5xl dark:text-white">
          Three pillars. One controlled system.
        </h2>
        <p className="mt-4 text-lg text-muted-foreground">
          Replace the binder, the spreadsheet, and the email chain with a single source of truth
          your inspectors will actually trust.
        </p>
      </div>

      <div className="mt-16 grid gap-6 lg:grid-cols-3">
        {pillars.map((p) => (
          <div
            key={p.eyebrow}
            className="group relative overflow-hidden rounded-2xl border border-border bg-card p-8 transition-all hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-soft"
          >
            <div className="grid size-11 place-items-center rounded-xl bg-brand-navy/5 text-brand-navy ring-1 ring-brand-navy/10 dark:bg-white/5 dark:text-white dark:ring-white/10">
              <p.icon className="size-5" />
            </div>
            <p className="mt-6 text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
              {p.eyebrow}
            </p>
            <h3 className="mt-2 text-xl font-semibold text-brand-navy dark:text-white">
              {p.title}
            </h3>
            <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{p.body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ------------------------------------------------------- Capability grid */

function CapabilityGrid() {
  const items = [
    { icon: BookOpenCheck, title: "SOP Library", body: "Versioned, locked-during-CC, read-only rendering." },
    { icon: ClipboardSignature, title: "Approvals & E-sign", body: "QA-routed with mobile signature capture." },
    { icon: Wrench, title: "Equipment PMs", body: "Schedules, alerts, and full maintenance history." },
    { icon: GraduationCap, title: "Training Hub", body: "Assignments, expirations, and competency tracking." },
    { icon: History, title: "Change Control", body: "Snapshot signatories. Immutable certificates." },
    { icon: Radar, title: "Pulse", body: "Real-time visibility across every active workflow." },
  ]

  return (
    <section id="capabilities" className="border-y border-border/60 bg-muted/30 py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold tracking-[0.18em] text-brand-blue uppercase">
            Capabilities
          </p>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight text-brand-navy sm:text-5xl dark:text-white">
            Everything quality teams need.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Designed by operators, for operators. Each module orbits the SOP and Equipment hubs —
            so nothing lives in a silo.
          </p>
        </div>

        <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.title}
              className="group relative bg-card p-7 transition-colors hover:bg-background"
            >
              <div className="flex items-center gap-3">
                <div className="grid size-9 place-items-center rounded-lg bg-brand-blue/10 text-brand-blue">
                  <item.icon className="size-[18px]" />
                </div>
                <h3 className="text-[15px] font-semibold text-brand-navy dark:text-white">
                  {item.title}
                </h3>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ---------------------------------------------------------- Compliance band */

function ComplianceBand() {
  const bullets = [
    {
      title: "Row-level security on every table",
      body: "Postgres RLS is the security layer — never just frontend filtering.",
    },
    {
      title: "Immutable signature certificates",
      body: "Audit-trail tables have no UPDATE or DELETE policies. Ever.",
    },
    {
      title: "Snapshot-based change control",
      body: "Required signatories captured at CC creation — transfers mid-cycle never affect signing.",
    },
    {
      title: "Soft-delete by default",
      body: "Profiles are deactivated, not destroyed. FK references stay valid forever.",
    },
  ]

  return (
    <section id="compliance" className="relative overflow-hidden bg-brand-navy py-24 text-white lg:py-32">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 50% at 80% 20%, rgba(2,132,199,0.25), transparent 60%), radial-gradient(50% 50% at 10% 90%, rgba(13,148,136,0.20), transparent 60%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: "radial-gradient(white 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />

      <div className="relative mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-2 lg:gap-16 lg:px-8">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold tracking-[0.12em] uppercase">
            <ShieldCheck className="size-3" />
            Built for inspections
          </span>
          <h2 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">
            Compliance baked in,
            <br />
            <span className="text-brand-teal">not bolted on.</span>
          </h2>
          <p className="mt-5 max-w-lg text-lg text-white/70">
            The architecture itself enforces your audit posture. No shortcuts. No surprises during
            a Form&nbsp;483.
          </p>
          <Link
            href="/signup"
            className="mt-10 inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 text-sm font-medium text-brand-navy transition-all hover:bg-white/90 active:translate-y-px"
          >
            See how it works
            <ArrowRight className="size-4" />
          </Link>
        </div>

        <ul className="grid gap-4 sm:grid-cols-2">
          {bullets.map((b) => (
            <li
              key={b.title}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm"
            >
              <CheckCircle2 className="size-5 text-brand-teal" />
              <p className="mt-4 text-[15px] font-semibold leading-snug">{b.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-white/65">{b.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/* --------------------------------------------------------------- Final CTA */

function FinalCTA() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto max-w-5xl px-6 py-24 text-center lg:px-8 lg:py-32">
        <h2 className="text-4xl font-semibold tracking-tight text-brand-navy sm:text-5xl lg:text-6xl dark:text-white">
          Ready to retire the binder?
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
          Spin up your workspace in minutes. Bring your team. Pass your next audit with the receipts
          ready.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/signup"
            className="group inline-flex h-12 items-center gap-2 rounded-xl bg-brand-navy px-7 text-sm font-medium text-white shadow-[0_8px_24px_-8px_rgba(15,23,42,0.4)] transition-all hover:bg-brand-navy/90 active:translate-y-px dark:bg-white dark:text-brand-navy"
          >
            Get started
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/login"
            className="inline-flex h-12 items-center gap-2 rounded-xl border border-border bg-background px-7 text-sm font-medium text-foreground hover:bg-muted"
          >
            Sign in
          </Link>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ Footer */

function SiteFooter() {
  return (
    <footer className="border-t border-border bg-muted/20">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 py-10 md:flex-row lg:px-8">
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-md bg-brand-navy text-white">
            <FileCheck2 className="size-3.5" />
          </span>
          <span className="text-sm font-semibold tracking-tight text-brand-navy dark:text-white">
            SOP-Guard Pro
          </span>
          <span className="ml-3 text-xs text-muted-foreground">
            © {new Date().getFullYear()} All rights reserved.
          </span>
        </div>
        <nav className="flex items-center gap-6 text-sm text-muted-foreground">
          <Link href="/docs" className="transition-colors hover:text-foreground">Docs</Link>
          <Link href="/login" className="transition-colors hover:text-foreground">Sign in</Link>
          <Link href="/signup" className="transition-colors hover:text-foreground">Get started</Link>
        </nav>
      </div>
    </footer>
  )
}
