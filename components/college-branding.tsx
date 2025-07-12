"use client"

import { useState } from "react"

interface CollegeBrandingProps {
  size?: "sm" | "md" | "lg"
  showText?: boolean
  variant?: "default" | "admin" | "login"
  className?: string
}

export function CollegeBranding({
  size = "md",
  showText = true,
  variant = "default",
  className = "",
}: CollegeBrandingProps) {
  const [imageError, setImageError] = useState(false)

  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  }

  const textSizes = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-4xl",
  }

  const gradients = {
    default: "from-blue-600 to-purple-600",
    admin: "from-purple-600 to-pink-600",
    login: "from-blue-600 to-purple-600",
  }

  const collegeName = "ASIET" // Updated college name
  const tagline = "Library Management System"

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="p-2 bg-white rounded-xl shadow-sm">
        {!imageError ? (
          <img
            src="/logo.png"
            alt={`${collegeName} Logo`}
            className={`${sizeClasses[size]} object-contain`}
            onError={() => setImageError(true)}
          />
        ) : (
          // Fallback to text logo if image fails to load
          <div
            className={`${sizeClasses[size]} bg-gradient-to-r ${gradients[variant]} rounded-lg flex items-center justify-center text-white font-bold text-sm`}
          >
            ASIET
          </div>
        )}
      </div>

      {showText && (
        <div>
          <h1
            className={`${textSizes[size]} font-bold bg-gradient-to-r ${gradients[variant]} bg-clip-text text-transparent`}
          >
            {collegeName}
          </h1>
          <p className="text-sm text-gray-600">{tagline}</p>
        </div>
      )}
    </div>
  )
}
