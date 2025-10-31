import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

const faqs = [
  {
    question: "What is Hukasa?",
    answer:
      "Hukasa is ai driven platform that delivers tools that transforms your property photos into stunning, buyer-attracting assets. No tech skills needed. Upload a photo, and get photo-realistic results fast.",
  },
  {
    question: "How Does This Virtual Staging Work?",
    answer:
      "Very straightforward. Upload a photo, pick your tool (like virtual staging or item removal), and our AI gets to work. You'll have a stunning, edited image in under a minute. No more waiting for designers. You get total control and instant results",
  },
  {
    question: "Is there a free trial available?",
    answer:
      "Sign up and we'll give you free credits to test-drive some of our powerful tools. See the speed and quality for yourself. Results come with watermark on the free images.",
  },
  {
    question: "What tools do you offer?",
    answer:
      "Everything you need to make properties stand out in the market. We offer AI virtual staging, item removal to declutter messy rooms, and day-to-dusk conversion for stunning twilight shots, image to video and more. These are the tools that get you more clicks, more showings, and faster results.",
  },
  {
    question: "Can You Help Me Visualize Renovations?",
    answer:
      "Instantly show clients a home's hidden potential. Change walls, floors, and even restyle entire rooms with a few clicks. Stop telling, start showing. Close deals faster by helping buyers see the dream home you're selling them.",
  },
  {
    question: "How Fast Can I Get My Results?",
    answer:
      "Faster than you can make a cup of coffee. Most results are ready in about 30 seconds, videos might take longer. Upload your photo, choose your edit, and get back to what you do best: selling. No more wasted time waiting for edits.",
  },
  {
    question: "What kind of photos does Hukasa accept?",
    answer: "JPG, PNG, WEBP up to 50MB. For the best results, we recommend using clear, well-lit photos.",
  },
  {
    question: "Where can I contact Hukasa for issues or questions?",
    answer:
      "If you have any questions or need a helping hand, Hit us up at support@hukasa.com and we will get back to you as soon as possible",
  },
  {
    question: "Can i market my images",
    answer:
      "Absolutely. Once you download your images, they're yours to use on the MLS, Zillow, Finn or anywhere else you market your listings. Just make sure you follow your local board's rules on virtual staging disclosures.",
  },
  {
    question: "What If I Don't Like the First Result?",
    answer:
      'No problem. If the first result isn\'t quite right, just hit the "Regenerate" button. Our AI will create a new version for you, free of charge.',
  },
]

export function FAQSection() {
  return (
    <section id="faq" className="py-24 bg-muted/30">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="mt-16">
          <Accordion
            type="single"
            collapsible
            className="grid gap-4 items-start md:grid-cols-2"
          >
            {faqs.map((faq, index) => (
              <AccordionItem 
                key={index} 
                value={`item-${index}`}
                className="bg-card border border-border rounded-lg px-6"
              >
                <AccordionTrigger className="text-left py-6 hover:no-underline cursor-pointer">
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
