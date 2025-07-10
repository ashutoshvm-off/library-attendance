"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"
import { Upload, ImageIcon, X, Check } from "lucide-react"

export function LogoUpload() {
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [collegeName, setCollegeName] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid File",
        description: "Please select an image file (PNG, JPG, SVG)",
        variant: "destructive",
      })
      return
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select an image smaller than 2MB",
        variant: "destructive",
      })
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setLogoPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleUpload = async () => {
    if (!logoPreview || !collegeName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please select a logo and enter your college name",
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)

    try {
      // In a real implementation, you would upload to your server or cloud storage
      // For now, we'll simulate the upload and store in localStorage
      localStorage.setItem("college-logo", logoPreview)
      localStorage.setItem("college-name", collegeName)

      // Simulate upload delay
      await new Promise((resolve) => setTimeout(resolve, 2000))

      toast({
        title: "Logo Updated Successfully!",
        description: "Your college logo and name have been saved. Refresh the page to see changes.",
      })

      // Refresh the page to show new logo
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Failed to upload logo. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const clearLogo = () => {
    setLogoPreview(null)
    setCollegeName("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="w-5 h-5" />
          College Logo Setup
        </CardTitle>
        <CardDescription>Upload your college logo and customize the branding</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Logo Preview */}
        <div className="space-y-4">
          <Label>College Logo</Label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            {logoPreview ? (
              <div className="space-y-4">
                <div className="relative inline-block">
                  <img
                    src={logoPreview || "/placeholder.svg"}
                    alt="Logo Preview"
                    className="w-24 h-24 object-contain mx-auto rounded-lg shadow-sm"
                  />
                  <Button
                    size="sm"
                    variant="destructive"
                    className="absolute -top-2 -right-2 w-6 h-6 p-0 rounded-full"
                    onClick={clearLogo}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
                <p className="text-sm text-green-600 font-medium">Logo selected successfully!</p>
              </div>
            ) : (
              <div className="space-y-4">
                <Upload className="w-12 h-12 mx-auto text-gray-400" />
                <div>
                  <p className="text-sm font-medium">Click to upload logo</p>
                  <p className="text-xs text-gray-500">PNG, JPG, SVG up to 2MB</p>
                </div>
              </div>
            )}
          </div>

          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />

          <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full">
            <Upload className="w-4 h-4 mr-2" />
            {logoPreview ? "Change Logo" : "Select Logo"}
          </Button>
        </div>

        {/* College Name */}
        <div className="space-y-2">
          <Label htmlFor="collegeName">College Name</Label>
          <Input
            id="collegeName"
            placeholder="Enter your college name"
            value={collegeName}
            onChange={(e) => setCollegeName(e.target.value)}
          />
        </div>

        {/* Upload Button */}
        <Button onClick={handleUpload} disabled={isUploading || !logoPreview || !collegeName.trim()} className="w-full">
          {isUploading ? (
            <>
              <Upload className="w-4 h-4 mr-2 animate-pulse" />
              Updating...
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              Update Branding
            </>
          )}
        </Button>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Instructions:</h4>
          <ol className="text-sm text-blue-800 space-y-1">
            <li>1. Upload your college logo (PNG/JPG/SVG)</li>
            <li>2. Enter your college name</li>
            <li>3. Click "Update Branding"</li>
            <li>4. Page will refresh with new branding</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  )
}
