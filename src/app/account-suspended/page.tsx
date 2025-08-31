import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, Mail } from "lucide-react"
import Link from "next/link"

export default function AccountSuspendedPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-semibold">Account Suspended</CardTitle>
          <CardDescription className="text-base">
            Your account has been temporarily suspended
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              Your account access has been temporarily restricted due to a violation of our terms of service or community guidelines.
            </p>
            <p>
              This suspension is temporary and you may regain access after review or upon expiration of the suspension period.
            </p>
          </div>
          
          <div className="space-y-3">
            <Button asChild className="w-full" variant="outline">
              <Link href="mailto:support@hukasa.com" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Contact Support
              </Link>
            </Button>
            
            <Button asChild className="w-full" variant="secondary">
              <Link href="/">
                Return to Home
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}