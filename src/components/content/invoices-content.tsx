"use client"

import * as React from "react"
import {
  IconChevronDown,
  IconDotsVertical,
  IconLayoutColumns,
  IconPlus,
  IconBriefcase,
  IconCurrencyDollar,
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

// Invoice type definition
type Invoice = {
  id: string
  workspace_id: string
  student_id: string
  invoice_number: string
  amount_due: number
  amount_paid: number
  due_date: string
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  description?: string
  created_at: string
  student_name?: string
}

// INVOICES MANAGEMENT SYSTEM
export function InvoicesContent() {
  const [invoices, setInvoices] = React.useState<Invoice[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [refreshTrigger, setRefreshTrigger] = React.useState(0)
  const [selectedInvoice, setSelectedInvoice] = React.useState<Invoice | null>(null)
  const [isEditSheetOpen, setIsEditSheetOpen] = React.useState(false)

  // Fetch invoices
  React.useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: userData } = await supabase
          .from('app_users')
          .select('workspace_id')
          .eq('id', user.id)
          .single()

        if (!userData?.workspace_id) return

        const { data: invoicesData, error } = await supabase
          .from('invoices')
          .select(`
            *,
            student:students!student_id(first_name, last_name)
          `)
          .eq('workspace_id', userData.workspace_id)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Error fetching invoices:', error)
          return
        }

        if (invoicesData) {
          const formattedInvoices = invoicesData.map(invoice => ({
            ...invoice,
            student_name: invoice.student ? `${invoice.student.first_name} ${invoice.student.last_name}` : 'Unknown'
          }))
          setInvoices(formattedInvoices)
        }
      } catch (error) {
        console.error('Error fetching invoices:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchInvoices()
  }, [refreshTrigger])

  const handleInvoiceAdded = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  const handleInvoiceUpdated = () => {
    setRefreshTrigger(prev => prev + 1)
    setIsEditSheetOpen(false)
    setSelectedInvoice(null)
  }

  const handleEditInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setIsEditSheetOpen(true)
  }

  const handleCloseEdit = () => {
    setIsEditSheetOpen(false)
    setSelectedInvoice(null)
  }

  return (
    <div className="space-y-8">
      <InvoicesDataTable 
        invoices={invoices}
        isLoading={isLoading}
        onEditInvoice={handleEditInvoice}
        onRefresh={handleInvoiceAdded}
        onInvoiceAdded={handleInvoiceAdded}
      />

      {/* Edit Invoice Sheet */}
      <Sheet open={isEditSheetOpen} onOpenChange={setIsEditSheetOpen}>
        <SheetContent className="w-[400px] sm:w-[540px] p-6">
          <SheetHeader>
            <SheetTitle>Edit Invoice</SheetTitle>
            <SheetDescription>
              Update the invoice details and payment information.
            </SheetDescription>
          </SheetHeader>
          {selectedInvoice && (
            <InvoiceEditForm
              invoice={selectedInvoice}
              onInvoiceUpdated={handleInvoiceUpdated}
              onClose={handleCloseEdit}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

// Add Invoice Sheet Component
function AddInvoiceSheet({ onInvoiceAdded }: { onInvoiceAdded?: () => void }) {
  const [isOpen, setIsOpen] = React.useState(false)

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button size="sm">
          <IconPlus className="h-4 w-4 mr-2" />
          Add Invoice
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px] p-6">
        <SheetHeader>
          <SheetTitle>Create New Invoice</SheetTitle>
          <SheetDescription>
            Create a new invoice for a student with payment details.
          </SheetDescription>
        </SheetHeader>
        <AddInvoiceContent 
          onInvoiceAdded={() => {
            onInvoiceAdded?.()
            setIsOpen(false)
          }} 
        />
      </SheetContent>
    </Sheet>
  )
}

// Add Invoice Form Schema
const addInvoiceSchema = z.object({
  student_id: z.string().min(1, "Student is required"),
  invoice_number: z.string().min(1, "Invoice number is required"),
  amount_due: z.string().min(1, "Amount due is required"),
  amount_paid: z.string().optional(),
  due_date: z.string().min(1, "Due date is required"),
  status: z.enum(["draft", "sent", "paid", "overdue", "cancelled"]).default("draft"),
  description: z.string().optional(),
})

type AddInvoiceFormData = z.infer<typeof addInvoiceSchema>

// Add Invoice Content Component
function AddInvoiceContent({ onInvoiceAdded }: { onInvoiceAdded?: () => void }) {
  const { register, handleSubmit, formState: { errors }, reset, control } = useForm<AddInvoiceFormData>({
    resolver: zodResolver(addInvoiceSchema),
  })
  const [isLoading, setIsLoading] = React.useState(false)
  const [students, setStudents] = React.useState<{id: string, name: string}[]>([])

  // Fetch students for dropdown
  React.useEffect(() => {
    const fetchStudents = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: userData } = await supabase
          .from('app_users')
          .select('workspace_id')
          .eq('id', user.id)
          .single()

        if (!userData?.workspace_id) return

        const { data: studentsData } = await supabase
          .from('students')
          .select('id, first_name, last_name')
          .eq('workspace_id', userData.workspace_id)

        if (studentsData) {
          setStudents(studentsData.map(s => ({ id: s.id, name: `${s.first_name} ${s.last_name}` })))
        }
      } catch (error) {
        console.error('Error fetching students:', error)
      }
    }

    fetchStudents()
  }, [])

  const createInvoice = async (data: AddInvoiceFormData) => {
    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userData } = await supabase
        .from('app_users')
        .select('workspace_id')
        .eq('id', user.id)
        .single()

      if (!userData?.workspace_id) return

      const { error } = await supabase
        .from('invoices')
        .insert({
          workspace_id: userData.workspace_id,
          student_id: data.student_id,
          invoice_number: data.invoice_number,
          amount_due: parseFloat(data.amount_due),
          amount_paid: data.amount_paid ? parseFloat(data.amount_paid) : 0,
          due_date: data.due_date,
          status: data.status,
          description: data.description || null,
        })

      if (error) {
        console.error('Error creating invoice:', error)
        toast.error('Failed to create invoice')
        return
      }

      toast.success('Invoice created successfully!')
      reset()
      onInvoiceAdded?.()
    } catch (error) {
      console.error('Error creating invoice:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(createInvoice)} className="space-y-4">
        {/* Invoice Details */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <IconBriefcase className="h-4 w-4" />
            Invoice Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="invoice_number">Invoice Number *</Label>
              <Input
                id="invoice_number"
                {...register('invoice_number')}
                placeholder="e.g., INV-001"
                className={errors.invoice_number ? "border-red-500" : ""}
              />
              {errors.invoice_number && (
                <p className="text-sm text-red-500">{errors.invoice_number.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="student_id">Student *</Label>
              <Controller
                name="student_id"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select student" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map(student => (
                        <SelectItem key={student.id} value={student.id}>{student.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.student_id && (
                <p className="text-sm text-red-500">{errors.student_id.message}</p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Invoice description or notes..."
              rows={3}
            />
          </div>
        </div>

        {/* Payment Details */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <IconCurrencyDollar className="h-4 w-4" />
            Payment Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount_due">Amount Due *</Label>
              <Input
                id="amount_due"
                type="number"
                step="0.01"
                min="0"
                {...register('amount_due')}
                placeholder="0.00"
                className={errors.amount_due ? "border-red-500" : ""}
              />
              {errors.amount_due && (
                <p className="text-sm text-red-500">{errors.amount_due.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount_paid">Amount Paid</Label>
              <Input
                id="amount_paid"
                type="number"
                step="0.01"
                min="0"
                {...register('amount_paid')}
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="due_date">Due Date *</Label>
              <Input
                id="due_date"
                type="date"
                {...register('due_date')}
                className={errors.due_date ? "border-red-500" : ""}
              />
              {errors.due_date && (
                <p className="text-sm text-red-500">{errors.due_date.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                Creating...
              </>
            ) : (
              'Create Invoice'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

// Invoices Data Table Props
interface InvoicesDataTableProps {
  invoices: Invoice[]
  isLoading: boolean
  onEditInvoice: (invoice: Invoice) => void
  onRefresh: () => void
  onInvoiceAdded: () => void
}

function InvoicesDataTable({ invoices, isLoading, onEditInvoice, onRefresh, onInvoiceAdded }: InvoicesDataTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  const [globalFilter, setGlobalFilter] = React.useState("")

  const columns: ColumnDef<Invoice>[] = [
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
      accessorKey: "invoice_number",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-semibold hover:bg-transparent"
        >
          Invoice Number
          <IconChevronDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <Button 
          variant="link" 
          className="text-foreground w-fit px-0 text-left font-medium h-auto"
          onClick={() => onEditInvoice(row.original)}
        >
          {row.getValue("invoice_number")}
        </Button>
      ),
    },
    {
      accessorKey: "student_name",
      header: "Student",
      cell: ({ row }) => (
        <div className="font-medium">
          {row.getValue("student_name") || "Unknown"}
        </div>
      ),
    },
    {
      accessorKey: "amount_due",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-semibold hover:bg-transparent"
        >
          <IconCurrencyDollar className="mr-1 h-4 w-4" />
          Amount Due
          <IconChevronDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const amount = row.getValue("amount_due") as number
        return `$${amount?.toFixed(2) || '0.00'}`
      },
    },
    {
      accessorKey: "amount_paid",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-semibold hover:bg-transparent"
        >
          <IconCurrencyDollar className="mr-1 h-4 w-4" />
          Amount Paid
          <IconChevronDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const amount = row.getValue("amount_paid") as number
        return `$${amount?.toFixed(2) || '0.00'}`
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        const statusColors = {
          draft: "bg-gray-100 text-gray-800",
          sent: "bg-blue-100 text-blue-800",
          paid: "bg-green-100 text-green-800",
          overdue: "bg-red-100 text-red-800",
          cancelled: "bg-gray-100 text-gray-800"
        }
        return (
          <Badge className={statusColors[status as keyof typeof statusColors] || "bg-gray-100 text-gray-800"}>
            {status?.charAt(0).toUpperCase() + status?.slice(1) || 'Unknown'}
          </Badge>
        )
      },
    },
    {
      accessorKey: "due_date",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-semibold hover:bg-transparent"
        >
          Due Date
          <IconChevronDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const date = new Date(row.getValue("due_date"))
        return date.toLocaleDateString()
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const invoice = row.original
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
              <DropdownMenuItem onClick={() => onEditInvoice(invoice)}>
                Edit invoice
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={async () => {
                  if (confirm('Are you sure you want to delete this invoice?')) {
                    try {
                      const { error } = await supabase
                        .from('invoices')
                        .delete()
                        .eq('id', invoice.id)
                      
                      if (error) {
                        console.error('Error deleting invoice:', error)
                        toast.error('Failed to delete invoice')
                      } else {
                        toast.success('Invoice deleted successfully')
                        onRefresh()
                      }
                    } catch (error) {
                      console.error('Error deleting invoice:', error)
                      toast.error('An unexpected error occurred')
                    }
                  }
                }}
                className="text-red-600"
              >
                Delete invoice
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  const table = useReactTable({
    data: invoices,
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
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-current border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Invoices</CardTitle>
            <CardDescription>
              Manage your invoices and track payments.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <IconLayoutColumns className="h-4 w-4 mr-2" />
              View
            </Button>
            <AddInvoiceSheet onInvoiceAdded={onInvoiceAdded} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center py-4">
          <Input
            placeholder="Search invoices..."
            value={globalFilter ?? ""}
            onChange={(event) => setGlobalFilter(String(event.target.value))}
            className="max-w-sm"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="ml-auto">
                <IconLayoutColumns className="mr-2 h-4 w-4" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
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
                    No invoices found.
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
      </CardContent>
    </Card>
  )
}

// Edit Invoice Form Schema
const editInvoiceSchema = z.object({
  student_id: z.string().min(1, "Student is required"),
  invoice_number: z.string().min(1, "Invoice number is required"),
  amount_due: z.number().min(0, "Amount due must be positive"),
  amount_paid: z.number().min(0, "Amount paid must be positive"),
  due_date: z.string().min(1, "Due date is required"),
  status: z.enum(["draft", "sent", "paid", "overdue", "cancelled"]),
  description: z.string().optional(),
})

type EditInvoiceFormData = z.infer<typeof editInvoiceSchema>

interface InvoiceEditFormProps {
  invoice: Invoice
  onInvoiceUpdated: () => void
  onClose: () => void
}

function InvoiceEditForm({ invoice, onInvoiceUpdated, onClose }: InvoiceEditFormProps) {
  const [students, setStudents] = React.useState<Array<{ id: string; first_name: string; last_name: string }>>([])
  const [lineItems, setLineItems] = React.useState<Array<{
    id: string
    lesson_id?: string
    service_id?: string
    description?: string
    rate: number
    duration_minutes: number
    subtotal: number
    lesson_title?: string
    service_name?: string
  }>>([])
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const form = useForm<EditInvoiceFormData>({
    resolver: zodResolver(editInvoiceSchema),
    defaultValues: {
      student_id: invoice.student_id,
      invoice_number: invoice.invoice_number,
      amount_due: invoice.amount_due,
      amount_paid: invoice.amount_paid,
      due_date: invoice.due_date.split('T')[0], // Format for date input
      status: invoice.status,
      description: invoice.description || "",
    },
  })

  const { register, handleSubmit, control, formState: { errors } } = form

  // Fetch students and line items
  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser()
        if (!userData.user) return

        const { data: workspaceData } = await supabase
          .from('app_users')
          .select('workspace_id')
          .eq('id', userData.user.id)
          .single()

        if (!workspaceData) return

        // Fetch students
        const { data: studentsData, error: studentsError } = await supabase
          .from('students')
          .select('id, first_name, last_name')
          .eq('workspace_id', workspaceData.workspace_id)
          .order('first_name')

        if (studentsError) {
          console.error('Error fetching students:', studentsError)
        } else {
          setStudents(studentsData || [])
        }

        // Fetch line items for this invoice
        const { data: lineItemsData, error: lineItemsError } = await supabase
          .from('invoice_line_items')
          .select(`
            *,
            lessons(
              title,
              start_time
            ),
            services(
              name
            )
          `)
          .eq('invoice_id', invoice.id)

        if (lineItemsError) {
          console.error('Error fetching line items:', lineItemsError)
        } else {
          const processedLineItems = lineItemsData?.map(item => ({
            ...item,
            lesson_title: item.lessons?.title || `Lesson - ${new Date(item.lessons?.start_time || '').toLocaleDateString()}`,
            service_name: item.services?.name || 'No Service',
            lessons: undefined,
            services: undefined
          })) || []
          setLineItems(processedLineItems)
        }
      } catch (error) {
        console.error('Error in fetchData:', error)
      }
    }

    fetchData()
  }, [invoice.id])

  const onSubmit = async (data: EditInvoiceFormData) => {
    setIsSubmitting(true)
    try {
      const { error } = await supabase
        .from('invoices')
        .update({
          student_id: data.student_id,
          invoice_number: data.invoice_number,
          amount_due: data.amount_due,
          amount_paid: data.amount_paid,
          due_date: data.due_date,
          status: data.status,
          description: data.description,
        })
        .eq('id', invoice.id)

      if (error) {
        console.error('Error updating invoice:', error)
        toast.error('Failed to update invoice')
        return
      }

      toast.success('Invoice updated successfully')
      onInvoiceUpdated()
      onClose()
    } catch (error) {
      console.error('Error updating invoice:', error)
      toast.error('Failed to update invoice')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoice.id)

      if (error) {
        console.error('Error deleting invoice:', error)
        toast.error('Failed to delete invoice')
        return
      }

      toast.success('Invoice deleted successfully')
      onInvoiceUpdated()
      onClose()
    } catch (error) {
      console.error('Error deleting invoice:', error)
      toast.error('Failed to delete invoice')
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Edit Invoice</h3>
          <p className="text-sm text-muted-foreground">
            Update invoice details and information.
          </p>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDelete}
          className="ml-auto"
        >
          Delete Invoice
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="invoice_number">Invoice Number</Label>
            <Input
              id="invoice_number"
              {...register("invoice_number")}
              placeholder="Enter invoice number"
            />
            {errors.invoice_number && (
              <p className="text-sm text-destructive">{errors.invoice_number.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="student">Student</Label>
            <Controller
              name="student_id"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select student" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.first_name} {student.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.student_id && (
              <p className="text-sm text-destructive">{errors.student_id.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="amount_due">Amount Due ($)</Label>
            <Input
              id="amount_due"
              type="number"
              step="0.01"
              {...register("amount_due", { valueAsNumber: true })}
              placeholder="0.00"
            />
            {errors.amount_due && (
              <p className="text-sm text-destructive">{errors.amount_due.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount_paid">Amount Paid ($)</Label>
            <Input
              id="amount_paid"
              type="number"
              step="0.01"
              {...register("amount_paid", { valueAsNumber: true })}
              placeholder="0.00"
            />
            {errors.amount_paid && (
              <p className="text-sm text-destructive">{errors.amount_paid.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="due_date">Due Date</Label>
            <Input
              id="due_date"
              type="date"
              {...register("due_date")}
            />
            {errors.due_date && (
              <p className="text-sm text-destructive">{errors.due_date.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.status && (
              <p className="text-sm text-destructive">{errors.status.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description (Optional)</Label>
          <Textarea
            id="description"
            {...register("description")}
            placeholder="Enter invoice description or notes"
            rows={3}
          />
          {errors.description && (
            <p className="text-sm text-destructive">{errors.description.message}</p>
          )}
        </div>

        {/* Line Items Table */}
        {lineItems.length > 0 && (
          <div className="space-y-4">
            <div className="border-t pt-4">
              <h4 className="text-md font-semibold mb-3">Invoice Line Items ({lineItems.length})</h4>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lineItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {item.description || item.lesson_title || 'Line Item'}
                            </div>
                            {item.lesson_id && (
                              <div className="text-sm text-muted-foreground">
                                Lesson: {item.lesson_title}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {item.service_name || 'No Service'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: "USD",
                          }).format(item.rate)}/hr
                        </TableCell>
                        <TableCell>
                          {item.duration_minutes} min
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: "USD",
                          }).format(item.subtotal)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-end mt-3">
                <div className="text-sm text-muted-foreground">
                  Total: {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                  }).format(lineItems.reduce((sum, item) => sum + item.subtotal, 0))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Updating..." : "Update Invoice"}
          </Button>
        </div>
      </form>
    </div>
  )
}
