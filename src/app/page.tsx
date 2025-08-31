import { headers } from "next/headers"
import { LandingPage } from "@/components/landing"
import { validateServerSession } from "@/lib/auth-utils"
import { MainApp } from "@/components/main-app"
import { redirect } from "next/navigation"

export default async function Home() {
  const sessionResult = await validateServerSession(await headers())
  
  // Handle suspended users
  if (sessionResult === 'suspended') {
    redirect('/account-suspended')
  }
  
  // Handle valid sessions
  if (sessionResult && typeof sessionResult !== 'string') {
    return <MainApp user={sessionResult.user} />
  }
  
  // Handle unauthenticated users
  return <LandingPage />
}
