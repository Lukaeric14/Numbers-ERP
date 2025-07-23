"use client"

import { useContent } from '@/contexts/content-context'
import { DashboardContent } from '@/components/content/dashboard-content'
import { CalendarContent } from '@/components/content/calendar-content'
import { StudentsContent, AddStudentContent } from '@/components/content/students-content'
import { ServicesContent, TutorsContent, LessonsContent } from '@/components/content/tutoring-content'
import { InvoicesContent } from '@/components/content/invoices-content'
import { BalancesContent } from '@/components/content/balances-content'
import { ReportsContent } from '@/components/content/billing-content'
import { GeneralSettingsContent, UsersSettingsContent, PreferencesSettingsContent } from '@/components/content/settings-content'
import { ProfileContent } from '@/components/content/profile-content'

export function ContentRenderer() {
  const { activeContent } = useContent()

  switch (activeContent) {
    case 'dashboard':
      return <DashboardContent />
    case 'calendar':
      return <CalendarContent />
    case 'students':
      return <StudentsContent />
    case 'students/new':
      return <AddStudentContent />
    case 'services':
      return <ServicesContent />
    case 'tutors':
      return <TutorsContent />
    case 'lessons':
      return <LessonsContent />
    case 'invoices':
      return <InvoicesContent />
    case 'balances':
      return <BalancesContent />
    case 'reports':
      return <ReportsContent />
    case 'settings/general':
      return <GeneralSettingsContent />
    case 'settings/users':
      return <UsersSettingsContent />
    case 'settings/preferences':
      return <PreferencesSettingsContent />
    case 'profile':
      return <ProfileContent />
    default:
      return <DashboardContent />
  }
}
