import Image from "next/image"
import Link from "next/link"
import { ArrowRight, Calendar, Sparkles } from "lucide-react"

export default function Hero() {
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
