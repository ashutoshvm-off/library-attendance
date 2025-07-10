"use client"

import { AuthProvider, useAuth } from "@/components/auth-context"
import LoginScreen from "@/components/login-screen"
import { LogoUpload } from "@/components/logo-upload"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

function BrandingContent() {
  const { isAuthenticated, staff } = useAuth()

  if (!isAuthenticated) {
    return <LoginScreen />
  }

  // Check if user has admin privileges
  const isAdmin = staff?.isAdmin === true || staff?.role === "System Admin" || staff?.id === "ADMIN"

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-pink-50 to-orange-50">
        <Card className="w-full max-w-md bg-white/80 backdrop-blur-sm border-white/20 shadow-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-red-600">Access Denied</CardTitle>
            <p className="text-gray-600 mt-2">Only administrators can access branding settings.</p>
          </CardHeader>
          <CardContent>
            <Link href="/">
              <Button variant="outline" className="w-full bg-transparent">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="container mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              College Branding
            </h1>
            <p className="text-gray-600">Customize your library system's appearance</p>
          </div>
          <Link href="/admin">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Admin
            </Button>
          </Link>
        </div>

        {/* Logo Upload */}
        <LogoUpload />

        {/* Preview Section */}
        <Card className="bg-white/80 backdrop-blur-sm border-white/20">
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <p className="text-sm text-gray-600">How your branding will appear across the system</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Login Screen Preview */}
              <div className="space-y-2">
                <h3 className="font-medium">Login Screen</h3>
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-4 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-xl shadow-sm">
                      <img
                        src="/logo.png"
                        alt="Logo Preview"
                        className="w-6 h-6 object-contain"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.style.display = "none"
                          target.nextElementSibling?.classList.remove("hidden")
                        }}
                      />
                      <div className="hidden w-6 h-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded text-white text-xs flex items-center justify-center font-bold">
                        YC
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold text-lg bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        Your College Name
                      </h4>
                      <p className="text-xs text-gray-600">Library Management System</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dashboard Preview */}
              <div className="space-y-2">
                <h3 className="font-medium">Dashboard Header</h3>
                <div className="bg-white p-4 rounded-lg border shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-xl shadow-sm">
                      <img
                        src="/logo.png"
                        alt="Logo Preview"
                        className="w-5 h-5 object-contain"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.style.display = "none"
                          target.nextElementSibling?.classList.remove("hidden")
                        }}
                      />
                      <div className="hidden w-5 h-5 bg-gradient-to-r from-blue-600 to-purple-600 rounded text-white text-xs flex items-center justify-center font-bold">
                        YC
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        Your College Library
                      </h4>
                      <p className="text-xs text-gray-600">Library Management System</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function BrandingPage() {
  return (
    <AuthProvider>
      <BrandingContent />
    </AuthProvider>
  )
}
