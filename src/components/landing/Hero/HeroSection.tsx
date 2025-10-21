import { BeforeAfterCarousel } from "@/components/before-after-carousel"

export function HeroSection() {
  return (
    <section className="pt-4 pb-20 lg:pt-10 lg:pb-32 bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
            {/* Trust indicator */}
            {/*
            <div className="flex items-center justify-center mb-6">
            <span className="text-muted-foreground">Trusted by 100+ real estate professionals in Scandinavia</span>
            </div>
            */}

          {/* Main Headline */}
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-4 leading-tight">
            AI-Powered Virtual Staging in <span className="text-primary">30 Seconds</span>
          </h1>
          
          {/* Subheading */}
          <p className="text-md text-muted-foreground mb-4 max-w-lg mx-auto leading-relaxed">
            Transform empty properties into beautifully furnished spaces instantly with photorealistic AI staging.
          </p>
        </div>

        {/* Before/After Carousel */}
        <div className="mt-6 flex justify-center">
          <BeforeAfterCarousel />
        </div>

      </div>
    </section>
  )
}
