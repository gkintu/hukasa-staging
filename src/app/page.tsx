import { headers } from "next/headers"
import { LandingPage } from "@/components/landing"
import { validateServerSession } from "@/lib/auth-utils"
import { MainApp } from "@/components/main-app"
import { SharedQueryProvider } from "@/lib/shared/providers/query-provider"
import { SearchProvider } from "@/lib/search-provider"
import { getMainAppSearchData } from "@/lib/main-app-search-data"
import { redirect } from "next/navigation"

export default async function Home() {
  const sessionResult = await validateServerSession(await headers())
  
  // Handle suspended users
  if (sessionResult === 'suspended') {
    redirect('/account-suspended')
  }
  
  // Handle valid sessions
  if (sessionResult && typeof sessionResult !== 'string') {
    const mainAppSearchData = getMainAppSearchData()
    
    return (
      <SharedQueryProvider>
        <SearchProvider searchableData={mainAppSearchData}>
          <MainApp user={sessionResult.user} />
        </SearchProvider>
      </SharedQueryProvider>
    )
  }
  
  // Handle unauthenticated users
  return <LandingPage />
}
