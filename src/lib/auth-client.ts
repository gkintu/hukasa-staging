import { createAuthClient } from "better-auth/react"

const getBaseUrl = () => {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL
    if (!baseUrl) {
        throw new Error('NEXT_PUBLIC_APP_URL environment variable is required')
    }
    return baseUrl
}

export const authClient = createAuthClient({
    baseURL: getBaseUrl()
})

export const { signIn, signOut, useSession } = authClient