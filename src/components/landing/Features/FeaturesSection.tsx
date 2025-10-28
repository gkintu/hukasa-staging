import { Fragment, type ComponentType, type SVGProps } from "react"
import Image from "next/image"
import { Download, Upload, Wand2 } from "lucide-react"

import {
  CardDescription,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

type StepDefinition = {
  index: string
  title: string
  description: string
  image: string
  Icon: ComponentType<SVGProps<SVGSVGElement>>
}

const steps: StepDefinition[] = [
  {
    index: "01",
    title: "Upload Property Photos",
    description:
      "Upload empty or unfurnished rooms directly from your listing to start the staging workflow.",
    image: "/carousel/empty-room-before.jpg",
    Icon: Upload,
  },
  {
    index: "02",
    title: "Choose Design Direction",
    description:
      "Select curated staging styles that align with your target buyer and let our AI handle the heavy lifting.",
    image: "/carousel/ai-designed-bedroom-after.jpg",
    Icon: Wand2,
  },
  {
    index: "03",
    title: "Review & Download",
    description:
      "Approve your favorite variants and download photorealistic renders ready for MLS listings and marketing.",
    image: "/carousel/ai-modern-kitchen-after.jpg",
    Icon: Download,
  },
]

type StepProps = StepDefinition

function Step({ index, title, description, image, Icon }: StepProps) {
  return (
    <div className="flex max-w-sm flex-1 flex-col items-center text-center px-4">
      <header className="mb-8 flex flex-col items-center">
        <span className="text-5xl text-muted-foreground">
          {index}
        </span>
        <div className="mt-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="h-5 w-5" strokeWidth={1.5} />
        </div>
        <CardTitle className="mt-6 text-2xl text-primary">
          {title}
        </CardTitle>
        <CardDescription className="mt-3 text-base leading-relaxed">
          {description}
        </CardDescription>
      </header>
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-border/80 bg-muted">
        <Image
          src={image}
          alt={title}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 360px"
          loading="lazy"
        />
      </div>
    </div>
  )
}

export function FeaturesSection() {
  return (
    <section id="how-it-works" className="bg-muted/20 pt-16 pb-24 lg:pt-20 lg:pb-24">
      <div className="container mx-auto px-6">
        <header className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <p className="text-3xl font-bold uppercase tracking-wide text-primary/80 lg:text-4xl">
            How It Works
          </p>
          <h2 className="mt-4 text-md text-muted-foreground max-w-lg mx-auto leading-relaxed">
            Transform empty properties into stunning staged spaces in three
            simple steps
          </h2>
        </header>

        <div className="mt-16 flex flex-col items-center gap-12 md:flex-row md:items-start md:justify-center md:gap-0">
          {steps.map((step, index) => (
            <Fragment key={step.index}>
              <Step {...step} />
              {index < steps.length - 1 ? (
                <Separator
                  orientation="vertical"
                  className="hidden h-24 w-px bg-border md:mx-10 md:block md:self-center"
                />
              ) : null}
            </Fragment>
          ))}
        </div>
      </div>
    </section>
  )
}
