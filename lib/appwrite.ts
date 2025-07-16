import { Client, Databases, Query, ID, Account } from "appwrite"

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

export class AppwriteService {
  private client: Client | null = null
  private databases: Databases | null = null
  private account: Account | null = null
  private databaseId: string
  private recordsCollectionId: string
  private studentsCollectionId: string
  private staffCollectionId: string
  private loginRecordsCollectionId: string
  private isConfigured = false
  private connectionTested = false

  constructor() {
    this.databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "library-db"
    this.recordsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_RECORDS_COLLECTION_ID || "records"
    this.studentsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_STUDENTS_COLLECTION_ID || "students"
    this.staffCollectionId = process.env.NEXT_PUBLIC_APPWRITE_STAFF_COLLECTION_ID || "staff"
    this.loginRecordsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_LOGIN_RECORDS_COLLECTION_ID || "login-records"

    this.initializeAppwrite()
  }

  private async initializeAppwrite() {
    try {
      const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT
      const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID

      if (!endpoint || !projectId) {
        console.warn("❌ Appwrite environment variables not configured. Using fallback mode.")
        console.warn("Missing variables:", { 
          endpoint: !!endpoint, 
          projectId: !!projectId 
        })
        return
      }

      console.log("🔧 Initializing Appwrite with:", {
        endpoint: endpoint,
        projectId: projectId.substring(0, 8) + "..."
      })

      this.client = new Client()
      this.client.setEndpoint(endpoint).setProject(projectId)
      this.databases = new Databases(this.client)
      this.account = new Account(this.client)

      console.log("Appwrite initialized successfully")

      // Test the connection with better error handling
      await this.testConnection()
      
      this.isConfigured = true
      console.log("✅ Appwrite initialized and connected successfully")
    } catch (error) {
      console.error("❌ Failed to initialize Appwrite:", error)
      this.isConfigured = false
      
      // Provide specific error guidance
      if (error instanceof Error) {
        if (error.message.includes("401")) {
          console.error("🔑 Authentication error: Check your project ID and permissions")
        } else if (error.message.includes("404")) {
          console.error("📂 Project not found: Verify your project ID")
        } else if (error.message.includes("network") || error.message.includes("fetch")) {
          console.error("🌐 Network error: Check your internet connection")
        }
      }
    }
  }

  private async testConnection(): Promise<void> {
    if (this.connectionTested) return

    try {
      if (!this.databases) throw new Error("Databases not initialized")
      
      console.log("🔍 Testing Appwrite connection...")
      
      // Try to list documents from any collection to test connection
      // Use a more specific approach to avoid permission issues
      const testResult = await this.databases.listDocuments(
        this.databaseId,
        this.recordsCollectionId,
        [Query.limit(1)]
      )
      
      this.connectionTested = true
      console.log("✅ Appwrite connection test successful")
    } catch (error) {
      console.error("❌ Appwrite connection test failed:", error)
      
      // Provide specific error guidance
      if (error instanceof Error) {
        if (error.message.includes("401")) {
          console.error("🔑 Permission denied. Please check:")
          console.error("   1. Collection permissions are set to 'any' for all operations")
          console.error("   2. Project ID is correct")
          console.error("   3. Database and collection IDs match your Appwrite setup")
        } else if (error.message.includes("404")) {
          console.error("📂 Resource not found. Please check:")
          console.error("   1. Database ID exists:", this.databaseId)
          console.error("   2. Collection ID exists:", this.recordsCollectionId)
          console.error("   3. All collections are created in Appwrite console")
        }
      }
      
      throw error
    }
  }

  // Fallback storage using localStorage
  private getLocalStorageKey(type: string): string {
    return `library-${type}`
  }

  private getLocalData<T>(key: string): T[] {
    if (typeof window === "undefined") return []
    try {
      const data = localStorage.getItem(this.getLocalStorageKey(key))
      return data ? JSON.parse(data) : []
    } catch {
      return []
    }
  }

