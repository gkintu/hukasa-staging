"use client"

import { useCallback } from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { setTheme, theme, resolvedTheme } = useTheme()

  const handleToggle = useCallback(() => {
    const currentTheme = theme === "system" ? resolvedTheme : theme
    const nextTheme = currentTheme === "dark" ? "light" : "dark"

    setTheme(nextTheme)
    document.cookie = `theme=${nextTheme}; path=/; max-age=31536000; SameSite=Lax`
  }, [resolvedTheme, setTheme, theme])

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleToggle}
      className="h-9 w-9"
    >
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
