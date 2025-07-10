"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import { UserCheck, UserX } from "lucide-react"
import { format } from "date-fns"
import { AppwriteService } from "@/lib/appwrite"
import { AuthProvider, useAuth } from "@/components/auth-context"
import LoginScreen from "@/components/login-screen"
import { Dashboard } from "@/components/dashboard"

interface LibraryRecord {
  $id?: string
  admissionId: string
  studentName: string
  checkInTime?: string
  checkOutTime?: string
  date: string
  status: "checked-in" | "checked-out"
}

function LibraryManagementContent() {
  const { isAuthenticated, staff } = useAuth()
  const [barcode, setBarcode] = useState("")
  const [isScanning, setIsScanning] = useState(false)
  const [records, setRecords] = useState<LibraryRecord[]>([])
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [loading, setLoading] = useState(false)
  const [appwriteService] = useState(() => new AppwriteService())

  const [isAppwriteConfigured, setIsAppwriteConfigured] = useState(false)

  useEffect(() => {
    setIsAppwriteConfigured(appwriteService.isAppwriteConfigured())
  }, [appwriteService])

  useEffect(() => {
    loadRecords()
  }, [selectedDate])

  const loadRecords = async () => {
    setLoading(true)
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd")
      const data = await appwriteService.getRecordsByDate(dateStr)
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

  const handleScan = async () => {
    if (!barcode.trim()) {
      toast({
        title: "Error",
        description: "Please enter a barcode",
        variant: "destructive",
      })
      return
    }

    setIsScanning(true)
    try {
      // Check if student is already checked in today
      const today = format(new Date(), "yyyy-MM-dd")
      const existingRecord = records.find(
        (record) => record.admissionId === barcode && record.date === today && record.status === "checked-in",
      )

      if (existingRecord) {
        // Check out
        await handleCheckOut(existingRecord)
      } else {
        // Check in
        await handleCheckIn()
      }
    } catch (error) {
      console.error("Error processing scan:", error)
      toast({
        title: "Error",
        description: "Failed to process scan",
        variant: "destructive",
      })
    } finally {
      setIsScanning(false)
    }
  }

  const handleCheckIn = async () => {
    try {
      const studentData = await appwriteService.getStudentByAdmissionId(barcode)

      const newRecord: LibraryRecord = {
        admissionId: barcode,
        studentName: studentData?.name || `Student ${barcode}`,
        checkInTime: new Date().toISOString(),
        date: format(new Date(), "yyyy-MM-dd"),
        status: "checked-in",
      }

      const savedRecord = await appwriteService.createRecord(newRecord)

      toast({
        title: "Check-in Successful",
        description: `${newRecord.studentName} checked in at ${format(new Date(), "HH:mm:ss")}`,
      })

      // Refresh page after successful check-in
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch (error) {
      console.error("Error during check-in:", error)
      toast({
        title: "Check-in Failed",
        description: "Unable to process check-in",
        variant: "destructive",
      })
    }
  }

  const handleCheckOut = async (record: LibraryRecord) => {
    try {
      const updatedRecord = {
        ...record,
        checkOutTime: new Date().toISOString(),
        status: "checked-out" as const,
      }

      await appwriteService.updateRecord(record.$id!, updatedRecord)

      toast({
        title: "Check-out Successful",
        description: `${record.studentName} checked out at ${format(new Date(), "HH:mm:ss")}`,
      })

      // Refresh page after successful check-out
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch (error) {
      console.error("Error during check-out:", error)
      toast({
        title: "Check-out Failed",
        description: "Unable to process check-out",
        variant: "destructive",
      })
    }
  }

  const getStatusBadge = (record: LibraryRecord) => {
    if (record.status === "checked-in") {
      return (
        <Badge variant="default" className="bg-green-500">
          <UserCheck className="w-3 h-3 mr-1" />
          Checked In
        </Badge>
      )
    } else {
      return (
        <Badge variant="secondary">
          <UserX className="w-3 h-3 mr-1" />
          Checked Out
        </Badge>
      )
    }
  }

  const filteredRecords = records.filter((record) => record.date === format(selectedDate, "yyyy-MM-dd"))

  const checkedInCount = filteredRecords.filter((r) => r.status === "checked-in").length
  const totalVisits = filteredRecords.length

  if (!isAuthenticated) {
    return <LoginScreen />
  }

  return (
    <div className="relative">
      <Dashboard staff={staff} />
    </div>
  )
}

export default function LibraryManagement() {
  return (
    <AuthProvider>
      <LibraryManagementContent />
    </AuthProvider>
  )
}
