"use client"

import type React from "react"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"
import { ScanLine, Users, BarChart3, Shield, RefreshCw, Eye, EyeOff, Lock, Zap, Star, CheckCircle } from "lucide-react"
import { useAuth } from "./auth-context"

interface LoginScreenProps {
  isAdminLogin?: boolean
}

function LoginScreen({ isAdminLogin = false }: LoginScreenProps) {
  const [staffId, setStaffId] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const { login, loginAdmin } = useAuth()

  const handleLogin = async () => {
    if (!staffId.trim()) {
      toast({
        title: "Error",
        description: "Please enter your staff ID",
        variant: "destructive",
      })
      return
    }

    if (isAdminLogin) {
      // Admin login requires password
      if (!password.trim()) {
        toast({
          title: "Password Required",
          description: "Admin login requires a password",
          variant: "destructive",
        })
        return
      }

      setIsScanning(true)
      try {
        const success = await loginAdmin(staffId, password)
        if (success) {
          toast({
            title: "Admin Login Successful",
            description: "Welcome to the Admin Panel",
          })
        } else {
          toast({
            title: "Admin Login Failed",
            description: "Invalid admin credentials",
            variant: "destructive",
          })
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "An error occurred during admin login",
          variant: "destructive",
        })
      } finally {
        setIsScanning(false)
      }
    } else {
      // Regular staff login (password optional)
      const requiresPassword = staffId.toUpperCase() === "ADMIN" || staffId.toUpperCase().startsWith("ADMIN")

      if (requiresPassword && !password.trim()) {
        toast({
          title: "Password Required",
          description: "Admin accounts require a password",
          variant: "destructive",
        })
        return
      }

      setIsScanning(true)
      try {
        const success = await login(staffId, password)
        if (success) {
          toast({
            title: "Login Successful",
            description: "Welcome to the Library Management System",
          })
        } else {
          toast({
            title: "Login Failed",
            description: requiresPassword ? "Invalid staff ID or password" : "Invalid staff ID. Please try again.",
            variant: "destructive",
          })
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "An error occurred during login",
          variant: "destructive",
        })
      } finally {
        setIsScanning(false)
      }
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleLogin()
    }
  }

  // Update the title and description based on login type:
  const title = isAdminLogin ? "Admin Login" : "Staff Login"
  const description = isAdminLogin
    ? "Enter admin credentials to access the admin panel"
    : "Enter your credentials to access the system"

  // Always show password field for admin login:
  const shouldShowPassword =
    isAdminLogin || staffId.toUpperCase() === "ADMIN" || staffId.toUpperCase().startsWith("ADMIN")

  // Update the demo credentials section for admin login:
  const demoIds = isAdminLogin ? ["ADMIN", "ADMIN001"] : ["STAFF001", "STAFF002", "STAFF003", "ADMIN"]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 opacity-40">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='%239C92AC' fillOpacity='0.05'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-7xl grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - Hero Section */}
          <div className="text-center lg:text-left space-y-8">
            {/* Main Branding */}
            <div className="space-y-6">
              <div className="flex items-center justify-center lg:justify-start gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur-lg opacity-75"></div>
                  <div className="relative p-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl">
                    <img src="/logo.png" alt="ASIET Logo" className="w-10 h-10 object-contain" />
                  </div>
                </div>
                <div>
                  <h1 className="text-5xl lg:text-6xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">
                    LibraryOS
                  </h1>
                  <p className="text-lg text-gray-300 font-medium">ASIET Library</p>
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="text-3xl lg:text-4xl font-bold text-white leading-tight">
                  Modern Library Management
                  <span className="block bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                    for the Digital Age
                  </span>
                </h2>
                <p className="text-xl text-gray-300 max-w-lg">
                  Streamline student tracking, generate insights, and manage your library with cutting-edge technology.
                </p>
              </div>
            </div>

            {/* Feature Highlights */}
            <div className="grid grid-cols-2 lg:grid-cols-2 gap-4 max-w-lg mx-auto lg:mx-0">
              <div className="group p-6 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 hover:bg-white/10 transition-all duration-300">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg">
                    <ScanLine className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-bold text-white">Smart Scanning</h3>
                </div>
                <p className="text-sm text-gray-300">Lightning-fast barcode scanning with real-time processing</p>
              </div>

              <div className="group p-6 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 hover:bg-white/10 transition-all duration-300">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg">
                    <BarChart3 className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-bold text-white">Live Analytics</h3>
                </div>
                <p className="text-sm text-gray-300">Real-time insights and comprehensive reporting</p>
              </div>

              <div className="group p-6 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 hover:bg-white/10 transition-all duration-300">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-bold text-white">Student Tracking</h3>
                </div>
                <p className="text-sm text-gray-300">Comprehensive student attendance monitoring</p>
              </div>

              <div className="group p-6 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 hover:bg-white/10 transition-all duration-300">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-bold text-white">Secure Access</h3>
                </div>
                <p className="text-sm text-gray-300">Role-based authentication and data protection</p>
              </div>
            </div>

            {/* Stats Section */}
            <div className="flex items-center justify-center lg:justify-start gap-8 pt-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-white">99.9%</div>
                <div className="text-sm text-gray-400">Uptime</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white">10k+</div>
                <div className="text-sm text-gray-400">Students</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white">24/7</div>
                <div className="text-sm text-gray-400">Support</div>
              </div>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="flex justify-center lg:justify-end">
            <Card className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
              <CardHeader className="text-center space-y-6 pb-8">
                <div className="relative mx-auto">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur-lg opacity-75"></div>
                  <div className="relative p-4 bg-white rounded-full shadow-lg">
                    <img src="/logo.png" alt="ASIET Logo" className="w-10 h-10 object-contain" />
                  </div>
                </div>
                <div>
                  <CardTitle className="text-3xl font-bold text-white">{title}</CardTitle>
                  <CardDescription className="text-gray-300 text-lg mt-2">{description}</CardDescription>
                </div>
              </CardHeader>

              <CardContent className="space-y-6 px-8 pb-8">
                <div className="space-y-5">
                  <div className="space-y-3">
                    <Label htmlFor="staffId" className="text-white font-medium">
                      Staff ID
                    </Label>
                    <div className="relative">
                      <Input
                        id="staffId"
                        placeholder="Enter Staff ID (e.g., STAFF001)"
                        value={staffId}
                        onChange={(e) => setStaffId(e.target.value.toUpperCase())}
                        onKeyPress={handleKeyPress}
                        className="text-lg h-14 pl-14 bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-blue-400 focus:ring-blue-400/50 backdrop-blur-sm"
                      />
                      <ScanLine className="absolute left-4 top-1/2 transform -translate-y-1/2 w-6 h-6 text-gray-400" />
                    </div>
                  </div>

                  {shouldShowPassword && (
                    <div className="space-y-3">
                      <Label htmlFor="password" className="text-white font-medium">
                        Password
                      </Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter admin password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          onKeyPress={handleKeyPress}
                          className="text-lg h-14 pl-14 pr-14 bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-blue-400 focus:ring-blue-400/50 backdrop-blur-sm"
                        />
                        <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-6 h-6 text-gray-400" />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 h-10 w-10 p-0 text-gray-400 hover:text-white"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </Button>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={handleLogin}
                    disabled={isScanning || !staffId.trim() || (shouldShowPassword && !password.trim())}
                    className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 border-0 shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    {isScanning ? (
                      <>
                        <RefreshCw className="w-6 h-6 animate-spin mr-3" />
                        Authenticating...
                      </>
                    ) : (
                      <>
                        <Shield className="w-6 h-6 mr-3" />
                        Access System
                      </>
                    )}
                  </Button>
                </div>

                {/* Demo Credentials */}
                <div className="space-y-4 pt-4 border-t border-white/20">
                  <p className="text-sm text-gray-300 text-center font-medium">Quick Access Demo IDs:</p>
                  <div className="grid grid-cols-2 gap-3">
                    {demoIds.map((id) => (
                      <Badge
                        key={id}
                        variant="outline"
                        className={`cursor-pointer hover:bg-white/20 transition-all duration-200 text-center justify-center py-3 px-4 border-white/30 text-white hover:border-white/50 ${
                          id === "ADMIN" ? "bg-red-500/20 border-red-400/50 text-red-200 hover:bg-red-500/30" : ""
                        }`}
                        onClick={() => {
                          setStaffId(id)
                          if (id === "ADMIN") {
                            setPassword("")
                          }
                        }}
                      >
                        {id}
                        {id === "ADMIN" && <span className="ml-1 text-xs">(Admin)</span>}
                      </Badge>
                    ))}
                  </div>

                  {/* Password Hints */}
                  <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/30 rounded-xl p-4 backdrop-blur-sm">
                    <div className="space-y-2">
                      <p className="text-xs text-blue-200 text-center font-medium">
                        <strong>Admin Password:</strong>{" "}
                        <code className="bg-blue-400/20 px-2 py-1 rounded text-blue-100">admin2024</code>
                      </p>
                      <p className="text-xs text-purple-200 text-center">
                        Staff Password:{" "}
                        <code className="bg-purple-400/20 px-2 py-1 rounded text-purple-100">library123</code>{" "}
                        (optional)
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Bottom Floating Elements */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center gap-6 text-white/60">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-400" />
          <span className="text-sm">Secure</span>
        </div>
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-400" />
          <span className="text-sm">Fast</span>
        </div>
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-purple-400" />
          <span className="text-sm">Modern</span>
        </div>
      </div>
    </div>
  )
}

export default LoginScreen
