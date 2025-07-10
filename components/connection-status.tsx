"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Wifi, WifiOff, RefreshCw, ExternalLink } from "lucide-react"
import { AppwriteService } from "@/lib/appwrite"

export function ConnectionStatus() {
  const [appwriteService] = useState(() => new AppwriteService())
  const [status, setStatus] = useState({ isConnected: false, message: "" })
  const [isChecking, setIsChecking] = useState(false)

  useEffect(() => {
    checkConnection()
  }, [])

  const checkConnection = async () => {
    setIsChecking(true)
    try {
      const connectionStatus = appwriteService.getConnectionStatus()
      setStatus(connectionStatus)
    } catch (error) {
      setStatus({
        isConnected: false,
        message: "Connection check failed",
      })
    } finally {
      setIsChecking(false)
    }
  }

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-white/20">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {status.isConnected ? (
              <Wifi className="w-5 h-5 text-green-500" />
            ) : (
              <WifiOff className="w-5 h-5 text-yellow-500" />
            )}
            <div>
              <p className="font-medium text-sm">Database Connection</p>
              <p className="text-xs text-gray-600">{status.message}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant={status.isConnected ? "default" : "secondary"} className="text-xs">
              {status.isConnected ? "Connected" : "Demo Mode"}
            </Badge>

            <Button size="sm" variant="outline" onClick={checkConnection} disabled={isChecking}>
              {isChecking ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            </Button>

            {!status.isConnected && (
              <Button size="sm" variant="outline" asChild>
                <a href="https://cloud.appwrite.io" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-3 h-3" />
                </a>
              </Button>
            )}
          </div>
        </div>

        {!status.isConnected && (
          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-800">
              <strong>Setup Appwrite:</strong> Create account at{" "}
              <a href="https://cloud.appwrite.io" className="underline" target="_blank" rel="noopener noreferrer">
                cloud.appwrite.io
              </a>{" "}
              and configure environment variables.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
