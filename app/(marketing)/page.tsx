import FAQ from "@/components/marketing/faq"
import FinalCTAGrid from "@/components/marketing/final-cta-grid"
import Hero from "@/components/marketing/hero"
import PricingSection from "@/components/marketing/pricing-section"
import RolesGrid from "@/components/marketing/roles-grid"
import TabbedBenefits from "@/components/marketing/tabbed-benefits"
import TourTabs from "@/components/marketing/tour-tabs"
import TrustStrip from "@/components/marketing/trust-strip"

export default function LandingPage() {
  return (
    <>
      <Hero />
      <TrustStrip />
      <TabbedBenefits />
      <TourTabs />
      <RolesGrid />
      <PricingSection />
      <FAQ />
      <FinalCTAGrid />
    </>
  )
}
