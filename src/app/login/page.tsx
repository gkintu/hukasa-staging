"use client"

import { signIn } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useState } from "react"
import { Loader2 } from "lucide-react"
import { useSearchParams } from "next/navigation"

export default function LoginPage() {
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
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center space-y-2">
                    <CardTitle className="text-2xl font-semibold">
                        Welcome to Hukasa
                    </CardTitle>
                    <CardDescription>
                        AI Virtual Staging Platform
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button 
                        onClick={handleGoogleSignIn}
                        disabled={isSigningIn}
                        className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-medium disabled:opacity-50"
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
        </div>
    )
}