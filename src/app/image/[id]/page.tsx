import { headers } from "next/headers"
import { validateServerSession } from "@/lib/auth-utils"
import { redirect } from "next/navigation"
import { ImageDetailPage } from "@/components/image-detail-page"
import { SharedQueryProvider } from "@/lib/shared/providers/query-provider"

interface PageProps {
  params: {
    id: string
  }
}

export default async function ImagePage({ params }: PageProps) {
  const sessionResult = await validateServerSession(await headers())

  // Handle suspended users
  if (!sessionResult.success && 'suspended' in sessionResult && sessionResult.suspended) {
    redirect('/account-suspended')
  }

  // Redirect unauthenticated users to login
  if (!sessionResult.success || !sessionResult.user) {
    redirect('/login')
  }

  return (
    <SharedQueryProvider>
      <ImageDetailPage imageId={params.id} user={sessionResult.user} />
    </SharedQueryProvider>
  )
}