  private setLocalData<T>(key: string, data: T[]): void {
    if (typeof window === "undefined") return
    try {
      localStorage.setItem(this.getLocalStorageKey(key), JSON.stringify(data))
    } catch (error) {
      console.error("Failed to save to localStorage:", error)
    }
  }

  // Login Records Management
  async createLoginRecord(loginRecord: Omit<LoginRecord, "$id">): Promise<LoginRecord> {
    if (this.isConfigured && this.databases) {
      try {
        // Remove any metadata fields before sending to Appwrite
        const { $databaseId, $collectionId, $permissions, $createdAt, $updatedAt, ...cleanRecord } = loginRecord as any
        
        const response = await this.databases.createDocument(
          this.databaseId,
          this.loginRecordsCollectionId,
          ID.unique(),
          cleanRecord,
        )
        return response as unknown as LoginRecord
      } catch (error) {
        console.error("Appwrite error, falling back to localStorage:", error)
      }
    }

    // Fallback to localStorage
    const newRecord: LoginRecord = {
      $id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...loginRecord,
    }

    const records = this.getLocalData<LoginRecord>("login-records")
    records.push(newRecord)
    this.setLocalData("login-records", records)

    return newRecord
  }

  async updateLoginRecord(recordId: string, updates: Partial<LoginRecord>): Promise<LoginRecord> {
    if (this.isConfigured && this.databases && !recordId.startsWith("local-")) {
      try {
        // Remove metadata fields from updates
        const { $id, $databaseId, $collectionId, $permissions, $createdAt, $updatedAt, ...cleanUpdates } = updates as any
        
        const response = await this.databases.updateDocument(
          this.databaseId,
          this.loginRecordsCollectionId,
          recordId,
          cleanUpdates,
        )
        return response as unknown as LoginRecord
      } catch (error) {
        console.error("Appwrite error, falling back to localStorage:", error)
      }
    }

    // Fallback to localStorage
    const records = this.getLocalData<LoginRecord>("login-records")
    const recordIndex = records.findIndex((r) => r.$id === recordId)

    if (recordIndex !== -1) {
      records[recordIndex] = { ...records[recordIndex], ...updates }
      this.setLocalData("login-records", records)
      return records[recordIndex]
    }

    throw new Error("Login record not found")
  }

  async getAllLoginRecords(): Promise<LoginRecord[]> {
    if (this.isConfigured && this.databases) {
      try {
        const response = await this.databases.listDocuments(this.databaseId, this.loginRecordsCollectionId, [
          Query.orderDesc("loginTime"),
          Query.limit(1000),
        ])
        return response.documents as unknown as LoginRecord[]
      } catch (error) {
        console.error("Appwrite error, falling back to localStorage:", error)
      }
    }

    // Fallback to localStorage
    const records = this.getLocalData<LoginRecord>("login-records")
    return records.sort((a, b) => new Date(b.loginTime).getTime() - new Date(a.loginTime).getTime())
  }

  async getLoginRecordsByDateRange(startDate: string, endDate: string): Promise<LoginRecord[]> {
    if (this.isConfigured && this.databases) {
      try {
        const response = await this.databases.listDocuments(this.databaseId, this.loginRecordsCollectionId, [
          Query.greaterThanEqual("loginTime", startDate),
          Query.lessThanEqual("loginTime", endDate),
          Query.orderDesc("loginTime"),
        ])
        return response.documents as unknown as LoginRecord[]
      } catch (error) {
        console.error("Appwrite error, falling back to localStorage:", error)
      }
    }

    // Fallback to localStorage
    const records = this.getLocalData<LoginRecord>("login-records")
    return records
      .filter((record) => {
        const loginDate = record.loginTime.split("T")[0]
        return loginDate >= startDate && loginDate <= endDate
      })
      .sort((a, b) => new Date(b.loginTime).getTime() - new Date(a.loginTime).getTime())
  }

  async getCurrentActiveSessions(): Promise<LoginRecord[]> {
    const allRecords = await this.getAllLoginRecords()
    return allRecords.filter((record) => !record.logoutTime)
  }

