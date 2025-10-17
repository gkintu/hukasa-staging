import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

const faqs = [
  {
    question: "How does virtual staging work?",
    answer: "Our AI analyzes your empty room photos and digitally adds realistic furniture, decor, and lighting to create beautifully staged spaces that help buyers visualize the property's potential."
  },
  {
    question: "What types of rooms can be virtually staged?",
    answer: "We can stage any interior space including living rooms, bedrooms, kitchens, dining rooms, home offices, and more. Both residential and commercial properties are supported."
  },
  {
    question: "How long does it take to get staged photos?",
    answer: "Virtual staging is completed in just 30 seconds. You'll receive your professionally staged images instantly, ready to use in your MLS listings."
  },
  {
    question: "What photo formats are supported?",
    answer: "We support JPEG, PNG, WEBP, and TIFF formats. For best results, upload high-resolution photos with good lighting and clear views of the empty rooms."
  },
  {
    question: "Can I use staged photos for MLS listings?",
    answer: "Yes, all our virtual staging packages include MLS-compliant usage rights. The staged photos are clearly marked as virtually staged as required by real estate regulations."
  },
  {
    question: "What if I don't like the staging results?",
    answer: "We offer unlimited revisions and different furniture styles. If you're not completely satisfied, we provide a 100% money-back guarantee within 30 days."
  }
]

export function FAQSection() {
  return (
    <section id="faq" className="py-24 bg-muted/30">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
            Frequently Asked Questions
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Everything you need to know about our virtual staging service
          </p>
        </div>

        <div className="mt-16">
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem 
                key={index} 
                value={`item-${index}`}
                className="bg-card border border-border rounded-lg px-6"
              >
                <AccordionTrigger className="text-left py-6 hover:no-underline">
                  <span className="font-semibold text-foreground">{faq.question}</span>
                </AccordionTrigger>
                <AccordionContent className="pb-6 text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  )
}