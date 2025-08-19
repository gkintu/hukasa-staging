import Link from "next/link"
import { Button } from "@/components/ui/button"

export function PricingSection() {
  return (
    <section id="pricing" className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
            Virtual staging plans for every need
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Get professional virtual staging at 95% less cost than traditional staging
          </p>
        </div>

        <div className="mt-20">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {/* Basic Package */}
            <div className="bg-card p-8 rounded-lg border border-border">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground">Starter</h3>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-foreground">$16</span>
                  <span className="text-lg text-muted-foreground">/month</span>
                </div>
                <p className="mt-2 text-muted-foreground">6 staged rooms</p>
                <p className="mt-1 text-sm text-muted-foreground">3 furniture styles</p>
              </div>
              <div className="mt-8">
                <Button className="w-full" asChild>
                  <Link href="/generate">Get Started</Link>
                </Button>
              </div>
            </div>

            {/* Pro Package - Featured */}
            <div className="bg-primary p-8 rounded-lg text-primary-foreground relative">
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <span className="bg-yellow-400 text-gray-900 px-3 py-1 rounded-full text-sm font-medium">
                  Most Popular
                </span>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold">Professional</h3>
                <div className="mt-4">
                  <span className="text-4xl font-bold">$49</span>
                  <span className="text-lg text-primary-foreground/80">/month</span>
                </div>
                <p className="mt-2">25 staged rooms</p>
                <p className="mt-1 text-sm text-primary-foreground/80">All furniture styles</p>
              </div>
              <div className="mt-8">
                <Button className="w-full bg-background text-foreground hover:bg-muted" asChild>
                  <Link href="/generate">Get Started</Link>
                </Button>
              </div>
            </div>

            {/* Premium Package */}
            <div className="bg-card p-8 rounded-lg border border-border">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground">Enterprise</h3>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-foreground">$149</span>
                  <span className="text-lg text-muted-foreground">/month</span>
                </div>
                <p className="mt-2 text-muted-foreground">Unlimited staging</p>
                <p className="mt-1 text-sm text-muted-foreground">Custom furniture sets</p>
              </div>
              <div className="mt-8">
                <Button className="w-full" asChild>
                  <Link href="/generate">Get Started</Link>
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-12 text-center">
            <p className="text-sm text-muted-foreground">
              All packages include high-resolution images and MLS-compliant usage rights
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}