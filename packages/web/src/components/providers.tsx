"use client"

import { SessionProvider } from "next-auth/react"
import { ThemeProvider } from "next-themes"
import { SidebarProvider } from "@/components/ui/sidebar"
import { useState, useEffect } from "react"

export function Providers({ children }: { children: React.ReactNode }) {
  // Add this to ensure hydration doesn't cause mismatches
  const [mounted, setMounted] = useState(false)

  // Only render children client-side to avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <SessionProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
        storageKey="terapotik-theme"
      >
        <SidebarProvider
          defaultOpen={true}
          style={
            {
              "--sidebar-width": "16rem",
              "--sidebar-width-mobile": "16rem",
            } as React.CSSProperties
          }
        >
          {mounted ? children : null}
        </SidebarProvider>
      </ThemeProvider>
    </SessionProvider>
  )
}
