"use client"

import * as React from "react"
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { EventClickArg, EventInput } from '@fullcalendar/core'
import { supabase } from '@/lib/supabase'
import { toast } from "sonner"
import {
  IconCalendar,
  IconClock,
  IconUser,
  IconFilter,
  IconX,
  IconPlus,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/contexts/auth-context"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

// Lesson type based on the existing schema
interface Lesson {
  id: string
  title: string
  description?: string
  tutor_id: string
  student_id: string
  service_id?: string
  location_id?: string
  start_time: string
  end_time: string
  status: 'scheduled' | 'completed' | 'canceled'
  tutor_name?: string
  student_name?: string
  service_name?: string
  location_name?: string
}

interface CalendarFilters {
  tutor: string
  student: string
  service: string
  status: string
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
  status: z.enum(["scheduled", "completed", "canceled"]).optional().default("scheduled"),
})

type AddLessonFormData = z.infer<typeof addLessonSchema>

// CreateLessonDrawer Component
interface CreateLessonDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedTimeSlot: {start: string, end: string} | null
  tutors: {id: string, name: string}[]
  students: {id: string, name: string}[]
  services: {id: string, name: string}[]
  locations: {id: string, name: string}[]
  onLessonCreated: () => void
}

function CreateLessonDrawer({ 
  open, 
  onOpenChange, 
  selectedTimeSlot, 
  tutors, 
  students, 
  services, 
  locations, 
  onLessonCreated 
}: CreateLessonDrawerProps) {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = React.useState(false)
  
  const { register, handleSubmit, formState: { errors }, reset, control, setValue } = useForm<AddLessonFormData>({
    resolver: zodResolver(addLessonSchema),
    defaultValues: {
      status: 'scheduled'
    }
  })
  
  // Set form values when time slot is selected
  React.useEffect(() => {
    if (selectedTimeSlot) {
      setValue('start_time', selectedTimeSlot.start)
      setValue('end_time', selectedTimeSlot.end)
    }
  }, [selectedTimeSlot, setValue])
  
  // Reset form when drawer closes
  React.useEffect(() => {
    if (!open) {
      reset()
    }
  }, [open, reset])
  
  const createLesson = async (data: AddLessonFormData) => {
    if (!user?.user_metadata?.workspace_id) {
      toast.error('Workspace not found')
      return
    }
    
    setIsLoading(true)
    
    try {
      // Convert "none" values to null for optional fields
      const lessonData = {
        ...data,
        service_id: data.service_id === 'none' ? null : data.service_id,
        location_id: data.location_id === 'none' ? null : data.location_id,
        workspace_id: user.user_metadata.workspace_id,
      }
      
      const { error } = await supabase
        .from('lessons')
        .insert(lessonData)
      
      if (error) throw error
      
      toast.success('Lesson created successfully!')
      onLessonCreated()
      reset()
    } catch (error) {
      console.error('Error creating lesson:', error)
      toast.error('Failed to create lesson')
    } finally {
      setIsLoading(false)
    }
  }
  
  const formatDateTimeLocal = (isoString: string) => {
    const date = new Date(isoString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Create New Lesson</SheetTitle>
          <SheetDescription>
            {selectedTimeSlot ? 
              `Creating lesson for ${new Date(selectedTimeSlot.start).toLocaleString()} - ${new Date(selectedTimeSlot.end).toLocaleString()}` :
              'Fill out the form below to create a new lesson.'
            }
          </SheetDescription>
        </SheetHeader>
        
        <form onSubmit={handleSubmit(createLesson)} className="space-y-6 mt-6">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              {...register('title')}
              placeholder="Enter lesson title"
            />
            {errors.title && (
              <p className="text-sm text-red-500">{errors.title.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Enter lesson description (optional)"
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
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
                      {tutors.map((tutor) => (
                        <SelectItem key={tutor.id} value={tutor.id}>
                          {tutor.name}
                        </SelectItem>
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
                      {students.map((student) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.name}
                        </SelectItem>
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
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="service_id">Service</Label>
              <Controller
                name="service_id"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select service" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No service</SelectItem>
                      {services.map((service) => (
                        <SelectItem key={service.id} value={service.id}>
                          {service.name}
                        </SelectItem>
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
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No location</SelectItem>
                      {locations.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_time">Start Time *</Label>
              <Input
                id="start_time"
                type="datetime-local"
                {...register('start_time')}
                value={selectedTimeSlot ? formatDateTimeLocal(selectedTimeSlot.start) : ''}
                onChange={(e) => setValue('start_time', new Date(e.target.value).toISOString())}
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
                value={selectedTimeSlot ? formatDateTimeLocal(selectedTimeSlot.end) : ''}
                onChange={(e) => setValue('end_time', new Date(e.target.value).toISOString())}
              />
              {errors.end_time && (
                <p className="text-sm text-red-500">{errors.end_time.message}</p>
              )}
            </div>
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
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="canceled">Canceled</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Lesson'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}

export function CalendarContent() {
  const { user } = useAuth()
  const [lessons, setLessons] = React.useState<Lesson[]>([])
  const [loading, setLoading] = React.useState(true)
  const [selectedLesson, setSelectedLesson] = React.useState<Lesson | null>(null)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [createDrawerOpen, setCreateDrawerOpen] = React.useState(false)
  const [selectedTimeSlot, setSelectedTimeSlot] = React.useState<{start: string, end: string} | null>(null)
  const [currentView, setCurrentView] = React.useState('dayGridMonth')
  const [filters, setFilters] = React.useState<CalendarFilters>({
    tutor: 'all',
    student: 'all',
    service: 'all',
    status: 'all'
  })
  
  // Filter options
  const [tutors, setTutors] = React.useState<{id: string, name: string}[]>([])
  const [students, setStudents] = React.useState<{id: string, name: string}[]>([])
  const [services, setServices] = React.useState<{id: string, name: string}[]>([])
  const [locations, setLocations] = React.useState<{id: string, name: string}[]>([])
  
  const calendarRef = React.useRef<FullCalendar>(null)

  // Fetch lessons and filter options
  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true)
      
      // Get workspace_id from user context
      const workspaceId = user?.user_metadata?.workspace_id || '260d9ad8-7aed-4b2e-a192-f96ad9ab3115'
      
      // Fetch lessons with joins
      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons')
        .select(`
          *,
          tutor:employees!lessons_tutor_id_fkey(first_name, last_name),
          student:students!lessons_student_id_fkey(first_name, last_name),
          service:services!lessons_service_id_fkey(name),
          location:locations!lessons_location_id_fkey(name)
        `)
        .eq('workspace_id', workspaceId)
        .order('start_time', { ascending: true })
      
      if (lessonsError) {
        console.error('Error fetching lessons:', lessonsError)
        toast.error('Failed to load lessons')
        return
      }
      
      // Transform lessons data
      const transformedLessons: Lesson[] = (lessonsData || []).map(lesson => ({
        ...lesson,
        tutor_name: lesson.tutor ? `${lesson.tutor.first_name} ${lesson.tutor.last_name}` : undefined,
        student_name: lesson.student ? `${lesson.student.first_name} ${lesson.student.last_name}` : undefined,
        service_name: lesson.service?.name,
        location_name: lesson.location?.name
      }))
      
      setLessons(transformedLessons)
      
      // Extract unique filter options using Map to deduplicate by ID
      const tutorMap = new Map<string, {id: string, name: string}>()
      transformedLessons
        .filter(l => l.tutor_name && l.tutor_id)
        .forEach(l => {
          tutorMap.set(l.tutor_id, { id: l.tutor_id, name: l.tutor_name! })
        })
      const uniqueTutors = Array.from(tutorMap.values())
      
      const studentMap = new Map<string, {id: string, name: string}>()
      transformedLessons
        .filter(l => l.student_name && l.student_id)
        .forEach(l => {
          studentMap.set(l.student_id, { id: l.student_id, name: l.student_name! })
        })
      const uniqueStudents = Array.from(studentMap.values())
      
      const serviceMap = new Map<string, {id: string, name: string}>()
      transformedLessons
        .filter(l => l.service_name && l.service_id)
        .forEach(l => {
          serviceMap.set(l.service_id!, { id: l.service_id!, name: l.service_name! })
        })
      const uniqueServices = Array.from(serviceMap.values())
      
      // Also fetch locations for the form
      const { data: locationsData } = await supabase
        .from('locations')
        .select('id, name')
        .eq('workspace_id', workspaceId)
        .order('name')
      
      const locationOptions = (locationsData || []).map(loc => ({
        id: loc.id,
        name: loc.name
      }))
      
      setTutors(uniqueTutors)
      setStudents(uniqueStudents)
      setServices(uniqueServices)
      setLocations(locationOptions)
      
    } catch (error) {
      console.error('Error fetching calendar data:', error)
      toast.error('Failed to load calendar data')
    } finally {
      setLoading(false)
    }
  }, [user])
  
  React.useEffect(() => {
    fetchData()
  }, [fetchData])
  
  // Filter lessons based on current filters
  const filteredLessons = React.useMemo(() => {
    return lessons.filter(lesson => {
      if (filters.tutor !== 'all' && lesson.tutor_id !== filters.tutor) return false
      if (filters.student !== 'all' && lesson.student_id !== filters.student) return false
      if (filters.service !== 'all' && lesson.service_id !== filters.service) return false
      if (filters.status !== 'all' && lesson.status !== filters.status) return false
      return true
    })
  }, [lessons, filters])
  
  // Transform lessons to FullCalendar events
  const calendarEvents: EventInput[] = React.useMemo(() => {
    return filteredLessons.map(lesson => ({
      id: lesson.id,
      title: lesson.title,
      start: lesson.start_time,
      end: lesson.end_time,
      backgroundColor: getEventColor(lesson.status),
      borderColor: getEventColor(lesson.status),
      textColor: '#ffffff',
      extendedProps: {
        lesson
      }
    }))
  }, [filteredLessons])
  
  // Get event color based on status
  function getEventColor(status: string): string {
    switch (status) {
      case 'completed': return '#22c55e' // green
      case 'scheduled': return '#3b82f6' // blue
      case 'canceled': return '#ef4444' // red
      default: return '#6b7280' // gray
    }
  }
  
  // Handle event click
  const handleEventClick = (clickInfo: EventClickArg) => {
    const lesson = clickInfo.event.extendedProps.lesson as Lesson
    setSelectedLesson(lesson)
    setDialogOpen(true)
  }
  
  // Handle time selection (drag to create)
  const handleDateSelect = (selectInfo: any) => {
    const start = selectInfo.start.toISOString()
    const end = selectInfo.end.toISOString()
    
    setSelectedTimeSlot({ start, end })
    setCreateDrawerOpen(true)
  }
  
  // Custom toolbar buttons
  const customButtons = {
    todayCustom: {
      text: 'Today',
      click: () => {
        calendarRef.current?.getApi().today()
      }
    },
    prevCustom: {
      text: 'Previous',
      click: () => {
        calendarRef.current?.getApi().prev()
      }
    },
    nextCustom: {
      text: 'Next', 
      click: () => {
        calendarRef.current?.getApi().next()
      }
    }
  }
  
  // Handle view change
  const handleViewChange = (view: string) => {
    setCurrentView(view)
    calendarRef.current?.getApi().changeView(view)
  }
  
  // Clear all filters
  const clearFilters = () => {
    setFilters({
      tutor: 'all',
      student: 'all', 
      service: 'all',
      status: 'all'
    })
  }
  
  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Completed</Badge>
      case 'scheduled':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Scheduled</Badge>
      case 'canceled':
        return <Badge variant="destructive">Canceled</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading calendar...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min">
      <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:p-6">
        
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Calendar</h1>
              <p className="text-muted-foreground">Manage and view all lessons</p>
            </div>
            <Button onClick={() => setCreateDrawerOpen(true)}>
              <IconPlus className="h-4 w-4 mr-2" />
              Add Lesson
            </Button>
          </div>
          
          {/* Filters */}
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <Label className="text-xs text-muted-foreground whitespace-nowrap">Tutor</Label>
                    <Select value={filters.tutor} onValueChange={(value) => setFilters(prev => ({ ...prev, tutor: value }))}>
                      <SelectTrigger className="h-8 text-xs min-w-[120px]">
                        <SelectValue placeholder="All tutors" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All tutors</SelectItem>
                        {tutors.map(tutor => (
                          <SelectItem key={tutor.id} value={tutor.id}>{tutor.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center gap-2 min-w-0">
                    <Label className="text-xs text-muted-foreground whitespace-nowrap">Student</Label>
                    <Select value={filters.student} onValueChange={(value) => setFilters(prev => ({ ...prev, student: value }))}>
                      <SelectTrigger className="h-8 text-xs min-w-[120px]">
                        <SelectValue placeholder="All students" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All students</SelectItem>
                        {students.map(student => (
                          <SelectItem key={student.id} value={student.id}>{student.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center gap-2 min-w-0">
                    <Label className="text-xs text-muted-foreground whitespace-nowrap">Service</Label>
                    <Select value={filters.service} onValueChange={(value) => setFilters(prev => ({ ...prev, service: value }))}>
                      <SelectTrigger className="h-8 text-xs min-w-[120px]">
                        <SelectValue placeholder="All services" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All services</SelectItem>
                        {services.map(service => (
                          <SelectItem key={service.id} value={service.id}>{service.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center gap-2 min-w-0">
                    <Label className="text-xs text-muted-foreground whitespace-nowrap">Status</Label>
                    <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                      <SelectTrigger className="h-8 text-xs min-w-[120px]">
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="canceled">Canceled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 px-2 text-xs">
                  <IconX className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Calendar */}
        <Card className="flex-1">
          <CardContent className="p-0">
            {/* Custom Toolbar */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => calendarRef.current?.getApi().prev()}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" onClick={() => calendarRef.current?.getApi().today()}>
                  Today
                </Button>
                <Button variant="outline" size="sm" onClick={() => calendarRef.current?.getApi().next()}>
                  Next
                </Button>
              </div>
              
              <div className="flex items-center gap-2">
                <Button 
                  variant={currentView === 'dayGridMonth' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => handleViewChange('dayGridMonth')}
                >
                  Month
                </Button>
                <Button 
                  variant={currentView === 'timeGridWeek' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => handleViewChange('timeGridWeek')}
                >
                  Week
                </Button>
                <Button 
                  variant={currentView === 'timeGridDay' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => handleViewChange('timeGridDay')}
                >
                  Day
                </Button>
              </div>
            </div>
            
            {/* FullCalendar */}
            <div className="p-4">
              <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                headerToolbar={false} // We use custom toolbar
                events={calendarEvents}
                eventClick={handleEventClick}
                height="auto"
                customButtons={customButtons}
                eventDisplay="block"
                dayMaxEvents={3}
                moreLinkClick="popover"
                eventTimeFormat={{
                  hour: 'numeric',
                  minute: '2-digit',
                  meridiem: 'short'
                }}
                slotMinTime="06:00:00"
                slotMaxTime="22:00:00"
                allDaySlot={false}
                nowIndicator={true}
                selectable={true}
                selectMirror={true}
                weekends={true}
                select={handleDateSelect}
                businessHours={{
                  daysOfWeek: [1, 2, 3, 4, 5, 6], // Monday - Saturday
                  startTime: '08:00',
                  endTime: '20:00'
                }}
                // Custom styling to match ShadCN theme
                eventClassNames="fc-event-custom"
              />
            </div>
          </CardContent>
        </Card>
        
        {/* Event Details Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <IconCalendar className="h-5 w-5" />
                {selectedLesson?.title}
              </DialogTitle>
              <DialogDescription>
                Lesson details and information
              </DialogDescription>
            </DialogHeader>
            
            {selectedLesson && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Status</span>
                  {getStatusBadge(selectedLesson.status)}
                </div>
                
                <Separator />
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <IconUser className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Student</p>
                      <p className="text-sm text-muted-foreground">{selectedLesson.student_name}</p>
                    </div>
                  </div>
                  
                  {selectedLesson.tutor_name && (
                    <div className="flex items-center gap-2">
                      <IconUser className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Tutor</p>
                        <p className="text-sm text-muted-foreground">{selectedLesson.tutor_name}</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <IconClock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Time</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(selectedLesson.start_time).toLocaleString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  
                  {selectedLesson.service_name && (
                    <div>
                      <p className="text-sm font-medium">Service</p>
                      <p className="text-sm text-muted-foreground">{selectedLesson.service_name}</p>
                    </div>
                  )}
                  
                  {selectedLesson.location_name && (
                    <div>
                      <p className="text-sm font-medium">Location</p>
                      <p className="text-sm text-muted-foreground">{selectedLesson.location_name}</p>
                    </div>
                  )}
                  
                  {selectedLesson.description && (
                    <div>
                      <p className="text-sm font-medium">Description</p>
                      <p className="text-sm text-muted-foreground">{selectedLesson.description}</p>
                    </div>
                  )}
                </div>
                
                <Separator />
                
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    Reschedule
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
        
        {/* Create Lesson Drawer */}
        <CreateLessonDrawer 
          open={createDrawerOpen}
          onOpenChange={setCreateDrawerOpen}
          selectedTimeSlot={selectedTimeSlot}
          tutors={tutors}
          students={students}
          services={services}
          locations={locations}
          onLessonCreated={() => {
            fetchData()
            setCreateDrawerOpen(false)
            setSelectedTimeSlot(null)
          }}
        />
      </div>
      
      {/* Enhanced CSS for FullCalendar ShadCN theming */}
      <style jsx global>{`
        /* Remove default borders and apply ShadCN styling */
        .fc-theme-standard .fc-scrollgrid {
          border: none;
          font-family: inherit;
        }
        
        .fc-theme-standard td, .fc-theme-standard th {
          border-color: hsl(var(--border));
          border-width: 1px;
        }
        
        /* Header styling */
        .fc-col-header-cell {
          background-color: hsl(var(--muted));
          font-weight: 600;
          color: hsl(var(--foreground));
          padding: 12px 8px;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 0.025em;
          border-bottom: 2px solid hsl(var(--border));
        }
        
        .fc-col-header-cell-cushion {
          padding: 0;
          color: hsl(var(--muted-foreground));
          font-weight: 500;
        }
        
        /* Day cells */
        .fc-daygrid-day {
          background-color: hsl(var(--background));
          transition: background-color 0.2s ease;
        }
        
        .fc-daygrid-day:hover {
          background-color: hsl(var(--muted) / 0.3);
        }
        
        .fc-daygrid-day-number {
          color: hsl(var(--foreground));
          font-weight: 500;
          padding: 8px;
          font-size: 14px;
        }
        
        /* Today highlighting */
        .fc-day-today {
          background-color: hsl(var(--primary) / 0.05) !important;
          border: 1px solid hsl(var(--primary) / 0.2) !important;
        }
        
        .fc-day-today .fc-daygrid-day-number {
          background-color: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
          border-radius: 6px;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
        }
        
        /* Event styling */
        .fc-event-custom {
          border: none !important;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          padding: 4px 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          margin: 1px 2px;
          box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
        }
        
        .fc-event-custom:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -1px rgb(0 0 0 / 0.06);
        }
        
        .fc-event-title {
          font-weight: 500;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .fc-event-time {
          font-weight: 400;
          opacity: 0.9;
        }
        
        /* More link styling */
        .fc-more-link {
          color: hsl(var(--primary));
          font-weight: 500;
          font-size: 12px;
          padding: 2px 6px;
          border-radius: 4px;
          background-color: hsl(var(--primary) / 0.1);
          border: 1px solid hsl(var(--primary) / 0.2);
          transition: all 0.2s ease;
        }
        
        .fc-more-link:hover {
          background-color: hsl(var(--primary) / 0.2);
          text-decoration: none;
        }
        
        /* Popover styling */
        .fc-popover {
          background-color: hsl(var(--background));
          border: 1px solid hsl(var(--border));
          border-radius: 8px;
          box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -2px rgb(0 0 0 / 0.05);
          overflow: hidden;
        }
        
        .fc-popover-header {
          background-color: hsl(var(--muted));
          border-bottom: 1px solid hsl(var(--border));
          padding: 12px 16px;
          font-weight: 600;
          font-size: 14px;
          color: hsl(var(--foreground));
        }
        
        .fc-popover-body {
          padding: 8px;
        }
        
        /* Time grid styling */
        .fc-timegrid-slot {
          height: 48px;
          border-color: hsl(var(--border));
        }
        
        .fc-timegrid-slot-minor {
          border-color: hsl(var(--border) / 0.3);
        }
        
        .fc-timegrid-axis {
          color: hsl(var(--muted-foreground));
          font-size: 12px;
          font-weight: 500;
          background-color: hsl(var(--muted) / 0.3);
          border-right: 2px solid hsl(var(--border));
        }
        
        .fc-timegrid-axis-cushion {
          padding: 0 8px;
        }
        
        /* Time grid events */
        .fc-timegrid-event {
          border-radius: 4px;
          border: none !important;
          box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px 0 rgb(0 0 0 / 0.06);
        }
        
        .fc-timegrid-event:hover {
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -1px rgb(0 0 0 / 0.06);
        }
        
        .fc-timegrid-event-harness {
          margin: 1px 2px;
        }
        
        /* Now indicator */
        .fc-now-indicator-line {
          border-color: hsl(var(--destructive));
          border-width: 2px;
          opacity: 0.8;
        }
        
        .fc-now-indicator-arrow {
          border-left-color: hsl(var(--destructive));
          border-width: 6px;
        }
        
        /* Scrollbars */
        .fc-scroller::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        
        .fc-scroller::-webkit-scrollbar-track {
          background: hsl(var(--muted));
          border-radius: 3px;
        }
        
        .fc-scroller::-webkit-scrollbar-thumb {
          background: hsl(var(--muted-foreground) / 0.3);
          border-radius: 3px;
        }
        
        .fc-scroller::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--muted-foreground) / 0.5);
        }
        
        /* Business hours */
        .fc-non-business {
          background-color: hsl(var(--muted) / 0.2);
        }
        
        /* Selection */
        .fc-highlight {
          background-color: hsl(var(--primary) / 0.1);
          border: 1px solid hsl(var(--primary) / 0.3);
        }
        
        /* Day view specific */
        .fc-timegrid-col {
          background-color: hsl(var(--background));
        }
        
        .fc-timegrid-col-frame {
          border-right: 1px solid hsl(var(--border));
        }
        
        /* Week view day headers */
        .fc-timegrid .fc-col-header-cell {
          border-bottom: 2px solid hsl(var(--border));
        }
        
        /* All day section */
        .fc-timegrid-divider {
          border-color: hsl(var(--border));
          border-width: 2px;
        }
        
        /* Responsive adjustments */
        @media (max-width: 768px) {
          .fc-col-header-cell {
            padding: 8px 4px;
            font-size: 12px;
          }
          
          .fc-daygrid-day-number {
            font-size: 12px;
            padding: 4px;
          }
          
          .fc-event-custom {
            font-size: 11px;
            padding: 2px 4px;
          }
          
          .fc-timegrid-slot {
            height: 40px;
          }
        }
      `}</style>
    </div>
  )
}
