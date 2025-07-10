"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
} from "@/components/ui/dialog"
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

function getStatusBadge(record: LibraryRecord) {
  if (record.status === "checked-in") {
    return <Badge className="bg-green-600 text-white">Checked In</Badge>
  } else {
    return <Badge className="bg-red-600 text-white">Checked Out</Badge>
  }
}

export function AdminPanel({ staff }: AdminPanelProps) {
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

  useEffect(() => {
    loadAllRecords()
    loadStudents()
  }, [])

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

    // Check if admission ID already exists
    const existingStudent = students.find((s) => s.admissionId === newStudent.admissionId.trim())
    if (existingStudent) {
      toast({
        title: "Duplicate Entry",
        description: "A student with this admission ID already exists",
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
      toast({
        title: "Error",
        description: "Failed to add student",
        variant: "destructive",
      })
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <header className="bg-white/80 backdrop-blur-sm border-b border-white/20 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-white rounded-xl shadow-sm">
                <img src="/logo.png" alt="College Logo" className="w-6 h-6 object-contain" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Your College Admin
                </h1>
                <p className="text-sm text-gray-600">Library Management System</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm">
                <Bell className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <Settings className="w-4 h-4" />
              </Button>

              <div className="flex items-center gap-3 px-3 py-2 bg-white/60 rounded-full border border-white/20">
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
                  <p className="font-medium">{staff?.name}</p>
                  <p className="text-gray-600 text-xs">{staff?.role}</p>
                </div>
              </div>

              <Button
                onClick={logout}
                variant="outline"
                size="sm"
                className="border-red-200 text-red-600 hover:bg-red-50 bg-transparent"
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

        <Card className="bg-white/80 backdrop-blur-sm border-white/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Library Records Management
            </CardTitle>
            <CardDescription>View, filter, edit, and export library attendance records</CardDescription>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal bg-white/70">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(startDate, "PPP")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => date && setStartDate(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal bg-white/70">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(endDate, "PPP")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={(date) => date && setEndDate(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search by ID or name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white/70"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-white/70">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
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
              <Button onClick={loadAllRecords} variant="outline" className="bg-white/70">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="text-center py-12">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
                <p className="text-gray-600">Loading records...</p>
              </div>
            ) : (
              <div className="bg-white/70 rounded-lg border border-white/20">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-200">
                      <TableHead className="font-semibold">Admission ID</TableHead>
                      <TableHead className="font-semibold">Student Name</TableHead>
                      <TableHead className="font-semibold">Date</TableHead>
                      <TableHead className="font-semibold">Check-in Time</TableHead>
                      <TableHead className="font-semibold">Check-out Time</TableHead>
                      <TableHead className="font-semibold">Duration</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12 text-gray-500">
                          <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                          <p className="text-lg font-medium">No records found</p>
                          <p className="text-sm">Try adjusting your filters</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRecords.map((record) => (
                        <TableRow
                          key={record.$id || `${record.admissionId}-${record.checkInTime}`}
                          className="border-gray-100"
                        >
                          <TableCell className="font-medium text-blue-600">{record.admissionId}</TableCell>
                          <TableCell className="font-medium">{record.studentName}</TableCell>
                          <TableCell>{format(new Date(record.date), "MMM dd, yyyy")}</TableCell>
                          <TableCell>
                            {record.checkInTime ? (
                              <span className="text-green-600 font-medium">
                                {format(new Date(record.checkInTime), "HH:mm:ss")}
                              </span>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            {record.checkOutTime ? (
                              <span className="text-red-600 font-medium">
                                {format(new Date(record.checkOutTime), "HH:mm:ss")}
                              </span>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            {record.checkInTime && record.checkOutTime ? (
                              <span className="text-blue-600 font-medium">
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
                                  <Button variant="outline" size="sm" onClick={() => setEditingRecord(record)}>
                                    <Edit className="w-3 h-3" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md">
                                  <DialogHeader>
                                    <DialogTitle>Edit Record</DialogTitle>
                                    <DialogDescription>
                                      Update the admission ID and student name for this record.
                                    </DialogDescription>
                                  </DialogHeader>
                                  {editingRecord && (
                                    <div className="space-y-4 py-4">
                                      <div className="space-y-2">
                                        <Label htmlFor="editRecordAdmissionId">Admission ID *</Label>
                                        <Input
                                          id="editRecordAdmissionId"
                                          value={editingRecord.admissionId}
                                          onChange={(e) =>
                                            setEditingRecord({ ...editingRecord, admissionId: e.target.value })
                                          }
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label htmlFor="editRecordStudentName">Student Name *</Label>
                                        <Input
                                          id="editRecordStudentName"
                                          value={editingRecord.studentName}
                                          onChange={(e) =>
                                            setEditingRecord({ ...editingRecord, studentName: e.target.value })
                                          }
                                        />
                                      </div>
                                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                        <p className="text-sm text-blue-800">
                                          <strong>Note:</strong> This will update both the record and the student
                                          database if the student exists.
                                        </p>
                                      </div>
                                    </div>
                                  )}
                                  <div className="flex justify-end gap-2">
                                    <Button variant="outline" onClick={() => setEditingRecord(null)}>
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
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
        <Card className="bg-white/80 backdrop-blur-sm border-white/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Student Management
            </CardTitle>
            <CardDescription>Add, edit, and manage student information</CardDescription>

            <div className="flex items-center justify-between gap-4 pt-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search students..."
                    value={studentSearchTerm}
                    onChange={(e) => setStudentSearchTerm(e.target.value)}
                    className="pl-10 bg-white/70"
                  />
                </div>
                <Button onClick={loadStudents} variant="outline" className="bg-white/70">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>

              <Dialog>
                <DialogTrigger asChild>
                  <Button className="bg-green-600 hover:bg-green-700">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Student
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add New Student</DialogTitle>
                    <DialogDescription>Enter the student's information to add them to the database.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="admissionId">Admission ID *</Label>
                      <Input
                        id="admissionId"
                        placeholder="Enter admission ID"
                        value={newStudent.admissionId}
                        onChange={(e) => setNewStudent({ ...newStudent, admissionId: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="studentName">Full Name *</Label>
                      <Input
                        id="studentName"
                        placeholder="Enter student's full name"
                        value={newStudent.name}
                        onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email (Optional)</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter email address"
                        value={newStudent.email}
                        onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone (Optional)</Label>
                      <Input
                        id="phone"
                        placeholder="Enter phone number"
                        value={newStudent.phone}
                        onChange={(e) => setNewStudent({ ...newStudent, phone: e.target.value })}
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
          </CardHeader>

          <CardContent>
            {studentLoading ? (
              <div className="text-center py-12">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
                <p className="text-gray-600">Loading students...</p>
              </div>
            ) : (
              <div className="bg-white/70 rounded-lg border border-white/20">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-200">
                      <TableHead className="font-semibold">Admission ID</TableHead>
                      <TableHead className="font-semibold">Name</TableHead>
                      <TableHead className="font-semibold">Email</TableHead>
                      <TableHead className="font-semibold">Phone</TableHead>
                      <TableHead className="font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.filter(
                      (student) =>
                        student.admissionId.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
                        student.name.toLowerCase().includes(studentSearchTerm.toLowerCase()),
                    ).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12 text-gray-500">
                          <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
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
                          <TableRow key={student.$id} className="border-gray-100">
                            <TableCell className="font-medium text-blue-600">{student.admissionId}</TableCell>
                            <TableCell className="font-medium">{student.name}</TableCell>
                            <TableCell className="text-gray-600">{student.email || "-"}</TableCell>
                            <TableCell className="text-gray-600">{student.phone || "-"}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="outline" size="sm" onClick={() => setEditingStudent(student)}>
                                      <Edit className="w-3 h-3" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="sm:max-w-md">
                                    <DialogHeader>
                                      <DialogTitle>Edit Student</DialogTitle>
                                      <DialogDescription>Update the student's information.</DialogDescription>
                                    </DialogHeader>
                                    {editingStudent && (
                                      <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                          <Label htmlFor="editAdmissionId">Admission ID *</Label>
                                          <Input
                                            id="editAdmissionId"
                                            value={editingStudent.admissionId}
                                            onChange={(e) =>
                                              setEditingStudent({ ...editingStudent, admissionId: e.target.value })
                                            }
                                          />
                                        </div>
                                        <div className="space-y-2">
                                          <Label htmlFor="editName">Full Name *</Label>
                                          <Input
                                            id="editName"
                                            value={editingStudent.name}
                                            onChange={(e) =>
                                              setEditingStudent({ ...editingStudent, name: e.target.value })
                                            }
                                          />
                                        </div>
                                        <div className="space-y-2">
                                          <Label htmlFor="editEmail">Email</Label>
                                          <Input
                                            id="editEmail"
                                            type="email"
                                            value={editingStudent.email || ""}
                                            onChange={(e) =>
                                              setEditingStudent({ ...editingStudent, email: e.target.value })
                                            }
                                          />
                                        </div>
                                        <div className="space-y-2">
                                          <Label htmlFor="editPhone">Phone</Label>
                                          <Input
                                            id="editPhone"
                                            value={editingStudent.phone || ""}
                                            onChange={(e) =>
                                              setEditingStudent({ ...editingStudent, phone: e.target.value })
                                            }
                                          />
                                        </div>
                                      </div>
                                    )}
                                    <div className="flex justify-end gap-2">
                                      <Button variant="outline" onClick={() => setEditingStudent(null)}>
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
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