  // Authentication methods
  async createStaffAccount(email: string, password: string, name: string): Promise<any> {
    if (this.isConfigured && this.account) {
      try {
        return await this.account.create(ID.unique(), email, password, name)
      } catch (error) {
        console.error("Appwrite auth error:", error)
        throw error
      }
    }
    throw new Error("Appwrite not configured")
  }

  async loginStaff(email: string, password: string): Promise<any> {
    if (this.isConfigured && this.account) {
      try {
        return await this.account.createSession(email, password)
      } catch (error) {
        console.error("Appwrite login error:", error)
        throw error
      }
    }
    throw new Error("Appwrite not configured")
  }

  async logoutStaff(): Promise<void> {
    if (this.isConfigured && this.account) {
      try {
        await this.account.deleteSession("current")
      } catch (error) {
        console.error("Appwrite logout error:", error)
      }
    }
  }

  async getCurrentUser(): Promise<any> {
    if (this.isConfigured && this.account) {
      try {
        return await this.account.get()
      } catch (error) {
        console.error("Appwrite get user error:", error)
        return null
      }
    }
    return null
  }

  // Staff management
  async createStaff(staff: Omit<Staff, "$id">): Promise<Staff> {
    if (this.isConfigured && this.databases) {
      try {
        // Remove any metadata fields before sending to Appwrite
        const { $databaseId, $collectionId, $permissions, $createdAt, $updatedAt, ...cleanStaff } = staff as any
        
        const response = await this.databases.createDocument(
          this.databaseId,
          this.staffCollectionId,
          ID.unique(),
          cleanStaff,
        )
        return response as unknown as Staff
      } catch (error) {
        console.error("Appwrite error, falling back to localStorage:", error)
      }
    }

    // Fallback to localStorage
    const newStaff: Staff = {
      $id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...staff,
    }

    const staffList = this.getLocalData<Staff>("staff")
    staffList.push(newStaff)
    this.setLocalData("staff", staffList)

    return newStaff
  }

  async getAllStaff(): Promise<Staff[]> {
    if (this.isConfigured && this.databases) {
      try {
        const response = await this.databases.listDocuments(this.databaseId, this.staffCollectionId)
        return response.documents as unknown as Staff[]
      } catch (error) {
        console.error("Appwrite error, falling back to localStorage:", error)
      }
    }

    // Fallback to localStorage
    return this.getLocalData<Staff>("staff")
  }

  async updateStaff(staffId: string, updates: Partial<Staff>): Promise<Staff> {
    if (this.isConfigured && this.databases && !staffId.startsWith("local-")) {
      try {
        // Remove metadata fields from updates
        const { $id, $databaseId, $collectionId, $permissions, $createdAt, $updatedAt, ...cleanUpdates } = updates as any
        
        const response = await this.databases.updateDocument(this.databaseId, this.staffCollectionId, staffId, cleanUpdates)
        return response as unknown as Staff
      } catch (error) {
        console.error("Appwrite error, falling back to localStorage:", error)
      }
    }

    // Fallback to localStorage
    const staffList = this.getLocalData<Staff>("staff")
    const staffIndex = staffList.findIndex((s) => s.$id === staffId)

    if (staffIndex !== -1) {
      staffList[staffIndex] = { ...staffList[staffIndex], ...updates }
      this.setLocalData("staff", staffList)
      return staffList[staffIndex]
    }

    throw new Error("Staff not found")
  }

  async deleteStaff(staffId: string): Promise<void> {
    if (this.isConfigured && this.databases && !staffId.startsWith("local-")) {
      try {
        await this.databases.deleteDocument(this.databaseId, this.staffCollectionId, staffId)
        return
      } catch (error) {
        console.error("Appwrite error, falling back to localStorage:", error)
      }
    }

    // Fallback to localStorage
    const staffList = this.getLocalData<Staff>("staff")
    const filteredStaff = staffList.filter((s) => s.$id !== staffId)
    this.setLocalData("staff", filteredStaff)
  }

