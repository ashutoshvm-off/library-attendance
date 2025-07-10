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
        console.warn("Appwrite environment variables not configured. Using fallback mode.")
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
        const response = await this.databases.createDocument(
          this.databaseId,
          this.loginRecordsCollectionId,
          ID.unique(),
          loginRecord,
        )
        return response as LoginRecord
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
        const response = await this.databases.updateDocument(
          this.databaseId,
          this.loginRecordsCollectionId,
          recordId,
          updates,
        )
        return response as LoginRecord
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
        return response.documents as LoginRecord[]
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
        return response.documents as LoginRecord[]
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
        return await this.account.createEmailSession(email, password)
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
        const response = await this.databases.createDocument(
          this.databaseId,
          this.staffCollectionId,
          ID.unique(),
          staff,
        )
        return response as Staff
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
        return response.documents as Staff[]
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
        const response = await this.databases.updateDocument(this.databaseId, this.staffCollectionId, staffId, updates)
        return response as Staff
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
        const response = await this.databases.createDocument(
          this.databaseId,
          this.recordsCollectionId,
          ID.unique(),
          record,
        )
        return response as LibraryRecord
      } catch (error) {
        console.error("Appwrite error, falling back to localStorage:", error)
      }
    }

    // Fallback to localStorage
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
        const response = await this.databases.updateDocument(
          this.databaseId,
          this.recordsCollectionId,
          recordId,
          updates,
        )
        return response as LibraryRecord
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
        const response = await this.databases.listDocuments(this.databaseId, this.recordsCollectionId, [
          Query.equal("date", date),
          Query.orderDesc("checkInTime"),
        ])
        return response.documents as LibraryRecord[]
      } catch (error) {
        console.error("Appwrite error, falling back to localStorage:", error)
      }
    }

    // Fallback to localStorage
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
        return response.documents as LibraryRecord[]
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
          return response.documents[0] as Student
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

  // Create a new student
  async createStudent(student: Omit<Student, "$id">): Promise<Student> {
    if (this.isConfigured && this.databases) {
      try {
        const response = await this.databases.createDocument(
          this.databaseId,
          this.studentsCollectionId,
          ID.unique(),
          student,
        )
        return response as Student
      } catch (error) {
        console.error("Appwrite error, falling back to localStorage:", error)
      }
    }

    // Fallback to localStorage
    const newStudent: Student = {
      $id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...student,
    }

    const students = this.getLocalData<Student>("students")
    students.push(newStudent)
    this.setLocalData("students", students)

    return newStudent
  }

  // Get all students
  async getAllStudents(): Promise<Student[]> {
    if (this.isConfigured && this.databases) {
      try {
        const response = await this.databases.listDocuments(this.databaseId, this.studentsCollectionId, [
          Query.orderAsc("name"),
        ])
        return response.documents as Student[]
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
        const response = await this.databases.updateDocument(
          this.databaseId,
          this.studentsCollectionId,
          studentId,
          updates,
        )
        return response as Student
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

  // Get connection status
  getConnectionStatus(): { isConnected: boolean; message: string } {
    if (this.isConfigured) {
      return {
        isConnected: true,
        message: "Connected to Appwrite Cloud",
      }
    } else {
      return {
        isConnected: false,
        message: "Running in Demo Mode (Local Storage)",
      }
    }
  }
}
