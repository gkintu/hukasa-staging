import Link from "next/link"
import { Button } from "@/components/ui/button"
import { BeforeAfterCarousel } from "@/components/before-after-carousel"

export function HeroSection() {
  return (
    <section className="py-20 lg:py-32 bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* Trust indicator */}
          <div className="flex items-center justify-center mb-6">
            <span className="text-muted-foreground">Trusted by 10,000+ real estate professionals worldwide</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
            AI-Powered Virtual Staging in <span className="text-primary">30 Seconds</span>
          </h1>
          
          {/* Subheading */}
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
            Transform empty properties into beautifully furnished spaces instantly with photorealistic AI staging.
          </p>

          {/* Before/After Carousel */}
          <BeforeAfterCarousel />

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
            <Button size="lg" className="text-lg px-8 py-6" asChild>
              <Link href="/generate">
                Start Virtual Staging
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 py-6 bg-transparent" asChild>
              <Link href="#gallery">
                View Examples
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}