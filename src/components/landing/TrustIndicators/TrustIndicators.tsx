export function TrustIndicators() {
  const companies = [
    { name: "Google", logo: "/placeholder.svg?height=40&width=120" },
    { name: "Microsoft", logo: "/placeholder.svg?height=40&width=120" },
    { name: "Amazon", logo: "/placeholder.svg?height=40&width=120" },
    { name: "Meta", logo: "/placeholder.svg?height=40&width=120" },
    { name: "Apple", logo: "/placeholder.svg?height=40&width=120" },
  ]

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <p className="text-center text-muted-foreground mb-8">Trusted by professionals at leading companies</p>
        <div className="flex items-center justify-center space-x-8 lg:space-x-12 opacity-60">
          {companies.map((company) => (
            <div
              key={company.name}
              className="h-8 lg:h-10 w-20 lg:w-24 bg-muted rounded grayscale hover:grayscale-0 transition-all duration-300"
            />
          ))}
        </div>
      </div>
    </section>
  )
}