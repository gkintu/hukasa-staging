export function GallerySection() {
  return (
    <section id="gallery" className="py-24">
      <div className="container mx-auto px-4">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
            Stunning Property Transformations
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            See how our AI transforms empty rooms into beautifully furnished spaces
          </p>
        </div>

        <div className="mt-20">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {/* Before/After Image 1 */}
            <div className="space-y-4">
              <div className="aspect-[3/4] bg-muted rounded-lg overflow-hidden">
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-muted-foreground text-sm">Empty Room</span>
                </div>
              </div>
              <div className="aspect-[3/4] bg-primary/10 rounded-lg overflow-hidden">
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-primary text-sm font-medium">Staged</span>
                </div>
              </div>
            </div>

            {/* Before/After Image 2 */}
            <div className="space-y-4">
              <div className="aspect-[3/4] bg-muted rounded-lg overflow-hidden">
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-muted-foreground text-sm">Empty Room</span>
                </div>
              </div>
              <div className="aspect-[3/4] bg-primary/10 rounded-lg overflow-hidden">
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-primary text-sm font-medium">Staged</span>
                </div>
              </div>
            </div>

            {/* Before/After Image 3 */}
            <div className="space-y-4">
              <div className="aspect-[3/4] bg-muted rounded-lg overflow-hidden">
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-muted-foreground text-sm">Empty Room</span>
                </div>
              </div>
              <div className="aspect-[3/4] bg-primary/10 rounded-lg overflow-hidden">
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-primary text-sm font-medium">Staged</span>
                </div>
              </div>
            </div>

            {/* Before/After Image 4 */}
            <div className="space-y-4">
              <div className="aspect-[3/4] bg-muted rounded-lg overflow-hidden">
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-muted-foreground text-sm">Empty Room</span>
                </div>
              </div>
              <div className="aspect-[3/4] bg-primary/10 rounded-lg overflow-hidden">
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-primary text-sm font-medium">Staged</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}