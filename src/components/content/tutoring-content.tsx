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
import { useForm } from "react-hook-form";

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

export function ServicesContent() {
  return (
    <div className="min-h-[100vh] flex-1 rounded-xl border-2 border-dashed border-muted-foreground/25 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-muted-foreground mb-2">Welcome to Services</h1>
        <p className="text-muted-foreground">Services management will be displayed here</p>
      </div>
    </div>
  )
}

export function LessonsContent() {
  return (
    <div className="min-h-[100vh] flex-1 rounded-xl border-2 border-dashed border-muted-foreground/25 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-muted-foreground mb-2">Welcome to Lessons</h1>
        <p className="text-muted-foreground">Lessons management will be displayed here</p>
      </div>
    </div>
  )
}
