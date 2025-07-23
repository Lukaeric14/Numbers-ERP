"use client"

import * as React from "react"
import { useEffect, useState } from 'react'
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconDotsVertical,
  IconLayoutColumns,
  IconPlus,
  IconUser,
  IconMail,
  IconPhone,
  IconBriefcase,
  IconCalendar,
  IconSearch,
  IconCurrencyDollar,
  IconX,
} from "@tabler/icons-react"
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
import { toast } from "sonner"
import { supabase } from '@/lib/supabase'
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea";

// Tutor type definition
type Tutor = {
  id: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  position_title?: string
  type: 'admin' | 'tutor'
  status: 'active' | 'inactive'
  hire_date?: string
  custom_wage?: number
  lesson_wage_type?: 'custom' | 'service-based'
  subjects?: string[]
  bio?: string
  workspace_id: string
  created_at: string
}

interface TutorEditFormProps {
  tutor: Tutor;
  onTutorUpdated: () => void;
  onClose: () => void;
}

export function TutorsContent() {
  const [showAddForm, setShowAddForm] = React.useState(false)
  


  const handleTutorAdded = () => {
    setShowAddForm(false)
  }
  
  const handleAddTutor = () => {
    setShowAddForm(true);
  }

  return (
    <div className="space-y-8">
      {showAddForm ? (
        <AddTutorContent onTutorAdded={handleTutorAdded} />
      ) : (
        <TutorsDataTable onAddTutor={handleAddTutor} />
      )}
    </div>
  )
}

// Add Tutor Form Schema
const addTutorSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  position_title: z.string().optional(),
  type: z.enum(["admin", "tutor"]).default("tutor"),
  hire_date: z.string().optional(),
  custom_wage: z.string().optional(),
  lesson_wage_type: z.enum(["custom", "service-based"]).optional(),
  subjects: z.string().optional(),
  bio: z.string().optional(),
})

type AddTutorFormData = z.infer<typeof addTutorSchema>

