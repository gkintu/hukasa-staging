"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  HelpCircle,
  FileText,
  MessageCircle,
  Mail,
  Upload,
  Image,
  Settings,
  LogOut,
  Zap,
  Video,
  ExternalLink,
  Copy
} from "lucide-react"
import { signOut } from "@/lib/auth-client"
import { QuickTipsModal } from "@/components/quick-tips-modal"
import { toast } from "sonner"

interface HelpProps {
  onUploadClick?: () => void
  onNavigateToProjects?: () => void
  onNavigateToSettings?: () => void
  onNavigateToHelp?: () => void
}

export function Help({ onUploadClick, onNavigateToProjects, onNavigateToSettings, onNavigateToHelp }: HelpProps = {}) {
  const [quickTipsOpen, setQuickTipsOpen] = useState(false)
  const [email, setEmail] = useState('')

  // Email obfuscation for scraper protection
  useEffect(() => {
    // This code runs only in the browser, not on the server
    const user = 'support'
    const domain = 'hukasa.com'
    setEmail(`${user}@${domain}`)
  }, [])

  const copyEmail = async () => {
    if (email) {
      try {
        await navigator.clipboard.writeText(email)
        toast.success('Email copied to clipboard!')
      } catch (err) {
        toast.error('Failed to copy email')
      }
    }
  }

  const faqs = [
    {
      question: "How do I upload images for virtual staging?",
      answer: "Click the 'Upload' button in the sidebar or header. You can choose to upload to an existing project or leave images in 'Unassigned Images' to organize later. We support JPG, JPEG, PNG and WEBP formats with a 10MB file size limit per image."
    },
    {
      question: "What is the Unassigned Images project?",
      answer: "Unassigned Images is a default project where your uploads go when you don't choose a specific project. This lets you upload quickly now and organize later. To move them from this project, navigate to it by clicking the All Images tab, select the images you want to move using checkboxes, and click Move to Project."
    },
    {
      question: "How do I organize my images into projects?",
      answer: "Create projects from the Projects page to organize your work by property, client, or any system that works for you. To move images between projects, go to All Images view, select the images you want to move using checkboxes, and click the Move button to choose a destination project."
    },
    {
      question: "How many variants can I generate per image?",
      answer: "You can generate up to 4 variants per generation request. Click any image to open the detail view, then use the generation panel to create variants. You can run multiple generations. Each variant provides a unique staging option with different furniture arrangements and design aesthetics."
    },
    {
      question: "How do I download my staged images?",
      answer: "Open any image to view its detail page. Each generated variant has its own download button."
    },
    {
      question: "Can I delete images or variants?",
      answer: "Yes! You have two deletion options: (1) Delete a specific variant while keeping the source image and other variants, or (2) Delete the source image, which automatically deletes all its variants."
    },
    {
      question: "How do I view all my images across projects?",
      answer: "Click 'All Images' in the sidebar to see every image you've uploaded, regardless of which project they're in. From here you can also rename or delete individual source images."
    },
    {
      question: "What if I need to rename an image?",
      answer: "Hover over any image card to reveal the three-dot menu, then select Rename. Alternatively, click on the name of the image card. Enter a custom display name to make it easier to identify the image in your projects."
    }
  ]

  const handleLogout = async () => {
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          window.location.href = "/"
        },
      },
    })
  }

  const quickActions = [
    {
      title: "Upload Images",
      description: "Start a new virtual staging project",
      icon: Upload,
      action: "upload"
    },
    {
      title: "View Projects",
      description: "Check your current and completed projects",
      icon: Image,
      action: "projects"
    },
    {
      title: "Account Settings",
      description: "Manage your profile and preferences",
      icon: Settings,
      action: "settings"
    },
    {
      title: "Sign Out",
      description: "Log out of your account",
      icon: LogOut,
      action: "signout"
    }
  ]

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="text-center mb-8">
        <HelpCircle className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-3xl font-bold text-foreground">Help & Support</h1>
        <p className="text-muted-foreground">
          Get help with Hukasa virtual staging platform
        </p>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5" />
            <span>Quick Actions</span>
          </CardTitle>
          <CardDescription>Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quickActions.map((action, index) => {
              const handleClick = () => {
                if (action.action === "upload") onUploadClick?.()
                else if (action.action === "projects") onNavigateToProjects?.()
                else if (action.action === "settings") onNavigateToSettings?.()
                else if (action.action === "signout") handleLogout()
              }

              return (
                <Card
                  key={index}
                  className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={handleClick}
                >
                  <div className="flex items-center space-x-3">
                    <action.icon className="h-8 w-8 text-primary" />
                    <div>
                      <h3 className="font-semibold">{action.title}</h3>
                      <p className="text-sm text-muted-foreground">{action.description}</p>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Getting Started */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1.5">
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Getting Started</span>
              </CardTitle>
              <CardDescription>New to virtual staging? Start here</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuickTipsOpen(true)}
              className="gap-2"
            >
              <Video className="h-4 w-4 text-red-500" />
              Video Tutorials
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold shrink-0">1</div>
              <div>
                <h4 className="font-semibold">Upload Your Images</h4>
                <p className="text-sm text-muted-foreground">
                  Click the Upload button in the sidebar or header to get started. You&apos;ll see a dialog where you can choose an existing project
                  or let your images go to &quot;Unassigned Images&quot; to organize later. Select high-quality photos of empty or minimally
                  furnished rooms the clearer your photos, the better your staged results will be. You can upload upto 5 images at once for
                  batch processing.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold shrink-0">2</div>
              <div>
                <h4 className="font-semibold">Organize with Projects</h4>
                <p className="text-sm text-muted-foreground">
                  Create projects to organize your staging work by property, client, or any way that makes sense for your workflow.
                  Navigate to the Projects page to create a new project with a custom name. To move images between projects, open any
                  project, select the images you want to move using checkboxes, and click Move to Project. You can choose an existing
                  destination or create a new project on the spot. Projects help you keep track of different properties and find your work quickly.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold shrink-0">3</div>
              <div>
                <h4 className="font-semibold">Generate Variants</h4>
                <p className="text-sm text-muted-foreground">
                  Click any image from your Dashboard, All Images, or within a project to open the detailed view. Here you can generate
                  up to 4 different AI-staged variants of the same room. Each variant can showcase different furniture styles, layouts,
                  and design aesthetics. This gives you and your clients multiple professionally staged options to choose from. Generation
                  typically takes a few seconds per variant.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold shrink-0">4</div>
              <div>
                <h4 className="font-semibold">Download & Share</h4>
                <p className="text-sm text-muted-foreground">
                  Once your variants are ready, download them individually by clicking the download button on each variant. 
                  Your staged images are ready to use in property listings, marketing materials,
                  social media posts, or client presentations. You can also delete specific variants you don&apos;t need or regenerate
                  new ones if you want to try different styles.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FAQ Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <HelpCircle className="h-5 w-5" />
            <span>Frequently Asked Questions</span>
          </CardTitle>
          <CardDescription>Find answers to common questions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <div key={index} className="border-b last:border-b-0 pb-4 last:pb-0">
                <h4 className="font-semibold mb-2">{faq.question}</h4>
                <p className="text-sm text-muted-foreground">{faq.answer}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Contact Support */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageCircle className="h-5 w-5" />
            <span>Contact Support</span>
          </CardTitle>
          <CardDescription>Still need help? Get in touch with our team</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-center p-6 bg-muted/50 rounded-lg">
              <Mail className="mx-auto h-12 w-12 text-primary mb-4" />
              <h4 className="font-semibold mb-2">Email Support</h4>
              <p className="text-sm text-muted-foreground mb-4">
                 Have a question or need assistance? Send us an email and we&apos;ll get back to you as soon as possible.
              </p>
              <div className="flex gap-2 justify-center">
                <Button
                  variant="outline"
                  onClick={copyEmail}
                  className="gap-2"
                  disabled={!email}
                >
                  <Copy className="h-4 w-4" />
                  {email ? email : 'Loading email...'}
                </Button>
                <Button asChild className="gap-2">
                  <a 
                    href={email ? `mailto:${email}?subject=Hukasa Support Request&body=Hi there,%0A%0AI need help with:%0A%0A` : '#'}
                    className={email ? '' : 'pointer-events-none opacity-50'}
                  >
                    <Mail className="h-4 w-4" />
                    Send Email
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
            

          </div>
        </CardContent>
      </Card>

      {/* Quick Tips Modal */}
      <QuickTipsModal
        open={quickTipsOpen}
        onOpenChange={setQuickTipsOpen}
        onNavigateToHelp={onNavigateToHelp}
      />
    </div>
  )
}