"use client"

import { UserMenu } from "@/components/user-menu"
import { ModeToggle } from "@/components/mode-toggle"

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-semibold">Hukasa</h1>
          <span className="text-sm text-muted-foreground">AI Virtual Staging Platform</span>
        </div>
        <div className="flex items-center space-x-2">
          <ModeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  )
}