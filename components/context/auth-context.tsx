"use client"

import type React from "react"
import { createContext, useContext, useState } from "react"

type User = {
  displayName: string
}

type AuthContextType = {
  user: User | null
  login: (name: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

/**
 * Temporary AuthProvider
 * ---------------------------------
 * • Starts with a guest user so `IdeHeader` can read `user?.displayName`.
 * • Call `login("Jane")` or `logout()` from anywhere once you add real auth.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>({ displayName: "Guest" })

  const login = (name: string) => setUser({ displayName: name })
  const logout = () => setUser(null)

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuthContext(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuthContext must be used inside <AuthProvider>")
  return ctx
}
