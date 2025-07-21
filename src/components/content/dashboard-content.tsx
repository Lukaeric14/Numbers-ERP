import { DashboardKPICards } from "@/components/dashboard-kpi-cards"
import { DashboardLessonsChart } from "@/components/dashboard-lessons-chart"
import { DashboardLessonsTable } from "@/components/dashboard-lessons-table"
import { useDashboardData } from "@/hooks/use-dashboard-data"

export function DashboardContent() {
  const { data, loading, error } = useDashboardData()

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-destructive mb-2">Error Loading Dashboard</h2>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min">
      <div className="@container/main flex flex-1 flex-col gap-2 p-4 md:p-6">
        <div className="flex flex-col gap-4 md:gap-6">
          <DashboardKPICards 
            data={{
              totalRevenue: data.totalRevenue,
              newCustomers: data.newCustomers,
              activeAccounts: data.activeAccounts,
              growthRate: data.growthRate
            }}
            loading={loading}
          />
          <div className="px-4 lg:px-6">
            <DashboardLessonsChart 
              data={data.lessonsChartData}
              totalLessons={data.totalLessons}
              loading={loading}
            />
          </div>
          <div className="px-4 lg:px-6">
            <DashboardLessonsTable 
              data={data.recentLessons}
              loading={loading}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
