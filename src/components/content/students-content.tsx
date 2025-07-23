"use client"

import * as React from "react"
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
  IconSchool,
  IconCalendar,
  IconSearch,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export const studentSchema = z.object({
  id: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  school: z.string().nullable(),
  subjects: z.array(z.string()).nullable(),
  grade_year: z.string().nullable(),
  start_date: z.string().nullable(),
  created_at: z.string(),
  parent_name: z.string().optional(),
})

export const parentSchema = z.object({
  id: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  created_at: z.string(),
  student_count: z.number().optional(),
})

type Student = z.infer<typeof studentSchema>
type Parent = z.infer<typeof parentSchema>

export function StudentsContent() {
  return (
    <div className="space-y-8">
      <Tabs defaultValue="students" className="w-full">
        <TabsList className="mt-4 grid w-full grid-cols-2 ">
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="parents">Parents</TabsTrigger>
        </TabsList>
        <TabsContent value="students" className="space-y-4">
          <StudentsDataTable />
        </TabsContent>
        <TabsContent value="parents" className="space-y-4">
          <ParentsDataTable />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Add Student Form Schema
const addStudentSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  school: z.string().optional(),
  grade_year: z.string().optional(),
  parent_email: z.string().email("Valid parent email is required"),
  parent_first_name: z.string().min(1, "Parent first name is required"),
  parent_last_name: z.string().min(1, "Parent last name is required"),
  parent_phone: z.string().optional(),
})

type AddStudentFormData = z.infer<typeof addStudentSchema>

