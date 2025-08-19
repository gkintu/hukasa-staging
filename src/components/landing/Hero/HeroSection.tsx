import Link from "next/link"
import { Button } from "@/components/ui/button"

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

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
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

          {/* Professional Images Grid */}
          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
            <div className="aspect-square rounded-lg overflow-hidden">
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <span className="text-muted-foreground text-sm">Before</span>
              </div>
            </div>
            <div className="aspect-square rounded-lg overflow-hidden">
              <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary text-sm font-medium">After</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center mt-4 space-x-4 text-sm text-muted-foreground">
            <span>Empty Room</span>
            <span>→</span>
            <span>Virtually Staged</span>
          </div>
        </div>
      </div>
    </section>
  )
}