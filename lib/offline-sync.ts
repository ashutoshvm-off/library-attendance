"use client"

import { AppwriteService } from "./appwrite"

interface SyncQueueItem {
  id: string
  type: "create" | "update" | "delete"
  collection: "records" | "students" | "staff" | "login-records"
  data: any
  timestamp: string
  retryCount: number
  localId?: string
}

interface SyncStatus {
  isOnline: boolean
  isSyncing: boolean
  lastSyncTime: string | null
  pendingItems: number
  failedItems: number
  isTrulySynced?: boolean
}

export class OfflineSyncService {
  private appwriteService: AppwriteService
  private syncQueue: SyncQueueItem[] = []
  private isOnline = true
  private isSyncing = false
  private syncListeners: ((status: SyncStatus) => void)[] = []
  private maxRetries = 3
  private syncInterval: NodeJS.Timeout | null = null

  constructor() {
    this.appwriteService = new AppwriteService()
    this.initializeOfflineSync()
  }

  private initializeOfflineSync() {
    // Load existing sync queue from localStorage
    this.loadSyncQueue()

    // Set up online/offline detection
    this.setupNetworkDetection()

    // Start periodic sync attempts
    this.startPeriodicSync()

    // Initial sync attempt
    this.attemptSync()
  }

  private setupNetworkDetection() {
    if (typeof window !== "undefined") {
      // Initial online status
      this.isOnline = navigator.onLine

      // Listen for online/offline events
      window.addEventListener("online", () => {
        console.log("🌐 Device came online")
        this.isOnline = true
        this.notifyListeners()
        this.attemptSync()
      })

      window.addEventListener("offline", () => {
        console.log("📴 Device went offline")
        this.isOnline = false
        this.notifyListeners()
      })

      // Additional connectivity check using fetch
      this.checkConnectivity()
    }
  }

  private async checkConnectivity() {
    try {
      // Check if Appwrite is configured first
      if (!this.appwriteService.isAppwriteConfigured()) {
        this.isOnline = false
        this.notifyListeners()
        return
      }

      // Test Appwrite connectivity by attempting a simple operation
      const connectionStatus = this.appwriteService.getConnectionStatus()
      
      if (connectionStatus.isConnected) {
        // Do a lightweight test to verify actual connectivity
        try {
          await this.appwriteService.getAllRecords()
          this.isOnline = true
        } catch (error) {
          console.warn("Appwrite configured but connection test failed:", error)
          this.isOnline = false
        }
      } else {
        this.isOnline = false
      }
      
      console.log("🔍 Connectivity check result:", this.isOnline ? "Connected" : "Disconnected")
    } catch (error) {
      console.error("❌ Connectivity check failed:", error)
      this.isOnline = false
    }
    this.notifyListeners()
  }

  private startPeriodicSync() {
    // Attempt sync every 30 seconds when online
    this.syncInterval = setInterval(() => {
      if (this.isOnline && !this.isSyncing && this.syncQueue.length > 0) {
        this.attemptSync()
      }
    }, 30000)
  }

  private loadSyncQueue() {
    try {
      const stored = localStorage.getItem("library-sync-queue")
      if (stored) {
        this.syncQueue = JSON.parse(stored)
        console.log(`📥 Loaded ${this.syncQueue.length} items from sync queue`)
      }
    } catch (error) {
      console.error("Error loading sync queue:", error)
      this.syncQueue = []
    }
  }

  private saveSyncQueue() {
    try {
      localStorage.setItem("library-sync-queue", JSON.stringify(this.syncQueue))
    } catch (error) {
      console.error("Error saving sync queue:", error)
    }
  }

