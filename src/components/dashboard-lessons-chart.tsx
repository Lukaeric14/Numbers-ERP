"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import { useIsMobile } from "@/hooks/use-mobile"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
import { Skeleton } from "@/components/ui/skeleton"

const chartConfig = {
  lessons: {
    label: "Lessons",
    color: "var(--primary)",
  },
} satisfies ChartConfig

interface DashboardLessonsChartProps {
  data: Array<{
    date: string
    lessons: number
  }>
  totalLessons: number
  loading: boolean
}

export function DashboardLessonsChart({ data, totalLessons, loading }: DashboardLessonsChartProps) {
  const isMobile = useIsMobile()
  const [timeRange, setTimeRange] = React.useState("month")

  React.useEffect(() => {
    if (isMobile) {
      setTimeRange("week")
    }
  }, [isMobile])

  // Filter data based on time range - moved before conditional return
  const filteredData = React.useMemo(() => {
    if (!data || data.length === 0) return []
    
    const now = new Date()
    let startDate: Date
    let endDate: Date
    
    if (timeRange === "week") {
      // This week (Monday to Sunday)
      const dayOfWeek = now.getDay()
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek // Handle Sunday as 0
      startDate = new Date(now)
      startDate.setDate(now.getDate() + mondayOffset)
      startDate.setHours(0, 0, 0, 0)
      
      endDate = new Date(startDate)
      endDate.setDate(startDate.getDate() + 6)
      endDate.setHours(23, 59, 59, 999)
    } else if (timeRange === "month") {
      // This month (July 1st to July 31st)
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    } else {
      // Last 3 months (May 1st to July 31st)
      startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1) // 2 months back to include current month
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999) // End of current month
    }
    
    return data.filter((item) => {
      const date = new Date(item.date)
      return date >= startDate && date <= endDate
    })
  }, [data, timeRange])

  // Calculate total for the selected time range
  const filteredTotal = filteredData.reduce((sum, item) => sum + item.lessons, 0)

  if (loading) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    )
  }

  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case "3months": return "last 3 months"
      case "month": return "this month"
      case "week": return "this week"
      default: return "this month"
    }
  }

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Total Lessons</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Total for the {getTimeRangeLabel()}: {filteredTotal} lessons
          </span>
          <span className="@[540px]/card:hidden">{filteredTotal} lessons</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={setTimeRange}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex"
          >
            <ToggleGroupItem value="3months">Last 3 months</ToggleGroupItem>
            <ToggleGroupItem value="month">This month</ToggleGroupItem>
            <ToggleGroupItem value="week">This week</ToggleGroupItem>
          </ToggleGroup>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Select a value"
            >
              <SelectValue placeholder="This month" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="3months" className="rounded-lg">
                Last 3 months
              </SelectItem>
              <SelectItem value="month" className="rounded-lg">
                This month
              </SelectItem>
              <SelectItem value="week" className="rounded-lg">
                This week
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[300px] w-full"
        >
          <AreaChart 
            data={filteredData}
            margin={{
              top: 30,
              right: 12,
              left: 12,
              bottom: 12,
            }}
          >
            <defs>
              <linearGradient id="fillLessons" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-lessons)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-lessons)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value)
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              }}
            />
            <ChartTooltip
              cursor={false}
              defaultIndex={isMobile ? -1 : 10}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  }}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="lessons"
              type="natural"
              fill="url(#fillLessons)"
              stroke="var(--color-lessons)"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
