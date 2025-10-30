import Image from 'next/image'

import { BeforeAfterSlider } from '@/components/ui/before-after-slider'

const galleryComparisons = [
  {
    id: 'gallery-comparison-1',
    alt: 'Living room transformation',
    beforeSrc: '/carousel/empty-room-before.jpg',
    afterSrc: '/carousel/ai-furnished-room-after.jpg',
  },
  {
    id: 'gallery-comparison-2',
    alt: 'Bedroom transformation',
    beforeSrc: '/carousel/bare-bedroom-before.jpg',
    afterSrc: '/carousel/ai-designed-bedroom-after.jpg',
  },
  {
    id: 'gallery-comparison-3',
    alt: 'Kitchen transformation',
    beforeSrc: '/carousel/empty-kitchen-before.jpg',
    afterSrc: '/carousel/ai-modern-kitchen-after.jpg',
  },
  {
    id: 'gallery-comparison-4',
    alt: 'Office transformation',
    beforeSrc: '/carousel/plain-office-before.jpg',
    afterSrc: '/carousel/ai-stylish-office-after.jpg',
  },
  {
    id: 'gallery-comparison-5',
    alt: 'Studio transformation',
    beforeSrc: '/carousel/studio-before.jpg',
    afterSrc: '/carousel/studio-after.jpg',
  },
  {
    id: 'gallery-comparison-6',
    alt: 'Exterior transformation',
    beforeSrc: '/carousel/exterior-before.jpg',
    afterSrc: '/carousel/exterior-after.jpg',
  },
]

export function GallerySection() {
  return (
    <section id="gallery" className="py-24">
      <div className="container mx-auto px-4">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
            Stunning Property <span className="text-primary">Transformations</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            See how our AI transforms empty rooms into beautifully furnished spaces
          </p>
        </div>

        <div className="mt-20">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {galleryComparisons.map(({ id, alt, beforeSrc, afterSrc }) => (
              <BeforeAfterSlider
                key={id}
                before={{
                  alt: `${alt} - Before`,
                  label: 'Before',
                  contentClassName: 'bg-muted',
                  content: (
                    <Image
                      fill
                      priority={false}
                      src={beforeSrc}
                      alt={`${alt} - Before`}
                      sizes="(min-width: 1280px) 400px, (min-width: 768px) 45vw, 90vw"
                      className="object-cover"
                    />
                  ),
                }}
                after={{
                  alt: `${alt} - After`,
                  label: 'After',
                  contentClassName: 'bg-muted',
                  content: (
                    <Image
                      fill
                      priority={false}
                      src={afterSrc}
                      alt={`${alt} - After`}
                      sizes="(min-width: 1280px) 400px, (min-width: 768px) 45vw, 90vw"
                      className="object-cover"
                    />
                  ),
                }}
                wrapperClassName="bg-background"
                overlayClassName="bg-background/80 text-[0.65rem] font-semibold uppercase tracking-wide text-foreground/90"
                className="rounded-lg"
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
