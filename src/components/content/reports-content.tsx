"use client"

import * as React from "react"
import { 
  IconTrendingUp, 
  IconTrendingDown, 
  IconCurrencyDollar, 
  IconUsers, 
  IconReceipt, 
  IconClock,
  IconChartBar,
  IconTarget,
  IconExternalLink
} from "@tabler/icons-react"
import { supabase } from '@/lib/supabase'

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

interface FinancialMetrics {
  totalRevenue: number
  monthlyRevenue: number
  outstandingBalance: number
  averageInvoiceValue: number
  paymentCollectionRate: number
  totalLessonsDelivered: number
  averageHourlyRate: number
  topPerformingTutor: {
    name: string
    revenue: number
  }
  monthlyGrowth: number
  unpaidInvoicesCount: number
  totalActiveParents: number
  averageLessonDuration: number
}

export function ReportsContent() {
  const [metrics, setMetrics] = React.useState<FinancialMetrics | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    const fetchFinancialMetrics = async () => {
      try {
        setIsLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: userData } = await supabase
          .from('app_users')
          .select('workspace_id')
          .eq('id', user.id)
          .single()

        if (!userData?.workspace_id) return

        // Fetch all necessary data in parallel
        const [
          invoicesData,
          parentsData,
          lessonsData,
          tutorsData
        ] = await Promise.all([
          // Invoices data
          supabase
            .from('invoices')
            .select('*')
            .eq('workspace_id', userData.workspace_id),
          
          // Parents data
          supabase
            .from('parents')
            .select('*')
            .eq('workspace_id', userData.workspace_id),
          
          // Lessons data with tutor info
          supabase
            .from('lessons')
            .select(`
              *,
              tutor:employees!tutor_id(first_name, last_name)
            `)
            .eq('workspace_id', userData.workspace_id),
          
          // Tutors data
          supabase
            .from('employees')
            .select('*')
            .eq('workspace_id', userData.workspace_id)
        ])

        if (invoicesData.error || parentsData.error || lessonsData.error || tutorsData.error) {
          console.error('Error fetching data:', {
            invoices: invoicesData.error,
            parents: parentsData.error,
            lessons: lessonsData.error,
            tutors: tutorsData.error
          })
          return
        }

        const invoices = invoicesData.data || []
        const parents = parentsData.data || []
        const lessons = lessonsData.data || []
        const tutors = tutorsData.data || []

        // Calculate metrics
        const currentMonth = new Date().getMonth()
        const currentYear = new Date().getFullYear()
        
        // Total revenue (all time)
        const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.amount_paid || 0), 0)
        
        // Monthly revenue (current month)
        const monthlyRevenue = invoices
          .filter(inv => {
            const invDate = new Date(inv.created_at)
            return invDate.getMonth() === currentMonth && invDate.getFullYear() === currentYear
          })
          .reduce((sum, inv) => sum + (inv.amount_paid || 0), 0)

        // Outstanding balance
        const outstandingBalance = parents.reduce((sum, parent) => sum + (parent.current_balance || 0), 0)

        // Average invoice value
        const averageInvoiceValue = invoices.length > 0 
          ? invoices.reduce((sum, inv) => sum + inv.amount_due, 0) / invoices.length 
          : 0

        // Payment collection rate
        const totalBilled = invoices.reduce((sum, inv) => sum + inv.amount_due, 0)
        const paymentCollectionRate = totalBilled > 0 ? (totalRevenue / totalBilled) * 100 : 0

        // Total lessons delivered
        const totalLessonsDelivered = lessons.filter(lesson => lesson.status === 'completed').length

        // Average hourly rate
        const averageHourlyRate = lessons.length > 0
          ? lessons.reduce((sum, lesson) => sum + (lesson.rate || 0), 0) / lessons.length
          : 0

        // Top performing tutor (by revenue from lessons)
        const tutorRevenue = new Map()
        lessons.forEach(lesson => {
          if (lesson.tutor && lesson.status === 'completed') {
            const tutorName = `${lesson.tutor.first_name} ${lesson.tutor.last_name}`
            const revenue = (lesson.rate || 0) * ((lesson.duration_minutes || 60) / 60)
            tutorRevenue.set(tutorName, (tutorRevenue.get(tutorName) || 0) + revenue)
          }
        })

        const topPerformingTutor = Array.from(tutorRevenue.entries())
          .sort(([,a], [,b]) => b - a)[0] || ['No data', 0]

        // Monthly growth (compare current month to previous month)
        const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1
        const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear
        
        const previousMonthRevenue = invoices
          .filter(inv => {
            const invDate = new Date(inv.created_at)
            return invDate.getMonth() === previousMonth && invDate.getFullYear() === previousYear
          })
          .reduce((sum, inv) => sum + (inv.amount_paid || 0), 0)

        const monthlyGrowth = previousMonthRevenue > 0 
          ? ((monthlyRevenue - previousMonthRevenue) / previousMonthRevenue) * 100 
          : 0

        // Unpaid invoices count
        const unpaidInvoicesCount = invoices.filter(inv => 
          inv.status === 'pending' || inv.status === 'sent'
        ).length

        // Average lesson duration
        const averageLessonDuration = lessons.length > 0
          ? lessons.reduce((sum, lesson) => sum + (lesson.duration_minutes || 60), 0) / lessons.length
          : 60

        setMetrics({
          totalRevenue,
          monthlyRevenue,
          outstandingBalance,
          averageInvoiceValue,
          paymentCollectionRate,
          totalLessonsDelivered,
          averageHourlyRate,
          topPerformingTutor: {
            name: topPerformingTutor[0],
            revenue: topPerformingTutor[1]
          },
          monthlyGrowth,
          unpaidInvoicesCount,
          totalActiveParents: parents.length,
          averageLessonDuration
        })

      } catch (error) {
        console.error('Error fetching financial metrics:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchFinancialMetrics()
  }, [])

  const handleViewDetails = (reportType: string) => {
    // Open detailed report in new tab
    const url = `/reports/${reportType}`
    window.open(url, '_blank')
  }

  if (isLoading) {
    return (
      <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min">
        <div className="@container/main flex flex-1 flex-col gap-2 p-4 md:p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">Financial Reports</h1>
            <p className="text-muted-foreground">Comprehensive financial metrics and insights for your tutoring business</p>
          </div>
          
          <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="@container/card">
                <CardHeader>
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-32" />
                  <Skeleton className="h-6 w-16" />
                </CardHeader>
                <CardFooter className="flex-col items-start gap-1.5 text-sm">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-8 w-20" />
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-destructive mb-2">Error Loading Reports</h2>
          <p className="text-muted-foreground">Unable to fetch financial data</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min">
      <div className="@container/main flex flex-1 flex-col gap-2 p-4 md:p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Financial Reports</h1>
          <p className="text-muted-foreground">Comprehensive financial metrics and insights for your tutoring business</p>
        </div>
        
        <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
          
          {/* 1. Total Revenue */}
          <Card className="@container/card">
            <CardHeader>
              <CardDescription>Total Revenue</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                ${metrics.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </CardTitle>
              <CardAction>
                <Badge variant="outline">
                  <IconCurrencyDollar className="size-3" />
                  All Time
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5 text-sm">
              <div className="line-clamp-1 flex gap-2 font-medium">
                Total payments received <IconCurrencyDollar className="size-4" />
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-auto p-0 text-muted-foreground hover:text-foreground"
                onClick={() => handleViewDetails('revenue')}
              >
                View Details <IconExternalLink className="ml-1 size-3" />
              </Button>
            </CardFooter>
          </Card>

          {/* 2. Monthly Revenue */}
          <Card className="@container/card">
            <CardHeader>
              <CardDescription>Monthly Revenue</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                ${metrics.monthlyRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </CardTitle>
              <CardAction>
                <Badge variant="outline">
                  {metrics.monthlyGrowth >= 0 ? (
                    <>
                      <IconTrendingUp className="size-3" />
                      +{metrics.monthlyGrowth.toFixed(1)}%
                    </>
                  ) : (
                    <>
                      <IconTrendingDown className="size-3" />
                      {metrics.monthlyGrowth.toFixed(1)}%
                    </>
                  )}
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5 text-sm">
              <div className="line-clamp-1 flex gap-2 font-medium">
                {metrics.monthlyGrowth >= 0 ? 'Growing this month' : 'Declining this month'} 
                {metrics.monthlyGrowth >= 0 ? <IconTrendingUp className="size-4" /> : <IconTrendingDown className="size-4" />}
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-auto p-0 text-muted-foreground hover:text-foreground"
                onClick={() => handleViewDetails('monthly-revenue')}
              >
                View Details <IconExternalLink className="ml-1 size-3" />
              </Button>
            </CardFooter>
          </Card>

          {/* 3. Outstanding Balance */}
          <Card className="@container/card">
            <CardHeader>
              <CardDescription>Outstanding Balance</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                ${metrics.outstandingBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </CardTitle>
              <CardAction>
                <Badge variant="outline">
                  <IconReceipt className="size-3" />
                  {metrics.unpaidInvoicesCount} Unpaid
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5 text-sm">
              <div className="line-clamp-1 flex gap-2 font-medium">
                Pending collections <IconReceipt className="size-4" />
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-auto p-0 text-muted-foreground hover:text-foreground"
                onClick={() => handleViewDetails('outstanding')}
              >
                View Details <IconExternalLink className="ml-1 size-3" />
              </Button>
            </CardFooter>
          </Card>

          {/* 4. Payment Collection Rate */}
          <Card className="@container/card">
            <CardHeader>
              <CardDescription>Collection Rate</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                {metrics.paymentCollectionRate.toFixed(1)}%
              </CardTitle>
              <CardAction>
                <Badge variant="outline">
                  {metrics.paymentCollectionRate >= 80 ? (
                    <>
                      <IconTrendingUp className="size-3" />
                      Excellent
                    </>
                  ) : metrics.paymentCollectionRate >= 60 ? (
                    <>
                      <IconTarget className="size-3" />
                      Good
                    </>
                  ) : (
                    <>
                      <IconTrendingDown className="size-3" />
                      Needs Work
                    </>
                  )}
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5 text-sm">
              <div className="line-clamp-1 flex gap-2 font-medium">
                Payment efficiency <IconTarget className="size-4" />
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-auto p-0 text-muted-foreground hover:text-foreground"
                onClick={() => handleViewDetails('collection-rate')}
              >
                View Details <IconExternalLink className="ml-1 size-3" />
              </Button>
            </CardFooter>
          </Card>

          {/* 5. Average Invoice Value */}
          <Card className="@container/card">
            <CardHeader>
              <CardDescription>Avg Invoice Value</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                ${metrics.averageInvoiceValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </CardTitle>
              <CardAction>
                <Badge variant="outline">
                  <IconChartBar className="size-3" />
                  Per Invoice
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5 text-sm">
              <div className="line-clamp-1 flex gap-2 font-medium">
                Revenue per transaction <IconChartBar className="size-4" />
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-auto p-0 text-muted-foreground hover:text-foreground"
                onClick={() => handleViewDetails('invoice-value')}
              >
                View Details <IconExternalLink className="ml-1 size-3" />
              </Button>
            </CardFooter>
          </Card>

          {/* 6. Lessons Delivered */}
          <Card className="@container/card">
            <CardHeader>
              <CardDescription>Lessons Delivered</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                {metrics.totalLessonsDelivered.toLocaleString()}
              </CardTitle>
              <CardAction>
                <Badge variant="outline">
                  <IconClock className="size-3" />
                  {Math.round(metrics.averageLessonDuration)}min avg
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5 text-sm">
              <div className="line-clamp-1 flex gap-2 font-medium">
                Completed sessions <IconClock className="size-4" />
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-auto p-0 text-muted-foreground hover:text-foreground"
                onClick={() => handleViewDetails('lessons')}
              >
                View Details <IconExternalLink className="ml-1 size-3" />
              </Button>
            </CardFooter>
          </Card>

          {/* 7. Average Hourly Rate */}
          <Card className="@container/card">
            <CardHeader>
              <CardDescription>Avg Hourly Rate</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                ${metrics.averageHourlyRate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </CardTitle>
              <CardAction>
                <Badge variant="outline">
                  <IconClock className="size-3" />
                  Per Hour
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5 text-sm">
              <div className="line-clamp-1 flex gap-2 font-medium">
                Service pricing <IconCurrencyDollar className="size-4" />
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-auto p-0 text-muted-foreground hover:text-foreground"
                onClick={() => handleViewDetails('hourly-rate')}
              >
                View Details <IconExternalLink className="ml-1 size-3" />
              </Button>
            </CardFooter>
          </Card>

          {/* 8. Top Performing Tutor */}
          <Card className="@container/card">
            <CardHeader>
              <CardDescription>Top Performer</CardDescription>
              <CardTitle className="text-xl font-semibold @[250px]/card:text-2xl">
                {metrics.topPerformingTutor.name}
              </CardTitle>
              <CardAction>
                <Badge variant="outline">
                  <IconUsers className="size-3" />
                  ${metrics.topPerformingTutor.revenue.toFixed(0)} earned
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5 text-sm">
              <div className="line-clamp-1 flex gap-2 font-medium">
                Highest revenue tutor <IconUsers className="size-4" />
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-auto p-0 text-muted-foreground hover:text-foreground"
                onClick={() => handleViewDetails('tutor-performance')}
              >
                View Details <IconExternalLink className="ml-1 size-3" />
              </Button>
            </CardFooter>
          </Card>

        </div>
      </div>
    </div>
  )
}
