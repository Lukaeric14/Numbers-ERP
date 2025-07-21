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
  type LucideIcon,
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

type NavChild = {
  label: string;
  path: string;
};

type NavItem = {
  label: string;
  path?: string;
  icon: LucideIcon;
  children?: NavChild[];
};

type NavItems = {
  admin: NavItem[];
  tutor: NavItem[];
  parent: NavItem[];
  student: NavItem[];
};

const navItems: NavItems = {
  admin: [
    { label: "Dashboard", path: "/dashboard", icon: PieChart },
    { label: "Calendar", path: "/calendar", icon: Calendar },
    {
      label: "Students",
      icon: Users,
      children: [
        { label: "All Students", path: "/students" },
        { label: "Add Student", path: "/students/new" }
      ]
    },
    {
      label: "Tutoring",
      icon: BookOpen,
      children: [
        { label: "Services", path: "/services" },
        { label: "Tutors", path: "/tutors" },
        { label: "Lessons", path: "/lessons" }
      ]
    },
    {
      label: "Billing",
      icon: DollarSign,
      children: [
        { label: "Invoices", path: "/invoices" },
        { label: "Reports", path: "/reports" }
      ]
    },
    {
      label: "Settings",
      icon: Settings2,
      children: [
        { label: "General", path: "/settings/general" },
        { label: "Users", path: "/settings/users" },
        { label: "Preferences", path: "/settings/preferences" }
      ]
    }
  ],

  tutor: [
    { label: "Calendar", path: "/calendar", icon: Calendar },
    { label: "My Lessons", path: "/lessons", icon: BookOpen },
    { label: "Students", path: "/students", icon: Users },
    { label: "Profile", path: "/profile", icon: Settings2 }
  ],

  parent: [
    { label: "Calendar", path: "/calendar", icon: Calendar },
    { label: "My Students", path: "/students", icon: Users },
    { label: "Invoices", path: "/invoices", icon: DollarSign },
    { label: "Account", path: "/profile", icon: Settings2 }
  ],

  student: [
    { label: "Calendar", path: "/calendar", icon: Calendar },
    { label: "My Lessons", path: "/lessons", icon: BookOpen },
    { label: "Profile", path: "/profile", icon: Settings2 }
  ]
};

const navSecondary = [
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
];

const projects = [
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
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, userRole } = useAuth()

  const userData = {
    name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User',
    email: user?.email || 'user@example.com',
    avatar: user?.user_metadata?.avatar_url || '/avatars/user.jpg',
  }

  // Debug: Log user role from context
  console.log('User role from context:', userRole)
  
  // Use role from auth context, default to 'student' if not set
  const currentUserRole = userRole || 'student'
  
  // Get navigation items based on user role
  const currentNavItems = navItems[currentUserRole as keyof typeof navItems] || navItems.student
  
  // Transform navigation items to match NavMain expected format
  const transformedNavItems = currentNavItems.map(item => ({
    title: item.label,
    url: item.path || "#",
    icon: item.icon,
    items: item.children?.map((child: NavChild) => ({
      title: child.label,
      url: child.path,
    }))
  }))

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
        <NavMain items={transformedNavItems} />
        {currentUserRole === 'admin' && <NavProjects projects={projects} />}
        <NavSecondary items={navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
    </Sidebar>
  )
}
