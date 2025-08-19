export function TestimonialsSection() {
  return (
    <section className="py-24">
      <div className="container mx-auto px-4">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
            What Real Estate Professionals Say
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Join thousands of agents who trust us with their property staging
          </p>
        </div>

        <div className="mt-20">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {/* Testimonial 1 */}
            <div className="bg-card p-8 rounded-lg border border-border">
              <div className="flex items-center mb-4">
                <div className="h-12 w-12 rounded-full bg-muted"></div>
                <div className="ml-4">
                  <h4 className="text-sm font-semibold text-foreground">Sarah Chen</h4>
                  <p className="text-sm text-muted-foreground">Real Estate Agent</p>
                </div>
              </div>
              <p className="text-muted-foreground">
                &ldquo;Virtual staging transformed my listings completely! Empty rooms now look inviting and my properties sell 40% faster.&rdquo;
              </p>
            </div>

            {/* Testimonial 2 */}
            <div className="bg-card p-8 rounded-lg border border-border">
              <div className="flex items-center mb-4">
                <div className="h-12 w-12 rounded-full bg-muted"></div>
                <div className="ml-4">
                  <h4 className="text-sm font-semibold text-foreground">Michael Rodriguez</h4>
                  <p className="text-sm text-muted-foreground">Property Manager</p>
                </div>
              </div>
              <p className="text-muted-foreground">
                &ldquo;I was skeptical about AI staging, but the results are incredibly realistic. 95% cheaper than traditional staging!&rdquo;
              </p>
            </div>

            {/* Testimonial 3 */}
            <div className="bg-card p-8 rounded-lg border border-border">
              <div className="flex items-center mb-4">
                <div className="h-12 w-12 rounded-full bg-muted"></div>
                <div className="ml-4">
                  <h4 className="text-sm font-semibold text-foreground">Emily Johnson</h4>
                  <p className="text-sm text-muted-foreground">Broker</p>
                </div>
              </div>
              <p className="text-muted-foreground">
                &ldquo;Game-changer for my brokerage! We can stage any property instantly and our clients love the results.&rdquo;
              </p>
            </div>
          </div>
        </div>

        <div className="mt-16 text-center">
          <div className="flex items-center justify-center space-x-2">
            <div className="flex space-x-1">
              <span className="text-yellow-400">★</span>
              <span className="text-yellow-400">★</span>
              <span className="text-yellow-400">★</span>
              <span className="text-yellow-400">★</span>
              <span className="text-yellow-400">★</span>
            </div>
            <span className="text-muted-foreground">4.9/5 from over 10,000 reviews</span>
          </div>
        </div>
      </div>
    </section>
  )
}