  private generateId(): string {
    return `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  // Add item to sync queue
  private addToSyncQueue(
    type: SyncQueueItem["type"],
    collection: SyncQueueItem["collection"],
    data: any,
    localId?: string,
  ) {
    const item: SyncQueueItem = {
      id: this.generateId(),
      type,
      collection,
      data,
      timestamp: new Date().toISOString(),
      retryCount: 0,
      localId,
    }

    this.syncQueue.push(item)
    this.saveSyncQueue()
    this.notifyListeners()

    console.log(`📝 Added ${type} ${collection} to sync queue`, item)

    // Try immediate sync if online
    if (this.isOnline) {
      this.attemptSync()
    }
  }

  // Main sync method
  private async attemptSync() {
    if (this.isSyncing || !this.isOnline || this.syncQueue.length === 0) {
      return
    }

    this.isSyncing = true
    this.notifyListeners()

    console.log(`🔄 Starting sync of ${this.syncQueue.length} items`)

    const itemsToSync = [...this.syncQueue]
    const successfulItems: string[] = []
    const failedItems: string[] = []

    for (const item of itemsToSync) {
      try {
        await this.syncItem(item)
        successfulItems.push(item.id)
        console.log(`✅ Synced ${item.type} ${item.collection}:`, item.id)
      } catch (error) {
        console.error(`❌ Failed to sync ${item.type} ${item.collection}:`, error)
        item.retryCount++

        if (item.retryCount >= this.maxRetries) {
          failedItems.push(item.id)
          console.error(`🚫 Max retries exceeded for item:`, item.id)
        }
      }
    }

    // Remove successful and permanently failed items
    this.syncQueue = this.syncQueue.filter(
      (item) => !successfulItems.includes(item.id) && !failedItems.includes(item.id),
    )

    this.saveSyncQueue()
    this.isSyncing = false

    // Update last sync time if any items were processed
    if (successfulItems.length > 0) {
      localStorage.setItem("library-last-sync", new Date().toISOString())
    }

    this.notifyListeners()

    console.log(
      `🎉 Sync completed: ${successfulItems.length} successful, ${failedItems.length} failed, ${this.syncQueue.length} remaining`,
    )
  }

  private async syncItem(item: SyncQueueItem): Promise<void> {
    switch (item.collection) {
      case "records":
        return this.syncRecord(item)
      case "students":
        return this.syncStudent(item)
      case "staff":
        return this.syncStaff(item)
      case "login-records":
        return this.syncLoginRecord(item)
      default:
        throw new Error(`Unknown collection: ${item.collection}`)
    }
  }

  private async syncRecord(item: SyncQueueItem): Promise<void> {
    switch (item.type) {
      case "create":
        const newRecord = await this.appwriteService.createRecord(item.data)
        // Update local storage with the new ID
        this.updateLocalRecordId(item.localId!, newRecord.$id!)
        break
      case "update":
        await this.appwriteService.updateRecord(item.data.$id, item.data)
        break
      case "delete":
        await this.appwriteService.deleteRecord(item.data.$id)
        break
    }
  }

  private async syncStudent(item: SyncQueueItem): Promise<void> {
    switch (item.type) {
      case "create":
        // Check for existing student before creating
        const existingStudent = await this.appwriteService.getStudentByAdmissionId(item.data.admissionId)
        if (existingStudent) {
          console.warn(`Student with admission ID ${item.data.admissionId} already exists, skipping creation`)
          // Update local record with server ID if it exists
          this.updateLocalStudentId(item.localId!, existingStudent.$id!)
          return
        }
        
        const newStudent = await this.appwriteService.createStudent(item.data)
        this.updateLocalStudentId(item.localId!, newStudent.$id!)
        break
      case "update":
        await this.appwriteService.updateStudent(item.data.$id, item.data)
        break
      case "delete":
        await this.appwriteService.deleteStudent(item.data.$id)
        break
    }
  }

  private async syncStaff(item: SyncQueueItem): Promise<void> {
    switch (item.type) {
      case "create":
        const newStaff = await this.appwriteService.createStaff(item.data)
        this.updateLocalStaffId(item.localId!, newStaff.$id!)
        break
      case "update":
        await this.appwriteService.updateStaff(item.data.$id, item.data)
        break
      case "delete":
        await this.appwriteService.deleteStaff(item.data.$id)
        break
    }
  }

  private async syncLoginRecord(item: SyncQueueItem): Promise<void> {
    switch (item.type) {
      case "create":
        await this.appwriteService.createLoginRecord(item.data)
        break
      case "update":
        await this.appwriteService.updateLoginRecord(item.data.$id, item.data)
        break
    }
  }

  private updateLocalRecordId(localId: string, newId: string) {
    try {
      const records = JSON.parse(localStorage.getItem("library-records") || "[]")
      const recordIndex = records.findIndex((r: any) => r.$id === localId)
      if (recordIndex !== -1) {
        records[recordIndex].$id = newId
        localStorage.setItem("library-records", JSON.stringify(records))
      }
    } catch (error) {
      console.error("Error updating local record ID:", error)
    }
  }

  private updateLocalStudentId(localId: string, newId: string) {
    try {
      const students = JSON.parse(localStorage.getItem("library-students") || "[]")
      const studentIndex = students.findIndex((s: any) => s.$id === localId)
      if (studentIndex !== -1) {
        students[studentIndex].$id = newId
        localStorage.setItem("library-students", JSON.stringify(students))
      }
    } catch (error) {
      console.error("Error updating local student ID:", error)
    }
  }

  private updateLocalStaffId(localId: string, newId: string) {
    try {
      const staff = JSON.parse(localStorage.getItem("library-staff") || "[]")
      const staffIndex = staff.findIndex((s: any) => s.$id === localId)
      if (staffIndex !== -1) {
        staff[staffIndex].$id = newId
        localStorage.setItem("library-staff", JSON.stringify(staff))
      }
    } catch (error) {
      console.error("Error updating local staff ID:", error)
    }
  }

  // Public methods for components to use
  public queueRecordCreate(data: any, localId: string) {
    this.addToSyncQueue("create", "records", data, localId)
  }

  public queueRecordUpdate(data: any) {
    this.addToSyncQueue("update", "records", data)
  }

  public queueRecordDelete(data: any) {
    this.addToSyncQueue("delete", "records", data)
  }

  public queueStudentCreate(data: any, localId: string) {
    this.addToSyncQueue("create", "students", data, localId)
  }

  public queueStudentUpdate(data: any) {
    this.addToSyncQueue("update", "students", data)
  }

  public queueStudentDelete(data: any) {
    this.addToSyncQueue("delete", "students", data)
  }

  public queueLoginRecordCreate(data: any) {
    this.addToSyncQueue("create", "login-records", data)
  }

  public queueLoginRecordUpdate(data: any) {
    this.addToSyncQueue("update", "login-records", data)
  }

  // Status methods
  public getSyncStatus(): SyncStatus {
    const appwriteConfigured = this.appwriteService.isAppwriteConfigured()
    const connectionStatus = this.appwriteService.getConnectionStatus()
    const isActuallyOnline = navigator.onLine && connectionStatus.isConnected && appwriteConfigured

    return {
      isOnline: isActuallyOnline,
      isSyncing: this.isSyncing,
      lastSyncTime: localStorage.getItem("library-last-sync"),
      pendingItems: this.syncQueue.length,
      failedItems: this.syncQueue.filter((item) => item.retryCount >= this.maxRetries).length,
      // Only consider truly synced if Appwrite is configured, connected, no pending items, and no failed items
      isTrulySynced: appwriteConfigured && isActuallyOnline && this.syncQueue.length === 0 && !this.isSyncing,
    }
  }

  public addSyncListener(callback: (status: SyncStatus) => void) {
    this.syncListeners.push(callback)
  }

  public removeSyncListener(callback: (status: SyncStatus) => void) {
    this.syncListeners = this.syncListeners.filter((listener) => listener !== callback)
  }

  private notifyListeners() {
    const status = this.getSyncStatus()
    this.syncListeners.forEach((listener) => listener(status))
  }

  // Manual sync trigger
  public async forcSync(): Promise<void> {
    await this.attemptSync()
  }

  // Clear sync queue (for testing/debugging)
  public clearSyncQueue() {
    this.syncQueue = []
    this.saveSyncQueue()
    this.notifyListeners()
  }

  // Cleanup
  public destroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
    }
    this.syncListeners = []
  }

  public getAppwriteService(): AppwriteService {
    return this.appwriteService
  }
}

// Singleton instance
let offlineSyncService: OfflineSyncService | null = null

export function getOfflineSyncService(): OfflineSyncService {
  if (!offlineSyncService) {
    offlineSyncService = new OfflineSyncService()
  }
  return offlineSyncService
}
