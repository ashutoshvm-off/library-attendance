"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "@/hooks/use-toast"
import {
  CalendarIcon,
  ScanLine,
  UserCheck,
  UserX,
  RefreshCw,
  LogOut,
  Users,
  Clock,
  TrendingUp,
  Settings,
  Bell,
} from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { getOfflineSyncService } from "@/lib/offline-sync"
import { useAuth } from "./auth-context"
import { SyncStatus } from "./sync-status"

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
}

interface DashboardProps {
  staff: Staff | null
}

export function Dashboard({ staff }: DashboardProps) {
  const [barcode, setBarcode] = useState("")
  const [isScanning, setIsScanning] = useState(false)
  const [records, setRecords] = useState<LibraryRecord[]>([])
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [loading, setLoading] = useState(false)
  const [offlineSyncService] = useState(() => getOfflineSyncService())
  const [appwriteService] = useState(() => offlineSyncService.getAppwriteService())
  const { logout } = useAuth()
  const [displayedStudentName, setDisplayedStudentName] = useState<string>("")
  const [displayedStudentId, setDisplayedStudentId] = useState<string>("")
  const [showStudentCard, setShowStudentCard] = useState<boolean>(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    loadRecords()
  }, [selectedDate])

  // Auto-focus the input field when component mounts or when switching to scanner
  useEffect(() => {
    const focusInput = () => {
      if (inputRef.current) {
        inputRef.current.focus()
      }
    }

    // Focus immediately
    focusInput()

    // Also focus when clicking anywhere on the scanner tab
    const handleClick = () => {
      setTimeout(focusInput, 100)
    }

    document.addEventListener("click", handleClick)

    return () => {
      document.removeEventListener("click", handleClick)
    }
  }, [])

  // Clear any existing timer when component unmounts
  useEffect(() => {
    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current)
      }
    }
  }, [])

  const startHideTimer = () => {
    // Clear any existing timer
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current)
    }

    // Start new 5-second timer
    hideTimerRef.current = setTimeout(() => {
      setShowStudentCard(false)
    }, 5000)
  }

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

    const admissionId = barcode.trim().toUpperCase()

    // Clear the hide timer since we're about to scan
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current)
    }

    setIsScanning(true)
    try {
      const today = format(new Date(), "yyyy-MM-dd")
      
      // Get current student status using the enhanced method
      const studentStatus = await appwriteService.getStudentCurrentStatus(admissionId, today)
      
      if (studentStatus.isCheckedIn) {
        // Student is currently checked in, so check them out
        if (studentStatus.lastRecord) {
          await handleCheckOut(studentStatus.lastRecord)
        }
      } else {
        // Student is not checked in (or no record exists), so check them in
        await handleCheckIn(admissionId)
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

  const handleCheckIn = async (admissionId: string) => {
    try {
      const today = format(new Date(), "yyyy-MM-dd")
      
      // Get student data or create if doesn't exist
      const studentData = await appwriteService.getStudentByAdmissionId(admissionId)

      const newRecord: LibraryRecord = {
        admissionId: admissionId,
        studentName: studentData?.name || `Student ${admissionId}`,
        checkInTime: new Date().toISOString(),
        date: today,
        status: "checked-in",
      }

      await appwriteService.createRecord(newRecord)

      // Show success message with sync status
      const connectionStatus = appwriteService.getConnectionStatus()
      const isOnline = connectionStatus.isConnected
      
      toast({
        title: "✅ Check-in Successful",
        description: `${newRecord.studentName} checked in at ${format(new Date(), "HH:mm:ss")}${!isOnline ? " (Saved locally)" : ""}`,
      })

      // Update the displayed student info after successful scan
      setDisplayedStudentName(newRecord.studentName)
      setDisplayedStudentId(admissionId)
      setShowStudentCard(true)

      // Start the 5-second hide timer
      startHideTimer()

      setBarcode("")
      // Refocus the input after clearing
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus()
        }
      }, 100)
      loadRecords()
    } catch (error) {
      console.error("Error during check-in:", error)
      toast({
        title: "Check-in Failed",
        description: error instanceof Error ? error.message : "Unable to process check-in",
        variant: "destructive",
      })
    }
  }

  const handleCheckOut = async (record: LibraryRecord) => {
    try {
      // Ensure we're checking out the correct record
      if (record.status !== "checked-in") {
        toast({
          title: "Invalid Operation",
          description: `${record.studentName} is not currently checked in`,
          variant: "destructive",
        })
        setBarcode("")
        return
      }

      const updatedRecord = {
        ...record,
        checkOutTime: new Date().toISOString(),
        status: "checked-out" as const,
      }

      await appwriteService.updateRecord(record.$id!, updatedRecord)

      // Show success message with sync status
      const connectionStatus = appwriteService.getConnectionStatus()
      const isOnline = connectionStatus.isConnected
      
      toast({
        title: "✅ Check-out Successful",
        description: `${record.studentName} checked out at ${format(new Date(), "HH:mm:ss")}${!isOnline ? " (Saved locally)" : ""}`,
      })

      // Update the displayed student info after successful scan
      setDisplayedStudentName(record.studentName)
      setDisplayedStudentId(record.admissionId)
      setShowStudentCard(true)

      // Start the 5-second hide timer
      startHideTimer()

      setBarcode("")
      // Refocus the input after clearing
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus()
        }
      }, 100)
      loadRecords()
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
        <Badge className="bg-green-100 text-green-800 border-green-200">
          <UserCheck className="w-3 h-3 mr-1" />
          Checked In
        </Badge>
      )
    } else {
      return (
        <Badge variant="secondary" className="bg-gray-100 text-gray-800">
          <UserX className="w-3 h-3 mr-1" />
          Checked Out
        </Badge>
      )
    }
  }

  const filteredRecords = records.filter((record) => record.date === format(selectedDate, "yyyy-MM-dd"))
  const checkedInCount = filteredRecords.filter((r) => r.status === "checked-in").length
  const totalVisits = filteredRecords.length
  const checkOutCount = filteredRecords.filter((r) => r.status === "checked-out").length

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-white/20 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-white rounded-xl shadow-sm">
                <img src="/logo.png" alt="ASIET Logo" className="w-6 h-6 object-contain" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  ASIET Library
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
                  <AvatarFallback className="bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm">
                    {staff?.name
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("") || "U"}
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
        {/* Sync Status */}
        <SyncStatus />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Currently In</p>
                  <p className="text-3xl font-bold">{checkedInCount}</p>
                </div>
                <UserCheck className="w-8 h-8 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Total Visits</p>
                  <p className="text-3xl font-bold">{totalVisits}</p>
                </div>
                <Users className="w-8 h-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-pink-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Checked Out</p>
                  <p className="text-3xl font-bold">{checkOutCount}</p>
                </div>
                <UserX className="w-8 h-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-500 to-red-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium">Peak Hour</p>
                  <p className="text-3xl font-bold">2PM</p>
                </div>
                <TrendingUp className="w-8 h-8 text-orange-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="scanner" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-white/60 backdrop-blur-sm">
            <TabsTrigger value="scanner" className="data-[state=active]:bg-white">
              <ScanLine className="w-4 h-4 mr-2" />
              Scanner
            </TabsTrigger>
            <TabsTrigger value="records" className="data-[state=active]:bg-white">
              <Clock className="w-4 h-4 mr-2" />
              Records
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scanner" className="space-y-6">
            <Card className="bg-white/80 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg">
                    <ScanLine className="w-5 h-5 text-white" />
                  </div>
                  Student Check-in/Check-out
                </CardTitle>
                <CardDescription>Scan or enter student admission ID to process entry/exit</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Student Name Display - Shows last scanned student for 5 seconds */}
                {showStudentCard && displayedStudentName && (
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-6 transition-all duration-300 ease-in-out">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-white rounded-full shadow-sm">
                        <Users className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Last Scanned Student</p>
                        <p className="text-2xl font-bold text-gray-900">{displayedStudentName}</p>
                        <p className="text-sm text-blue-600 font-medium">ID: {displayedStudentId}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Input
                      ref={inputRef}
                      placeholder="Scan barcode or enter admission ID..."
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleScan()}
                      onBlur={() => {
                        // Re-focus after a short delay if no other element is focused
                        setTimeout(() => {
                          if (document.activeElement === document.body && inputRef.current) {
                            inputRef.current.focus()
                          }
                        }, 100)
                      }}
                      className="text-lg h-14 pl-12 bg-white/70 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                      autoComplete="off"
                      autoFocus
                    />
                    <ScanLine className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  </div>
                  <Button
                    onClick={handleScan}
                    disabled={isScanning || !barcode.trim()}
                    size="lg"
                    className="h-14 px-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    {isScanning ? (
                      <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                    ) : (
                      <ScanLine className="w-5 h-5 mr-2" />
                    )}
                    {isScanning ? "Processing..." : "Process"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="records" className="space-y-6">
            <Card className="bg-white/80 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Library Records
                </CardTitle>
                <CardDescription>View and manage student check-in/check-out records</CardDescription>
                <div className="flex items-center gap-3">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-[240px] justify-start text-left font-normal bg-white/70",
                          !selectedDate && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => date && setSelectedDate(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <Button onClick={loadRecords} variant="outline" size="sm" className="bg-white/70">
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
                          <TableHead className="font-semibold">Check-in Time</TableHead>
                          <TableHead className="font-semibold">Check-out Time</TableHead>
                          <TableHead className="font-semibold">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRecords.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-12 text-gray-500">
                              <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                              <p className="text-lg font-medium">No records found</p>
                              <p className="text-sm">for {format(selectedDate, "PPP")}</p>
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
                              <TableCell>{getStatusBadge(record)}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
