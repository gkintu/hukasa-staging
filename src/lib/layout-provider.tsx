"use client"

import { createContext, useContext, useState, useEffect } from "react"

export type Collapsible = "offcanvas" | "icon" | "none"
export type Variant = "inset" | "sidebar" | "floating"

// Cookie constants following the pattern from sidebar.tsx
const LAYOUT_COLLAPSIBLE_COOKIE_NAME = "layout_collapsible"
const LAYOUT_VARIANT_COOKIE_NAME = "layout_variant"
const LAYOUT_COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

// Default values
const DEFAULT_VARIANT = "inset"
const DEFAULT_COLLAPSIBLE = "icon"

type LayoutContextType = {
  resetLayout: () => void

  defaultCollapsible: Collapsible
  collapsible: Collapsible
  setCollapsible: (collapsible: Collapsible) => void

  defaultVariant: Variant
  variant: Variant
  setVariant: (variant: Variant) => void
}

const LayoutContext = createContext<LayoutContextType | null>(null)

type LayoutProviderProps = {
  children: React.ReactNode
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null
  
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop()?.split(";").shift() || null
  return null
}

function setCookie(name: string, value: string, maxAge: number) {
  if (typeof document === "undefined") return
  
  document.cookie = `${name}=${value}; path=/; max-age=${maxAge}`
}

export function LayoutProvider({ children }: LayoutProviderProps) {
  // Initialize with defaults to match server-side render
  const [collapsible, _setCollapsible] = useState<Collapsible>(DEFAULT_COLLAPSIBLE)
  const [variant, _setVariant] = useState<Variant>(DEFAULT_VARIANT)

  // Read cookie only on client after hydration (prevents mismatch)
  useEffect(() => {
    const savedCollapsible = getCookie(LAYOUT_COLLAPSIBLE_COOKIE_NAME)
    const savedVariant = getCookie(LAYOUT_VARIANT_COOKIE_NAME)

    if (savedCollapsible) {
      _setCollapsible(savedCollapsible as Collapsible)
    }
    if (savedVariant) {
      _setVariant(savedVariant as Variant)
    }
  }, [])

  const setCollapsible = (newCollapsible: Collapsible) => {
    _setCollapsible(newCollapsible)
    setCookie(
      LAYOUT_COLLAPSIBLE_COOKIE_NAME,
      newCollapsible,
      LAYOUT_COOKIE_MAX_AGE
    )
  }

  const setVariant = (newVariant: Variant) => {
    _setVariant(newVariant)
    setCookie(LAYOUT_VARIANT_COOKIE_NAME, newVariant, LAYOUT_COOKIE_MAX_AGE)
  }

  const resetLayout = () => {
    setCollapsible(DEFAULT_COLLAPSIBLE)
    setVariant(DEFAULT_VARIANT)
  }

  const contextValue: LayoutContextType = {
    resetLayout,
    defaultCollapsible: DEFAULT_COLLAPSIBLE,
    collapsible,
    setCollapsible,
    defaultVariant: DEFAULT_VARIANT,
    variant,
    setVariant,
  }

  return <LayoutContext value={contextValue}>{children}</LayoutContext>
}

// Define the hook for the provider
export function useLayout() {
  const context = useContext(LayoutContext)
  if (!context) {
    throw new Error("useLayout must be used within a LayoutProvider")
  }
  return context
}