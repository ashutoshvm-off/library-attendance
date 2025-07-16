import { Client, Databases, Query, ID, Account } from "appwrite"
import { getOfflineSyncService } from "./offline-sync"

interface LibraryRecord {
  $id?: string
  admissionId: string
  studentName: string
  checkInTime?: string
  checkOutTime?: string
  date: string
  status: "checked-in" | "checked-out"
}

interface Student {
  $id?: string
  admissionId: string
  name: string
  email?: string
  phone?: string
}

interface Staff {
  $id?: string
  staffId: string
  name: string
  role: string
  email?: string
  isActive?: boolean
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

export class EnhancedAppwriteService {
  private client: Client | null = null
  private databases: Databases | null = null
  private account: Account | null = null
  private databaseId: string
  private recordsCollectionId: string
  private studentsCollectionId: string
  private staffCollectionId: string
  private loginRecordsCollectionId: string
  private isConfigured = false
  private offlineSyncService = getOfflineSyncService()

  constructor() {
    this.databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "library-db"
    this.recordsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_RECORDS_COLLECTION_ID || "records"
    this.studentsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_STUDENTS_COLLECTION_ID || "students"
    this.staffCollectionId = process.env.NEXT_PUBLIC_APPWRITE_STAFF_COLLECTION_ID || "staff"
    this.loginRecordsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_LOGIN_RECORDS_COLLECTION_ID || "login-records"

    this.initializeAppwrite()
  }

  private initializeAppwrite() {
    try {
      const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT
      const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID

      if (!endpoint || !projectId) {
        console.warn("Appwrite environment variables not configured. Using offline-first mode.")
        return
      }

      this.client = new Client()
      this.client.setEndpoint(endpoint).setProject(projectId)
      this.databases = new Databases(this.client)
      this.account = new Account(this.client)
      this.isConfigured = true

      console.log("Appwrite initialized successfully")
    } catch (error) {
      console.error("Failed to initialize Appwrite:", error)
      this.isConfigured = false
    }
  }

  // Enhanced localStorage methods with sorting
  private getLocalStorageKey(type: string): string {
    return `library-${type}`
  }

  private getLocalData<T>(key: string): T[] {
    if (typeof window === "undefined") return []
    try {
      const data = localStorage.getItem(this.getLocalStorageKey(key))
      const parsed = data ? JSON.parse(data) : []

      // Sort by timestamp/date
      return this.sortData(parsed, key)
    } catch {
      return []
    }
  }

  private sortData<T>(data: T[], key: string): T[] {
    return data.sort((a: any, b: any) => {
      // Sort records by checkInTime or date
      if (key === "records") {
        const timeA = a.checkInTime || a.date
        const timeB = b.checkInTime || b.date
        return new Date(timeB).getTime() - new Date(timeA).getTime()
      }

      // Sort login records by loginTime
      if (key === "login-records") {
        return new Date(b.loginTime).getTime() - new Date(a.loginTime).getTime()
      }

      // Sort students and staff by name
      if (key === "students" || key === "staff") {
        const nameA = a.name || a.studentName || ""
        const nameB = b.name || b.studentName || ""
        return nameA.localeCompare(nameB)
      }

      return 0
    })
  }

  private setLocalData<T>(key: string, data: T[]): void {
    if (typeof window === "undefined") return
    try {
      const sortedData = this.sortData(data, key)
      localStorage.setItem(this.getLocalStorageKey(key), JSON.stringify(sortedData))
    } catch (error) {
      console.error("Failed to save to localStorage:", error)
    }
  }

