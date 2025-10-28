import { BeforeAfterCarousel } from "@/components/before-after-carousel"

export function HeroSection() {
  return (
    <section
      className="relative pt-4 pb-1 lg:pt-10"
      style={{
        backgroundImage: "url('/landing/Hero-banner-hukasa-00.webp')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Overlay softens the background artwork for legibility (light + dark tuned) */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-background/85 via-background/88 to-background/99 dark:from-background/92 dark:via-background/96 dark:to-background/99"
        aria-hidden="true"
      />
      {/* Actual hero content stack */}
      <div className="relative container mx-auto px-4">
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
