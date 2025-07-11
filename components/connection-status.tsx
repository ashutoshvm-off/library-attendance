"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertCircle, CheckCircle, RefreshCw } from "lucide-react"
import { AppwriteService } from "@/lib/appwrite"

const appwriteService = new AppwriteService()

export function ConnectionStatus() {
  const [status, setStatus] = useState<{
    isConnected: boolean
    message: string
    details?: any
  }>({ isConnected: false, message: "Checking..." })
  const [isRetrying, setIsRetrying] = useState(false)

  const checkConnection = async () => {
    const connectionStatus = appwriteService.getConnectionStatus()
    setStatus(connectionStatus)
  }

  const retryConnection = async () => {
    setIsRetrying(true)
    try {
      const success = await appwriteService.retryConnection()
      await checkConnection()
      if (success) {
        console.log("Connection retry successful")
      }
    } catch (error) {
      console.error("Connection retry failed:", error)
    } finally {
      setIsRetrying(false)
    }
  }

  useEffect(() => {
    checkConnection()
    // Check connection every 30 seconds
    const interval = setInterval(checkConnection, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex items-center gap-2">
      <Badge
        variant={status.isConnected ? "default" : "secondary"}
        className={`flex items-center gap-1 ${
          status.isConnected
            ? "bg-green-500 hover:bg-green-600"
            : "bg-yellow-500 hover:bg-yellow-600"
        }`}
      >
        {status.isConnected ? (
          <CheckCircle className="w-3 h-3" />
        ) : (
          <AlertCircle className="w-3 h-3" />
        )}
        {status.message}
      </Badge>

      {!status.isConnected && (
        <Button
          size="sm"
          variant="outline"
          onClick={retryConnection}
          disabled={isRetrying}
          className="h-6 px-2"
        >
          {isRetrying ? (
            <RefreshCw className="w-3 h-3 animate-spin" />
          ) : (
            <RefreshCw className="w-3 h-3" />
          )}
        </Button>
      )}

      {/* Debug information in development */}
      {process.env.NODE_ENV === "development" && status.details && (
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer">Debug Info</summary>
          <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto">
            {JSON.stringify(status.details, null, 2)}
          </pre>
        </details>
      )}
    </div>
  )
}
