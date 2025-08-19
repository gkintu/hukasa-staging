import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { Header } from "@/components/header"
import { validateServerSession } from "@/lib/auth-utils"
import { DashboardContent } from "./components/DashboardContent"

export default async function DashboardPage() {
    const session = await validateServerSession(await headers())

    if (!session) {
        redirect("/login")
    }

    return (
        <div className="min-h-screen bg-background">
            <Header />
            <main className="container py-6">
                <DashboardContent user={session.user} />
            </main>
        </div>
    )
}