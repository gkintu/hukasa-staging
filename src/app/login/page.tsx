"use client"

import { signIn } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useState, Suspense } from "react"
import { Loader2 } from "lucide-react"
import { useSearchParams } from "next/navigation"

function LoginForm() {
    const [isSigningIn, setIsSigningIn] = useState(false)
    const searchParams = useSearchParams()
    const callbackUrl = searchParams.get("callbackUrl") || "/dashboard"

    const handleGoogleSignIn = async () => {
        setIsSigningIn(true)
        try {
            await signIn.social({
                provider: "google",
                callbackURL: callbackUrl
            })
        } catch (error) {
            console.error("Sign in failed:", error)
            setIsSigningIn(false)
        }
    }

    return (
        <Card className="w-full max-w-md border border-border bg-card">
            <CardHeader className="text-center space-y-2">
                <CardTitle className="text-2xl font-bold text-foreground">
                    Welcome to Hukasa
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                    AI Virtual Staging Platform
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Button 
                    onClick={handleGoogleSignIn}
                    disabled={isSigningIn}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium disabled:opacity-50"
                    size="lg"
                >
                    {isSigningIn ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Signing in...
                        </>
                    ) : (
                        "Sign in with Google"
                    )}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                    By signing in, you agree to our Terms of Service and Privacy Policy
                </p>
            </CardContent>
        </Card>
    )
}

export default function LoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20 p-6">
            <Suspense fallback={
                <Card className="w-full max-w-md border border-border bg-card">
                    <CardContent className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                    </CardContent>
                </Card>
            }>
                <LoginForm />
            </Suspense>
        </div>
    )
}