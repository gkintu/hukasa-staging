"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { 
  HelpCircle, 
  FileText, 
  MessageCircle, 
  Mail,
  Upload,
  Image,
  Settings,
  Zap,
  ExternalLink
} from "lucide-react"

export function Help() {
  const faqs = [
    {
      question: "How do I upload images for virtual staging?",
      answer: "Click the &apos;Upload Files&apos; button at the top of the screen or navigate to Projects and click &apos;Upload More&apos;. Select up to 5 images (max 10MB each) in JPG, PNG, or WEBP format."
    },
    {
      question: "What image formats are supported?",
      answer: "We support JPG, PNG, and WEBP formats. Images should be high-resolution for best results, with a recommended minimum size of 1200x800 pixels."
    },
    {
      question: "How long does virtual staging take?",
      answer: "Processing typically takes 5-15 minutes depending on image size and complexity. You&apos;ll receive notifications when your staged images are ready."
    },
    {
      question: "Can I customize the staging style?",
      answer: "Yes! You can choose from various design styles including Modern, Scandinavian, Industrial, Farmhouse, and more. Set your default style in Settings or choose per project."
    },
    {
      question: "How do I download my staged images?",
      answer: "Go to Projects, find your completed project, and click the download button. You can also enable auto-download in Settings to automatically download completed projects."
    },
    {
      question: "What if I'm not satisfied with the results?",
      answer: "You can regenerate images with different styles or settings. Contact our support team if you need assistance with specific adjustments."
    }
  ]

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
      title: "Processing Status",
      description: "Check the status of your staging jobs",
      icon: Zap,
      action: "status"
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
            {quickActions.map((action, index) => (
              <Card key={index} className="p-4 hover:bg-muted/50 transition-colors cursor-pointer">
                <div className="flex items-center space-x-3">
                  <action.icon className="h-8 w-8 text-primary" />
                  <div>
                    <h3 className="font-semibold">{action.title}</h3>
                    <p className="text-sm text-muted-foreground">{action.description}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Getting Started */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Getting Started</span>
          </CardTitle>
          <CardDescription>New to virtual staging? Start here</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">1</div>
              <div>
                <h4 className="font-semibold">Upload Your Images</h4>
                <p className="text-sm text-muted-foreground">Click &apos;Upload Files&apos; and select high-quality images of empty or minimally furnished rooms.</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">2</div>
              <div>
                <h4 className="font-semibold">Choose Your Style</h4>
                <p className="text-sm text-muted-foreground">Select from our range of design styles or use your default preference.</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">3</div>
              <div>
                <h4 className="font-semibold">Wait for Processing</h4>
                <p className="text-sm text-muted-foreground">Our AI will generate beautifully staged versions of your rooms in minutes.</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">4</div>
              <div>
                <h4 className="font-semibold">Download & Use</h4>
                <p className="text-sm text-muted-foreground">Download your staged images and use them in your property listings.</p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-4">Send us a message</h4>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="support-email">Email Address</Label>
                  <Input id="support-email" type="email" placeholder="your@email.com" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="support-subject">Subject</Label>
                  <Input id="support-subject" placeholder="How can we help?" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="support-message">Message</Label>
                  <Textarea 
                    id="support-message" 
                    placeholder="Describe your issue or question..."
                    className="mt-1"
                    rows={4}
                  />
                </div>
                <Button className="w-full">
                  <Mail className="mr-2 h-4 w-4" />
                  Send Message
                </Button>
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-semibold">Other ways to reach us</h4>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50">
                  <Mail className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Email Support</p>
                    <p className="text-sm text-muted-foreground">support@hukasa.com</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50">
                  <FileText className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Documentation</p>
                    <p className="text-sm text-muted-foreground">Detailed guides and tutorials</p>
                  </div>
                </div>
                
                <Button variant="outline" className="w-full">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Visit Documentation
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}