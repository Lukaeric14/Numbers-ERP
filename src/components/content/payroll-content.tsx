"use client"

import * as React from "react"
import {
  IconChevronDown,
  IconDotsVertical,
  IconLayoutColumns,
  IconUsers,
  IconCurrencyDollar,
  IconClock,
  IconCalendar,
  IconCheck,
  IconX
} from "@tabler/icons-react"
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table"
import { supabase } from '@/lib/supabase'

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"

interface TutorPayroll {
  id: string
  first_name: string
  last_name: string
  email: string
  total_owed: number
  completed_lessons: number
  pending_lessons: number
  last_lesson_date: string | null
  workspace_id: string
  lesson_wage_type?: string
  custom_wage?: number
}

interface TutorLesson {
  id: string
  title: string
  start_time: string
  end_time: string
  duration_minutes: number
  rate: number
  status: 'scheduled' | 'completed' | 'canceled'
  billing_status: 'unbilled' | 'invoiced' | 'paid'
  calculated_amount: number
  student_name: string
  service_name: string | null
  created_at: string
}

interface TutorWithLessons extends TutorPayroll {
  lessons: TutorLesson[]
}

// PAYROLL MANAGEMENT SYSTEM
export function PayrollContent() {
  const [tutors, setTutors] = React.useState<TutorPayroll[]>([])
  const [selectedTutor, setSelectedTutor] = React.useState<TutorWithLessons | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isTutorDrawerOpen, setIsTutorDrawerOpen] = React.useState(false)

  // Fetch tutors with payroll data
  const fetchTutors = React.useCallback(async () => {
    try {
      setIsLoading(true)
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) return

      const { data: workspaceData } = await supabase
        .from('app_users')
        .select('workspace_id')
        .eq('id', userData.user.id)
        .single()

      if (!workspaceData) return

      // Fetch tutors (employees with type 'tutor')
      const { data: tutorsData, error: tutorsError } = await supabase
        .from('employees')
        .select('*, lesson_wage_type, custom_wage')
        .eq('workspace_id', workspaceData.workspace_id)
        .eq('type', 'tutor')
        .order('first_name')

      if (tutorsError) {
        console.error('Error fetching tutors:', tutorsError)
        return
      }

      if (!tutorsData) return

      // Fetch lessons for each tutor to calculate payroll
      const tutorsWithPayroll = await Promise.all(
        tutorsData.map(async (tutor) => {
          const { data: lessonsData } = await supabase
            .from('lessons')
            .select(`
              *,
              student:students!student_id(first_name, last_name),
              service:services!service_id(name, cost_per_hour)
            `)
            .eq('tutor_id', tutor.id)
            .eq('workspace_id', workspaceData.workspace_id)

          const lessons = lessonsData || []
          
          // Calculate payroll metrics
          const completedLessons = lessons.filter(lesson => lesson.status === 'completed')
          const pendingLessons = lessons.filter(lesson => lesson.status === 'scheduled')
          
          // Calculate total owed (completed lessons that haven't been paid to tutor)
          const totalOwed = completedLessons.reduce((sum, lesson) => {
            const duration = lesson.duration_minutes || 60
            
            // Determine tutor cost based on wage type
            let tutorCost = 0
            if (tutor.lesson_wage_type === 'custom' && tutor.custom_wage) {
              // Use tutor's custom wage
              tutorCost = parseFloat(tutor.custom_wage.toString())
            } else if (lesson.service?.cost_per_hour) {
              // Use service cost per hour
              tutorCost = parseFloat(lesson.service.cost_per_hour.toString())
            }
            
            const amount = (tutorCost * duration) / 60
            return sum + amount
          }, 0)

          // Get last lesson date
          const lastLessonDate = lessons.length > 0 
            ? lessons.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())[0].start_time
            : null

          return {
            ...tutor,
            total_owed: totalOwed,
            completed_lessons: completedLessons.length,
            pending_lessons: pendingLessons.length,
            last_lesson_date: lastLessonDate
          }
        })
      )

      setTutors(tutorsWithPayroll)
    } catch (error) {
      console.error('Error fetching tutors:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchTutors()
  }, [fetchTutors])

  const handleTutorClick = async (tutor: TutorPayroll) => {
    try {
      // Fetch detailed lessons for the selected tutor
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) return

      const { data: workspaceData } = await supabase
        .from('app_users')
        .select('workspace_id')
        .eq('id', userData.user.id)
        .single()

      if (!workspaceData) return

      const { data: lessonsData, error } = await supabase
        .from('lessons')
        .select(`
          *,
          student:students!student_id(first_name, last_name),
          service:services!service_id(name, cost_per_hour)
        `)
        .eq('tutor_id', tutor.id)
        .eq('workspace_id', workspaceData.workspace_id)
        .order('start_time', { ascending: false })

      if (error) {
        console.error('Error fetching tutor lessons:', error)
        return
      }

      // Format lessons with calculated amounts using tutor cost
      const formattedLessons = (lessonsData || []).map(lesson => {
        const duration = lesson.duration_minutes || 60
        
        // Determine tutor cost based on wage type
        let tutorCost = 0
        if (tutor.lesson_wage_type === 'custom' && tutor.custom_wage) {
          // Use tutor's custom wage
          tutorCost = parseFloat(tutor.custom_wage.toString())
        } else if (lesson.service?.cost_per_hour) {
          // Use service cost per hour
          tutorCost = parseFloat(lesson.service.cost_per_hour.toString())
        }
        
        return {
          ...lesson,
          student_name: lesson.student ? `${lesson.student.first_name} ${lesson.student.last_name}` : 'Unknown',
          service_name: lesson.service?.name || null,
          calculated_amount: (tutorCost * duration) / 60
        }
      })

      setSelectedTutor({
        ...tutor,
        lessons: formattedLessons
      })
      setIsTutorDrawerOpen(true)
    } catch (error) {
      console.error('Error fetching tutor details:', error)
    }
  }

  const handleCloseTutorDrawer = () => {
    setIsTutorDrawerOpen(false)
    setSelectedTutor(null)
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconUsers className="h-5 w-5" />
            Tutor Payroll
          </CardTitle>
          <CardDescription>
            Manage tutor payments and view lesson breakdowns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PayrollDataTable 
            tutors={tutors}
            isLoading={isLoading}
            onTutorClick={handleTutorClick}
            onRefresh={fetchTutors}
          />
        </CardContent>
      </Card>

      {/* Tutor Details Drawer */}
      <Sheet open={isTutorDrawerOpen} onOpenChange={setIsTutorDrawerOpen}>
        <SheetContent className="w-full sm:max-w-4xl p-6">
          <SheetHeader>
            <SheetTitle>
              {selectedTutor && `${selectedTutor.first_name} ${selectedTutor.last_name} - Lesson Details`}
            </SheetTitle>
            <SheetDescription>
              Detailed breakdown of lessons and earnings
            </SheetDescription>
          </SheetHeader>
          {selectedTutor && (
            <TutorLessonsBreakdown
              tutor={selectedTutor}
              onClose={handleCloseTutorDrawer}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

// Payroll Data Table Props
interface PayrollDataTableProps {
  tutors: TutorPayroll[]
  isLoading: boolean
  onTutorClick: (tutor: TutorPayroll) => void
  onRefresh: () => void
}

function PayrollDataTable({ tutors, isLoading, onTutorClick, onRefresh }: PayrollDataTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})

  const columns: ColumnDef<TutorPayroll>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "first_name",
      header: "Tutor Name",
      cell: ({ row }) => {
        const tutor = row.original
        return (
          <button
            onClick={() => onTutorClick(tutor)}
            className="text-left font-medium text-primary hover:underline"
          >
            {tutor.first_name} {tutor.last_name}
          </button>
        )
      },
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => (
        <div className="text-muted-foreground">{row.getValue("email")}</div>
      ),
    },
    {
      accessorKey: "total_owed",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-medium"
          >
            Amount Owed
            <IconChevronDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("total_owed"))
        return (
          <div className="font-medium">
            ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        )
      },
    },
    {
      accessorKey: "completed_lessons",
      header: "Completed",
      cell: ({ row }) => (
        <Badge variant="secondary">
          <IconCheck className="mr-1 h-3 w-3" />
          {row.getValue("completed_lessons")}
        </Badge>
      ),
    },
    {
      accessorKey: "pending_lessons",
      header: "Pending",
      cell: ({ row }) => (
        <Badge variant="outline">
          <IconClock className="mr-1 h-3 w-3" />
          {row.getValue("pending_lessons")}
        </Badge>
      ),
    },
    {
      accessorKey: "last_lesson_date",
      header: "Last Lesson",
      cell: ({ row }) => {
        const date = row.getValue("last_lesson_date") as string
        if (!date) return <span className="text-muted-foreground">No lessons</span>
        return (
          <div className="text-muted-foreground">
            {new Date(date).toLocaleDateString()}
          </div>
        )
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const tutor = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <IconDotsVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onTutorClick(tutor)}>
                View Details
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                Mark as Paid
              </DropdownMenuItem>
              <DropdownMenuItem>
                Generate Report
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  const table = useReactTable({
    data: tutors,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-24" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="flex items-center py-4">
        <Input
          placeholder="Filter tutors..."
          value={(table.getColumn("first_name")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("first_name")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              <IconLayoutColumns className="mr-2 h-4 w-4" />
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[150px]">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuItem
                    key={column.id}
                    className="capitalize"
                    onClick={() => column.toggleVisibility(!column.getIsVisible())}
                  >
                    <Checkbox
                      checked={column.getIsVisible()}
                      className="mr-2"
                    />
                    {column.id}
                  </DropdownMenuItem>
                )
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No tutors found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}

// Tutor Lessons Breakdown Component
interface TutorLessonsBreakdownProps {
  tutor: TutorWithLessons
  onClose: () => void
}

function TutorLessonsBreakdown({ tutor, onClose }: TutorLessonsBreakdownProps) {
  const totalEarnings = tutor.lessons
    .filter(lesson => lesson.status === 'completed')
    .reduce((sum, lesson) => sum + lesson.calculated_amount, 0)

  const pendingEarnings = tutor.lessons
    .filter(lesson => lesson.status === 'scheduled')
    .reduce((sum, lesson) => sum + lesson.calculated_amount, 0)

  return (
    <div className="mt-6 space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Owed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${totalEarnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              From {tutor.lessons.filter(l => l.status === 'completed').length} completed lessons
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              ${pendingEarnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              From {tutor.lessons.filter(l => l.status === 'scheduled').length} scheduled lessons
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Lessons</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tutor.lessons.length}
            </div>
            <p className="text-xs text-muted-foreground">
              All time lessons
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Lessons Table */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Lesson Breakdown</h3>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tutor.lessons.length > 0 ? (
                tutor.lessons.map((lesson) => (
                  <TableRow key={lesson.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <IconCalendar className="h-4 w-4 text-muted-foreground" />
                        {new Date(lesson.start_time).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {lesson.student_name}
                    </TableCell>
                    <TableCell>
                      {lesson.service_name || 'Custom Rate'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <IconClock className="h-3 w-3 text-muted-foreground" />
                        {lesson.duration_minutes}min
                      </div>
                    </TableCell>
                    <TableCell>
                      ${lesson.rate.toFixed(2)}/hr
                    </TableCell>
                    <TableCell className="font-medium">
                      ${lesson.calculated_amount.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          lesson.status === 'completed' ? 'default' :
                          lesson.status === 'scheduled' ? 'secondary' : 'destructive'
                        }
                      >
                        {lesson.status === 'completed' && <IconCheck className="mr-1 h-3 w-3" />}
                        {lesson.status === 'canceled' && <IconX className="mr-1 h-3 w-3" />}
                        {lesson.status === 'scheduled' && <IconClock className="mr-1 h-3 w-3" />}
                        {lesson.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    No lessons found for this tutor.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