  private generateLocalId(): string {
    return `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  // Enhanced record methods with offline support
  async createRecord(record: Omit<LibraryRecord, "$id">): Promise<LibraryRecord> {
    // Check for existing record to prevent duplicates
    const existingRecords = await this.getRecordsByDate(record.date)
    const duplicateRecord = existingRecords.find(
      r => r.admissionId === record.admissionId && 
           r.date === record.date && 
           r.status === record.status
    )

    if (duplicateRecord) {
      console.warn("Duplicate record detected, returning existing record")
      return duplicateRecord
    }

    const localId = this.generateLocalId()
    const newRecord: LibraryRecord = {
      $id: localId,
      ...record,
    }

    // Always save locally first
    const records = this.getLocalData<LibraryRecord>("records")
    records.push(newRecord)
    this.setLocalData("records", records)

    // Try to sync with Appwrite
    if (this.isConfigured && navigator.onLine) {
      try {
        // Remove any metadata fields before sending to Appwrite
        const { $databaseId, $collectionId, $permissions, $createdAt, $updatedAt, ...cleanRecord } = record as any
        
        const response = await this.databases!.createDocument(
          this.databaseId,
          this.recordsCollectionId,
          ID.unique(),
          cleanRecord,
        )

        // Update local record with server ID
        const updatedRecords = records.map((r) => (r.$id === localId ? { ...r, $id: response.$id } : r))
        this.setLocalData("records", updatedRecords)

        return response as unknown as LibraryRecord
      } catch (error) {
        console.error("Failed to sync record to Appwrite, queuing for later:", error)
        this.offlineSyncService.queueRecordCreate(record, localId)
      }
    } else {
      // Queue for sync when online
      this.offlineSyncService.queueRecordCreate(record, localId)
    }

    return newRecord
  }

  async updateRecord(recordId: string, updates: Partial<LibraryRecord>): Promise<LibraryRecord> {
    // Update locally first
    const records = this.getLocalData<LibraryRecord>("records")
    const recordIndex = records.findIndex((r) => r.$id === recordId)

    if (recordIndex === -1) {
      throw new Error("Record not found")
    }

    records[recordIndex] = { ...records[recordIndex], ...updates }
    this.setLocalData("records", records)

    // Try to sync with Appwrite
    if (this.isConfigured && navigator.onLine && !recordId.startsWith("local-")) {
      try {
        // Remove metadata fields from updates
        const { $id, $databaseId, $collectionId, $permissions, $createdAt, $updatedAt, ...cleanUpdates } = updates as any
        
        const response = await this.databases!.updateDocument(
          this.databaseId,
          this.recordsCollectionId,
          recordId,
          cleanUpdates,
        )
        return response as unknown as LibraryRecord
      } catch (error) {
        console.error("Failed to sync record update to Appwrite, queuing for later:", error)
        this.offlineSyncService.queueRecordUpdate({ $id: recordId, ...updates })
      }
    } else {
      // Queue for sync when online
      this.offlineSyncService.queueRecordUpdate({ $id: recordId, ...updates })
    }

    return records[recordIndex]
  }

  async deleteRecord(recordId: string): Promise<void> {
    // Remove locally first
    const records = this.getLocalData<LibraryRecord>("records")
    const filteredRecords = records.filter((r) => r.$id !== recordId)
    this.setLocalData("records", filteredRecords)

    // Try to sync with Appwrite
    if (this.isConfigured && navigator.onLine && !recordId.startsWith("local-")) {
      try {
        await this.databases!.deleteDocument(this.databaseId, this.recordsCollectionId, recordId)
      } catch (error) {
        console.error("Failed to sync record deletion to Appwrite, queuing for later:", error)
        this.offlineSyncService.queueRecordDelete({ $id: recordId })
      }
    } else {
      // Queue for sync when online
      this.offlineSyncService.queueRecordDelete({ $id: recordId })
    }
  }

  // Enhanced student methods with offline support
  async createStudent(student: Omit<Student, "$id">): Promise<Student> {
    // Check for duplicate admission ID across both local and remote data
    const existingStudent = await this.getStudentByAdmissionId(student.admissionId)
    if (existingStudent) {
      throw new Error(`Student with admission ID "${student.admissionId}" already exists`)
    }

    const localId = this.generateLocalId()
    const newStudent: Student = {
      $id: localId,
      ...student,
    }

    // Always save locally first
    const students = this.getLocalData<Student>("students")
    students.push(newStudent)
    this.setLocalData("students", students)

    // Try to sync with Appwrite
    if (this.isConfigured && navigator.onLine) {
      try {
        // Remove any metadata fields before sending to Appwrite
        const { $databaseId, $collectionId, $permissions, $createdAt, $updatedAt, ...cleanStudent } = student as any
        
        const response = await this.databases!.createDocument(
          this.databaseId,
          this.studentsCollectionId,
          ID.unique(),
          cleanStudent,
        )

        // Update local student with server ID
        const updatedStudents = students.map((s) => (s.$id === localId ? { ...s, $id: response.$id } : s))
        this.setLocalData("students", updatedStudents)

        return response as unknown as Student
      } catch (error) {
        console.error("Failed to sync student to Appwrite, queuing for later:", error)
        // If it's a duplicate error from Appwrite, remove from local storage
        if (error instanceof Error && error.message.includes("already exists")) {
          const filteredStudents = students.filter(s => s.$id !== localId)
          this.setLocalData("students", filteredStudents)
          throw error
        }
        this.offlineSyncService.queueStudentCreate(student, localId)
      }
    } else {
      // Queue for sync when online
      this.offlineSyncService.queueStudentCreate(student, localId)
    }

    return newStudent
  }

  async updateStudent(studentId: string, updates: Partial<Student>): Promise<Student> {
    // Update locally first
    const students = this.getLocalData<Student>("students")
    const studentIndex = students.findIndex((s) => s.$id === studentId)

    if (studentIndex === -1) {
      throw new Error("Student not found")
    }

    students[studentIndex] = { ...students[studentIndex], ...updates }
    this.setLocalData("students", students)

    // Try to sync with Appwrite
    if (this.isConfigured && navigator.onLine && !studentId.startsWith("local-")) {
      try {
        // Remove metadata fields from updates
        const { $id, $databaseId, $collectionId, $permissions, $createdAt, $updatedAt, ...cleanUpdates } = updates as any
        
        const response = await this.databases!.updateDocument(
          this.databaseId,
          this.studentsCollectionId,
          studentId,
          cleanUpdates,
        )
        return response as unknown as Student
      } catch (error) {
        console.error("Failed to sync student update to Appwrite, queuing for later:", error)
        this.offlineSyncService.queueStudentUpdate({ $id: studentId, ...updates })
      }
    } else {
      // Queue for sync when online
      this.offlineSyncService.queueStudentUpdate({ $id: studentId, ...updates })
    }

    return students[studentIndex]
  }

  async deleteStudent(studentId: string): Promise<void> {
    // Remove locally first
    const students = this.getLocalData<Student>("students")
    const filteredStudents = students.filter((s) => s.$id !== studentId)
    this.setLocalData("students", filteredStudents)

    // Try to sync with Appwrite
    if (this.isConfigured && navigator.onLine && !studentId.startsWith("local-")) {
      try {
        await this.databases!.deleteDocument(this.databaseId, this.studentsCollectionId, studentId)
      } catch (error) {
        console.error("Failed to sync student deletion to Appwrite, queuing for later:", error)
        this.offlineSyncService.queueStudentDelete({ $id: studentId })
      }
    } else {
      // Queue for sync when online
      this.offlineSyncService.queueStudentDelete({ $id: studentId })
    }
  }

  // Enhanced login record methods
  async createLoginRecord(loginRecord: Omit<LoginRecord, "$id">): Promise<LoginRecord> {
    const localId = this.generateLocalId()
    const newRecord: LoginRecord = {
      $id: localId,
      ...loginRecord,
    }

    // Always save locally first
    const records = this.getLocalData<LoginRecord>("login-records")
    records.push(newRecord)
    this.setLocalData("login-records", records)

    // Try to sync with Appwrite
    if (this.isConfigured && navigator.onLine) {
      try {
        // Remove any metadata fields before sending to Appwrite
        const { $databaseId, $collectionId, $permissions, $createdAt, $updatedAt, ...cleanRecord } = loginRecord as any
        
        const response = await this.databases!.createDocument(
          this.databaseId,
          this.loginRecordsCollectionId,
          ID.unique(),
          cleanRecord,
        )

        // Update local record with server ID
        const updatedRecords = records.map((r) => (r.$id === localId ? { ...r, $id: response.$id } : r))
        this.setLocalData("login-records", updatedRecords)

        return response as unknown as LoginRecord
      } catch (error) {
        console.error("Failed to sync login record to Appwrite, queuing for later:", error)
        this.offlineSyncService.queueLoginRecordCreate(loginRecord)
      }
    } else {
      // Queue for sync when online
      this.offlineSyncService.queueLoginRecordCreate(loginRecord)
    }

    return newRecord
  }

  async updateLoginRecord(recordId: string, updates: Partial<LoginRecord>): Promise<LoginRecord> {
    // Update locally first
    const records = this.getLocalData<LoginRecord>("login-records")
    const recordIndex = records.findIndex((r) => r.$id === recordId)

    if (recordIndex === -1) {
      throw new Error("Login record not found")
    }

    records[recordIndex] = { ...records[recordIndex], ...updates }
    this.setLocalData("login-records", records)

    // Try to sync with Appwrite
    if (this.isConfigured && navigator.onLine && !recordId.startsWith("local-")) {
      try {
        // Remove metadata fields from updates
        const { $id, $databaseId, $collectionId, $permissions, $createdAt, $updatedAt, ...cleanUpdates } = updates as any
        
        const response = await this.databases!.updateDocument(
          this.databaseId,
          this.loginRecordsCollectionId,
          recordId,
          cleanUpdates,
        )
        return response as unknown as LoginRecord
      } catch (error) {
        console.error("Failed to sync login record update to Appwrite, queuing for later:", error)
        this.offlineSyncService.queueLoginRecordUpdate({ $id: recordId, ...updates })
      }
    } else {
      // Queue for sync when online
      this.offlineSyncService.queueLoginRecordUpdate({ $id: recordId, ...updates })
    }

    return records[recordIndex]
  }

  // Read methods (try Appwrite first, fallback to local)
  async getRecordsByDate(date: string): Promise<LibraryRecord[]> {
    if (this.isConfigured && navigator.onLine) {
      try {
        const response = await this.databases!.listDocuments(this.databaseId, this.recordsCollectionId, [
          Query.equal("date", date),
          Query.orderDesc("checkInTime"),
        ])
        return response.documents as unknown as LibraryRecord[]
      } catch (error) {
        console.error("Failed to fetch from Appwrite, using local data:", error)
      }
    }

    // Fallback to localStorage
    const records = this.getLocalData<LibraryRecord>("records")
    return records.filter((record) => record.date === date)
  }

  async getAllRecords(): Promise<LibraryRecord[]> {
    if (this.isConfigured && navigator.onLine) {
      try {
        const response = await this.databases!.listDocuments(this.databaseId, this.recordsCollectionId, [
          Query.orderDesc("checkInTime"),
          Query.limit(1000),
        ])
        return response.documents as unknown as LibraryRecord[]
      } catch (error) {
        console.error("Failed to fetch from Appwrite, using local data:", error)
      }
    }

    // Fallback to localStorage
    return this.getLocalData<LibraryRecord>("records")
  }

  async getAllStudents(): Promise<Student[]> {
    if (this.isConfigured && navigator.onLine) {
      try {
        const response = await this.databases!.listDocuments(this.databaseId, this.studentsCollectionId, [
          Query.orderAsc("name"),
        ])
        return response.documents as unknown as Student[]
      } catch (error) {
        console.error("Failed to fetch from Appwrite, using local data:", error)
      }
    }

    // Fallback to localStorage
    return this.getLocalData<Student>("students")
  }

  async getStudentByAdmissionId(admissionId: string): Promise<Student | null> {
    if (this.isConfigured && navigator.onLine) {
      try {
        const response = await this.databases!.listDocuments(this.databaseId, this.studentsCollectionId, [
          Query.equal("admissionId", admissionId),
        ])

        if (response.documents.length > 0) {
          return response.documents[0] as unknown as Student
        }
      } catch (error) {
        console.error("Failed to fetch from Appwrite, using local data:", error)
      }
    }

    // Fallback to localStorage
    const students = this.getLocalData<Student>("students")
    let student = students.find((s) => s.admissionId === admissionId)

    if (!student) {
      // Create a new student
      student = await this.createStudent({
        admissionId,
        name: `Student ${admissionId}`,
      })
    }

    return student
  }

  async getAllLoginRecords(): Promise<LoginRecord[]> {
    if (this.isConfigured && navigator.onLine) {
      try {
        const response = await this.databases!.listDocuments(this.databaseId, this.loginRecordsCollectionId, [
          Query.orderDesc("loginTime"),
          Query.limit(1000),
        ])
        return response.documents as unknown as LoginRecord[]
      } catch (error) {
        console.error("Failed to fetch from Appwrite, using local data:", error)
      }
    }

    // Fallback to localStorage
    return this.getLocalData<LoginRecord>("login-records")
  }

  // Status methods
  isAppwriteConfigured(): boolean {
    return this.isConfigured
  }

  getConnectionStatus(): { isConnected: boolean; message: string } {
    if (this.isConfigured && navigator.onLine) {
      return {
        isConnected: true,
        message: "Connected to Appwrite Cloud",
      }
    } else {
      return {
        isConnected: false,
        message: "Offline Mode - Data saved locally",
      }
    }
  }

  // Add method to get current student status
  async getStudentCurrentStatus(admissionId: string, date: string): Promise<{
    isCheckedIn: boolean
    lastRecord: LibraryRecord | null
  }> {
    const todaysRecords = await this.getRecordsByDate(date)
    const studentRecords = todaysRecords
      .filter(record => record.admissionId === admissionId)
      .sort((a, b) => {
        const timeA = new Date(a.checkInTime || a.date).getTime()
        const timeB = new Date(b.checkInTime || b.date).getTime()
        return timeB - timeA // Most recent first
      })

    const lastRecord = studentRecords[0] || null
    const isCheckedIn = lastRecord?.status === "checked-in"

    return {
      isCheckedIn,
      lastRecord
    }
  }
}
