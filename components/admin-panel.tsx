"use client"

import { useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog"
import { toast } from "@/hooks/use-toast"
import {
  CalendarIcon,
  FileText,
  FileSpreadsheet,
  Users,
  UserCheck,
  UserX,
  RefreshCw,
  LogOut,
  Settings,
  Bell,
  Search,
  Plus,
  Edit,
  Trash2,
  UserPlus,
  Save,
  X,
  Moon,
  Sun,
  Upload,
  Download,
  CheckCircle,
  AlertCircle,
} from "lucide-react"
import { format, startOfMonth, endOfMonth } from "date-fns"
import { AppwriteService } from "@/lib/appwrite"
import { useAuth } from "./auth-context"

interface LibraryRecord {
  $id?: string
  admissionId: string
  studentName: string
  checkInTime?: string
  checkOutTime?: string
  date: string
  status: "checked-in" | "checked-out"
}

interface Staff {
  id: string
  name: string
  role: string
  avatar?: string
  isActive?: boolean
}

interface AdminPanelProps {
  staff: Staff | null
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

interface Student {
  $id?: string
  admissionId: string
  name: string
  email?: string
  phone?: string
}

interface ImportProgress {
  total: number
  processed: number
  successful: number
  failed: number
  errors: string[]
}

interface ImportStudentData {
  admissionId: string
  name: string
  email?: string
  phone?: string
  error?: string
}

function getStatusBadge(record: LibraryRecord) {
  if (record.status === "checked-in") {
    return <Badge className="bg-green-600 text-white">Checked In</Badge>
  } else {
    return <Badge className="bg-red-600 text-white">Checked Out</Badge>
  }
}

export function AdminPanel({ staff }: AdminPanelProps) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [records, setRecords] = useState<LibraryRecord[]>([])
  const [filteredRecords, setFilteredRecords] = useState<LibraryRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [appwriteService] = useState(() => new AppwriteService())
  const { logout } = useAuth()
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()))
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()))
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const [students, setStudents] = useState<Student[]>([])
  const [studentSearchTerm, setStudentSearchTerm] = useState("")
  const [isAddingStudent, setIsAddingStudent] = useState(false)
  const [newStudent, setNewStudent] = useState({
    admissionId: "",
    name: "",
    email: "",
    phone: "",
  })
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [studentLoading, setStudentLoading] = useState(false)

  // New states for editing records
  const [editingRecord, setEditingRecord] = useState<LibraryRecord | null>(null)
  const [isUpdatingRecord, setIsUpdatingRecord] = useState(false)

  // New states for import functionality
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null)
  const [importData, setImportData] = useState<ImportStudentData[]>([])
  const [showImportPreview, setShowImportPreview] = useState(false)
  
  const downloadTemplate = () => {
    const templateData = [
      {
        "Admission ID": "ASIET001",
        "Full Name": "John Doe",
        "Email": "john.doe@example.com",
        "Phone": "9876543210"
      },
      {
        "Admission ID": "ASIET002", 
        "Full Name": "Jane Smith",
        "Email": "jane.smith@example.com",
        "Phone": "9876543211"
      }
    ]

    try {
      import("xlsx").then((XLSX) => {
        const wb = XLSX.utils.book_new()
        const ws = XLSX.utils.json_to_sheet(templateData)
        
        // Set column widths
        ws['!cols'] = [
          { wch: 15 }, // Admission ID
          { wch: 25 }, // Full Name
          { wch: 30 }, // Email
          { wch: 15 }  // Phone
        ]
        
        XLSX.utils.book_append_sheet(wb, ws, "Students Template")
        
        const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" })
        const blob = new Blob([wbout], { type: "application/octet-stream" })
        
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = "students-import-template.xlsx"
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)

        toast({
          title: "Template Downloaded",
          description: "Use this template to format your student data for import",
        })
      })
    } catch (error) {
      console.error("Error downloading template:", error)
      toast({
        title: "Download Failed",
        description: "Failed to download template file",
        variant: "destructive",
      })
    }
  }
  
  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    if (!['xlsx', 'xls', 'csv'].includes(fileExtension || '')) {
      toast({
        title: "Invalid File Format",
        description: "Please upload an Excel (.xlsx, .xls) or CSV file",
        variant: "destructive",
      })
      return
    }

    try {
      const XLSX = await import("xlsx")
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data, { type: "array" })
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][]

      if (jsonData.length < 2) {
        toast({
          title: "Empty File",
          description: "The file appears to be empty or has no data rows",
          variant: "destructive",
        })
        return
      }

      // Parse the data
      const headers = jsonData[0].map(h => h?.toString().toLowerCase().trim())
      const rows = jsonData.slice(1)

      // Find column indices with more flexible matching
      const admissionIdIndex = headers.findIndex(h => 
        h.includes('admission') || h.includes('id') || h === 'admission id' || h === 'admissionid'
      )
      const nameIndex = headers.findIndex(h => 
        h.includes('name') || h === 'full name' || h === 'student name'
      )
      const emailIndex = headers.findIndex(h => h.includes('email'))
      const phoneIndex = headers.findIndex(h => h.includes('phone') || h.includes('mobile') || h.includes('contact'))

      if (admissionIdIndex === -1 || nameIndex === -1) {
        toast({
          title: "Invalid Format",
          description: "File must contain 'Admission ID' and 'Name' columns. Found headers: " + headers.join(', '),
          variant: "destructive",
        })
        return
      }

      // Get existing students to check for duplicates during parsing
      const existingStudents = await appwriteService.getAllStudents()
      const existingIds = new Set(existingStudents.map(s => s.admissionId.toLowerCase()))

      const parsedData: ImportStudentData[] = rows
        .filter(row => row && row.length > 0 && row[admissionIdIndex]?.toString().trim() && row[nameIndex]?.toString().trim())
        .map((row, index) => {
          const admissionId = row[admissionIdIndex]?.toString().trim() || ''
          const name = row[nameIndex]?.toString().trim() || ''
          const email = emailIndex !== -1 && row[emailIndex] ? row[emailIndex]?.toString().trim() : undefined
          const phone = phoneIndex !== -1 && row[phoneIndex] ? row[phoneIndex]?.toString().trim() : undefined

          // Enhanced validation
          let error = ""
          if (!admissionId) {
            error = "Missing admission ID"
          } else if (!name) {
            error = "Missing name"
          } else if (existingIds.has(admissionId.toLowerCase())) {
            error = "Student already exists in database"
          } else if (email && email.length > 0 && !email.includes("@")) {
            error = "Invalid email format"
          } else if (phone && phone.length > 0 && !/^\d{10}$/.test(phone.replace(/\D/g, ''))) {
            // Basic phone validation - should be 10 digits
            error = "Invalid phone format (should be 10 digits)"
          }

          return {
            admissionId,
            name,
            email: email && email.length > 0 ? email : undefined,
            phone: phone && phone.length > 0 ? phone : undefined,
            error: error || undefined
          }
        })

      if (parsedData.length === 0) {
        toast({
          title: "No Valid Data",
          description: "No valid student records found in the file",
          variant: "destructive",
        })
        return
      }

      setImportData(parsedData)
      setShowImportPreview(true)

      const validCount = parsedData.filter(item => !item.error).length
      const duplicateCount = parsedData.filter(item => item.error?.includes('already exists')).length

      toast({
        title: "File Parsed Successfully",
        description: `Found ${parsedData.length} records. ${validCount} are valid, ${duplicateCount} are duplicates.`,
      })

    } catch (error) {
      console.error("Error parsing file:", error)
      toast({
        title: "File Parse Error",
        description: "Failed to read the file. Please check the format and try again.",
        variant: "destructive",
      })
    }

    // Reset file input
    e.target.value = ""
  }
  
  const executeImport = async () => {
    const validRecords = importData.filter(item => !item.error)
    if (validRecords.length === 0) {
      toast({
        title: "No Valid Records",
        description: "Please fix the errors before importing",
        variant: "destructive",
      })
      return
    }

    setIsImporting(true)
    const progress: ImportProgress = {
      total: validRecords.length,
      processed: 0,
      successful: 0,
      failed: 0,
      errors: []
    }
    
    setImportProgress(progress)

    try {
      // Get fresh list of existing students to avoid duplicates
      const existingStudents = await appwriteService.getAllStudents()
      const existingIds = new Set(existingStudents.map(s => s.admissionId.toLowerCase()))

      for (let i = 0; i < validRecords.length; i++) {
        const record = validRecords[i]
        
        try {
          // Double-check if student already exists (real-time check)
          if (existingIds.has(record.admissionId.toLowerCase())) {
            progress.failed++
            progress.errors.push(`${record.admissionId}: Student already exists`)
          } else {
            // Validate data before creating
            if (!record.admissionId?.trim() || !record.name?.trim()) {
              progress.failed++
              progress.errors.push(`${record.admissionId || 'Unknown'}: Missing required fields`)
              continue
            }

            // Create student in database
            const studentData = {
              admissionId: record.admissionId.trim(),
              name: record.name.trim(),
              email: record.email?.trim() || undefined,
              phone: record.phone?.trim() || undefined
            }

            const createdStudent = await appwriteService.createStudent(studentData)
            
            // Verify the student was created successfully
            if (createdStudent && createdStudent.$id) {
              progress.successful++
              existingIds.add(record.admissionId.toLowerCase()) // Add to set to prevent duplicates in same batch
              console.log(`Successfully imported student: ${record.admissionId} - ${record.name}`)
            } else {
              throw new Error('Student creation returned invalid response')
            }
          }
        } catch (error) {
          progress.failed++
          let errorMessage = 'Unknown error'
          if (error instanceof Error) {
            errorMessage = error.message
            // Handle specific duplicate error
            if (errorMessage.includes("already exists")) {
              errorMessage = "Student already exists in database"
            }
          }
          progress.errors.push(`${record.admissionId}: ${errorMessage}`)
          console.error(`Failed to import student ${record.admissionId}:`, error)
        }

        progress.processed++
        setImportProgress({ ...progress })

        // Small delay to prevent overwhelming the database and show progress
        if (i % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 200))
        }
      }

      // Show final results
      if (progress.successful > 0) {
        toast({
          title: "Import Completed",
          description: `Successfully imported ${progress.successful} students. ${progress.failed} failed.`,
          variant: progress.failed === 0 ? "default" : "destructive",
        })
        
        // Refresh the student list to show new students
        await loadStudents()
      } else {
        toast({
          title: "Import Failed",
          description: "No students were imported. Check the errors below.",
          variant: "destructive",
        })
      }

    } catch (error) {
      console.error("Import error:", error)
      toast({
        title: "Import Error",
        description: `An unexpected error occurred during import: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      })
    } finally {
      setIsImporting(false)
      
      // Keep progress visible for a few seconds then auto-close
      setTimeout(() => {
        setImportProgress(null)
        if (progress.successful > 0) {
          setShowImportPreview(false)
          setImportData([])
        }
      }, 5000)
    }
  }

  // Prevent hydration mismatch by only rendering after mounting
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted) {
      loadAllRecords()
      loadStudents()
    }
  }, [mounted])

  useEffect(() => {
    filterRecords()
  }, [records, searchTerm, statusFilter, startDate, endDate])

  const loadAllRecords = async () => {
    setLoading(true)
    try {
      const data = await appwriteService.getAllRecords()
      setRecords(data)
    } catch (error) {
      console.error("Error loading records:", error)
      toast({
        title: "Error",
        description: "Failed to load records",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const filterRecords = () => {
    let filtered = records

    if (startDate && endDate) {
      const startStr = format(startDate, "yyyy-MM-dd")
      const endStr = format(endDate, "yyyy-MM-dd")
      filtered = filtered.filter((record) => record.date >= startStr && record.date <= endStr)
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (record) =>
          record.admissionId.toLowerCase().includes(searchTerm.toLowerCase()) ||
          record.studentName.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((record) => record.status === statusFilter)
    }

    setFilteredRecords(filtered)
  }

  const exportToPDF = async () => {
    setExportLoading(true)
    try {
      const { jsPDF } = await import("jspdf")
      const doc = new jsPDF()

      doc.setFontSize(20)
      doc.text("Library Records Report", 20, 20)

      doc.setFontSize(12)
      doc.text(`Date Range: ${format(startDate, "PPP")} - ${format(endDate, "PPP")}`, 20, 35)
      doc.text(`Total Records: ${filteredRecords.length}`, 20, 45)

      let yPosition = 65
      doc.setFontSize(10)
      doc.text("Admission ID", 20, yPosition)
      doc.text("Student Name", 60, yPosition)
      doc.text("Date", 120, yPosition)
      doc.text("Check-in", 150, yPosition)
      doc.text("Check-out", 180, yPosition)

      filteredRecords.forEach((record, index) => {
        yPosition += 10
        if (yPosition > 280) {
          doc.addPage()
          yPosition = 20
        }

        doc.text(record.admissionId, 20, yPosition)
        doc.text(record.studentName.substring(0, 20), 60, yPosition)
        doc.text(record.date, 120, yPosition)
        doc.text(record.checkInTime ? format(new Date(record.checkInTime), "HH:mm") : "-", 150, yPosition)
        doc.text(record.checkOutTime ? format(new Date(record.checkOutTime), "HH:mm") : "-", 180, yPosition)
      })

      const fileName = `library-records-${format(startDate, "yyyy-MM-dd")}-to-${format(endDate, "yyyy-MM-dd")}.pdf`
      doc.save(fileName)

      toast({
        title: "Export Successful",
        description: `PDF exported as ${fileName}`,
      })
    } catch (error) {
      console.error("Error exporting PDF:", error)
      toast({
        title: "Export Failed",
        description: "Failed to export PDF",
        variant: "destructive",
      })
    } finally {
      setExportLoading(false)
    }
  }

  const exportToExcel = async () => {
    setExportLoading(true)
    try {
      const XLSX = await import("xlsx")

      const excelData = filteredRecords.map((record) => ({
        "Admission ID": record.admissionId,
        "Student Name": record.studentName,
        Date: record.date,
        "Check-in Time": record.checkInTime ? format(new Date(record.checkInTime), "HH:mm:ss") : "",
        "Check-out Time": record.checkOutTime ? format(new Date(record.checkOutTime), "HH:mm:ss") : "",
        Status: record.status,
        "Duration (Hours)":
          record.checkInTime && record.checkOutTime
            ? (
                (new Date(record.checkOutTime).getTime() - new Date(record.checkInTime).getTime()) /
                (1000 * 60 * 60)
              ).toFixed(2)
            : "",
      }))

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(excelData)

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, "Library Records")

      // Generate buffer and create blob
      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" })
      const blob = new Blob([wbout], { type: "application/octet-stream" })

      // Create download link and trigger download
      const fileName = `library-records-${format(startDate, "yyyy-MM-dd")}-to-${format(endDate, "yyyy-MM-dd")}.xlsx`
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast({
        title: "Export Successful",
        description: `Excel file exported as ${fileName}`,
      })
    } catch (error) {
      console.error("Error exporting Excel:", error)
      toast({
        title: "Export Failed",
        description: "Failed to export Excel file",
        variant: "destructive",
      })
    } finally {
      setExportLoading(false)
    }
  }

  const loadStudents = async () => {
    setStudentLoading(true)
    try {
      const data = await appwriteService.getAllStudents()
      setStudents(data)
    } catch (error) {
      console.error("Error loading students:", error)
      toast({
        title: "Error",
        description: "Failed to load students",
        variant: "destructive",
      })
    } finally {
      setStudentLoading(false)
    }
  }

  const handleAddStudent = async () => {
    if (!newStudent.admissionId.trim() || !newStudent.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Admission ID and Name are required",
        variant: "destructive",
      })
      return
    }

    setIsAddingStudent(true)
    try {
      const studentData = {
        admissionId: newStudent.admissionId.trim(),
        name: newStudent.name.trim(),
        email: newStudent.email.trim() || undefined,
        phone: newStudent.phone.trim() || undefined,
      }

      await appwriteService.createStudent(studentData)

      toast({
        title: "Student Added",
        description: `${studentData.name} has been added successfully`,
      })

      // Reset form and reload students
      setNewStudent({ admissionId: "", name: "", email: "", phone: "" })
      loadStudents()
    } catch (error) {
      console.error("Error adding student:", error)
      if (error instanceof Error && error.message.includes("already exists")) {
        toast({
          title: "Duplicate Entry",
          description: error.message,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to add student",
          variant: "destructive",
        })
      }
    } finally {
      setIsAddingStudent(false)
    }
  }

  const handleUpdateStudent = async () => {
    if (!editingStudent || !editingStudent.admissionId.trim() || !editingStudent.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Admission ID and Name are required",
        variant: "destructive",
      })
      return
    }

    try {
      const updatedData = {
        admissionId: editingStudent.admissionId.trim(),
        name: editingStudent.name.trim(),
        email: editingStudent.email?.trim() || undefined,
        phone: editingStudent.phone?.trim() || undefined,
      }

      await appwriteService.updateStudent(editingStudent.$id!, updatedData)

      toast({
        title: "Student Updated",
        description: `${updatedData.name} has been updated successfully`,
      })

      setEditingStudent(null)
      loadStudents()
    } catch (error) {
      console.error("Error updating student:", error)
      toast({
        title: "Error",
        description: "Failed to update student",
        variant: "destructive",
      })
    }
  }

  const handleDeleteStudent = async (student: Student) => {
    if (!confirm(`Are you sure you want to delete ${student.name}? This action cannot be undone.`)) {
      return
    }

    try {
      await appwriteService.deleteStudent(student.$id!)

      toast({
        title: "Student Deleted",
        description: `${student.name} has been deleted successfully`,
      })

      loadStudents()
    } catch (error) {
      console.error("Error deleting student:", error)
      toast({
        title: "Error",
        description: "Failed to delete student",
        variant: "destructive",
      })
    }
  }

  // New function to handle record updates
  const handleUpdateRecord = async () => {
    if (!editingRecord || !editingRecord.admissionId.trim() || !editingRecord.studentName.trim()) {
      toast({
        title: "Validation Error",
        description: "Admission ID and Student Name are required",
        variant: "destructive",
      })
      return
    }

    setIsUpdatingRecord(true)
    try {
      const updatedData = {
        admissionId: editingRecord.admissionId.trim(),
        studentName: editingRecord.studentName.trim(),
      }

      await appwriteService.updateRecord(editingRecord.$id!, updatedData)

      // Also update the student record if it exists
      try {
        const existingStudent = await appwriteService.getStudentByAdmissionId(updatedData.admissionId)
        if (existingStudent && existingStudent.name !== updatedData.studentName) {
          await appwriteService.updateStudent(existingStudent.$id!, {
            name: updatedData.studentName,
          })
        }
      } catch (error) {
        console.log("Student record update skipped:", error)
      }

      toast({
        title: "Record Updated",
        description: `Record for ${updatedData.studentName} has been updated successfully`,
      })

      setEditingRecord(null)
      loadAllRecords()
      loadStudents() // Refresh students in case we updated a student record
    } catch (error) {
      console.error("Error updating record:", error)
      toast({
        title: "Error",
        description: "Failed to update record",
        variant: "destructive",
      })
    } finally {
      setIsUpdatingRecord(false)
    }
  }

  const handleDeleteRecord = async (record: LibraryRecord) => {
    if (
      !confirm(`Are you sure you want to delete this record for ${record.studentName}? This action cannot be undone.`)
    ) {
      return
    }

    try {
      await appwriteService.deleteRecord(record.$id!)

      toast({
        title: "Record Deleted",
        description: `Record for ${record.studentName} has been deleted successfully`,
      })

      loadAllRecords()
    } catch (error) {
      console.error("Error deleting record:", error)
      toast({
        title: "Error",
        description: "Failed to delete record",
        variant: "destructive",
      })
    }
  }

  const stats = {
    totalRecords: filteredRecords.length,
    checkedIn: filteredRecords.filter((r) => r.status === "checked-in").length,
    checkedOut: filteredRecords.filter((r) => r.status === "checked-out").length,
    uniqueStudents: new Set(filteredRecords.map((r) => r.admissionId)).size,
  }

  // Don't render theme-dependent content until mounted
  if (!mounted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-blue-900 dark:to-indigo-900">
      <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-white/20 dark:border-slate-700/20 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-white dark:bg-slate-700 rounded-xl shadow-sm">
                <img src="/logo.png" alt="ASIET Logo" className="w-6 h-6 object-contain" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  ASIET Admin
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">Library Management System</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="hover:bg-white/20 dark:hover:bg-slate-700/20"
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="sm" className="hover:bg-white/20 dark:hover:bg-slate-700/20">
                <Bell className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" className="hover:bg-white/20 dark:hover:bg-slate-700/20">
                <Settings className="w-4 h-4" />
              </Button>

              <div className="flex items-center gap-3 px-3 py-2 bg-white/60 dark:bg-slate-700/60 rounded-full border border-white/20 dark:border-slate-600/20">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={staff?.avatar || "/placeholder.svg"} />
                  <AvatarFallback className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm">
                    {staff?.name
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("") || "A"}
                  </AvatarFallback>
                </Avatar>
                <div className="text-sm">
                  <p className="font-medium dark:text-white">{staff?.name}</p>
                  <p className="text-gray-600 dark:text-gray-400 text-xs">{staff?.role}</p>
                </div>
              </div>

              <Button
                onClick={logout}
                variant="outline"
                size="sm"
                className="border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 bg-transparent"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Total Records</p>
                  <p className="text-3xl font-bold">{stats.totalRecords}</p>
                </div>
                <FileText className="w-8 h-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Checked In</p>
                  <p className="text-3xl font-bold">{stats.checkedIn}</p>
                </div>
                <UserCheck className="w-8 h-8 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-pink-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Checked Out</p>
                  <p className="text-3xl font-bold">{stats.checkedOut}</p>
                </div>
                <UserX className="w-8 h-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-500 to-red-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium">Unique Students</p>
                  <p className="text-3xl font-bold">{stats.uniqueStudents}</p>
                </div>
                <Users className="w-8 h-8 text-orange-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-white/20 dark:border-slate-700/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 dark:text-white">
              <FileText className="w-5 h-5" />
              Library Records Management
            </CardTitle>
            <CardDescription className="dark:text-slate-300">View, filter, edit, and export library attendance records</CardDescription>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
              <div className="space-y-2">
                <Label className="dark:text-white">Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal bg-white/70 dark:bg-slate-700/70 dark:text-white dark:border-slate-600">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(startDate, "PPP")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 dark:bg-slate-800 dark:border-slate-700" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => date && setStartDate(date)}
                      initialFocus
                      className="dark:bg-slate-800"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label className="dark:text-white">End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal bg-white/70 dark:bg-slate-700/70 dark:text-white dark:border-slate-600">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(endDate, "PPP")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 dark:bg-slate-800 dark:border-slate-700" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={(date) => date && setEndDate(date)}
                      initialFocus
                      className="dark:bg-slate-800"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label className="dark:text-white">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                  <Input
                    placeholder="Search by ID or name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white/70 dark:bg-slate-700/70 dark:text-white dark:border-slate-600 dark:placeholder-gray-400"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="dark:text-white">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-white/70 dark:bg-slate-700/70 dark:text-white dark:border-slate-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="checked-in">Checked In</SelectItem>
                    <SelectItem value="checked-out">Checked Out</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={exportToPDF} disabled={exportLoading} className="bg-red-600 hover:bg-red-700">
                {exportLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <FileText className="w-4 h-4 mr-2" />
                )}
                Export PDF
              </Button>
              <Button onClick={exportToExcel} disabled={exportLoading} className="bg-green-600 hover:bg-green-700">
                {exportLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                )}
                Export Excel
              </Button>
              <Button onClick={loadAllRecords} variant="outline" className="bg-white/70 dark:bg-slate-700/70 dark:text-white dark:border-slate-600">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="text-center py-12">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
                <p className="text-gray-600 dark:text-gray-400">Loading records...</p>
              </div>
            ) : (
              <div className="bg-white/70 dark:bg-slate-700/70 rounded-lg border border-white/20 dark:border-slate-600/20">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-200 dark:border-slate-600">
                      <TableHead className="font-semibold dark:text-slate-200">Admission ID</TableHead>
                      <TableHead className="font-semibold dark:text-slate-200">Student Name</TableHead>
                      <TableHead className="font-semibold dark:text-slate-200">Date</TableHead>
                      <TableHead className="font-semibold dark:text-slate-200">Check-in Time</TableHead>
                      <TableHead className="font-semibold dark:text-slate-200">Check-out Time</TableHead>
                      <TableHead className="font-semibold dark:text-slate-200">Duration</TableHead>
                      <TableHead className="font-semibold dark:text-slate-200">Status</TableHead>
                      <TableHead className="font-semibold dark:text-slate-200">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12 text-gray-500 dark:text-gray-400">
                          <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                          <p className="text-lg font-medium">No records found</p>
                          <p className="text-sm">Try adjusting your filters</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRecords.map((record) => (
                        <TableRow
                          key={record.$id || `${record.admissionId}-${record.checkInTime}`}
                          className="border-gray-100 dark:border-slate-600"
                        >
                          <TableCell className="font-medium text-blue-600 dark:text-blue-400">{record.admissionId}</TableCell>
                          <TableCell className="font-medium dark:text-slate-200">{record.studentName}</TableCell>
                          <TableCell className="dark:text-slate-300">{format(new Date(record.date), "MMM dd, yyyy")}</TableCell>
                          <TableCell>
                            {record.checkInTime ? (
                              <span className="text-green-600 dark:text-green-400 font-medium">
                                {format(new Date(record.checkInTime), "HH:mm:ss")}
                              </span>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            {record.checkOutTime ? (
                              <span className="text-red-600 dark:text-red-400 font-medium">
                                {format(new Date(record.checkOutTime), "HH:mm:ss")}
                              </span>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            {record.checkInTime && record.checkOutTime ? (
                              <span className="text-blue-600 dark:text-blue-400 font-medium">
                                {(
                                  (new Date(record.checkOutTime).getTime() - new Date(record.checkInTime).getTime()) /
                                  (1000 * 60 * 60)
                                ).toFixed(1)}
                                h
                              </span>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>{getStatusBadge(record)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="outline" size="sm" onClick={() => setEditingRecord(record)} className="dark:border-slate-600 dark:text-slate-200">
                                    <Edit className="w-3 h-3" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md dark:bg-slate-800 dark:border-slate-700">
                                  <DialogHeader>
                                    <DialogTitle className="dark:text-white">Edit Record</DialogTitle>
                                    <DialogDescription className="dark:text-slate-300">
                                      Update the admission ID and student name for this record.
                                    </DialogDescription>
                                  </DialogHeader>
                                  {editingRecord && (
                                    <div className="space-y-4 py-4">
                                      <div className="space-y-2">
                                        <Label htmlFor="editRecordAdmissionId" className="dark:text-white">Admission ID *</Label>
                                        <Input
                                          id="editRecordAdmissionId"
                                          value={editingRecord.admissionId}
                                          onChange={(e) =>
                                            setEditingRecord({ ...editingRecord, admissionId: e.target.value })
                                          }
                                          className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label htmlFor="editRecordStudentName" className="dark:text-white">Student Name *</Label>
                                        <Input
                                          id="editRecordStudentName"
                                          value={editingRecord.studentName}
                                          onChange={(e) =>
                                            setEditingRecord({ ...editingRecord, studentName: e.target.value })
                                          }
                                          className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                                        />
                                      </div>
                                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                                        <p className="text-sm text-blue-800 dark:text-blue-300">
                                          <strong>Note:</strong> This will update both the record and the student
                                          database if the student exists.
                                        </p>
                                      </div>
                                    </div>
                                  )}
                                  <div className="flex justify-end gap-2">
                                    <Button variant="outline" onClick={() => setEditingRecord(null)} className="dark:border-slate-600 dark:text-slate-200">
                                      <X className="w-4 h-4 mr-2" />
                                      Cancel
                                    </Button>
                                    <Button
                                      onClick={handleUpdateRecord}
                                      disabled={isUpdatingRecord}
                                      className="bg-blue-600 hover:bg-blue-700"
                                    >
                                      {isUpdatingRecord ? (
                                        <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                                      ) : (
                                        <Save className="w-4 h-4 mr-2" />
                                      )}
                                      {isUpdatingRecord ? "Updating..." : "Update Record"}
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteRecord(record)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20 dark:border-slate-600"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Student Management Section */}
        <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-white/20 dark:border-slate-700/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 dark:text-white">
              <Users className="w-5 h-5" />
              Student Management
            </CardTitle>
            <CardDescription className="dark:text-slate-300">Add, edit, and manage student information</CardDescription>

            <div className="flex items-center justify-between gap-4 pt-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                  <Input
                    placeholder="Search students..."
                    value={studentSearchTerm}
                    onChange={(e) => setStudentSearchTerm(e.target.value)}
                    className="pl-10 bg-white/70 dark:bg-slate-700/70 dark:text-white dark:border-slate-600 dark:placeholder-gray-400"
                  />
                </div>
                <Button onClick={loadStudents} variant="outline" className="bg-white/70 dark:bg-slate-700/70 dark:text-white dark:border-slate-600">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button onClick={downloadTemplate} variant="outline" className="bg-white/70 dark:bg-slate-700/70 dark:text-white dark:border-slate-600">
                  <Download className="w-4 h-4 mr-2" />
                  Template
                </Button>

                <Dialog open={showImportPreview} onOpenChange={setShowImportPreview}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300">
                      <Upload className="w-4 h-4 mr-2" />
                      Import Students
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto dark:bg-slate-800 dark:border-slate-700">
                    <DialogHeader>
                      <DialogTitle className="dark:text-white">Import Students</DialogTitle>
                      <DialogDescription className="dark:text-slate-300">
                        {importData.length === 0 
                          ? "Upload an Excel or CSV file to import multiple students at once."
                          : `Review ${importData.length} records before importing`}
                      </DialogDescription>
                    </DialogHeader>

                    {importData.length === 0 ? (
                      <div className="space-y-4 py-4">
                        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                          <div className="space-y-2">
                            <p className="text-lg font-medium dark:text-white">Upload Student Data</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Select an Excel (.xlsx, .xls) or CSV file containing student information
                            </p>
                          </div>
                          <Input
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            onChange={handleFileImport}
                            className="mt-4 max-w-sm mx-auto dark:bg-slate-700 dark:border-slate-600"
                          />
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                          <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">Required Columns:</h4>
                          <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                            <li>• <strong>Admission ID</strong> - Unique identifier for each student</li>
                            <li>• <strong>Full Name</strong> - Student's complete name</li>
                            <li>• <strong>Email</strong> - Email address (optional)</li>
                            <li>• <strong>Phone</strong> - Contact number (optional)</li>
                          </ul>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4 py-4">
                        {importProgress && (
                          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-blue-800 dark:text-blue-300">Import Progress</span>
                              <span className="text-sm text-blue-600 dark:text-blue-400">
                                {importProgress.processed} / {importProgress.total}
                              </span>
                            </div>
                            <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2 mb-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                                style={{ width: `${(importProgress.processed / importProgress.total) * 100}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-green-600 dark:text-green-400">
                                <CheckCircle className="w-4 h-4 inline mr-1" />
                                {importProgress.successful} successful
                              </span>
                              {importProgress.failed > 0 && (
                                <span className="text-red-600 dark:text-red-400">
                                  <AlertCircle className="w-4 h-4 inline mr-1" />
                                  {importProgress.failed} failed
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg">
                          <Table>
                            <TableHeader>
                              <TableRow className="border-gray-200 dark:border-slate-600">
                                <TableHead className="font-semibold dark:text-slate-200">Status</TableHead>
                                <TableHead className="font-semibold dark:text-slate-200">Admission ID</TableHead>
                                <TableHead className="font-semibold dark:text-slate-200">Name</TableHead>
                                <TableHead className="font-semibold dark:text-slate-200">Email</TableHead>
                                <TableHead className="font-semibold dark:text-slate-200">Phone</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {importData.map((item, index) => (
                                <TableRow key={index} className="border-gray-100 dark:border-slate-600">
                                  <TableCell>
                                    {item.error ? (
                                      <Badge variant="destructive" className="text-xs">
                                        <AlertCircle className="w-3 h-3 mr-1" />
                                        Error
                                      </Badge>
                                    ) : (
                                      <Badge className="bg-green-600 text-white text-xs">
                                        <CheckCircle className="w-3 h-3 mr-1" />
                                        Valid
                                      </Badge>
                                    )}
                                  </TableCell>
                                  <TableCell className="font-medium">{item.admissionId}</TableCell>
                                  <TableCell>{item.name}</TableCell>
                                  <TableCell className="text-gray-600 dark:text-gray-400">{item.email || "-"}</TableCell>
                                  <TableCell className="text-gray-600 dark:text-gray-400">{item.phone || "-"}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>

                        {importProgress?.errors && importProgress.errors.length > 0 && (
                          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                            <h4 className="font-medium text-red-800 dark:text-red-300 mb-2">Import Errors:</h4>
                            <ul className="text-sm text-red-700 dark:text-red-300 space-y-1 max-h-32 overflow-y-auto">
                              {importProgress.errors.map((error, index) => (
                                <li key={index}>• {error}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="flex justify-between items-center">
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            Valid records: <strong>{importData.filter(item => !item.error).length}</strong> / {importData.length}
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              onClick={() => {
                                setShowImportPreview(false)
                                setImportData([])
                              }}
                              disabled={isImporting}
                              className="dark:border-slate-600 dark:text-slate-200"
                            >
                              Cancel
                            </Button>
                            <Button 
                              onClick={executeImport}
                              disabled={isImporting || importData.filter(item => !item.error).length === 0}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              {isImporting ? (
                                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                              ) : (
                                <Upload className="w-4 h-4 mr-2" />
                              )}
                              {isImporting ? "Importing..." : `Import ${importData.filter(item => !item.error).length} Students`}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="bg-green-600 hover:bg-green-700">
                      <UserPlus className="w-4 h-4 mr-2" />
                      Add Student
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md dark:bg-slate-800 dark:border-slate-700">
                    <DialogHeader>
                      <DialogTitle className="dark:text-white">Add New Student</DialogTitle>
                      <DialogDescription className="dark:text-slate-300">Enter the student's information to add them to the database.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="admissionId" className="dark:text-white">Admission ID *</Label>
                        <Input
                          id="admissionId"
                          placeholder="Enter admission ID"
                          value={newStudent.admissionId}
                          onChange={(e) => setNewStudent({ ...newStudent, admissionId: e.target.value })}
                          className="dark:bg-slate-700 dark:text-white dark:border-slate-600 dark:placeholder-gray-400"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="studentName" className="dark:text-white">Full Name *</Label>
                        <Input
                          id="studentName"
                          placeholder="Enter student's full name"
                          value={newStudent.name}
                          onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                          className="dark:bg-slate-700 dark:text-white dark:border-slate-600 dark:placeholder-gray-400"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email" className="dark:text-white">Email (Optional)</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="Enter email address"
                          value={newStudent.email}
                          onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                          className="dark:bg-slate-700 dark:text-white dark:border-slate-600 dark:placeholder-gray-400"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="dark:text-white">Phone (Optional)</Label>
                        <Input
                          id="phone"
                          placeholder="Enter phone number"
                          value={newStudent.phone}
                          onChange={(e) => setNewStudent({ ...newStudent, phone: e.target.value })}
                          className="dark:bg-slate-700 dark:text-white dark:border-slate-600 dark:placeholder-gray-400"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        onClick={handleAddStudent}
                        disabled={isAddingStudent || !newStudent.admissionId.trim() || !newStudent.name.trim()}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {isAddingStudent ? (
                          <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Plus className="w-4 h-4 mr-2" />
                        )}
                        {isAddingStudent ? "Adding..." : "Add Student"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {studentLoading ? (
              <div className="text-center py-12">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
                <p className="text-gray-600 dark:text-gray-400">Loading students...</p>
              </div>
            ) : (
              <div className="bg-white/70 dark:bg-slate-700/70 rounded-lg border border-white/20 dark:border-slate-600/20">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-200 dark:border-slate-600">
                      <TableHead className="font-semibold dark:text-slate-200">Admission ID</TableHead>
                      <TableHead className="font-semibold dark:text-slate-200">Name</TableHead>
                      <TableHead className="font-semibold dark:text-slate-200">Email</TableHead>
                      <TableHead className="font-semibold dark:text-slate-200">Phone</TableHead>
                      <TableHead className="font-semibold dark:text-slate-200">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.filter(
                      (student) =>
                        student.admissionId.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
                        student.name.toLowerCase().includes(studentSearchTerm.toLowerCase()),
                    ).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12 text-gray-500 dark:text-gray-400">
                          <Users className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                          <p className="text-lg font-medium">No students found</p>
                          <p className="text-sm">Add students to get started</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      students
                        .filter(
                          (student) =>
                            student.admissionId.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
                            student.name.toLowerCase().includes(studentSearchTerm.toLowerCase()),
                        )
                        .map((student) => (
                          <TableRow key={student.$id} className="border-gray-100 dark:border-slate-600">
                            <TableCell className="font-medium text-blue-600 dark:text-blue-400">{student.admissionId}</TableCell>
                            <TableCell className="font-medium dark:text-slate-200">{student.name}</TableCell>
                            <TableCell className="text-gray-600 dark:text-gray-400">{student.email || "-"}</TableCell>
                            <TableCell className="text-gray-600 dark:text-gray-400">{student.phone || "-"}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="outline" size="sm" onClick={() => setEditingStudent(student)} className="dark:border-slate-600 dark:text-slate-200">
                                      <Edit className="w-3 h-3" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="sm:max-w-md dark:bg-slate-800 dark:border-slate-700">
                                    <DialogHeader>
                                      <DialogTitle className="dark:text-white">Edit Student</DialogTitle>
                                      <DialogDescription className="dark:text-slate-300">Update the student's information.</DialogDescription>
                                    </DialogHeader>
                                    {editingStudent && (
                                      <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                          <Label htmlFor="editAdmissionId" className="dark:text-white">Admission ID *</Label>
                                          <Input
                                            id="editAdmissionId"
                                            value={editingStudent.admissionId}
                                            onChange={(e) =>
                                              setEditingStudent({ ...editingStudent, admissionId: e.target.value })
                                            }
                                            className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                                          />
                                        </div>
                                        <div className="space-y-2">
                                          <Label htmlFor="editName" className="dark:text-white">Full Name *</Label>
                                          <Input
                                            id="editName"
                                            value={editingStudent.name}
                                            onChange={(e) =>
                                              setEditingStudent({ ...editingStudent, name: e.target.value })
                                            }
                                            className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                                          />
                                        </div>
                                        <div className="space-y-2">
                                          <Label htmlFor="editEmail" className="dark:text-white">Email</Label>
                                          <Input
                                            id="editEmail"
                                            type="email"
                                            value={editingStudent.email || ""}
                                            onChange={(e) =>
                                              setEditingStudent({ ...editingStudent, email: e.target.value })
                                            }
                                            className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                                          />
                                        </div>
                                        <div className="space-y-2">
                                          <Label htmlFor="editPhone" className="dark:text-white">Phone</Label>
                                          <Input
                                            id="editPhone"
                                            value={editingStudent.phone || ""}
                                            onChange={(e) =>
                                              setEditingStudent({ ...editingStudent, phone: e.target.value })
                                            }
                                            className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                                          />
                                        </div>
                                      </div>
                                    )}
                                    <div className="flex justify-end gap-2">
                                      <Button variant="outline" onClick={() => setEditingStudent(null)} className="dark:border-slate-600 dark:text-slate-200">
                                        Cancel
                                      </Button>
                                      <Button onClick={handleUpdateStudent} className="bg-blue-600 hover:bg-blue-700">
                                        <Edit className="w-4 h-4 mr-2" />
                                        Update Student
                                      </Button>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteStudent(student)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20 dark:border-slate-600"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}