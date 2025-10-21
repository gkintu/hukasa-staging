"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

type ThemeMode = "light" | "dark"

interface ThemeProviderProps
  extends React.ComponentProps<typeof NextThemesProvider> {
  initialTheme: ThemeMode
}

const ThemeHydrationContext = React.createContext<ThemeMode>("light")

export function ThemeProvider({
  children,
  initialTheme,
  ...props
}: ThemeProviderProps) {
  return (
    <ThemeHydrationContext.Provider value={initialTheme}>
      <NextThemesProvider {...props}>{children}</NextThemesProvider>
    </ThemeHydrationContext.Provider>
  )
}

export function useInitialTheme() {
  return React.useContext(ThemeHydrationContext)
}
