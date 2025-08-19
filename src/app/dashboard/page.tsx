import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Header } from "@/components/header"
import { validateServerSession } from "@/lib/auth-utils"

export default async function DashboardPage() {
    const session = await validateServerSession(await headers())

    if (!session) {
        redirect("/login")
    }

    return (
        <div className="min-h-screen bg-background">
            <Header />
            <main className="container py-6">
                <div className="max-w-2xl mx-auto space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-2xl">
                                Welcome to Hukasa Dashboard
                            </CardTitle>
                            <CardDescription>
                                AI Virtual Staging Platform
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid gap-4">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Name</p>
                                    <p className="text-lg font-medium">{session.user.name}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Email</p>
                                    <p className="text-lg font-medium">{session.user.email}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">User ID</p>
                                    <p className="text-sm text-muted-foreground font-mono">{session.user.id}</p>
                                </div>
                            </div>
                            <div className="pt-4 border-t">
                                <p className="text-sm text-muted-foreground">
                                    Use the user menu in the top-right corner to sign out or access your profile.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    )
}