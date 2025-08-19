export function FeaturesSection() {
  return (
    <section id="how-it-works" className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
            How It Works
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Transform empty properties into stunning staged spaces in three simple steps
          </p>
        </div>

        <div className="mt-20">
          <div className="grid grid-cols-1 gap-12 sm:grid-cols-3">
            {/* Step 1 */}
            <div className="text-center">
              <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-2xl font-bold text-primary">1</span>
              </div>
              <h3 className="mt-6 text-xl font-semibold text-foreground">
                Upload Property Photos
              </h3>
              <p className="mt-2 text-muted-foreground">
                Upload photos of empty or unfurnished rooms from your property listings
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-2xl font-bold text-primary">2</span>
              </div>
              <h3 className="mt-6 text-xl font-semibold text-foreground">
                Choose Design Style
              </h3>
              <p className="mt-2 text-muted-foreground">
                Select from modern, traditional, luxury, or Scandinavian furniture styles
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-2xl font-bold text-primary">3</span>
              </div>
              <h3 className="mt-6 text-xl font-semibold text-foreground">
                Get Staged Photos
              </h3>
              <p className="mt-2 text-muted-foreground">
                Receive photorealistic staged images in 30 seconds, ready for MLS listings
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}