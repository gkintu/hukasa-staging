import { headers } from "next/headers"
import { LandingPage } from "@/components/landing"
import { validateServerSession } from "@/lib/auth-utils"
import { MainApp } from "@/components/main-app"

export default async function Home() {
  const session = await validateServerSession(await headers())
  
  if (session) {
    return <MainApp user={session.user} />
  }
  
  return <LandingPage />
}
