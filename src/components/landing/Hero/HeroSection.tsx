import Link from "next/link"
import { Button } from "@/components/ui/button"
import { BeforeAfterCarousel } from "@/components/before-after-carousel"

export function HeroSection() {
  return (
    <section className="pt-4 pb-20 lg:pt-10 lg:pb-32 bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* Trust indicator */}
          <div className="flex items-center justify-center mb-6">
            <span className="text-muted-foreground">Trusted by 10,000+ real estate professionals worldwide</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl lg:text-6xl font-bold text-foreground mb-4 leading-tight">
            AI-Powered Virtual Staging in <span className="text-primary">30 Seconds</span>
          </h1>
          
          {/* Subheading */}
          <p className="text-lg text-muted-foreground mb-4 max-w-2xl mx-auto leading-relaxed">
            Transform empty properties into beautifully furnished spaces instantly with photorealistic AI staging.
          </p>
        </div>

        {/* Before/After Carousel */}
        <div className="mt-6 flex justify-center">
          <BeforeAfterCarousel />
        </div>

        {/* CTA Buttons */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 max-w-4xl mx-auto text-center">
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
    </section>
  )
}