export function AddStudentContent() {
  const [isLoading, setIsLoading] = React.useState(false)
  const [formData, setFormData] = React.useState<AddStudentFormData>({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    school: "",
    grade_year: "",
    parent_email: "",
    parent_first_name: "",
    parent_last_name: "",
    parent_phone: "",
  })
  const [errors, setErrors] = React.useState<Partial<AddStudentFormData>>({})

  const handleInputChange = (field: keyof AddStudentFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const validateForm = (): boolean => {
    try {
      addStudentSchema.parse(formData)
      setErrors({})
      return true
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Partial<AddStudentFormData> = {}
        error.issues.forEach((err: z.ZodIssue) => {
          if (err.path[0]) {
            newErrors[err.path[0] as keyof AddStudentFormData] = err.message
          }
        })
        setErrors(newErrors)
      }
      return false
    }
  }

  const createStudentAndParent = async () => {
    if (!validateForm()) {
      toast.error("Please fix the form errors before submitting")
      return
    }

    setIsLoading(true)
    try {
      // Get current user for workspace_id
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) {
        toast.error("You must be logged in to add students")
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

      // 1. Create or get parent
      let parentId: string
      
      // Check if parent already exists
      const { data: existingParent } = await supabase
        .from('parents')
        .select('id')
        .eq('email', formData.parent_email)
        .eq('workspace_id', workspace_id)
        .single()

      if (existingParent) {
        parentId = existingParent.id
        toast.info("Using existing parent account")
      } else {
        // Create new parent
        const { data: newParent, error: parentError } = await supabase
          .from('parents')
          .insert({
            first_name: formData.parent_first_name,
            last_name: formData.parent_last_name,
            email: formData.parent_email,
            phone: formData.parent_phone || null,
            workspace_id,
          })
          .select('id')
          .single()

        if (parentError || !newParent) {
          console.error('Parent creation error:', parentError)
          toast.error("Failed to create parent account")
          return
        }

        parentId = newParent.id

        // Note: app_users entry will be created when parent signs up
        // The signup process will match their email to assign the correct role
      }

      // 2. Create student record
      const { data: newStudent, error: studentError } = await supabase
        .from('students')
        .insert({
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          phone: formData.phone || null,
          school: formData.school || null,
          grade_year: formData.grade_year || null,
          parent_id: parentId,
          workspace_id,
          start_date: new Date().toISOString().split('T')[0],
        })
        .select('id')
        .single()

      if (studentError || !newStudent) {
        console.error('Student creation error:', studentError)
        toast.error("Failed to create student account")
        return
      }

      // 3. Send invitations to both student and parent
      const invitationPromises = []
      
      // Invite student
      invitationPromises.push(
        fetch('/api/invite-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: formData.email,
            role: 'student',
            first_name: formData.first_name,
            last_name: formData.last_name,
            workspace_id,
            student_id: newStudent.id,
          }),
        })
      )

      // Always invite parent (API will handle existing users gracefully)
      invitationPromises.push(
        fetch('/api/invite-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: formData.parent_email,
            role: 'parent',
            first_name: formData.parent_first_name,
            last_name: formData.parent_last_name,
            workspace_id,
            parent_id: parentId,
          }),
        })
      )

      // Wait for all invitations to complete
      try {
        const invitationResults = await Promise.allSettled(invitationPromises)
        
        let successCount = 0
        let warnings = []
        
        for (const result of invitationResults) {
          if (result.status === 'fulfilled' && result.value.ok) {
            const data = await result.value.json()
            if (data.success) {
              successCount++
            }
            if (data.warning) {
              warnings.push(data.warning)
            }
          } else {
            warnings.push('Failed to send one or more invitations')
          }
        }
        
        if (successCount > 0) {
          toast.success(`Student and parent accounts created! ${successCount} invitation(s) sent successfully.`)
        }
        
        if (warnings.length > 0) {
          toast.warning(warnings[0]) // Show first warning
        }
        
      } catch (inviteError) {
        console.error('Invitation error:', inviteError)
        toast.warning("Accounts created but invitation emails failed to send")
      }

      // Reset form
      setFormData({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        school: "",
        grade_year: "",
        parent_email: "",
        parent_first_name: "",
        parent_last_name: "",
        parent_phone: "",
      })

      toast.success("Student successfully added to the system!")

    } catch (error) {
      console.error('Unexpected error:', error)
      toast.error("An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex-1 p-6">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconUser className="h-5 w-5" />
            Add New Student
          </CardTitle>
          <CardDescription>
            Create a new student account and parent record, then send invitation emails to both.
            They will receive emails with instructions to set up their passwords and access the platform.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Student Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <IconSchool className="h-4 w-4" />
              Student Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name *</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => handleInputChange('first_name', e.target.value)}
                  placeholder="Enter first name"
                  className={errors.first_name ? "border-red-500" : ""}
                />
                {errors.first_name && (
                  <p className="text-sm text-red-500">{errors.first_name}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name *</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => handleInputChange('last_name', e.target.value)}
                  placeholder="Enter last name"
                  className={errors.last_name ? "border-red-500" : ""}
                />
                {errors.last_name && (
                  <p className="text-sm text-red-500">{errors.last_name}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="student@example.com"
                  className={errors.email ? "border-red-500" : ""}
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="school">School</Label>
                <Input
                  id="school"
                  value={formData.school}
                  onChange={(e) => handleInputChange('school', e.target.value)}
                  placeholder="Enter school name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="grade_year">Grade/Year</Label>
                <Select value={formData.grade_year} onValueChange={(value) => handleInputChange('grade_year', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="K">Kindergarten</SelectItem>
                    <SelectItem value="1">1st Grade</SelectItem>
                    <SelectItem value="2">2nd Grade</SelectItem>
                    <SelectItem value="3">3rd Grade</SelectItem>
                    <SelectItem value="4">4th Grade</SelectItem>
                    <SelectItem value="5">5th Grade</SelectItem>
                    <SelectItem value="6">6th Grade</SelectItem>
                    <SelectItem value="7">7th Grade</SelectItem>
                    <SelectItem value="8">8th Grade</SelectItem>
                    <SelectItem value="9">9th Grade</SelectItem>
                    <SelectItem value="10">10th Grade</SelectItem>
                    <SelectItem value="11">11th Grade</SelectItem>
                    <SelectItem value="12">12th Grade</SelectItem>
                    <SelectItem value="College Freshman">College Freshman</SelectItem>
                    <SelectItem value="College Sophomore">College Sophomore</SelectItem>
                    <SelectItem value="College Junior">College Junior</SelectItem>
                    <SelectItem value="College Senior">College Senior</SelectItem>
                    <SelectItem value="Graduate">Graduate Student</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Parent Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <IconUser className="h-4 w-4" />
              Parent/Guardian Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="parent_first_name">Parent First Name *</Label>
                <Input
                  id="parent_first_name"
                  value={formData.parent_first_name}
                  onChange={(e) => handleInputChange('parent_first_name', e.target.value)}
                  placeholder="Enter parent first name"
                  className={errors.parent_first_name ? "border-red-500" : ""}
                />
                {errors.parent_first_name && (
                  <p className="text-sm text-red-500">{errors.parent_first_name}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="parent_last_name">Parent Last Name *</Label>
                <Input
                  id="parent_last_name"
                  value={formData.parent_last_name}
                  onChange={(e) => handleInputChange('parent_last_name', e.target.value)}
                  placeholder="Enter parent last name"
                  className={errors.parent_last_name ? "border-red-500" : ""}
                />
                {errors.parent_last_name && (
                  <p className="text-sm text-red-500">{errors.parent_last_name}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="parent_email">Parent Email *</Label>
                <Input
                  id="parent_email"
                  type="email"
                  value={formData.parent_email}
                  onChange={(e) => handleInputChange('parent_email', e.target.value)}
                  placeholder="parent@example.com"
                  className={errors.parent_email ? "border-red-500" : ""}
                />
                {errors.parent_email && (
                  <p className="text-sm text-red-500">{errors.parent_email}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="parent_phone">Parent Phone</Label>
                <Input
                  id="parent_phone"
                  value={formData.parent_phone}
                  onChange={(e) => handleInputChange('parent_phone', e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4 pt-6 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setFormData({
                  first_name: "",
                  last_name: "",
                  email: "",
                  phone: "",
                  school: "",
                  grade_year: "",
                  parent_email: "",
                  parent_first_name: "",
                  parent_last_name: "",
                  parent_phone: "",
                })
                setErrors({})
              }}
              disabled={isLoading}
            >
              Clear Form
            </Button>
            <Button
              onClick={createStudentAndParent}
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
                  Create Student
                </div>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StudentDrawer({ student, onStudentUpdate }: { student: Student; onStudentUpdate?: (updatedStudent: Student) => void }) {
  const isMobile = useIsMobile()
  const [isLoading, setIsLoading] = React.useState(false)
  const [isOpen, setIsOpen] = React.useState(false)
  
  // Form state
  const [formData, setFormData] = React.useState({
    first_name: student.first_name,
    last_name: student.last_name,
    email: student.email || '',
    phone: student.phone || '',
    school: student.school || '',
    grade_year: student.grade_year || '',
    start_date: student.start_date ? new Date(student.start_date).toISOString().slice(0, 10) : '',
  })

  const handleSave = async () => {
    setIsLoading(true)
    
    try {
      console.log('Attempting to update student:', {
        studentId: student.id,
        updateData: formData
      })
      
      const { data, error } = await supabase
        .from('students')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email || null,
          phone: formData.phone || null,
          school: formData.school || null,
          grade_year: formData.grade_year || null,
          start_date: formData.start_date || null,
        })
        .eq('id', student.id)
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

      // Create updated student object
      const updatedStudent: Student = {
        ...student,
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email || null,
        phone: formData.phone || null,
        school: formData.school || null,
        grade_year: formData.grade_year || null,
        start_date: formData.start_date || null,
      }

      // Call the callback to update the parent component
      onStudentUpdate?.(updatedStudent)
      
      toast.success('Student updated successfully!')
      setIsOpen(false)
      
    } catch (error: any) {
      console.error('Error updating student:', {
        error,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
        studentId: student.id
      })
      
      const errorMessage = error?.message || 'Failed to update student. Please try again.'
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
          {student.first_name} {student.last_name}
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="gap-1">
          <DrawerTitle>{formData.first_name} {formData.last_name}</DrawerTitle>
          <DrawerDescription>
            {formData.school && `${formData.school} • `}
            {formData.grade_year && `Grade ${formData.grade_year}`}
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col gap-4 overflow-y-auto px-4 text-sm">
          {!isMobile && (
            <>
              <div className="grid gap-2">
                <div className="flex gap-2 leading-none font-medium items-center">
                  <IconUser className="size-4" />
                  Student: {formData.first_name} {formData.last_name}
                </div>
                {formData.email && (
                  <div className="text-muted-foreground flex items-center gap-2">
                    <IconMail className="size-4" />
                    {formData.email}
                  </div>
                )}
                {formData.phone && (
                  <div className="text-muted-foreground flex items-center gap-2">
                    <IconPhone className="size-4" />
                    {formData.phone}
                  </div>
                )}
              </div>
              <Separator />
            </>
          )}
          <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-3">
                <Label htmlFor="first-name">First Name</Label>
                <Input 
                  id="first-name" 
                  value={formData.first_name}
                  onChange={(e) => handleInputChange('first_name', e.target.value)}
                  placeholder="Enter first name"
                  required
                />
              </div>
              <div className="flex flex-col gap-3">
                <Label htmlFor="last-name">Last Name</Label>
                <Input 
                  id="last-name" 
                  value={formData.last_name}
                  onChange={(e) => handleInputChange('last_name', e.target.value)}
                  placeholder="Enter last name"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-3">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="Enter email address"
                />
              </div>
              <div className="flex flex-col gap-3">
                <Label htmlFor="phone">Phone</Label>
                <Input 
                  id="phone" 
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="Enter phone number"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-3">
                <Label htmlFor="school">School</Label>
                <Input 
                  id="school" 
                  value={formData.school}
                  onChange={(e) => handleInputChange('school', e.target.value)}
                  placeholder="Enter school name"
                />
              </div>
              <div className="flex flex-col gap-3">
                <Label htmlFor="grade">Grade Year</Label>
                <Select 
                  value={formData.grade_year} 
                  onValueChange={(value) => handleInputChange('grade_year', value)}
                >
                  <SelectTrigger id="grade" className="w-full">
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="K">Kindergarten</SelectItem>
                    <SelectItem value="1">1st Grade</SelectItem>
                    <SelectItem value="2">2nd Grade</SelectItem>
                    <SelectItem value="3">3rd Grade</SelectItem>
                    <SelectItem value="4">4th Grade</SelectItem>
                    <SelectItem value="5">5th Grade</SelectItem>
                    <SelectItem value="6">6th Grade</SelectItem>
                    <SelectItem value="7">7th Grade</SelectItem>
                    <SelectItem value="8">8th Grade</SelectItem>
                    <SelectItem value="9">9th Grade</SelectItem>
                    <SelectItem value="10">10th Grade</SelectItem>
                    <SelectItem value="11">11th Grade</SelectItem>
                    <SelectItem value="12">12th Grade</SelectItem>
                    <SelectItem value="College">College</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <Label htmlFor="start-date">Start Date</Label>
              <Input 
                id="start-date" 
                type="date" 
                value={formData.start_date}
                onChange={(e) => handleInputChange('start_date', e.target.value)}
              />
            </div>
          </form>
        </div>
        <DrawerFooter>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
          <DrawerClose asChild>
            <Button variant="outline" disabled={isLoading}>Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

const columns: ColumnDef<Student>[] = [
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
    accessorKey: "name",
    header: "Name",
    cell: ({ row, table }) => {
      return (
        <StudentDrawer 
          student={row.original} 
          onStudentUpdate={(updatedStudent) => {
            // Update the table data when student is updated
            const meta = table.options.meta as any
            meta?.updateData?.(row.index, updatedStudent)
          }}
        />
      )
    },
    enableHiding: false,
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        {row.original.email ? (
          <>
            <IconMail className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">{row.original.email}</span>
          </>
        ) : (
          <span className="text-muted-foreground text-sm">No email</span>
        )}
      </div>
    ),
  },
  {
    accessorKey: "phone",
    header: "Phone",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        {row.original.phone ? (
          <>
            <IconPhone className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">{row.original.phone}</span>
          </>
        ) : (
          <span className="text-muted-foreground text-sm">No phone</span>
        )}
      </div>
    ),
  },
  {
    accessorKey: "school",
    header: "School",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        {row.original.school ? (
          <>
            <IconSchool className="w-4 h-4 text-muted-foreground" />
            <Badge variant="outline" className="text-muted-foreground px-1.5">
              {row.original.school}
            </Badge>
          </>
        ) : (
          <span className="text-muted-foreground text-sm">No school</span>
        )}
      </div>
    ),
  },
  {
    accessorKey: "grade_year",
    header: "Grade",
    cell: ({ row }) => (
      row.original.grade_year ? (
        <Badge variant="secondary">
          {row.original.grade_year === 'K' ? 'Kindergarten' : `Grade ${row.original.grade_year}`}
        </Badge>
      ) : (
        <span className="text-muted-foreground text-sm">No grade</span>
      )
    ),
  },
  {
    accessorKey: "start_date",
    header: "Start Date",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        {row.original.start_date ? (
          <>
            <IconCalendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">
              {new Date(row.original.start_date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </>
        ) : (
          <span className="text-muted-foreground text-sm">No start date</span>
        )}
      </div>
    ),
  },
  {
    accessorKey: "parent_name",
    header: "Parent",
    cell: ({ row }) => (
      row.original.parent_name ? (
        <span className="text-sm">{row.original.parent_name}</span>
      ) : (
        <span className="text-muted-foreground text-sm">No parent assigned</span>
      )
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
          <DropdownMenuItem>View Lessons</DropdownMenuItem>
          <DropdownMenuItem>Contact Parent</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive">Archive</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
]

function StudentsDataTable() {
  const [tableData, setTableData] = React.useState<Student[]>([])
  const [loading, setLoading] = React.useState(true)
  const [rowSelection, setRowSelection] = React.useState({})
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [sorting, setSorting] = React.useState<SortingState>([{ id: "name", desc: false }])
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 })
  const [globalFilter, setGlobalFilter] = React.useState("")

  // Function to update a specific student in the table
  const updateStudentData = React.useCallback((index: number, updatedStudent: Student) => {
    setTableData(prev => {
      const newData = [...prev]
      newData[index] = updatedStudent
      return newData
    })
  }, [])

  // Fetch students data
  React.useEffect(() => {
    async function fetchStudents() {
      try {
        setLoading(true)
        
        // TODO: Get workspace_id from user context - using hardcoded for now
        const workspaceId = '260d9ad8-7aed-4b2e-a192-f96ad9ab3115'
        
        const { data: studentsData, error } = await supabase
          .from('students')
          .select(`
            id,
            first_name,
            last_name,
            email,
            phone,
            school,
            subjects,
            grade_year,
            start_date,
            created_at,
            parents(first_name, last_name)
          `)
          .eq('workspace_id', workspaceId)
          .order('created_at', { ascending: false })
        
        if (error) {
          console.error('Error fetching students:', error)
          toast.error('Failed to load students')
          return
        }

        // Transform data to match our schema
        const transformedData: Student[] = studentsData?.map((student: any) => ({
          id: student.id,
          first_name: student.first_name,
          last_name: student.last_name,
          email: student.email,
          phone: student.phone,
          school: student.school,
          subjects: student.subjects,
          grade_year: student.grade_year,
          start_date: student.start_date,
          created_at: student.created_at,
          parent_name: student.parents ? `${student.parents.first_name} ${student.parents.last_name}` : undefined,
        })) || []

        setTableData(transformedData)
        
      } catch (err) {
        console.error('Error fetching students:', err)
        toast.error('Failed to load students')
      } finally {
        setLoading(false)
      }
    }

    fetchStudents()
  }, [])

  const table = useReactTable({
    data: tableData,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination,
      globalFilter,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    meta: {
      updateData: updateStudentData,
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
            {[...Array(8)].map((_, i) => (
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
        <CardTitle>All Students</CardTitle>
        <CardDescription>
          Manage student information and track their progress
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="relative">
              <IconSearch className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-8 w-64"
              />
            </div>
          </div>
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
              <span className="hidden lg:inline">Add Student</span>
            </Button>
          </div>
        </div>
        
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
                    No students found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        
        <div className="flex items-center justify-between px-4 mt-4">
          <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
            {table.getFilteredSelectedRowModel().rows.length} of{" "}
            {table.getFilteredRowModel().rows.length} student(s) selected.
          </div>
          <div className="flex w-full items-center gap-8 lg:w-auto">
            <div className="flex items-center gap-2">
              <p className="whitespace-nowrap text-sm font-medium">
                Rows per page
              </p>
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
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="hidden size-8 p-0 lg:flex"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Go to first page</span>
                <IconChevronsLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                className="size-8 p-0"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Go to previous page</span>
                <IconChevronLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                className="size-8 p-0"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Go to next page</span>
                <IconChevronRight className="size-4" />
              </Button>
              <Button
                variant="outline"
                className="hidden size-8 p-0 lg:flex"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Go to last page</span>
                <IconChevronsRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Parent Drawer Component
function ParentDrawer({ parent, onParentUpdate }: { parent: Parent; onParentUpdate?: (updatedParent: Parent) => void }) {
  const isMobile = useIsMobile()
  const [isLoading, setIsLoading] = React.useState(false)
  const [isOpen, setIsOpen] = React.useState(false)
  
  // Form state
  const [formData, setFormData] = React.useState({
    first_name: parent.first_name,
    last_name: parent.last_name,
    email: parent.email,
    phone: parent.phone || '',
  })

  const handleSave = async () => {
    setIsLoading(true)
    
    try {
      console.log('Attempting to update parent:', {
        parentId: parent.id,
        updateData: formData
      })
      
      const { data, error } = await supabase
        .from('parents')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          phone: formData.phone || null,
        })
        .eq('id', parent.id)
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

      // Create updated parent object
      const updatedParent: Parent = {
        ...parent,
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone || null,
      }

      // Call the callback to update the parent component
      onParentUpdate?.(updatedParent)
      
      toast.success('Parent updated successfully!')
      setIsOpen(false)
      
    } catch (error: any) {
      console.error('Error updating parent:', {
        error,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
        parentId: parent.id
      })
      
      const errorMessage = error?.message || 'Failed to update parent. Please try again.'
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
          {parent.first_name} {parent.last_name}
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="gap-1">
          <DrawerTitle>{formData.first_name} {formData.last_name}</DrawerTitle>
          <DrawerDescription>
            Parent • {parent.student_count || 0} student{(parent.student_count || 0) !== 1 ? 's' : ''}
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col gap-4 overflow-y-auto px-4 text-sm">
          {!isMobile && (
            <>
              <div className="grid gap-2">
                <div className="flex gap-2 leading-none font-medium items-center">
                  <IconUser className="size-4" />
                  Parent: {formData.first_name} {formData.last_name}
                </div>
                <div className="text-muted-foreground flex items-center gap-2">
                  <IconMail className="size-4" />
                  {formData.email}
                </div>
                {formData.phone && (
                  <div className="text-muted-foreground flex items-center gap-2">
                    <IconPhone className="size-4" />
                    {formData.phone}
                  </div>
                )}
              </div>
              <Separator />
            </>
          )}
          <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-3">
                <Label htmlFor="parent-first-name">First Name</Label>
                <Input 
                  id="parent-first-name" 
                  value={formData.first_name}
                  onChange={(e) => handleInputChange('first_name', e.target.value)}
                  placeholder="Enter first name"
                  required
                />
              </div>
              <div className="flex flex-col gap-3">
                <Label htmlFor="parent-last-name">Last Name</Label>
                <Input 
                  id="parent-last-name" 
                  value={formData.last_name}
                  onChange={(e) => handleInputChange('last_name', e.target.value)}
                  placeholder="Enter last name"
                  required
                />
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <Label htmlFor="parent-email">Email</Label>
              <Input 
                id="parent-email" 
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="Enter email address"
                required
              />
            </div>
            <div className="flex flex-col gap-3">
              <Label htmlFor="parent-phone">Phone</Label>
              <Input 
                id="parent-phone" 
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="Enter phone number"
              />
            </div>
          </form>
        </div>
        <DrawerFooter>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
          <DrawerClose asChild>
            <Button variant="outline" disabled={isLoading}>Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

// Parent Table Columns
const parentColumns: ColumnDef<Parent>[] = [
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
    accessorKey: "name",
    header: "Name",
    cell: ({ row, table }) => {
      return (
        <ParentDrawer 
          parent={row.original} 
          onParentUpdate={(updatedParent) => {
            // Update the table data when parent is updated
            const meta = table.options.meta as any
            meta?.updateData?.(row.index, updatedParent)
          }}
        />
      )
    },
    enableHiding: false,
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <IconMail className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm">{row.original.email}</span>
      </div>
    ),
  },
  {
    accessorKey: "phone",
    header: "Phone",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        {row.original.phone ? (
          <>
            <IconPhone className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">{row.original.phone}</span>
          </>
        ) : (
          <span className="text-muted-foreground text-sm">No phone</span>
        )}
      </div>
    ),
  },
  {
    accessorKey: "student_count",
    header: "Students",
    cell: ({ row }) => (
      <Badge variant="secondary">
        {row.original.student_count || 0} student{(row.original.student_count || 0) !== 1 ? 's' : ''}
      </Badge>
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
          <DropdownMenuItem>View Students</DropdownMenuItem>
          <DropdownMenuItem>Send Message</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive">Archive</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
]

// Parents Data Table Component
function ParentsDataTable() {
  const [tableData, setTableData] = React.useState<Parent[]>([])
  const [loading, setLoading] = React.useState(true)
  const [rowSelection, setRowSelection] = React.useState({})
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [sorting, setSorting] = React.useState<SortingState>([{ id: "name", desc: false }])
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 })
  const [globalFilter, setGlobalFilter] = React.useState("")

  // Function to update a specific parent in the table
  const updateParentData = React.useCallback((index: number, updatedParent: Parent) => {
    setTableData(prev => {
      const newData = [...prev]
      newData[index] = updatedParent
      return newData
    })
  }, [])

  // Fetch parents data
  React.useEffect(() => {
    async function fetchParents() {
      try {
        setLoading(true)
        
        // TODO: Get workspace_id from user context - using hardcoded for now
        const workspaceId = '260d9ad8-7aed-4b2e-a192-f96ad9ab3115'
        
        const { data: parentsData, error } = await supabase
          .from('parents')
          .select(`
            id,
            first_name,
            last_name,
            email,
            phone,
            created_at,
            students(id)
          `)
          .eq('workspace_id', workspaceId)
          .order('created_at', { ascending: false })
        
        if (error) {
          console.error('Error fetching parents:', error)
          toast.error('Failed to load parents')
          return
        }

        // Transform data to match our schema
        const transformedData: Parent[] = parentsData?.map((parent: any) => ({
          id: parent.id,
          first_name: parent.first_name,
          last_name: parent.last_name,
          email: parent.email,
          phone: parent.phone,
          created_at: parent.created_at,
          student_count: parent.students?.length || 0,
        })) || []

        setTableData(transformedData)
        
      } catch (err) {
        console.error('Error fetching parents:', err)
        toast.error('Failed to load parents')
      } finally {
        setLoading(false)
      }
    }

    fetchParents()
  }, [])

  const table = useReactTable({
    data: tableData,
    columns: parentColumns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination,
      globalFilter,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    meta: {
      updateData: updateParentData,
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
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex space-x-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
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
        <CardTitle>All Parents</CardTitle>
        <CardDescription>
          Manage parent information and contact details
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="relative">
              <IconSearch className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search parents..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-8 w-64"
              />
            </div>
          </div>
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
              <span className="hidden lg:inline">Add Parent</span>
            </Button>
          </div>
        </div>
        
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
                    colSpan={parentColumns.length}
                    className="h-24 text-center"
                  >
                    No parents found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        
        <div className="flex items-center justify-between px-4 mt-4">
          <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
            {table.getFilteredSelectedRowModel().rows.length} of{" "}
            {table.getFilteredRowModel().rows.length} parent(s) selected.
          </div>
          <div className="flex w-full items-center gap-8 lg:w-auto">
            <div className="flex items-center gap-2">
              <p className="whitespace-nowrap text-sm font-medium">
                Rows per page
              </p>
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
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="hidden size-8 p-0 lg:flex"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Go to first page</span>
                <IconChevronsLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                className="size-8 p-0"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Go to previous page</span>
                <IconChevronLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                className="size-8 p-0"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Go to next page</span>
                <IconChevronRight className="size-4" />
              </Button>
              <Button
                variant="outline"
                className="hidden size-8 p-0 lg:flex"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Go to last page</span>
                <IconChevronsRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
