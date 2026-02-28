"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"

type Theme = "light" | "dark"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
}

type ThemeContextType = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children, defaultTheme = "light" }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(defaultTheme)

  useEffect(() => {
    // Prefer cross-app cookie if present
    const cookieTheme = (() => {
      if (typeof document === "undefined") return null
      const match = document.cookie
        .split("; ")
        .find((row) => row.startsWith("beblocky_theme="))
      if (!match) return null
      const value = match.split("=")[1] as Theme | undefined
      return value === "light" || value === "dark" ? value : null
    })()

    if (cookieTheme) {
      setTheme(cookieTheme)
      return
    }

    // Check for saved theme preference in localStorage
    const savedTheme = localStorage.getItem("theme") as Theme | null

    if (savedTheme) {
      setTheme(savedTheme)
    } else {
      // Check for system preference
      const systemPreference = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
      setTheme(systemPreference)
    }
  }, [])

  useEffect(() => {
    // Update localStorage and document class when theme changes
    localStorage.setItem("theme", theme)

    const root = window.document.documentElement
    root.classList.remove("light", "dark")
    root.classList.add(theme)

    const hostname = window.location.hostname
    const isBeblockyDomain = hostname.endsWith(".beblocky.com")
    const cookieBase = `beblocky_theme=${theme}; Path=/; Max-Age=${
      60 * 60 * 24 * 365
    }; SameSite=Lax`
    document.cookie = isBeblockyDomain
      ? `${cookieBase}; Domain=.beblocky.com`
      : cookieBase
  }, [theme])

  const value = {
    theme,
    setTheme,
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext)

  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }

  return context
}