  // Create a new library record
  async createRecord(record: Omit<LibraryRecord, "$id">): Promise<LibraryRecord> {
    if (this.isConfigured && this.databases) {
      try {
        // Test connection first
        await this.testConnection()
        
        const { $databaseId, $collectionId, $permissions, $createdAt, $updatedAt, ...cleanRecord } = record as any
        
        const response = await this.databases.createDocument(
          this.databaseId,
          this.recordsCollectionId,
          ID.unique(),
          cleanRecord,
        )
        
        console.log("Record created successfully in Appwrite:", response.$id)
        return response as unknown as LibraryRecord
      } catch (error) {
        console.error("Appwrite createRecord error:", error)
        if (error instanceof Error) {
          console.error("Error details:", {
            message: error.message,
            name: error.name,
            stack: error.stack
          })
        }
        // Fall back to localStorage
      }
    }

    // Fallback to localStorage
    console.log("Using localStorage fallback for record creation")
    const newRecord: LibraryRecord = {
      $id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...record,
    }

    const records = this.getLocalData<LibraryRecord>("records")
    records.push(newRecord)
    this.setLocalData("records", records)

    return newRecord
  }

  // Update an existing record
  async updateRecord(recordId: string, updates: Partial<LibraryRecord>): Promise<LibraryRecord> {
    if (this.isConfigured && this.databases && !recordId.startsWith("local-")) {
      try {
        // Remove metadata fields from updates
        const { $id, $databaseId, $collectionId, $permissions, $createdAt, $updatedAt, ...cleanUpdates } = updates as any
        
        const response = await this.databases.updateDocument(
          this.databaseId,
          this.recordsCollectionId,
          recordId,
          cleanUpdates,
        )
        return response as unknown as LibraryRecord
      } catch (error) {
        console.error("Appwrite error, falling back to localStorage:", error)
      }
    }

    // Fallback to localStorage
    const records = this.getLocalData<LibraryRecord>("records")
    const recordIndex = records.findIndex((r) => r.$id === recordId)

    if (recordIndex !== -1) {
      records[recordIndex] = { ...records[recordIndex], ...updates }
      this.setLocalData("records", records)
      return records[recordIndex]
    }

    throw new Error("Record not found")
  }

  // Delete a record
  async deleteRecord(recordId: string): Promise<void> {
    if (this.isConfigured && this.databases && !recordId.startsWith("local-")) {
      try {
        await this.databases.deleteDocument(this.databaseId, this.recordsCollectionId, recordId)
        return
      } catch (error) {
        console.error("Appwrite error, falling back to localStorage:", error)
      }
    }

    // Fallback to localStorage
    const records = this.getLocalData<LibraryRecord>("records")
    const filteredRecords = records.filter((r) => r.$id !== recordId)
    this.setLocalData("records", filteredRecords)
  }

  // Get records by date
  async getRecordsByDate(date: string): Promise<LibraryRecord[]> {
    if (this.isConfigured && this.databases) {
      try {
        await this.testConnection()
        
        const response = await this.databases.listDocuments(this.databaseId, this.recordsCollectionId, [
          Query.equal("date", date),
          Query.orderDesc("checkInTime"),
        ])
        
        console.log(`Fetched ${response.documents.length} records from Appwrite for date ${date}`)
        return response.documents as unknown as LibraryRecord[]
      } catch (error) {
        console.error("Appwrite getRecordsByDate error:", error)
        if (error instanceof Error) {
          console.error("Error details:", {
            message: error.message,
            name: error.name
          })
        }
        // Fall back to localStorage
      }
    }

    // Fallback to localStorage
    console.log("Using localStorage fallback for getting records by date")
    const records = this.getLocalData<LibraryRecord>("records")
    return records
      .filter((record) => record.date === date)
      .sort((a, b) => {
        if (!a.checkInTime || !b.checkInTime) return 0
        return new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime()
      })
  }

