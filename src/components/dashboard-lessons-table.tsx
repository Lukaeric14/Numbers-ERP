"use client"

import * as React from "react"
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconCircleCheckFilled,
  IconDotsVertical,
  IconLayoutColumns,
  IconLoader,
  IconPlus,
  IconClock,
  IconUser,
} from "@tabler/icons-react"
import { toast } from "sonner"
import { supabase } from '@/lib/supabase'
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table"
import { z } from "zod"

import { useIsMobile } from "@/hooks/use-mobile"
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
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

export const lessonSchema = z.object({
  id: z.string(),
  title: z.string(),
  service_type: z.string(),
  status: z.string(),
  start_time: z.string(),
  student_name: z.string(),
  tutor_name: z.string().optional(),
})

type Lesson = z.infer<typeof lessonSchema>

interface DashboardLessonsTableProps {
  data: Lesson[]
  loading: boolean
}

function getStatusBadge(status: string) {
  switch (status.toLowerCase()) {
    case 'completed':
      return (
        <Badge variant="outline" className="text-green-600 border-green-200">
          <IconCircleCheckFilled className="w-3 h-3 mr-1 fill-green-500" />
          Completed
        </Badge>
      )
    case 'scheduled':
      return (
        <Badge variant="outline" className="text-blue-600 border-blue-200">
          <IconClock className="w-3 h-3 mr-1" />
          Scheduled
        </Badge>
      )
    case 'canceled':
    case 'cancelled':
      return (
        <Badge variant="destructive">
          Canceled
        </Badge>
      )
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

function LessonDrawer({ lesson, onLessonUpdate }: { lesson: Lesson; onLessonUpdate?: (updatedLesson: Lesson) => void }) {
  const isMobile = useIsMobile()
  const [isLoading, setIsLoading] = React.useState(false)
  const [isOpen, setIsOpen] = React.useState(false)
  
  // Debug: Log lesson data structure
  React.useEffect(() => {
    console.log('Lesson data received:', lesson)
  }, [lesson])
  
  // Form state
  const [formData, setFormData] = React.useState({
    title: lesson.title,
    service_type: lesson.service_type,
    status: lesson.status,
    student_name: lesson.student_name,
    start_time: new Date(lesson.start_time).toISOString().slice(0, 16),
  })

  // Note: Using the existing Supabase client from lib

  const handleSave = async () => {
    setIsLoading(true)
    
    try {
      // Convert datetime-local back to ISO string
      const updatedStartTime = new Date(formData.start_time).toISOString()
      
      console.log('Attempting to update lesson:', {
        lessonId: lesson.id,
        updateData: {
          title: formData.title,
          status: formData.status,
          start_time: updatedStartTime,
        }
      })
      
      const { data, error } = await supabase
        .from('lessons')
        .update({
          title: formData.title,
          status: formData.status,
          start_time: updatedStartTime,
          // Note: service_type and student updates might require additional logic
          // depending on your database relationships
        })
        .eq('id', lesson.id)
        .select()
      
      console.log('Supabase response:', { data, error })
      
      if (error) {
        console.error('Supabase error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw error
      }

      // Create updated lesson object
      const updatedLesson: Lesson = {
        ...lesson,
        title: formData.title,
        service_type: formData.service_type,
        status: formData.status,
        student_name: formData.student_name,
        start_time: updatedStartTime,
      }

      // Call the callback to update the parent component
      onLessonUpdate?.(updatedLesson)
      
      toast.success('Lesson updated successfully!')
      setIsOpen(false)
      
    } catch (error: any) {
      console.error('Error updating lesson:', {
        error,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
        lessonId: lesson.id
      })
      
      const errorMessage = error?.message || 'Failed to update lesson. Please try again.'
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <Drawer direction={isMobile ? "bottom" : "right"} open={isOpen} onOpenChange={setIsOpen}>
      <DrawerTrigger asChild>
        <Button variant="link" className="text-foreground w-fit px-0 text-left font-medium">
          {lesson.title}
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="gap-1">
          <DrawerTitle>{formData.title}</DrawerTitle>
          <DrawerDescription>
            {formData.service_type} • {new Date(formData.start_time).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col gap-4 overflow-y-auto px-4 text-sm">
          {!isMobile && (
            <>
              <div className="grid gap-2">
                <div className="flex gap-2 leading-none font-medium items-center">
                  <IconUser className="size-4" />
                  Student: {formData.student_name}
                </div>
                <div className="text-muted-foreground">
                  Service: {formData.service_type}
                </div>
                <div className="text-muted-foreground">
                  Status: {getStatusBadge(formData.status)}
                </div>
              </div>
              <Separator />
            </>
          )}
          <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
            <div className="flex flex-col gap-3">
              <Label htmlFor="lesson-title">Lesson Title</Label>
              <Input 
                id="lesson-title" 
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Enter lesson title"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-3">
                <Label htmlFor="service-type">Service Type</Label>
                <Select 
                  value={formData.service_type} 
                  onValueChange={(value) => handleInputChange('service_type', value)}
                >
                  <SelectTrigger id="service-type" className="w-full">
                    <SelectValue placeholder="Select service type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Math Tutoring">Math Tutoring</SelectItem>
                    <SelectItem value="Science Tutoring">Science Tutoring</SelectItem>
                    <SelectItem value="English Tutoring">English Tutoring</SelectItem>
                    <SelectItem value="Test Prep">Test Prep</SelectItem>
                    <SelectItem value="Homework Help">Homework Help</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-3">
                <Label htmlFor="status">Status</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value) => handleInputChange('status', value)}
                >
                  <SelectTrigger id="status" className="w-full">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="canceled">Canceled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <Label htmlFor="student">Student</Label>
              <Input 
                id="student" 
                value={formData.student_name}
                onChange={(e) => handleInputChange('student_name', e.target.value)}
                placeholder="Enter student name"
              />
            </div>
            <div className="flex flex-col gap-3">
              <Label htmlFor="datetime">Date & Time</Label>
              <Input 
                id="datetime" 
                type="datetime-local" 
                value={formData.start_time}
                onChange={(e) => handleInputChange('start_time', e.target.value)}
              />
            </div>
          </form>
        </div>
        <DrawerFooter>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? (
              <>
                <IconLoader className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
          <DrawerClose asChild>
            <Button variant="outline" disabled={isLoading}>Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

const columns: ColumnDef<Lesson>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "title",
    header: "Lesson Name",
    cell: ({ row, table }) => {
      return (
        <LessonDrawer 
          lesson={row.original} 
          onLessonUpdate={(updatedLesson) => {
            // Update the table data when lesson is updated
            const meta = table.options.meta as any
            meta?.updateData?.(row.index, updatedLesson)
          }}
        />
      )
    },
    enableHiding: false,
  },
  {
    accessorKey: "service_type",
    header: "Service Type",
    cell: ({ row }) => (
      <Badge variant="outline" className="text-muted-foreground px-1.5">
        {row.original.service_type}
      </Badge>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => getStatusBadge(row.original.status),
  },
  {
    accessorKey: "start_time",
    header: "Date & Time",
    cell: ({ row }) => (
      <div className="text-sm">
        {new Date(row.original.start_time).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}
        <div className="text-muted-foreground text-xs">
          {new Date(row.original.start_time).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
          })}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "student_name",
    header: "Student",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <IconUser className="w-4 h-4 text-muted-foreground" />
        {row.original.student_name}
      </div>
    ),
  },
  {
    id: "actions",
    cell: () => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
            size="icon"
          >
            <IconDotsVertical className="w-4 h-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-32">
          <DropdownMenuItem>Edit</DropdownMenuItem>
          <DropdownMenuItem>Duplicate</DropdownMenuItem>
          <DropdownMenuItem>Reschedule</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive">Cancel</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
]

export function DashboardLessonsTable({ data, loading }: DashboardLessonsTableProps) {
  const [tableData, setTableData] = React.useState<Lesson[]>(data)
  const [rowSelection, setRowSelection] = React.useState({})
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [sorting, setSorting] = React.useState<SortingState>([{ id: "start_time", desc: true }])
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 })
  const [activeTab, setActiveTab] = React.useState("all")

  // Update table data when props change
  React.useEffect(() => {
    setTableData(data)
  }, [data])

  // Function to update a specific lesson in the table
  const updateLessonData = React.useCallback((index: number, updatedLesson: Lesson) => {
    setTableData(prev => {
      const newData = [...prev]
      newData[index] = updatedLesson
      return newData
    })
  }, [])

  // Filter data by tutor (tab)
  const filteredData = React.useMemo(() => {
    if (activeTab === "all") return tableData
    return tableData.filter(lesson => 
      lesson.tutor_name?.toLowerCase().includes(activeTab.toLowerCase()) ||
      (activeTab === "unassigned" && !lesson.tutor_name)
    )
  }, [tableData, activeTab])

  // Get unique tutors for tabs
  const tutors = React.useMemo(() => {
    const uniqueTutors = [...new Set(tableData.map(lesson => lesson.tutor_name).filter(Boolean))]
    return uniqueTutors.slice(0, 3) // Limit to 3 tutors for tabs
  }, [tableData])

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    meta: {
      updateData: updateLessonData,
    },
  })

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex space-x-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-28" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Lessons</CardTitle>
        <CardDescription>
          Manage and view lesson details with advanced filtering
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex items-center justify-between mb-4">
            <TabsList className="grid w-fit grid-cols-2 lg:grid-cols-4">
              <TabsTrigger value="all">All Lessons</TabsTrigger>
              {tutors.map((tutor) => (
                <TabsTrigger key={tutor} value={tutor || "unassigned"}>
                  {tutor || "Unassigned"}
                </TabsTrigger>
              ))}
            </TabsList>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <IconLayoutColumns className="w-4 h-4" />
                    <span className="hidden lg:inline">Columns</span>
                    <IconChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {table
                    .getAllColumns()
                    .filter(
                      (column) =>
                        typeof column.accessorFn !== "undefined" &&
                        column.getCanHide()
                    )
                    .map((column) => {
                      return (
                        <DropdownMenuCheckboxItem
                          key={column.id}
                          className="capitalize"
                          checked={column.getIsVisible()}
                          onCheckedChange={(value) =>
                            column.toggleVisibility(!!value)
                          }
                        >
                          {column.id.replace('_', ' ')}
                        </DropdownMenuCheckboxItem>
                      )
                    })}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="outline" size="sm">
                <IconPlus className="w-4 h-4" />
                <span className="hidden lg:inline">Add Lesson</span>
              </Button>
            </div>
          </div>
          
          <TabsContent value={activeTab} className="space-y-4">
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader className="bg-muted sticky top-0 z-10">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => {
                        return (
                          <TableHead key={header.id} colSpan={header.colSpan}>
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
                        No lessons found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            
            <div className="flex items-center justify-between px-4">
              <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
                {table.getFilteredSelectedRowModel().rows.length} of{" "}
                {table.getFilteredRowModel().rows.length} lesson(s) selected.
              </div>
              <div className="flex w-full items-center gap-8 lg:w-fit">
                <div className="hidden items-center gap-2 lg:flex">
                  <Label htmlFor="rows-per-page" className="text-sm font-medium">
                    Rows per page
                  </Label>
                  <Select
                    value={`${table.getState().pagination.pageSize}`}
                    onValueChange={(value) => {
                      table.setPageSize(Number(value))
                    }}
                  >
                    <SelectTrigger size="sm" className="w-20" id="rows-per-page">
                      <SelectValue
                        placeholder={table.getState().pagination.pageSize}
                      />
                    </SelectTrigger>
                    <SelectContent side="top">
                      {[5, 10, 20, 30, 50].map((pageSize) => (
                        <SelectItem key={pageSize} value={`${pageSize}`}>
                          {pageSize}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex w-fit items-center justify-center text-sm font-medium">
                  Page {table.getState().pagination.pageIndex + 1} of{" "}
                  {table.getPageCount()}
                </div>
                <div className="ml-auto flex items-center gap-2 lg:ml-0">
                  <Button
                    variant="outline"
                    className="hidden h-8 w-8 p-0 lg:flex"
                    onClick={() => table.setPageIndex(0)}
                    disabled={!table.getCanPreviousPage()}
                  >
                    <span className="sr-only">Go to first page</span>
                    <IconChevronsLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="size-8"
                    size="icon"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                  >
                    <span className="sr-only">Go to previous page</span>
                    <IconChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="size-8"
                    size="icon"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                  >
                    <span className="sr-only">Go to next page</span>
                    <IconChevronRight className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="hidden size-8 lg:flex"
                    size="icon"
                    onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                    disabled={!table.getCanNextPage()}
                  >
                    <span className="sr-only">Go to last page</span>
                    <IconChevronsRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