export function AddTutorContent({ onTutorAdded }: { onTutorAdded?: () => void }) {
  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm<AddTutorFormData>({
    resolver: zodResolver(addTutorSchema),
  })
  const [isLoading, setIsLoading] = React.useState(false)

  const createTutor = async (data: AddTutorFormData) => {
    if (!data) return

    setIsLoading(true)
    try {
      // Get current user for workspace_id
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) {
        toast.error("You must be logged in to add tutors")
        return
      }

      // Get workspace_id from current user
      const { data: currentUserData } = await supabase
        .from('app_users')
        .select('workspace_id')
        .eq('id', currentUser.id)
        .single()

      if (!currentUserData?.workspace_id) {
        toast.error("Unable to determine workspace")
        return
      }

      const workspace_id = currentUserData.workspace_id

      // Parse subjects array
      const subjectsArray = data.subjects 
        ? data.subjects.split(',').map(s => s.trim()).filter(s => s.length > 0)
        : []

      // Create tutor record
      const { data: newTutor, error: tutorError } = await supabase
        .from('employees')
        .insert({
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email,
          phone: data.phone || null,
          position_title: data.position_title || null,
          type: data.type,
          status: 'active',
          hire_date: data.hire_date || null,
          custom_wage: data.custom_wage ? parseFloat(data.custom_wage) : null,
          lesson_wage_type: data.lesson_wage_type || null,
          subjects: subjectsArray.length > 0 ? subjectsArray : null,
          bio: data.bio || null,
          workspace_id,
        })
        .select('id')
        .single()

      if (tutorError || !newTutor) {
        console.error('Tutor creation error:', tutorError)
        toast.error("Failed to create tutor account")
        return
      }

      // Send invitation to tutor
      try {
        const response = await fetch('/api/invite-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: data.email,
            role: 'tutor',
            first_name: data.first_name,
            last_name: data.last_name,
            workspace_id,
            employee_id: newTutor.id,
          }),
        })

        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            toast.success("Tutor account created and invitation sent!")
          } else {
            toast.warning("Tutor account created but invitation email failed")
          }
        } else {
          toast.warning("Tutor account created but invitation email failed")
        }
      } catch (inviteError) {
        console.error('Invitation error:', inviteError)
        toast.warning("Tutor account created but invitation email failed")
      }

      // Reset form
      reset()

      toast.success("Tutor successfully added to the system!")
      
      // Call the callback to return to the table view
      if (onTutorAdded) {
        onTutorAdded()
      }

    } catch (error) {
      console.error('Unexpected error:', error)
      toast.error("An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex-1 p-6">
      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconBriefcase className="h-5 w-5" />
            Add New Tutor
          </CardTitle>
          <CardDescription>
            Create a new tutor account and send them an invitation to join the platform.
            They will receive an email with instructions to set up their password.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit((data: AddTutorFormData) => createTutor(data))} className="space-y-6">
            {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <IconUser className="h-4 w-4" />
              Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name *</Label>
                <Input
                  id="first_name"
                  {...register('first_name')}
                  placeholder="Enter first name"
                  className={errors.first_name ? "border-red-500" : ""}
                />
                {errors.first_name && (
                  <p className="text-sm text-red-500">{errors.first_name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name *</Label>
                <Input
                  id="last_name"
                  {...register('last_name')}
                  placeholder="Enter last name"
                  className={errors.last_name ? "border-red-500" : ""}
                />
                {errors.last_name && (
                  <p className="text-sm text-red-500">{errors.last_name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  placeholder="tutor@example.com"
                  className={errors.email ? "border-red-500" : ""}
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  {...register('phone')}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
          </div>

          {/* Professional Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <IconBriefcase className="h-4 w-4" />
              Professional Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="position_title">Position Title</Label>
                <Input
                  id="position_title"
                  {...register('position_title')}
                  placeholder="e.g., Math Tutor, Science Teacher"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Role Type</Label>
                <Select {...register('type')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tutor">Tutor</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="hire_date">Hire Date</Label>
                <Input
                  id="hire_date"
                  type="date"
                  {...register('hire_date')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lesson_wage_type">Wage Type</Label>
                <Select {...register('lesson_wage_type')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select wage type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="service-based">Service-Based</SelectItem>
                    <SelectItem value="custom">Custom Rate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {watch('lesson_wage_type') === 'custom' && (
                <div className="space-y-2">
                  <Label htmlFor="custom_wage">Custom Wage (per hour)</Label>
                  <Input
                    id="custom_wage"
                    type="number"
                    step="0.01"
                    {...register('custom_wage')}
                    placeholder="25.00"
                  />
                </div>
              )}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="subjects">Subjects (comma-separated)</Label>
                <Input
                  id="subjects"
                  {...register('subjects')}
                  placeholder="Math, Science, English, History"
                />
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Additional Information</h3>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio/Description</Label>
              <Textarea
                id="bio"
                {...register('bio')}
                placeholder="Brief description of the tutor's background, experience, and specialties..."
                rows={4}
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4 pt-6 border-t">
            <Button
              variant="outline"
              onClick={() => {
                reset()
              }}
              disabled={isLoading}
            >
              Clear Form
            </Button>
            <div className="flex justify-end gap-2">
              <Button 
                type="button" 
                variant="outline"
                onClick={() => onTutorAdded && onTutorAdded()}
                disabled={isLoading}
              >
                <IconX className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading}
                className="min-w-[140px]"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Creating...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <IconPlus className="h-4 w-4" />
                    Create Tutor
                  </div>
                )}
              </Button>
            </div>
          </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

// Tutors Data Table Component
function TutorsDataTable({ onAddTutor }: { onAddTutor: () => void }) {
  const [tutors, setTutors] = React.useState<Tutor[]>([])
  const [loading, setLoading] = React.useState(true)
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  const [selectedTutor, setSelectedTutor] = React.useState<Tutor | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false)
  const isMobile = useIsMobile()

  // Fetch tutors data
  const fetchTutors = React.useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userData } = await supabase
        .from('app_users')
        .select('workspace_id')
        .eq('id', user.id)
        .single()

      if (!userData?.workspace_id) return

      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('workspace_id', userData.workspace_id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching tutors:', error)
        toast.error('Failed to load tutors')
        return
      }

      setTutors(data || [])
    } catch (error) {
      console.error('Error fetching tutors:', error)
      toast.error('Failed to load tutors')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchTutors()
  }, [fetchTutors])

  const handleTutorUpdate = () => {
    fetchTutors()
  }

  // Table columns
  const columns: ColumnDef<Tutor>[] = [
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
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => {
        return (
          <button 
            onClick={() => {
              setSelectedTutor(row.original)
              setIsDrawerOpen(true)
            }}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {row.original.first_name} {row.original.last_name}
          </button>
        )
      },
      enableHiding: false,
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => {
        const email = row.getValue("email") as string
        return (
          <div className="flex items-center gap-2">
            <IconMail className="h-4 w-4 text-muted-foreground" />
            <span>{email}</span>
          </div>
        )
      },
    },
    {
      accessorKey: "position_title",
      header: "Position",
      cell: ({ row }) => {
        const position = row.original.position_title
        return position ? (
          <div className="flex items-center gap-2">
            <IconBriefcase className="h-4 w-4 text-muted-foreground" />
            <span>{position}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        )
      },
    },
    {
      accessorKey: "type",
      header: "Role",
      cell: ({ row }) => {
        const type = row.getValue("type") as string
        return (
          <Badge variant={type === 'admin' ? 'default' : 'secondary'}>
            {type === 'admin' ? 'Admin' : 'Tutor'}
          </Badge>
        )
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        return (
          <Badge variant={status === 'active' ? 'default' : 'secondary'}>
            {status === 'active' ? 'Active' : 'Inactive'}
          </Badge>
        )
      },
    },
    {
      accessorKey: "subjects",
      header: "Subjects",
      cell: ({ row }) => {
        const subjects = row.original.subjects
        return subjects && subjects.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {subjects.slice(0, 2).map((subject, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {subject}
              </Badge>
            ))}
            {subjects.length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{subjects.length - 2}
              </Badge>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        )
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const tutor = row.original
        
        const handleDelete = async () => {
          if (!confirm('Are you sure you want to delete this tutor?')) return
          
          try {
            const { error } = await supabase
              .from('employees')
              .delete()
              .eq('id', tutor.id)
            
            if (error) {
              console.error('Error deleting tutor:', error)
              toast.error('Failed to delete tutor')
              return
            }
            
            // Update local state
            setTutors(prev => prev.filter(t => t.id !== tutor.id))
            toast.success('Tutor deleted successfully')
          } catch (error) {
            console.error('Error deleting tutor:', error)
            toast.error('Failed to delete tutor')
          }
        }
        
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
              <DropdownMenuItem onClick={() => {
                setSelectedTutor(tutor)
                setIsDrawerOpen(true)
              }}>Edit tutor</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600" onClick={handleDelete}>
                Delete tutor
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
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Tutors</CardTitle>
        <CardDescription>
          Manage your tutoring staff and their information
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="relative">
              <IconSearch className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tutors..."
                value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
                onChange={(event) =>
                  table.getColumn("name")?.setFilterValue(event.target.value)
                }
                className="pl-8 max-w-sm"
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">

            <Button 
              onClick={() => {
onAddTutor()
              }} 
              size="sm"
            >
              <IconPlus className="mr-2 h-4 w-4" />
              Add Tutor
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="ml-auto">
                  <IconLayoutColumns className="mr-2 h-4 w-4" />
                  View
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
      </div>

      {/* Table */}
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

      {/* Pagination */}
      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Rows per page</p>
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(value) => {
                table.setPageSize(Number(value))
              }}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={table.getState().pagination.pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 30, 40, 50].map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-[100px] items-center justify-center text-sm font-medium">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to first page</span>
              <IconChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to previous page</span>
              <IconChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to next page</span>
              <IconChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to last page</span>
              <IconChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      </CardContent>
      
      {/* Tutor Edit Drawer */}
      <Drawer direction={isMobile ? "bottom" : "right"} open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DrawerContent>
          <DrawerHeader className="gap-1">
            <DrawerTitle>{selectedTutor?.first_name} {selectedTutor?.last_name}</DrawerTitle>
            <DrawerDescription>
              Tutor: {selectedTutor?.first_name} {selectedTutor?.last_name}
            </DrawerDescription>
          </DrawerHeader>
          <div className="p-4 space-y-4 overflow-y-auto">
            {selectedTutor && (
              <TutorEditForm 
                tutor={selectedTutor} 
                onTutorUpdated={handleTutorUpdate} 
                onClose={() => setIsDrawerOpen(false)} 
              />
            )}
          </div>
          <DrawerFooter>
            <Button 
              onClick={() => {
                // Trigger form submission
                const form = document.querySelector('#tutor-edit-form') as HTMLFormElement
                if (form) {
                  form.requestSubmit()
                }
              }}
            >
              Save Changes
            </Button>
            <DrawerClose asChild>
              <Button variant="outline">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </Card>
  )
}

// Tutor Edit Form Component
function TutorEditForm({ tutor, onTutorUpdated, onClose }: TutorEditFormProps) {
  const [formData, setFormData] = React.useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    position_title: '',
    type: 'tutor' as 'tutor' | 'admin',
    status: 'active' as 'active' | 'inactive',
    subjects: '',
    bio: '',
  });
  const [isLoading, setIsLoading] = React.useState(false);

  useEffect(() => {
    if (tutor) {
      setFormData({
        first_name: tutor.first_name || '',
        last_name: tutor.last_name || '',
        email: tutor.email || '',
        phone: tutor.phone || '',
        position_title: tutor.position_title || '',
        type: tutor.type || 'tutor',
        status: tutor.status || 'active',
        subjects: Array.isArray(tutor.subjects) ? tutor.subjects.join(', ') : '',
        bio: tutor.bio || '',
      });
    }
  }, [tutor]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const updateData = {
      ...formData,
      subjects: formData.subjects.split(',').map(s => s.trim()).filter(Boolean),
    };

    try {
      const { error } = await supabase
        .from('employees')
        .update(updateData)
        .eq('id', tutor.id);

      if (error) {
        throw error;
      }

      toast.success('Tutor updated successfully!');
      onTutorUpdated();
      onClose();
    } catch (error) {
      console.error('Error updating tutor:', error);
      toast.error('Failed to update tutor. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form id="tutor-edit-form" onSubmit={handleFormSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-3">
          <Label htmlFor="first_name">First Name</Label>
          <Input
            id="first_name"
            value={formData.first_name || ''}
            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-3">
          <Label htmlFor="last_name">Last Name</Label>
          <Input
            id="last_name"
            value={formData.last_name || ''}
            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-3">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email || ''}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-3">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            type="tel"
            value={formData.phone || ''}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-3">
          <Label htmlFor="position_title">Position Title</Label>
          <Input
            id="position_title"
            value={formData.position_title || ''}
            onChange={(e) => setFormData({ ...formData, position_title: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-3">
          <Label htmlFor="type">Role Type</Label>
          <Select value={formData.type} onValueChange={(value: 'tutor' | 'admin') => setFormData({ ...formData, type: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tutor">Tutor</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <Label htmlFor="subjects">Subjects (comma-separated)</Label>
        <Input
          id="subjects"
          value={formData.subjects}
          onChange={(e) => setFormData({ ...formData, subjects: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-3">
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          value={formData.bio}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, bio: e.target.value })}
        />
      </div>
      
    </form>
  )
}

// Service type definition
type Service = {
  id: string
  workspace_id: string
  name: string
  description?: string
  price_per_hour?: number
  cost_per_hour?: number
  created_at: string
}

export function ServicesContent() {
  const [services, setServices] = React.useState<Service[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [refreshTrigger, setRefreshTrigger] = React.useState(0)
  const [selectedService, setSelectedService] = React.useState<Service | null>(null)
  const [isEditSheetOpen, setIsEditSheetOpen] = React.useState(false)

  // Fetch services
  React.useEffect(() => {
    const fetchServices = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: userData } = await supabase
          .from('app_users')
          .select('workspace_id')
          .eq('id', user.id)
          .single()

        if (!userData?.workspace_id) return

        const { data: servicesData, error } = await supabase
          .from('services')
          .select('*')
          .eq('workspace_id', userData.workspace_id)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Error fetching services:', error)
          return
        }

        setServices(servicesData || [])
      } catch (error) {
        console.error('Error fetching services:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchServices()
  }, [refreshTrigger])

  const handleServiceAdded = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  const handleServiceUpdated = () => {
    setRefreshTrigger(prev => prev + 1)
    setIsEditSheetOpen(false)
    setSelectedService(null)
  }

  const handleEditService = (service: Service) => {
    setSelectedService(service)
    setIsEditSheetOpen(true)
  }

  const handleCloseEdit = () => {
    setIsEditSheetOpen(false)
    setSelectedService(null)
  }

  return (
    <div className="space-y-8">
      <ServicesDataTable 
        services={services}
        isLoading={isLoading}
        onEditService={handleEditService}
        onRefresh={handleServiceAdded}
        onServiceAdded={handleServiceAdded}
      />

      {/* Edit Service Sheet */}
      <Sheet open={isEditSheetOpen} onOpenChange={setIsEditSheetOpen}>
        <SheetContent className="w-[400px] sm:w-[540px] p-6">
          <SheetHeader>
            <SheetTitle>Edit Service</SheetTitle>
            <SheetDescription>
              Update the service details and pricing information.
            </SheetDescription>
          </SheetHeader>
          {selectedService && (
            <ServiceEditForm
              service={selectedService}
              onServiceUpdated={handleServiceUpdated}
              onClose={handleCloseEdit}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

// Add Service Sheet Component
function AddServiceSheet({ onServiceAdded }: { onServiceAdded?: () => void }) {
  const [isOpen, setIsOpen] = React.useState(false)

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button size="sm">
          <IconPlus className="h-4 w-4 mr-2" />
          Add Service
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px] p-6">
        <SheetHeader>
          <SheetTitle>Add New Service</SheetTitle>
          <SheetDescription>
            Create a new tutoring service with pricing information.
          </SheetDescription>
        </SheetHeader>
        <AddServiceContent 
          onServiceAdded={() => {
            onServiceAdded?.()
            setIsOpen(false)
          }} 
        />
      </SheetContent>
    </Sheet>
  )
}

// Add Service Form Schema
const addServiceSchema = z.object({
  name: z.string().min(1, "Service name is required"),
  description: z.string().optional(),
  price_per_hour: z.string().optional(),
  cost_per_hour: z.string().optional(),
})

type AddServiceFormData = z.infer<typeof addServiceSchema>

function AddServiceContent({ onServiceAdded }: { onServiceAdded?: () => void }) {
  const { register, handleSubmit, formState: { errors }, reset } = useForm<AddServiceFormData>({
    resolver: zodResolver(addServiceSchema),
  })
  const [isLoading, setIsLoading] = React.useState(false)

  const onSubmit = async (data: AddServiceFormData) => {
    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error("You must be logged in to create a service")
        return
      }

      const { data: userData } = await supabase
        .from('app_users')
        .select('workspace_id')
        .eq('id', user.id)
        .single()

      if (!userData?.workspace_id) {
        toast.error("Workspace not found")
        return
      }

      const { error } = await supabase
        .from('services')
        .insert({
          name: data.name,
          description: data.description || null,
          price_per_hour: data.price_per_hour ? parseFloat(data.price_per_hour) : null,
          cost_per_hour: data.cost_per_hour ? parseFloat(data.cost_per_hour) : null,
          workspace_id: userData.workspace_id,
        })

      if (error) {
        console.error('Error creating service:', error)
        toast.error("Failed to create service")
        return
      }

      reset()
      toast.success("Service successfully created!")
      
      if (onServiceAdded) {
        onServiceAdded()
      }
    } catch (error) {
      console.error('Error creating service:', error)
      toast.error("An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6 py-4">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Service Details */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <IconBriefcase className="h-4 w-4" />
            Service Details
          </h3>
          <div className="space-y-2">
            <Label htmlFor="name">Service Name *</Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="e.g., Math Tutoring, Physics Help"
              className={errors.name ? "border-red-500" : ""}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Describe what this service includes..."
              rows={3}
            />
          </div>
        </div>

        {/* Pricing */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <IconCurrencyDollar className="h-4 w-4" />
            Pricing
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price_per_hour">Price per Hour</Label>
              <Input
                id="price_per_hour"
                type="number"
                step="0.01"
                min="0"
                {...register('price_per_hour')}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost_per_hour">Cost per Hour</Label>
              <Input
                id="cost_per_hour"
                type="number"
                step="0.01"
                min="0"
                {...register('cost_per_hour')}
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex flex-col gap-2 pt-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                Creating...
              </>
            ) : (
              'Create Service'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

// Services Data Table Component
interface ServicesDataTableProps {
  services: Service[]
  isLoading: boolean
  onEditService: (service: Service) => void
  onRefresh: () => void
  onServiceAdded: () => void
}

function ServicesDataTable({ services, isLoading, onEditService, onRefresh, onServiceAdded }: ServicesDataTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  const [globalFilter, setGlobalFilter] = React.useState("")

  const columns: ColumnDef<Service>[] = [
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
      accessorKey: "name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-semibold hover:bg-transparent"
        >
          Service Name
          <IconChevronDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <Button 
          variant="link" 
          className="text-foreground w-fit px-0 text-left font-medium h-auto"
          onClick={() => onEditService(row.original)}
        >
          {row.getValue("name")}
        </Button>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <div className="max-w-[200px] truncate">
          {row.getValue("description") || "No description"}
        </div>
      ),
    },
    {
      accessorKey: "price_per_hour",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-semibold hover:bg-transparent"
        >
          <IconCurrencyDollar className="mr-1 h-4 w-4" />
          Price/Hour
          <IconChevronDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const price = row.getValue("price_per_hour") as number
        return price ? `$${price.toFixed(2)}` : "Not set"
      },
    },
    {
      accessorKey: "cost_per_hour",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-semibold hover:bg-transparent"
        >
          <IconCurrencyDollar className="mr-1 h-4 w-4" />
          Cost/Hour
          <IconChevronDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const cost = row.getValue("cost_per_hour") as number
        return cost ? `$${cost.toFixed(2)}` : "Not set"
      },
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-semibold hover:bg-transparent"
        >
          Created
          <IconChevronDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const date = new Date(row.getValue("created_at"))
        return date.toLocaleDateString()
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const service = row.original
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
              <DropdownMenuItem onClick={() => onEditService(service)}>
                Edit service
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={async () => {
                  if (confirm('Are you sure you want to delete this service?')) {
                    try {
                      const { error } = await supabase
                        .from('services')
                        .delete()
                        .eq('id', service.id)
                      
                      if (error) {
                        console.error('Error deleting service:', error)
                        toast.error('Failed to delete service')
                      } else {
                        toast.success('Service deleted successfully')
                        onRefresh()
                      }
                    } catch (error) {
                      console.error('Error deleting service:', error)
                      toast.error('An unexpected error occurred')
                    }
                  }
                }}
                className="text-red-600"
              >
                Delete service
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  const table = useReactTable({
    data: services,
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
            <CardTitle>Services</CardTitle>
            <CardDescription>
              Manage your tutoring services and pricing structure.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <IconLayoutColumns className="h-4 w-4 mr-2" />
              View
            </Button>
            <AddServiceSheet onServiceAdded={onServiceAdded} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center py-4">
          <Input
            placeholder="Search services..."
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
                    No services found.
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

// Service Edit Form Component
interface ServiceEditFormProps {
  service: Service
  onServiceUpdated: () => void
  onClose: () => void
}

function ServiceEditForm({ service, onServiceUpdated, onClose }: ServiceEditFormProps) {
  const [formData, setFormData] = React.useState({
    name: service.name,
    description: service.description || '',
    price_per_hour: service.price_per_hour?.toString() || '',
    cost_per_hour: service.cost_per_hour?.toString() || '',
  })
  const [isLoading, setIsLoading] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { error } = await supabase
        .from('services')
        .update({
          name: formData.name,
          description: formData.description || null,
          price_per_hour: formData.price_per_hour ? parseFloat(formData.price_per_hour) : null,
          cost_per_hour: formData.cost_per_hour ? parseFloat(formData.cost_per_hour) : null,
        })
        .eq('id', service.id)

      if (error) {
        console.error('Error updating service:', error)
        toast.error('Failed to update service')
        return
      }

      toast.success('Service updated successfully!')
      onServiceUpdated()
    } catch (error) {
      console.error('Error updating service:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Service Details */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <IconBriefcase className="h-4 w-4" />
            Service Details
          </h3>
          <div className="space-y-2">
            <Label htmlFor="name">Service Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Math Tutoring, Physics Help"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe what this service includes..."
              rows={3}
            />
          </div>
        </div>

        {/* Pricing */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <IconCurrencyDollar className="h-4 w-4" />
            Pricing
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price_per_hour">Price per Hour</Label>
              <Input
                id="price_per_hour"
                type="number"
                step="0.01"
                min="0"
                value={formData.price_per_hour}
                onChange={(e) => setFormData({ ...formData, price_per_hour: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost_per_hour">Cost per Hour</Label>
              <Input
                id="cost_per_hour"
                type="number"
                step="0.01"
                min="0"
                value={formData.cost_per_hour}
                onChange={(e) => setFormData({ ...formData, cost_per_hour: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                Updating...
              </>
            ) : (
              'Update Service'
            )}
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}

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

// Lesson type definition
type Lesson = {
  id: string
  workspace_id: string
  tutor_id: string
  student_id: string
  service_id?: string
  location_id?: string
  title: string
  description?: string
  start_time: string
  end_time: string
  status: 'scheduled' | 'completed' | 'canceled'
  invoice_id?: string
  created_at: string
  // Joined data
  tutor_name?: string
  student_name?: string
  service_name?: string
  location_name?: string
}

interface LessonEditFormProps {
  lesson: Lesson;
  onLessonUpdated: () => void;
  onClose: () => void;
  dropdownData: {
    tutors: { id: string; name: string }[];
    students: { id: string; name: string }[];
    services: { id: string; name: string }[];
    locations: { id: string; name: string }[];
  };
}

export function LessonsContent() {
  const [showAddForm, setShowAddForm] = React.useState(false)
  const [selectedLesson, setSelectedLesson] = React.useState<Lesson | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false)
  const [refreshTrigger, setRefreshTrigger] = React.useState(0)
  const [dropdownData, setDropdownData] = React.useState({
    tutors: [] as { id: string; name: string }[],
    students: [] as { id: string; name: string }[],
    services: [] as { id: string; name: string }[],
    locations: [] as { id: string; name: string }[]
  })

  const handleLessonAdded = () => {
    setShowAddForm(false)
    setRefreshTrigger(prev => prev + 1)
  }
  
  const handleAddLesson = () => {
    setShowAddForm(true);
  }

  const handleLessonUpdated = () => {
    setIsDrawerOpen(false)
    setSelectedLesson(null)
    setRefreshTrigger(prev => prev + 1)
  }

  // Fetch dropdown data on component mount
  React.useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: userData } = await supabase
          .from('app_users')
          .select('workspace_id')
          .eq('id', user.id)
          .single()

        if (!userData?.workspace_id) return

        // Fetch all dropdown data in parallel
        const [tutorsData, studentsData, servicesData, locationsData] = await Promise.all([
          supabase.from('employees').select('id, first_name, last_name').eq('workspace_id', userData.workspace_id).eq('type', 'tutor'),
          supabase.from('students').select('id, first_name, last_name').eq('workspace_id', userData.workspace_id),
          supabase.from('services').select('id, name').eq('workspace_id', userData.workspace_id),
          supabase.from('locations').select('id, name').eq('workspace_id', userData.workspace_id)
        ])

        setDropdownData({
          tutors: tutorsData.data?.map(t => ({ id: t.id, name: `${t.first_name} ${t.last_name}` })) || [],
          students: studentsData.data?.map(s => ({ id: s.id, name: `${s.first_name} ${s.last_name}` })) || [],
          services: servicesData.data || [],
          locations: locationsData.data || []
        })
      } catch (error) {
        console.error('Error fetching dropdown data:', error)
      }
    }

    fetchDropdownData()
  }, [])

  return (
    <div className="space-y-8">
      {showAddForm ? (
        <AddLessonContent onLessonAdded={handleLessonAdded} />
      ) : (
        <LessonsDataTable 
          onAddLesson={handleAddLesson} 
          onLessonSelect={(lesson) => {
            setSelectedLesson(lesson)
            setIsDrawerOpen(true)
          }}
          refreshTrigger={refreshTrigger}
        />
      )}
      
      {/* Edit Lesson Sheet */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{selectedLesson?.title}</SheetTitle>
            <SheetDescription>
              Lesson: {selectedLesson?.title}
            </SheetDescription>
          </SheetHeader>
          {selectedLesson && (
            <LessonEditForm 
              lesson={selectedLesson} 
              onLessonUpdated={handleLessonUpdated}
              onClose={() => setIsDrawerOpen(false)}
              dropdownData={dropdownData}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

// Add Lesson Form Schema
const addLessonSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  tutor_id: z.string().min(1, "Tutor is required"),
  student_id: z.string().min(1, "Student is required"),
  service_id: z.string().optional(),
  location_id: z.string().optional(),
  start_time: z.string().min(1, "Start time is required"),
  end_time: z.string().min(1, "End time is required"),
  status: z.enum(["scheduled", "completed", "canceled"]).default("scheduled"),
  custom_rate: z.string().optional(),
}).refine((data) => {
  // If service_id is 'custom', custom_rate is required
  if (data.service_id === 'custom') {
    return data.custom_rate && data.custom_rate.trim() !== '' && parseFloat(data.custom_rate) > 0
  }
  return true
}, {
  message: "Custom rate is required and must be greater than 0 when Custom Rate is selected",
  path: ["custom_rate"]
})

type AddLessonFormData = z.infer<typeof addLessonSchema>

export function AddLessonContent({ onLessonAdded }: { onLessonAdded?: () => void }) {
  const { register, handleSubmit, formState: { errors }, reset, watch, control } = useForm<AddLessonFormData>({
    resolver: zodResolver(addLessonSchema),
  })
  const [isLoading, setIsLoading] = React.useState(false)
  const [tutors, setTutors] = React.useState<{id: string, name: string}[]>([])
  const [students, setStudents] = React.useState<{id: string, name: string}[]>([])
  const [services, setServices] = React.useState<{id: string, name: string}[]>([])
  const [locations, setLocations] = React.useState<{id: string, name: string}[]>([])

  // Fetch dropdown data
  React.useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: userData } = await supabase
          .from('app_users')
          .select('workspace_id')
          .eq('id', user.id)
          .single()

        if (!userData?.workspace_id) return

        // Fetch tutors
        const { data: tutorsData } = await supabase
          .from('employees')
          .select('id, first_name, last_name')
          .eq('workspace_id', userData.workspace_id)
          .eq('status', 'active')

        if (tutorsData) {
          setTutors(tutorsData.map(t => ({ id: t.id, name: `${t.first_name} ${t.last_name}` })))
        }

        // Fetch students
        const { data: studentsData } = await supabase
          .from('students')
          .select('id, first_name, last_name')
          .eq('workspace_id', userData.workspace_id)

        if (studentsData) {
          setStudents(studentsData.map(s => ({ id: s.id, name: `${s.first_name} ${s.last_name}` })))
        }

        // Fetch services
        const { data: servicesData } = await supabase
          .from('services')
          .select('id, name')
          .eq('workspace_id', userData.workspace_id)

        if (servicesData) {
          setServices(servicesData)
        }

        // Fetch locations
        const { data: locationsData } = await supabase
          .from('locations')
          .select('id, name')
          .eq('workspace_id', userData.workspace_id)

        if (locationsData) {
          setLocations(locationsData)
        }
      } catch (error) {
        console.error('Error fetching dropdown data:', error)
      }
    }

    fetchDropdownData()
  }, [])

  const createLesson = async (data: AddLessonFormData) => {
    if (!data) return

    setIsLoading(true)
    try {
      // Get current user for workspace_id
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) {
        toast.error("You must be logged in to create a lesson")
        return
      }

      const { data: currentUserData } = await supabase
        .from('app_users')
        .select('workspace_id')
        .eq('id', currentUser.id)
        .single()

      if (!currentUserData?.workspace_id) {
        toast.error("Unable to determine workspace")
        return
      }

      const workspace_id = currentUserData.workspace_id

      // Get service rate for billing
      let serviceRate = 0
      if (data.service_id === 'custom') {
        // Use custom rate
        serviceRate = parseFloat(data.custom_rate || '0')
      } else if (data.service_id) {
        // Get rate from service
        const { data: serviceData } = await supabase
          .from('services')
          .select('price_per_hour')
          .eq('id', data.service_id)
          .single()
        
        serviceRate = serviceData?.price_per_hour || 0
      }

      // Calculate duration in minutes
      const startTime = new Date(data.start_time)
      const endTime = new Date(data.end_time)
      const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60))

      // Log the data being inserted for debugging
      const insertData = {
        title: data.title,
        description: data.description || null,
        tutor_id: data.tutor_id,
        student_id: data.student_id,
        service_id: data.service_id === 'custom' ? null : (data.service_id || null),
        location_id: data.location_id || null,
        start_time: data.start_time,
        end_time: data.end_time,
        status: data.status,
        workspace_id,
        // Add billing fields
        billing_status: 'unbilled',
        rate: serviceRate,
        duration_minutes: durationMinutes
      }
      
      console.log('Attempting to insert lesson with data:', insertData)

      // Create lesson record
      const { data: newLesson, error } = await supabase
        .from('lessons')
        .insert(insertData)
        .select('id')
        .single()

      if (error) {
        console.error('Detailed error creating lesson:', {
          error,
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          insertData
        })
        toast.error(`Failed to create lesson: ${error.message || 'Unknown error'}`)
        return
      }

      // Reset form
      reset()

      toast.success("Lesson successfully created!")
      
      // Call the callback to refresh the parent component
      if (onLessonAdded) {
        onLessonAdded()
      }
    } catch (error) {
      console.error('Error creating lesson:', error)
      toast.error("An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex-1 p-6">
      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconCalendar className="h-5 w-5" />
            Add New Lesson
          </CardTitle>
          <CardDescription>
            Schedule a new lesson by selecting the tutor, student, and time details.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit((data: AddLessonFormData) => createLesson(data))} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <IconCalendar className="h-4 w-4" />
                Lesson Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    {...register('title')}
                    placeholder="Enter lesson title"
                    className={errors.title ? "border-red-500" : ""}
                  />
                  {errors.title && (
                    <p className="text-sm text-red-500">{errors.title.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select {...register('status')}>
                    <SelectTrigger>
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
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...register('description')}
                  placeholder="Enter lesson description or notes..."
                  rows={3}
                />
              </div>
            </div>

            {/* Participants */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <IconUser className="h-4 w-4" />
                Participants
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tutor_id">Tutor *</Label>
                  <Controller
                    name="tutor_id"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select tutor" />
                        </SelectTrigger>
                        <SelectContent>
                          {tutors.map(tutor => (
                            <SelectItem key={tutor.id} value={tutor.id}>{tutor.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.tutor_id && (
                    <p className="text-sm text-red-500">{errors.tutor_id.message}</p>
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
            </div>

            {/* Schedule & Location */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <IconCalendar className="h-4 w-4" />
                Schedule & Location
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_time">Start Time *</Label>
                  <Input
                    id="start_time"
                    type="datetime-local"
                    {...register('start_time')}
                    className={errors.start_time ? "border-red-500" : ""}
                  />
                  {errors.start_time && (
                    <p className="text-sm text-red-500">{errors.start_time.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_time">End Time *</Label>
                  <Input
                    id="end_time"
                    type="datetime-local"
                    {...register('end_time')}
                    className={errors.end_time ? "border-red-500" : ""}
                  />
                  {errors.end_time && (
                    <p className="text-sm text-red-500">{errors.end_time.message}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="service_id">Service</Label>
                  <Controller
                    name="service_id"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select service (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="custom">Custom Rate</SelectItem>
                          {services.map(service => (
                            <SelectItem key={service.id} value={service.id}>{service.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location_id">Location</Label>
                  <Controller
                    name="location_id"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select location (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          {locations.map(location => (
                            <SelectItem key={location.id} value={location.id}>{location.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>
              
              {/* Custom Rate Input - Show when Custom is selected */}
              {watch('service_id') === 'custom' && (
                <div className="space-y-2">
                  <Label htmlFor="custom_rate">Custom Rate (per hour) *</Label>
                  <Input
                    id="custom_rate"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Enter hourly rate (e.g., 50.00)"
                    {...register('custom_rate')}
                    className={errors.custom_rate ? "border-red-500" : ""}
                  />
                  {errors.custom_rate && (
                    <p className="text-sm text-red-500">{errors.custom_rate.message}</p>
                  )}
                </div>
              )}
            </div>

            {/* Form Actions */}
            <div className="flex flex-col gap-4 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  reset()
                }}
                disabled={isLoading}
              >
                Clear Form
              </Button>
              <div className="flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => onLessonAdded && onLessonAdded()}
                  disabled={isLoading}
                >
                  <IconX className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="min-w-[140px]"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Creating...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <IconPlus className="h-4 w-4" />
                      Create Lesson
                    </div>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

// Lessons Data Table Component
function LessonsDataTable({ onAddLesson, onLessonSelect, refreshTrigger }: { 
  onAddLesson: () => void;
  onLessonSelect: (lesson: Lesson) => void;
  refreshTrigger: number;
}) {
  const [lessons, setLessons] = React.useState<Lesson[]>([])
  const [loading, setLoading] = React.useState(true)
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  const isMobile = useIsMobile()

  // Fetch lessons data
  const fetchLessons = React.useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userData } = await supabase
        .from('app_users')
        .select('workspace_id')
        .eq('id', user.id)
        .single()

      if (!userData?.workspace_id) return

      const { data: lessonsData, error } = await supabase
        .from('lessons')
        .select(`
          *,
          tutor:employees!tutor_id(first_name, last_name),
          student:students!student_id(first_name, last_name),
          service:services!service_id(name)
        `)
        .eq('workspace_id', userData.workspace_id)
        .order('start_time', { ascending: false })

      if (error) {
        console.error('Error fetching lessons:', error)
        return
      }

      if (lessonsData) {
        const formattedLessons = lessonsData.map(lesson => ({
          ...lesson,
          tutor_name: lesson.tutor ? `${lesson.tutor.first_name} ${lesson.tutor.last_name}` : 'Unknown',
          student_name: lesson.student ? `${lesson.student.first_name} ${lesson.student.last_name}` : 'Unknown',
          service_name: lesson.service?.name || 'No Service'
        }))
        setLessons(formattedLessons)
      }
    } catch (error) {
      console.error('Error fetching lessons:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchLessons()
  }, [fetchLessons, refreshTrigger])

  // Table columns
  const columns: ColumnDef<Lesson>[] = [
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
      accessorKey: "title",
      header: "Title",
      cell: ({ row }) => (
        <button
          onClick={() => {
            onLessonSelect(row.original)
          }}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          {row.getValue("title")}
        </button>
      ),
      enableHiding: false,
    },
    {
      accessorKey: "tutor_name",
      header: "Tutor",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <IconUser className="h-4 w-4 text-muted-foreground" />
          {row.getValue("tutor_name")}
        </div>
      ),
    },
    {
      accessorKey: "student_name",
      header: "Student",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <IconUser className="h-4 w-4 text-muted-foreground" />
          {row.getValue("student_name")}
        </div>
      ),
    },
    {
      accessorKey: "start_time",
      header: "Start Time",
      cell: ({ row }) => {
        const startTime = new Date(row.getValue("start_time"))
        return (
          <div className="flex items-center gap-2">
            <IconCalendar className="h-4 w-4 text-muted-foreground" />
            {startTime.toLocaleString()}
          </div>
        )
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        return (
          <Badge 
            variant={
              status === "completed" ? "default" : 
              status === "canceled" ? "destructive" : 
              "secondary"
            }
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        )
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const lesson = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <IconDotsVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={async () => {
                  if (confirm('Are you sure you want to delete this lesson?')) {
                    try {
                      const { error } = await supabase
                        .from('lessons')
                        .delete()
                        .eq('id', lesson.id)
                      
                      if (error) {
                        toast.error('Failed to delete lesson')
                      } else {
                        toast.success('Lesson deleted successfully')
                        fetchLessons()
                      }
                    } catch (error) {
                      toast.error('Failed to delete lesson')
                    }
                  }
                }}
                className="text-red-600"
              >
                Delete lesson
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  const table = useReactTable({
    data: lessons,
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-current border-t-transparent" />
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Lessons</CardTitle>
        <CardDescription>
          Manage your scheduled lessons and their details
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="relative">
              <IconSearch className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search lessons..."
                value={(table.getColumn("title")?.getFilterValue() as string) ?? ""}
                onChange={(event) =>
                  table.getColumn("title")?.setFilterValue(event.target.value)
                }
                className="pl-8 max-w-sm"
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button onClick={onAddLesson} size="sm">
              <IconPlus className="mr-2 h-4 w-4" />
              Add Lesson
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="ml-auto">
                  <IconLayoutColumns className="mr-2 h-4 w-4" />
                  View
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
                    No lessons found.
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

// Lesson Edit Form Component
function LessonEditForm({ lesson, onLessonUpdated, onClose, dropdownData }: LessonEditFormProps) {
  const [formData, setFormData] = React.useState({
    title: '',
    description: '',
    tutor_id: '',
    student_id: '',
    service_id: '',
    location_id: '',
    start_time: '',
    end_time: '',
    status: 'scheduled' as 'scheduled' | 'completed' | 'canceled'
  })
  const [isLoading, setIsLoading] = React.useState(false)

  // Initialize form data when lesson changes
  React.useEffect(() => {
    if (lesson) {
      setFormData({
        title: lesson.title || '',
        description: lesson.description || '',
        tutor_id: lesson.tutor_id || '',
        student_id: lesson.student_id || '',
        service_id: lesson.service_id || '',
        location_id: lesson.location_id || '',
        start_time: lesson.start_time ? new Date(lesson.start_time).toISOString().slice(0, 16) : '',
        end_time: lesson.end_time ? new Date(lesson.end_time).toISOString().slice(0, 16) : '',
        status: lesson.status || 'scheduled'
      })
    }
  }, [lesson])



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { error } = await supabase
        .from('lessons')
        .update({
          title: formData.title,
          description: formData.description || null,
          tutor_id: formData.tutor_id,
          student_id: formData.student_id,
          service_id: formData.service_id || null,
          location_id: formData.location_id || null,
          start_time: formData.start_time,
          end_time: formData.end_time,
          status: formData.status
        })
        .eq('id', lesson.id)

      if (error) {
        toast.error('Failed to update lesson')
        console.error('Error updating lesson:', error)
      } else {
        toast.success('Lesson updated successfully')
        onLessonUpdated()
      }
    } catch (error) {
      toast.error('Failed to update lesson')
      console.error('Error updating lesson:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status} onValueChange={(value: 'scheduled' | 'completed' | 'canceled') => setFormData({ ...formData, status: value })}>
              <SelectTrigger>
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

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="tutor_id">Tutor *</Label>
            <Select value={formData.tutor_id} onValueChange={(value) => setFormData({ ...formData, tutor_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select tutor" />
              </SelectTrigger>
              <SelectContent>
                {dropdownData.tutors.map((tutor: { id: string; name: string }) => (
                  <SelectItem key={tutor.id} value={tutor.id}>
                    {tutor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="student_id">Student *</Label>
            <Select value={formData.student_id} onValueChange={(value) => setFormData({ ...formData, student_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select student" />
              </SelectTrigger>
              <SelectContent>
                {dropdownData.students.map((student: { id: string; name: string }) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="service_id">Service</Label>
            <Select value={formData.service_id} onValueChange={(value) => setFormData({ ...formData, service_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select service" />
              </SelectTrigger>
              <SelectContent>
                {dropdownData.services.map((service: { id: string; name: string }) => (
                  <SelectItem key={service.id} value={service.id}>
                    {service.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location_id">Location</Label>
            <Select value={formData.location_id} onValueChange={(value) => setFormData({ ...formData, location_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                {dropdownData.locations.map((location: { id: string; name: string }) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="start_time">Start Time *</Label>
            <Input
              id="start_time"
              type="datetime-local"
              value={formData.start_time}
              onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="end_time">End Time *</Label>
            <Input
              id="end_time"
              type="datetime-local"
              value={formData.end_time}
              onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
              required
            />
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                Updating...
              </>
            ) : (
              'Update Lesson'
            )}
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
