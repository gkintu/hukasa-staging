import { headers } from "next/headers"
import { LandingPage } from "@/components/landing"
import { validateServerSession } from "@/lib/auth-utils"
import { MainApp } from "@/components/main-app"
import { SharedQueryProvider } from "@/lib/shared/providers/query-provider"
import { redirect } from "next/navigation"

export default async function Home() {
  const sessionResult = await validateServerSession(await headers())

  // Handle suspended users
  if (!sessionResult.success && 'suspended' in sessionResult && sessionResult.suspended) {
    redirect('/account-suspended')
  }

  // Handle valid sessions
  if (sessionResult.success && sessionResult.user) {
    return (
      <SharedQueryProvider>
        <MainApp user={sessionResult.user} />
      </SharedQueryProvider>
    )
  }

  // Handle unauthenticated users
  return <LandingPage />
}
