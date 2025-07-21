import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface DashboardData {
  totalRevenue: number
  newCustomers: number
  activeAccounts: number
  growthRate: string
  totalLessons: number
  recentLessons: Array<{
    id: string
    title: string
    service_type: string
    status: string
    start_time: string
    student_name: string
  }>
  lessonsChartData: Array<{
    date: string
    lessons: number
  }>
}

export function useDashboardData() {
  const [data, setData] = useState<DashboardData>({
    totalRevenue: 0,
    newCustomers: 0,
    activeAccounts: 0,
    growthRate: '-%',
    totalLessons: 0,
    recentLessons: [],
    lessonsChartData: []
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true)
        
        // Get current month dates
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        
        // TODO: Get workspace_id from user context - using hardcoded for now
        const workspaceId = '260d9ad8-7aed-4b2e-a192-f96ad9ab3115'
        
        // 1. Total Revenue this month (using your proven SQL query)
        const { data: revenueData, error: revenueError } = await supabase
          .from('invoices')
          .select('amount_due, amount_paid')
          .eq('workspace_id', workspaceId)
          .gte('created_at', startOfMonth.toISOString())
          .lt('created_at', new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString())
        
        if (revenueError) throw revenueError
        
        // Calculate totals like your SQL query
        const totalRevenue = revenueData?.reduce((sum, invoice) => sum + (invoice.amount_due || 0), 0) || 0
        const totalPaid = revenueData?.reduce((sum, invoice) => sum + (invoice.amount_paid || 0), 0) || 0
        const outstandingBalance = totalRevenue - totalPaid
        
        // 2. New Customers (students created this month)
        const { data: studentsData, error: studentsError } = await supabase
          .from('students')
          .select('id')
          .eq('workspace_id', workspaceId)
          .gte('created_at', startOfMonth.toISOString())
          .lt('created_at', new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString())
        
        if (studentsError) throw studentsError
        const newCustomers = studentsData?.length || 0
        
        // 3. Active Accounts (total active students)
        const { data: activeStudentsData, error: activeStudentsError } = await supabase
          .from('students')
          .select('id')
          .eq('workspace_id', workspaceId)
        
        if (activeStudentsError) throw activeStudentsError
        const activeAccounts = activeStudentsData?.length || 0
        
        // 4. Total Lessons this month
        const { data: lessonsData, error: lessonsError } = await supabase
          .from('lessons')
          .select('id')
          .eq('workspace_id', workspaceId)
          .gte('start_time', startOfMonth.toISOString())
          .lt('start_time', new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString())
        
        if (lessonsError) throw lessonsError
        
        const totalLessons = lessonsData?.length || 0
        
        // 5. Recent Lessons for table (with proper joins)
        const { data: recentLessonsData, error: recentLessonsError } = await supabase
          .from('lessons')
          .select(`
            id,
            title,
            status,
            start_time,
            students!inner(first_name, last_name),
            services!inner(name)
          `)
          .eq('workspace_id', workspaceId)
          .order('start_time', { ascending: false })
          .limit(10)
        
        if (recentLessonsError) throw recentLessonsError
        
        const recentLessons = recentLessonsData?.map((lesson: any) => ({
          id: lesson.id,
          title: lesson.title || 'Lesson',
          service_type: lesson.services?.name || 'Unknown Service',
          status: lesson.status,
          start_time: lesson.start_time,
          student_name: `${lesson.students?.first_name || ''} ${lesson.students?.last_name || ''}`.trim() || 'Unknown Student'
        })) || []
        
        // 6. Lessons chart data (last 30 days)
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        
        const { data: chartLessonsData, error: chartLessonsError } = await supabase
          .from('lessons')
          .select('start_time')
          .eq('workspace_id', workspaceId)
          .gte('start_time', thirtyDaysAgo.toISOString())
          .order('start_time', { ascending: true })
        
        if (chartLessonsError) throw chartLessonsError
        
        // Group lessons by date for chart
        const dateMap = new Map()
        chartLessonsData?.forEach((lesson: any) => {
          const date = new Date(lesson.start_time).toISOString().split('T')[0]
          dateMap.set(date, (dateMap.get(date) || 0) + 1)
        })
        
        // Fill in missing dates with 0 for the last 30 days
        const lessonsChartData = []
        for (let i = 29; i >= 0; i--) {
          const date = new Date()
          date.setDate(date.getDate() - i)
          const dateStr = date.toISOString().split('T')[0]
          lessonsChartData.push({
            date: dateStr,
            lessons: dateMap.get(dateStr) || 0
          })
        }
        
        setData({
          totalRevenue,
          newCustomers,
          activeAccounts,
          growthRate: '-%', // Leave as requested
          totalLessons,
          recentLessons,
          lessonsChartData
        })
        
      } catch (err) {
        console.error('Error fetching dashboard data:', err)
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  return { data, loading, error }
}
