import { Navigation } from "./Navigation"
import { HeroSection } from "./Hero"
import { TrustIndicators } from "./TrustIndicators"
import { FeaturesSection } from "./Features"
import { GallerySection } from "./Gallery"
import { PricingSection } from "./Pricing"
import { TestimonialsSection } from "./Testimonials"
import { FAQSection } from "./FAQ"
import { Footer } from "./Footer"

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main>
        <HeroSection />
        <TrustIndicators />
        <FeaturesSection />
        <GallerySection />
        <TestimonialsSection />
        <PricingSection />
        <FAQSection />
      </main>
      <Footer />
    </div>
  )
}