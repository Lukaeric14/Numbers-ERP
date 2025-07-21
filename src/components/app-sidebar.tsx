"use client"

import * as React from "react"
import {
  BookOpen,
  Bot,
  Calculator,
  Frame,
  LifeBuoy,
  Map,
  PieChart,
  Send,
  Settings2,
  Users,
  DollarSign,
  Calendar,
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const navData = {
  navMain: [
    {
      title: "Students",
      url: "#",
      icon: Users,
      isActive: true,
      items: [
        {
          title: "All Students",
          url: "#",
        },
        {
          title: "Add Student",
          url: "#",
        },
        {
          title: "Student Groups",
          url: "#",
        },
      ],
    },
    {
      title: "Tutoring",
      url: "#",
      icon: BookOpen,
      items: [
        {
          title: "Sessions",
          url: "#",
        },
        {
          title: "Schedule",
          url: "#",
        },
        {
          title: "Tutors",
          url: "#",
        },
      ],
    },
    {
      title: "Billing",
      url: "#",
      icon: DollarSign,
      items: [
        {
          title: "Invoices",
          url: "#",
        },
        {
          title: "Payments",
          url: "#",
        },
        {
          title: "Reports",
          url: "#",
        },
      ],
    },
    {
      title: "Settings",
      url: "#",
      icon: Settings2,
      items: [
        {
          title: "General",
          url: "#",
        },
        {
          title: "Users",
          url: "#",
        },
        {
          title: "Preferences",
          url: "#",
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Support",
      url: "#",
      icon: LifeBuoy,
    },
    {
      title: "Feedback",
      url: "#",
      icon: Send,
    },
  ],
  projects: [
    {
      name: "Math Tutoring",
      url: "#",
      icon: Calculator,
    },
    {
      name: "Science Tutoring",
      url: "#",
      icon: Bot,
    },
    {
      name: "Language Arts",
      url: "#",
      icon: BookOpen,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth()

  const userData = {
    name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User',
    email: user?.email || 'user@example.com',
    avatar: user?.user_metadata?.avatar_url || '/avatars/user.jpg',
  }

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Calculator className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Numbers ERP</span>
                  <span className="truncate text-xs">Tutoring Center</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navData.navMain} />
        <NavProjects projects={navData.projects} />
        <NavSecondary items={navData.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
    </Sidebar>
  )
}
