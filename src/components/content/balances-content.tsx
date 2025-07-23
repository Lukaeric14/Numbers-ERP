"use client"

import * as React from "react"
import {
  IconChevronDown,
  IconDotsVertical,
  IconLayoutColumns,
  IconPlus,
  IconCurrencyDollar,
  IconReceipt,
  IconCheck,
  IconX,
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
import { toast } from "sonner"
import { supabase } from '@/lib/supabase'
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, Controller } from "react-hook-form"

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
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"

// Types
interface Parent {
  id: string
  workspace_id: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  current_balance: number
  total_unbilled: number
  total_paid: number
  created_at: string
  student_count?: number
}

interface Lesson {
  id: string
  workspace_id: string
  tutor_id: string
  student_id: string
  service_id?: string
  location_id?: string
  title?: string
  description?: string
  start_time: string
  end_time: string
  status: string
  billing_status: 'unbilled' | 'invoiced' | 'paid'
  rate: number
  duration_minutes: number
  invoice_id?: string
  created_at: string
  // Joined data
  student_name?: string
  tutor_name?: string
  service_name?: string
  calculated_amount?: number
}

interface ParentWithLessons extends Parent {
  lessons: Lesson[]
}

// BALANCES MANAGEMENT SYSTEM
export function BalancesContent() {
  const [parents, setParents] = React.useState<Parent[]>([])
  const [selectedParent, setSelectedParent] = React.useState<ParentWithLessons | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isParentDrawerOpen, setIsParentDrawerOpen] = React.useState(false)

  // Fetch parents with balance data
  const fetchParents = React.useCallback(async () => {
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

      // Fetch parents with student count
      const { data: parentsData, error } = await supabase
        .from('parents')
        .select(`
          *,
          students!inner(id)
        `)
        .eq('workspace_id', workspaceData.workspace_id)
        .order('current_balance', { ascending: false })

      if (error) {
        console.error('Error fetching parents:', error)
        toast.error('Failed to load parent balances')
        return
      }

      // Process data to add student count and calculate total unbilled
      const processedParents = await Promise.all(
        parentsData?.map(async (parent) => {
          // Get all lessons for this parent's students that are unbilled
          const { data: unbilledLessons } = await supabase
            .from('lessons')
            .select('rate, duration_minutes')
            .in('student_id', parent.students?.map((s: any) => s.id) || [])
            .eq('billing_status', 'unbilled')
            .eq('workspace_id', workspaceData.workspace_id)

          // Calculate total unbilled amount
          const totalUnbilled = unbilledLessons?.reduce((sum, lesson) => {
            const duration = lesson.duration_minutes || 60
            const rate = lesson.rate || 0
            const amount = (rate * duration) / 60
            return sum + amount
          }, 0) || 0

          return {
            ...parent,
            student_count: parent.students?.length || 0,
            total_unbilled: totalUnbilled,
            students: undefined // Remove the nested students array
          }
        }) || []
      )

      setParents(processedParents)
    } catch (error) {
      console.error('Error in fetchParents:', error)
      toast.error('Failed to load parent balances')
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchParents()
  }, [fetchParents])

  const handleOpenParent = async (parent: Parent) => {
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) return

      const { data: workspaceData } = await supabase
        .from('app_users')
        .select('workspace_id')
        .eq('id', userData.user.id)
        .single()

      if (!workspaceData) return

      // Fetch lessons for this parent's students
      const { data: lessonsData, error } = await supabase
        .from('lessons')
        .select(`
          *,
          students!inner(
            id,
            first_name,
            last_name,
            parent_id
          ),
          employees!lessons_tutor_id_fkey(
            first_name,
            last_name
          ),
          services(
            name
          )
        `)
        .eq('students.parent_id', parent.id)
        .eq('workspace_id', workspaceData.workspace_id)
        .order('start_time', { ascending: false })

      if (error) {
        console.error('Error fetching lessons:', error)
        toast.error('Failed to load lessons')
        return
      }

      // Process lessons data
      const processedLessons = lessonsData?.map(lesson => ({
        ...lesson,
        student_name: `${lesson.students.first_name} ${lesson.students.last_name}`,
        tutor_name: lesson.employees ? `${lesson.employees.first_name} ${lesson.employees.last_name}` : 'Unknown',
        service_name: lesson.services?.name || 'No Service',
        calculated_amount: (lesson.rate * lesson.duration_minutes / 60),
        students: undefined,
        employees: undefined,
        services: undefined
      })) || []

      setSelectedParent({
        ...parent,
        lessons: processedLessons
      })
      setIsParentDrawerOpen(true)
    } catch (error) {
      console.error('Error opening parent:', error)
      toast.error('Failed to load parent details')
    }
  }

  const handleRefresh = () => {
    fetchParents()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Parent Balances</h1>
          <p className="text-muted-foreground">
            Manage parent account balances and billing status
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold">Parent Accounts</CardTitle>
            <CardDescription>
              View parent balances and manage lesson billing
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <ParentBalancesDataTable
            parents={parents}
            isLoading={isLoading}
            onOpenParent={handleOpenParent}
            onRefresh={handleRefresh}
          />
        </CardContent>
      </Card>

      {/* Parent Details Drawer */}
      <Sheet open={isParentDrawerOpen} onOpenChange={setIsParentDrawerOpen}>
        <SheetContent className="w-full sm:max-w-4xl p-6">
          {selectedParent && (
            <ParentLessonsView
              parent={selectedParent}
              onClose={() => setIsParentDrawerOpen(false)}
              onRefresh={handleRefresh}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

// Parent Balances Data Table Props
interface ParentBalancesDataTableProps {
  parents: Parent[]
  isLoading: boolean
  onOpenParent: (parent: Parent) => void
  onRefresh: () => void
}

function ParentBalancesDataTable({ parents, isLoading, onOpenParent, onRefresh }: ParentBalancesDataTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  const [globalFilter, setGlobalFilter] = React.useState("")

  const columns: ColumnDef<Parent>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
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
      accessorKey: "name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Parent Name
          <IconChevronDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <Button
          variant="link"
          className="text-foreground w-fit px-0 text-left font-medium h-auto"
          onClick={() => onOpenParent(row.original)}
        >
          {row.original.first_name} {row.original.last_name}
        </Button>
      ),
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => (
        <div className="flex items-center space-x-2">
          <span>{row.getValue("email")}</span>
        </div>
      ),
    },
    {
      accessorKey: "current_balance",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Current Balance
          <IconChevronDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const balance = parseFloat(row.getValue("current_balance"))
        const formatted = new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(balance)
        
        return (
          <div className={`font-medium ${balance > 0 ? 'text-red-600' : balance < 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
            {formatted}
          </div>
        )
      },
    },
    {
      accessorKey: "total_unbilled",
      header: "Total Unbilled",
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("total_unbilled"))
        const formatted = new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(amount)
        return <div className="font-medium text-orange-600">{formatted}</div>
      },
    },
    {
      accessorKey: "total_paid",
      header: "Total Paid",
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("total_paid"))
        const formatted = new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(amount)
        return <div className="font-medium text-green-600">{formatted}</div>
      },
    },
    {
      accessorKey: "student_count",
      header: "Students",
      cell: ({ row }) => (
        <Badge variant="secondary">
          {row.getValue("student_count")} student{row.getValue("student_count") !== 1 ? 's' : ''}
        </Badge>
      ),
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const parent = row.original

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
              <DropdownMenuItem onClick={() => onOpenParent(parent)}>
                View Lessons
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                Send Statement
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  const table = useReactTable({
    data: parents,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: "includesString",
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-64 bg-muted animate-pulse rounded" />
          </div>
          <div className="flex items-center space-x-2">
            <div className="h-8 w-24 bg-muted animate-pulse rounded" />
            <div className="h-8 w-24 bg-muted animate-pulse rounded" />
          </div>
        </div>
        <div className="rounded-md border">
          <div className="h-96 bg-muted animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Input
            placeholder="Search parents..."
            value={globalFilter ?? ""}
            onChange={(event) => setGlobalFilter(String(event.target.value))}
            className="max-w-sm"
          />
        </div>
        <div className="flex items-center space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="ml-auto">
                <IconLayoutColumns className="mr-2 h-4 w-4" />
                View
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[150px]">
              <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
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
          <Button onClick={onRefresh} variant="outline" size="sm">
            Refresh
          </Button>
        </div>
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
                  No parents found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between space-x-2 py-4">
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

// Parent Lessons View Component
interface ParentLessonsViewProps {
  parent: ParentWithLessons
  onClose: () => void
  onRefresh: () => void
}

function ParentLessonsView({ parent, onClose, onRefresh }: ParentLessonsViewProps) {
  const [selectedLessons, setSelectedLessons] = React.useState<string[]>([])
  const [isCreatingInvoice, setIsCreatingInvoice] = React.useState(false)

  const handleCreateInvoice = async () => {
    if (selectedLessons.length === 0) {
      toast.error('Please select at least one lesson to invoice')
      return
    }

    setIsCreatingInvoice(true)
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) return

      const { data: workspaceData } = await supabase
        .from('app_users')
        .select('workspace_id')
        .eq('id', userData.user.id)
        .single()

      if (!workspaceData) return

      // Calculate total amount
      const selectedLessonData = parent.lessons.filter(lesson => selectedLessons.includes(lesson.id))
      const totalAmount = selectedLessonData.reduce((sum, lesson) => sum + (lesson.calculated_amount || 0), 0)

      // Generate invoice number
      const invoiceNumber = `INV-${Date.now()}`

      // Prepare invoice data
      const invoiceInsertData = {
        workspace_id: workspaceData.workspace_id,
        student_id: selectedLessonData[0]?.student_id, // Use first student
        invoice_number: invoiceNumber,
        amount_due: totalAmount,
        amount_paid: 0,
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
        status: 'pending'
      }
      
      console.log('Attempting to create invoice with data:', invoiceInsertData)

      // Create invoice
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .insert(invoiceInsertData)
        .select()
        .single()

      if (invoiceError) {
        console.error('Invoice creation failed!')
        console.error('Error object:', invoiceError)
        console.error('Error message:', invoiceError?.message)
        console.error('Error code:', invoiceError?.code)
        console.error('Error details:', invoiceError?.details)
        console.error('Error hint:', invoiceError?.hint)
        console.error('Insert data was:', invoiceInsertData)
        console.error('Full error JSON:', JSON.stringify(invoiceError, null, 2))
        
        toast.error(`Failed to create invoice: ${invoiceError?.message || 'Unknown error'}`)
        return
      }

      // Create line items for each selected lesson
      const lineItems = selectedLessonData.map(lesson => ({
        invoice_id: invoiceData.id,
        lesson_id: lesson.id,
        service_id: lesson.service_id,
        description: `${lesson.service_name || 'Lesson'} - ${lesson.student_name}`,
        rate: lesson.rate,
        duration_minutes: lesson.duration_minutes,
        subtotal: lesson.calculated_amount || 0
      }))

      const { error: lineItemsError } = await supabase
        .from('invoice_line_items')
        .insert(lineItems)

      if (lineItemsError) {
        console.error('Error creating line items:', lineItemsError)
        toast.error('Failed to create invoice line items')
        return
      }

      // Update lessons billing status to 'invoiced'
      const { error: lessonsUpdateError } = await supabase
        .from('lessons')
        .update({ 
          billing_status: 'invoiced',
          invoice_id: invoiceData.id
        })
        .in('id', selectedLessons)

      if (lessonsUpdateError) {
        console.error('Error updating lessons:', lessonsUpdateError)
        toast.error('Failed to update lesson billing status')
        return
      }

      toast.success(`Invoice ${invoiceNumber} created successfully with ${selectedLessons.length} lesson${selectedLessons.length > 1 ? 's' : ''}`)
      setSelectedLessons([])
      onRefresh()
      onClose()
    } catch (error) {
      console.error('Error creating invoice:', error)
      toast.error('Failed to create invoice')
    } finally {
      setIsCreatingInvoice(false)
    }
  }

  const unbilledLessons = parent.lessons.filter(lesson => lesson.billing_status === 'unbilled')
  const totalUnbilledAmount = unbilledLessons.reduce((sum, lesson) => sum + (lesson.calculated_amount || 0), 0)

  return (
    <div className="space-y-6">
      <SheetHeader>
        <SheetTitle>
          {parent.first_name} {parent.last_name} - Lessons
        </SheetTitle>
        <SheetDescription>
          Manage lessons and billing for this parent account
        </SheetDescription>
      </SheetHeader>
      
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Current Balance: <span className={`font-medium ${parent.current_balance > 0 ? 'text-red-600' : parent.current_balance < 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
              {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(parent.current_balance)}
            </span>
          </p>
        </div>
        {selectedLessons.length > 0 && (
          <Button onClick={handleCreateInvoice} disabled={isCreatingInvoice}>
            <IconReceipt className="mr-2 h-4 w-4" />
            {isCreatingInvoice ? 'Creating...' : `Create Invoice (${selectedLessons.length})`}
          </Button>
        )}
      </div>

      {unbilledLessons.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-blue-900">Unbilled Lessons</h4>
              <p className="text-sm text-blue-700">
                {unbilledLessons.length} lesson{unbilledLessons.length > 1 ? 's' : ''} • Total: {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(totalUnbilledAmount)}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium">All Lessons ({parent.lessons.length})</h4>
          {selectedLessons.length > 0 && (
            <div className="text-sm text-muted-foreground">
              {selectedLessons.length} selected
            </div>
          )}
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedLessons.length === unbilledLessons.length && unbilledLessons.length > 0}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedLessons(unbilledLessons.map(lesson => lesson.id))
                      } else {
                        setSelectedLessons([])
                      }
                    }}
                  />
                </TableHead>
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
              {parent.lessons.map((lesson) => (
                <TableRow key={lesson.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedLessons.includes(lesson.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedLessons([...selectedLessons, lesson.id])
                        } else {
                          setSelectedLessons(selectedLessons.filter(id => id !== lesson.id))
                        }
                      }}
                      disabled={lesson.billing_status !== 'unbilled'}
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(lesson.start_time).toLocaleDateString()}
                  </TableCell>
                  <TableCell>{lesson.student_name}</TableCell>
                  <TableCell>{lesson.service_name}</TableCell>
                  <TableCell>{lesson.duration_minutes} min</TableCell>
                  <TableCell>
                    {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(lesson.rate)}/hr
                  </TableCell>
                  <TableCell>
                    {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(lesson.calculated_amount || 0)}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={
                        lesson.billing_status === 'paid' ? 'default' : 
                        lesson.billing_status === 'invoiced' ? 'secondary' : 
                        'outline'
                      }
                    >
                      {lesson.billing_status === 'paid' && <IconCheck className="mr-1 h-3 w-3" />}
                      {lesson.billing_status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
