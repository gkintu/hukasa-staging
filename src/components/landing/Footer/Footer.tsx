import Link from "next/link"
import { Button } from "@/components/ui/button"

export function Footer() {
  return (
    <footer className="bg-gray-900 dark:bg-gray-950 text-white">
      <div className="container mx-auto px-4">
        {/* CTA Section */}
        <div className="py-16 text-center">
          <h2 className="text-3xl font-bold sm:text-4xl text-white">
            Get your professional headshots today
          </h2>
          <p className="mt-4 text-lg text-gray-300 dark:text-gray-400 max-w-2xl mx-auto">
            Join thousands of professionals who trust our AI to create stunning headshots
          </p>
          <div className="mt-8">
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 text-lg" asChild>
              <Link href="/generate">
                Start Creating Now
              </Link>
            </Button>
          </div>
        </div>

        {/* Footer Links */}
        <div className="border-t border-gray-800 dark:border-gray-700 py-12">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-300 dark:text-gray-400 tracking-wider uppercase">
                Product
              </h3>
              <ul className="mt-4 space-y-2">
                <li><Link href="/pricing" className="text-gray-400 dark:text-gray-500 hover:text-white dark:hover:text-gray-300">Pricing</Link></li>
                <li><Link href="/examples" className="text-gray-400 dark:text-gray-500 hover:text-white dark:hover:text-gray-300">Examples</Link></li>
                <li><Link href="/api" className="text-gray-400 dark:text-gray-500 hover:text-white dark:hover:text-gray-300">API</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-300 dark:text-gray-400 tracking-wider uppercase">
                Company
              </h3>
              <ul className="mt-4 space-y-2">
                <li><Link href="/about" className="text-gray-400 dark:text-gray-500 hover:text-white dark:hover:text-gray-300">About</Link></li>
                <li><Link href="/blog" className="text-gray-400 dark:text-gray-500 hover:text-white dark:hover:text-gray-300">Blog</Link></li>
                <li><Link href="/careers" className="text-gray-400 dark:text-gray-500 hover:text-white dark:hover:text-gray-300">Careers</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-300 dark:text-gray-400 tracking-wider uppercase">
                Support
              </h3>
              <ul className="mt-4 space-y-2">
                <li><Link href="/help" className="text-gray-400 dark:text-gray-500 hover:text-white dark:hover:text-gray-300">Help Center</Link></li>
                <li><Link href="/contact" className="text-gray-400 dark:text-gray-500 hover:text-white dark:hover:text-gray-300">Contact</Link></li>
                <li><Link href="/faq" className="text-gray-400 dark:text-gray-500 hover:text-white dark:hover:text-gray-300">FAQ</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-300 dark:text-gray-400 tracking-wider uppercase">
                Legal
              </h3>
              <ul className="mt-4 space-y-2">
                <li><Link href="/privacy" className="text-gray-400 dark:text-gray-500 hover:text-white dark:hover:text-gray-300">Privacy</Link></li>
                <li><Link href="/terms" className="text-gray-400 dark:text-gray-500 hover:text-white dark:hover:text-gray-300">Terms</Link></li>
                <li><Link href="/cookies" className="text-gray-400 dark:text-gray-500 hover:text-white dark:hover:text-gray-300">Cookies</Link></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="border-t border-gray-800 dark:border-gray-700 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded bg-primary"></div>
              <span className="font-bold text-xl text-white">Hukasa AI</span>
            </div>
            <p className="mt-4 md:mt-0 text-gray-400 dark:text-gray-500 text-sm">
              © 2024 Hukasa AI. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}