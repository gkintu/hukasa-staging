const FiveStarRating = () => (
  <div
    className="flex items-center gap-1 text-yellow-400"
    aria-label="5 star rating"
  >
    <span aria-hidden="true">★</span>
    <span aria-hidden="true">★</span>
    <span aria-hidden="true">★</span>
    <span aria-hidden="true">★</span>
    <span aria-hidden="true">★</span>
  </div>
)

export function TestimonialsSection() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-screen-xl px-4">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
            Customer Reviews
          </h2>
        </div>

        <div className="mt-20">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Testimonial 1 */}
            <div className="bg-card p-8 rounded-lg border border-border max-w-sm mx-auto">
              <div className="flex items-center mb-4">
                {/* <div className="h-12 w-12 rounded-full bg-muted"></div> */}
                <div className="ml-4">
                  <h4 className="text-sm font-semibold text-foreground">Lydia N.</h4>
                  <FiveStarRating />
                </div>
              </div>
              <p className="text-muted-foreground">
                &ldquo;Wanted my rental unit to stand out, especially outside given the big garden we have, the sky replacement tool really brought it home.&rdquo;
              </p>
            </div>

            {/* Testimonial 2 */}
            <div className="bg-card p-8 rounded-lg border border-border max-w-sm mx-auto">
              <div className="flex items-center mb-4">
                {/* <div className="h-12 w-12 rounded-full bg-muted"></div> */}
                <div className="ml-4">
                  <h4 className="text-sm font-semibold text-foreground">Eva K.</h4>
                  <FiveStarRating />
                </div>
              </div>
              <p className="text-muted-foreground">
                &ldquo;I was a bit skeptical about AI staging, but the results are incredibly realistic. 95% cheaper than traditional staging!&rdquo;
              </p>
            </div>

            {/* Testimonial 3 */}
            <div className="bg-card p-8 rounded-lg border border-border max-w-sm mx-auto">
              <div className="flex items-center mb-4">
                {/* <div className="h-12 w-12 rounded-full bg-muted"></div> */}
                <div className="ml-4">
                  <h4 className="text-sm font-semibold text-foreground">Clark Williams</h4>
                  <FiveStarRating />
                </div>
              </div>
              <p className="text-muted-foreground">
                &ldquo;Highly recommend! The AI staging process was quick and the tutorial videos are so easy to follow. Great work guys&rdquo;
              </p>
            </div>
          </div>
        </div>

        {/* <div className="mt-16 text-center">
          <div className="flex items-center justify-center space-x-2">
            <FiveStarRating />
            <span className="text-muted-foreground">4.9/5 from over 10,000 reviews</span>
          </div>
        </div> */}
      </div>
    </section>
  )
}
