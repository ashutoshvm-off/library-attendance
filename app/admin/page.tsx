"use client"

import { AuthProvider, useAuth } from "@/components/auth-context"
import LoginScreen from "@/components/login-screen"
import { AdminPanel } from "@/components/admin-panel"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Shield, ArrowLeft, LogOut } from "lucide-react"
import Link from "next/link"

function AdminContent() {
  const { isAuthenticated, staff, logout } = useAuth()

  if (!isAuthenticated) {
    return <LoginScreen isAdminLogin={true} />
  }

  // Check if user has admin privileges
  const isAdmin = staff?.isAdmin === true || staff?.role === "System Admin" || staff?.id === "ADMIN"

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-pink-50 to-orange-50">
        <Card className="w-full max-w-md bg-white/80 backdrop-blur-sm border-white/20 shadow-2xl">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto p-4 bg-gradient-to-r from-red-500 to-pink-600 rounded-full w-fit">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-red-600">Access Denied</CardTitle>
              <p className="text-gray-600 mt-2">You don't have permission to access the admin panel.</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">
                <strong>Current User:</strong> {staff?.name} ({staff?.role})
              </p>
              <p className="text-sm text-red-600 mt-1">Only System Administrators can access this panel.</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800 font-medium mb-2">To Access Admin Panel:</p>
              <ol className="text-sm text-blue-600 space-y-1">
                <li>1. Logout from current account</li>
                <li>
                  2. Login with Admin ID: <code className="bg-blue-100 px-2 py-1 rounded">ADMIN</code>
                </li>
                <li>
                  3. Enter password: <code className="bg-blue-100 px-2 py-1 rounded">admin2024</code>
                </li>
              </ol>
            </div>

            <div className="flex gap-2">
              <Link href="/" className="flex-1">
                <Button variant="outline" className="w-full bg-transparent">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <Button
                onClick={logout}
                className="flex-1 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout & Switch
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <AdminPanel staff={staff} />
}

export default function AdminPage() {
  return (
    <AuthProvider>
      <AdminContent />
    </AuthProvider>
  )
}
