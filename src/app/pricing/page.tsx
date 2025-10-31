import { Footer, Navigation, PricingSection } from "@/components/landing"

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main>
        <PricingSection />
      </main>
      <Footer />
    </div>
  )
}
