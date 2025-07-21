"use client"

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  Card,
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
import { Skeleton } from "@/components/ui/skeleton"

const chartConfig = {
  lessons: {
    label: "Lessons",
    color: "hsl(var(--chart-1))",
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
  if (loading) {
    return (
      <Card>
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

  // Format data for chart display
  const chartData = data.map(item => ({
    ...item,
    displayDate: new Date(item.date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Total Lessons</CardTitle>
        <CardDescription>
          Total for the last 30 days: {totalLessons} lessons
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <AreaChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="displayDate"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => `${value}`}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="line" />}
            />
            <Area
              dataKey="lessons"
              type="natural"
              fill="var(--color-lessons)"
              fillOpacity={0.4}
              stroke="var(--color-lessons)"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
