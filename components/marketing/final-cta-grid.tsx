import Link from "next/link"
import { ArrowRight, Calendar, Sparkles, UserCog } from "lucide-react"

const CARDS = [
  {
    icon: Sparkles,
    title: "Try free for 14 days",
    body: "Full access. No credit card. No call required.",
    cta: "Start trial",
    href: "/signup",
    accent: "blue",
  },
  {
    icon: Calendar,
    title: "Book a guided demo",
    body: "See your workflows in action with a compliance specialist.",
    cta: "Schedule a call",
    href: "/contact",
    accent: "teal",
  },
  {
    icon: UserCog,
    title: "Talk to compliance",
    body: "Pharma, biotech, medical devices — let's discuss validation packages.",
    cta: "Contact sales",
    href: "/contact",
    accent: "navy",
  },
] as const

export default function FinalCTAGrid() {
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
          {CARDS.map((card) => {
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
