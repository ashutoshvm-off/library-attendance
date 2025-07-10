"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Wifi, WifiOff, RefreshCw, CheckCircle, AlertCircle, Clock, Zap, Database } from "lucide-react"
import { getOfflineSyncService } from "@/lib/offline-sync"
import { format } from "date-fns"

interface SyncStatus {
  isOnline: boolean
  isSyncing: boolean
  lastSyncTime: string | null
  pendingItems: number
  failedItems: number
  isTrulySynced: boolean
}

export function SyncStatus() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: true,
    isSyncing: false,
    lastSyncTime: null,
    pendingItems: 0,
    failedItems: 0,
    isTrulySynced: false,
  })

  const offlineSyncService = getOfflineSyncService()

  useEffect(() => {
    // Initial status
    setSyncStatus(offlineSyncService.getSyncStatus())

    // Listen for status updates
    const handleStatusUpdate = (status: SyncStatus) => {
      setSyncStatus(status)
    }

    offlineSyncService.addSyncListener(handleStatusUpdate)

    return () => {
      offlineSyncService.removeSyncListener(handleStatusUpdate)
    }
  }, [offlineSyncService])

  const handleForceSync = async () => {
    await offlineSyncService.forcSync()
  }

  const getStatusIcon = () => {
    if (syncStatus.isSyncing) {
      return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
    }

    if (!syncStatus.isOnline) {
      return <WifiOff className="w-5 h-5 text-orange-500" />
    }

    // Check if Appwrite is configured
    const appwriteConfigured = offlineSyncService.getAppwriteService().isAppwriteConfigured()

    if (!appwriteConfigured) {
      return <Database className="w-5 h-5 text-yellow-500" />
    }

    if (syncStatus.pendingItems > 0) {
      return <Clock className="w-5 h-5 text-yellow-500" />
    }

    if (syncStatus.failedItems > 0) {
      return <AlertCircle className="w-5 h-5 text-red-500" />
    }

    // Only show synced if truly synced with Appwrite
    if (syncStatus.isTrulySynced) {
      return <CheckCircle className="w-5 h-5 text-green-500" />
    }

    return <Database className="w-5 h-5 text-yellow-500" />
  }

  const getStatusMessage = () => {
    if (syncStatus.isSyncing) {
      return "Syncing data..."
    }

    if (!syncStatus.isOnline) {
      return "Offline - Data saved locally"
    }

    // Check if Appwrite is configured
    const appwriteConfigured = offlineSyncService.getAppwriteService().isAppwriteConfigured()

    if (!appwriteConfigured) {
      return "Demo Mode - No cloud sync"
    }

    if (syncStatus.pendingItems > 0) {
      return `${syncStatus.pendingItems} items pending sync`
    }

    if (syncStatus.failedItems > 0) {
      return `${syncStatus.failedItems} items failed to sync`
    }

    // Only show "All data synced" if truly synced with Appwrite
    if (syncStatus.isTrulySynced) {
      return "All data synced"
    }

    return "Local storage only"
  }

  const getStatusBadge = () => {
    if (syncStatus.isSyncing) {
      return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Syncing</Badge>
    }

    if (!syncStatus.isOnline) {
      return <Badge className="bg-orange-100 text-orange-800 border-orange-200">Offline</Badge>
    }

    // Check if Appwrite is configured
    const appwriteConfigured = offlineSyncService.getAppwriteService().isAppwriteConfigured()

    if (!appwriteConfigured) {
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Demo Mode</Badge>
    }

    if (syncStatus.pendingItems > 0) {
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Pending</Badge>
    }

    if (syncStatus.failedItems > 0) {
      return <Badge className="bg-red-100 text-red-800 border-red-200">Failed</Badge>
    }

    // Only show "Synced" if truly synced with Appwrite
    if (syncStatus.isTrulySynced) {
      return <Badge className="bg-green-100 text-green-800 border-green-200">Synced</Badge>
    }

    return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Local Only</Badge>
  }

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-white/20">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm">Sync Status</p>
                {getStatusBadge()}
              </div>
              <p className="text-xs text-gray-600">{getStatusMessage()}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {syncStatus.pendingItems > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleForceSync}
                disabled={syncStatus.isSyncing}
                className="text-xs bg-transparent"
              >
                {syncStatus.isSyncing ? (
                  <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                ) : (
                  <Zap className="w-3 h-3 mr-1" />
                )}
                Sync Now
              </Button>
            )}

            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Database className="w-3 h-3" />
              {syncStatus.isOnline ? (
                <Wifi className="w-3 h-3 text-green-500" />
              ) : (
                <WifiOff className="w-3 h-3 text-orange-500" />
              )}
            </div>
          </div>
        </div>

        {/* Additional sync info */}
        {(syncStatus.pendingItems > 0 || syncStatus.lastSyncTime) && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-4 text-xs">
              {syncStatus.pendingItems > 0 && (
                <div>
                  <span className="text-gray-500">Pending:</span>
                  <span className="ml-1 font-medium text-yellow-600">{syncStatus.pendingItems} items</span>
                </div>
              )}

              {syncStatus.lastSyncTime && (
                <div>
                  <span className="text-gray-500">Last sync:</span>
                  <span className="ml-1 font-medium text-green-600">
                    {format(new Date(syncStatus.lastSyncTime), "HH:mm:ss")}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Demo Mode / Offline notice */}
        {!syncStatus.isOnline && (
          <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-xs text-orange-800">
              <strong>Offline Mode:</strong> Your data is being saved locally and will sync automatically when
              connection is restored.
            </p>
          </div>
        )}

        {syncStatus.isOnline && !offlineSyncService.getAppwriteService().isAppwriteConfigured() && (
          <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-800">
              <strong>Demo Mode:</strong> Appwrite is not configured. Data is saved locally only.
              <a href="/admin" className="underline ml-1">
                Configure database
              </a>{" "}
              for cloud sync.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