  // Get all records
  async getAllRecords(): Promise<LibraryRecord[]> {
    if (this.isConfigured && this.databases) {
      try {
        const response = await this.databases.listDocuments(this.databaseId, this.recordsCollectionId, [
          Query.orderDesc("checkInTime"),
          Query.limit(1000), // Adjust limit as needed
        ])
        return response.documents as unknown as LibraryRecord[]
      } catch (error) {
        console.error("Appwrite error, falling back to localStorage:", error)
      }
    }

    // Fallback to localStorage
    const records = this.getLocalData<LibraryRecord>("records")
    return records.sort((a, b) => {
      if (!a.checkInTime || !b.checkInTime) return 0
      return new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime()
    })
  }

  // Get student by admission ID
  async getStudentByAdmissionId(admissionId: string): Promise<Student | null> {
    if (this.isConfigured && this.databases) {
      try {
        const response = await this.databases.listDocuments(this.databaseId, this.studentsCollectionId, [
          Query.equal("admissionId", admissionId),
        ])

        if (response.documents.length > 0) {
          return response.documents[0] as unknown as Student
        }
      } catch (error) {
        console.error("Appwrite error, falling back to localStorage:", error)
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

  // Check if admission ID already exists
  async checkAdmissionIdExists(admissionId: string): Promise<boolean> {
    if (this.isConfigured && this.databases) {
      try {
        const response = await this.databases.listDocuments(this.databaseId, this.studentsCollectionId, [
          Query.equal("admissionId", admissionId.trim()),
          Query.limit(1)
        ])
        return response.documents.length > 0
      } catch (error) {
        console.error("Error checking admission ID existence:", error)
        // Fall back to localStorage check
      }
    }

    // Fallback to localStorage
    const students = this.getLocalData<Student>("students")
    return students.some(s => s.admissionId.toLowerCase() === admissionId.toLowerCase().trim())
  }

  // Create a new student
  async createStudent(student: Omit<Student, "$id">): Promise<Student> {
    // Check for duplicate admission ID first
    const admissionIdExists = await this.checkAdmissionIdExists(student.admissionId)
    if (admissionIdExists) {
      throw new Error(`Student with admission ID "${student.admissionId}" already exists`)
    }

    if (this.isConfigured && this.databases) {
      try {
        // Remove any metadata fields before sending to Appwrite
        const { $databaseId, $collectionId, $permissions, $createdAt, $updatedAt, ...cleanStudent } = student as any
        
        const response = await this.databases.createDocument(
          this.databaseId,
          this.studentsCollectionId,
          ID.unique(),
          cleanStudent,
        )
        return response as unknown as Student
      } catch (error) {
        console.error("Appwrite error, falling back to localStorage:", error)
        // If Appwrite fails, still check localStorage for duplicates
        const localStudents = this.getLocalData<Student>("students")
        if (localStudents.some(s => s.admissionId.toLowerCase() === student.admissionId.toLowerCase())) {
          throw new Error(`Student with admission ID "${student.admissionId}" already exists`)
        }
      }
    }

    // Fallback to localStorage - double check for duplicates
    const localStudents = this.getLocalData<Student>("students")
    if (localStudents.some(s => s.admissionId.toLowerCase() === student.admissionId.toLowerCase())) {
      throw new Error(`Student with admission ID "${student.admissionId}" already exists`)
    }

    const newStudent: Student = {
      $id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...student,
    }

    localStudents.push(newStudent)
    this.setLocalData("students", localStudents)

    return newStudent
  }

  // Get all students
  async getAllStudents(): Promise<Student[]> {
    if (this.isConfigured && this.databases) {
      try {
        const response = await this.databases.listDocuments(this.databaseId, this.studentsCollectionId, [
          Query.orderAsc("name"),
        ])
        return response.documents as unknown as Student[]
      } catch (error) {
        console.error("Appwrite error, falling back to localStorage:", error)
      }
    }

    // Fallback to localStorage
    const students = this.getLocalData<Student>("students")
    return students.sort((a, b) => a.name.localeCompare(b.name))
  }

  // Update an existing student
  async updateStudent(studentId: string, updates: Partial<Student>): Promise<Student> {
    if (this.isConfigured && this.databases && !studentId.startsWith("local-")) {
      try {
        // Remove metadata fields from updates
        const { $id, $databaseId, $collectionId, $permissions, $createdAt, $updatedAt, ...cleanUpdates } = updates as any
        
        const response = await this.databases.updateDocument(
          this.databaseId,
          this.studentsCollectionId,
          studentId,
          cleanUpdates,
        )
        return response as unknown as Student
      } catch (error) {
        console.error("Appwrite error, falling back to localStorage:", error)
      }
    }

    // Fallback to localStorage
    const students = this.getLocalData<Student>("students")
    const studentIndex = students.findIndex((s) => s.$id === studentId)

    if (studentIndex !== -1) {
      students[studentIndex] = { ...students[studentIndex], ...updates }
      this.setLocalData("students", students)
      return students[studentIndex]
    }

    throw new Error("Student not found")
  }

  // Delete a student
  async deleteStudent(studentId: string): Promise<void> {
    if (this.isConfigured && this.databases && !studentId.startsWith("local-")) {
      try {
        await this.databases.deleteDocument(this.databaseId, this.studentsCollectionId, studentId)
        return
      } catch (error) {
        console.error("Appwrite error, falling back to localStorage:", error)
      }
    }

    // Fallback to localStorage
    const students = this.getLocalData<Student>("students")
    const filteredStudents = students.filter((s) => s.$id !== studentId)
    this.setLocalData("students", filteredStudents)
  }

  // Get current checked-in students
  async getCurrentlyCheckedIn(): Promise<LibraryRecord[]> {
    const today = new Date().toISOString().split("T")[0]
    const allRecords = await this.getRecordsByDate(today)
    return allRecords.filter((record) => record.status === "checked-in")
  }

  // Check if Appwrite is properly configured
  isAppwriteConfigured(): boolean {
    return this.isConfigured
  }

  // Enhanced connection status
  getConnectionStatus(): { isConnected: boolean; message: string; details?: any } {
    const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT
    const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID

    if (!endpoint || !projectId) {
      return {
        isConnected: false,
        message: "🔧 Configuration Required",
        details: {
          reason: "Environment variables missing",
          missing: {
            endpoint: !endpoint,
            projectId: !projectId
          },
          fix: "Add NEXT_PUBLIC_APPWRITE_ENDPOINT and NEXT_PUBLIC_APPWRITE_PROJECT_ID to .env.local"
        }
      }
    }

    if (this.isConfigured && this.connectionTested) {
      return {
        isConnected: true,
        message: "🌐 Connected to Appwrite Cloud",
        details: {
          endpoint: endpoint,
          projectId: projectId.substring(0, 8) + "...",
          database: this.databaseId,
          collections: {
            records: this.recordsCollectionId,
            students: this.studentsCollectionId,
            staff: this.staffCollectionId,
            loginRecords: this.loginRecordsCollectionId
          }
        }
      }
    } else if (this.isConfigured && !this.connectionTested) {
      return {
        isConnected: false,
        message: "⚠️ Appwrite configured but connection failed",
        details: {
          endpoint: endpoint,
          projectId: projectId.substring(0, 8) + "...",
          possibleIssues: [
            "Collection permissions not set to 'any'",
            "Database or collection IDs don't match",
            "Network connectivity issues",
            "Invalid project ID"
          ]
        }
      }
    } else {
      return {
        isConnected: false,
        message: "📱 Running in Demo Mode (Local Storage)",
        details: {
          reason: "Appwrite initialization failed",
          endpoint: endpoint || "Not set",
          projectId: projectId ? projectId.substring(0, 8) + "..." : "Not set"
        }
      }
    }
  }

  // Add method to manually retry connection
  async retryConnection(): Promise<boolean> {
    this.connectionTested = false
    this.isConfigured = false
    
    try {
      await this.initializeAppwrite()
      return this.isConfigured
    } catch (error) {
      console.error("Connection retry failed:", error)
      return false
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
