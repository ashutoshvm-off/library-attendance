"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { getOfflineSyncService } from "@/lib/offline-sync"

interface Staff {
  id: string
  name: string
  role: string
  avatar?: string
  isAdmin?: boolean
  password?: string
}

interface LoginRecord {
  $id?: string
  staffId: string
  staffName: string
  staffRole: string
  loginTime: string
  logoutTime?: string
  sessionDuration?: number
  ipAddress?: string
  userAgent?: string
}

interface AuthContextType {
  isAuthenticated: boolean
  staff: Staff | null
  login: (staffId: string, password?: string) => Promise<boolean>
  loginAdmin: (staffId: string, password: string) => Promise<boolean>
  logout: () => void
  currentSession: LoginRecord | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Mock staff database - replace with your actual staff data
const STAFF_DATABASE: Record<string, Staff> = {
  STAFF001: {
    id: "STAFF001",
    name: "Sarah Johnson",
    role: "Head Librarian",
    avatar: "/placeholder.svg?height=40&width=40",
    isAdmin: false,
    password: "library123",
  },
  STAFF002: {
    id: "STAFF002",
    name: "Michael Chen",
    role: "Assistant Librarian",
    avatar: "/placeholder.svg?height=40&width=40",
    isAdmin: false,
    password: "library123",
  },
  STAFF003: {
    id: "STAFF003",
    name: "Emily Davis",
    role: "Library Assistant",
    avatar: "/placeholder.svg?height=40&width=40",
    isAdmin: false,
    password: "library123",
  },
  ADMIN: {
    id: "ADMIN",
    name: "ASIET Administrator",
    role: "System Admin",
    avatar: "/placeholder.svg?height=40&width=40",
    isAdmin: true,
    password: "admin2024",
  },
  // Add more admin accounts if needed
  ADMIN001: {
    id: "ADMIN001",
    name: "ASIET Admin",
    role: "System Admin",
    avatar: "/placeholder.svg?height=40&width=40",
    isAdmin: true,
    password: "admin2024",
  },
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [staff, setStaff] = useState<Staff | null>(null)
  const [currentSession, setCurrentSession] = useState<LoginRecord | null>(null)
  const [offlineSyncService] = useState(() => getOfflineSyncService())
  const [appwriteService] = useState(() => offlineSyncService.getAppwriteService())

  useEffect(() => {
    // Check for existing session
    const savedStaff = localStorage.getItem("library-staff")
    const savedSession = localStorage.getItem("library-session")

    if (savedStaff && savedSession) {
      try {
        const staffData = JSON.parse(savedStaff)
        const sessionData = JSON.parse(savedSession)
        setStaff(staffData)
        setCurrentSession(sessionData)
        setIsAuthenticated(true)
      } catch (error) {
        console.error("Error parsing saved data:", error)
        localStorage.removeItem("library-staff")
        localStorage.removeItem("library-session")
      }
    }
  }, [])

  const getClientInfo = () => {
    return {
      userAgent: typeof window !== "undefined" ? window.navigator.userAgent : "Unknown",
      ipAddress: "Unknown", // In a real app, you'd get this from the server
    }
  }

  const login = async (staffId: string, password?: string): Promise<boolean> => {
    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const staffMember = STAFF_DATABASE[staffId.toUpperCase()]

    if (staffMember) {
      // Check password for admin accounts
      if (staffMember.isAdmin && password !== staffMember.password) {
        return false
      }

      // For regular staff, password is optional (backward compatibility)
      if (!staffMember.isAdmin && password && password !== staffMember.password) {
        return false
      }

      // Create login record
      const clientInfo = getClientInfo()
      const loginRecord: LoginRecord = {
        staffId: staffMember.id,
        staffName: staffMember.name,
        staffRole: staffMember.role,
        loginTime: new Date().toISOString(),
        userAgent: clientInfo.userAgent,
        ipAddress: clientInfo.ipAddress,
      }

      try {
        // Save login record to database using offline sync service
        const savedRecord = await appwriteService.createLoginRecord(loginRecord)
        setCurrentSession(savedRecord)
        localStorage.setItem("library-session", JSON.stringify(savedRecord))
      } catch (error) {
        console.error("Error saving login record:", error)
        // Continue with local session even if database save fails
        setCurrentSession(loginRecord)
        localStorage.setItem("library-session", JSON.stringify(loginRecord))
      }

      setStaff(staffMember)
      setIsAuthenticated(true)
      localStorage.setItem("library-staff", JSON.stringify(staffMember))

      return true
    }
    return false
  }

  const loginAdmin = async (staffId: string, password: string): Promise<boolean> => {
    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const staffMember = STAFF_DATABASE[staffId.toUpperCase()]

    if (staffMember && staffMember.isAdmin) {
      // Admin accounts require password
      if (password !== staffMember.password) {
        return false
      }

      // Create login record
      const clientInfo = getClientInfo()
      const loginRecord: LoginRecord = {
        staffId: staffMember.id,
        staffName: staffMember.name,
        staffRole: staffMember.role,
        loginTime: new Date().toISOString(),
        userAgent: clientInfo.userAgent,
        ipAddress: clientInfo.ipAddress,
      }

      try {
        const savedRecord = await appwriteService.createLoginRecord(loginRecord)
        setCurrentSession(savedRecord)
        localStorage.setItem("library-session", JSON.stringify(savedRecord))
      } catch (error) {
        console.error("Error saving login record:", error)
        setCurrentSession(loginRecord)
        localStorage.setItem("library-session", JSON.stringify(loginRecord))
      }

      setStaff(staffMember)
      setIsAuthenticated(true)
      localStorage.setItem("library-staff", JSON.stringify(staffMember))

      return true
    }
    return false
  }

  const logout = async () => {
    // Update logout time in current session
    if (currentSession) {
      const logoutTime = new Date().toISOString()
      const sessionDuration = Math.round(
        (new Date(logoutTime).getTime() - new Date(currentSession.loginTime).getTime()) / 1000,
      )

      const updatedSession = {
        ...currentSession,
        logoutTime,
        sessionDuration,
      }

      try {
        // Update login record with logout time
        if (currentSession.$id) {
          await appwriteService.updateLoginRecord(currentSession.$id, {
            logoutTime,
            sessionDuration,
          })
        }
      } catch (error) {
        console.error("Error updating logout record:", error)
      }
    }

    setIsAuthenticated(false)
    setStaff(null)
    setCurrentSession(null)
    localStorage.removeItem("library-staff")
    localStorage.removeItem("library-session")

    // Redirect to home page after logout
    window.location.href = "/"
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, staff, login, loginAdmin, logout, currentSession }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
