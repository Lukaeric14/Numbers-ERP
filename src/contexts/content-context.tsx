"use client"

import { createContext, useContext, useState } from 'react'

type ContentType = 
  | 'dashboard'
  | 'calendar'
  | 'students'
  | 'students/new'
  | 'services'
  | 'tutors'
  | 'lessons'
  | 'invoices'
  | 'balances'
  | 'payroll'
  | 'reports'
  | 'settings/general'
  | 'settings/users'
  | 'settings/preferences'
  | 'profile'

interface ContentContextType {
  activeContent: ContentType
  setActiveContent: (content: ContentType) => void
  breadcrumb: string[]
  setBreadcrumb: (breadcrumb: string[]) => void
}

const ContentContext = createContext<ContentContextType | undefined>(undefined)

export function ContentProvider({ children }: { children: React.ReactNode }) {
  const [activeContent, setActiveContent] = useState<ContentType>('dashboard')
  const [breadcrumb, setBreadcrumb] = useState<string[]>(['Numbers ERP', 'Dashboard'])

  const handleSetActiveContent = (content: ContentType) => {
    setActiveContent(content)
    
    // Update breadcrumb based on content
    const breadcrumbMap: Record<ContentType, string[]> = {
      'dashboard': ['Numbers ERP', 'Dashboard'],
      'calendar': ['Numbers ERP', 'Calendar'],
      'students': ['Numbers ERP', 'Students', 'All Students'],
      'students/new': ['Numbers ERP', 'Students', 'Add Student'],
      'services': ['Numbers ERP', 'Tutoring', 'Services'],
      'tutors': ['Numbers ERP', 'Tutoring', 'Tutors'],
      'lessons': ['Numbers ERP', 'Lessons'],
      'invoices': ['Numbers ERP', 'Billing', 'Invoices'],
      'balances': ['Numbers ERP', 'Billing', 'Balances'],
      'payroll': ['Numbers ERP', 'Billing', 'Payroll'],
      'reports': ['Numbers ERP', 'Billing', 'Reports'],
      'settings/general': ['Numbers ERP', 'Settings', 'General'],
      'settings/users': ['Numbers ERP', 'Settings', 'Users'],
      'settings/preferences': ['Numbers ERP', 'Settings', 'Preferences'],
      'profile': ['Numbers ERP', 'Profile'],
    }
    
    setBreadcrumb(breadcrumbMap[content])
  }

  return (
    <ContentContext.Provider value={{ 
      activeContent, 
      setActiveContent: handleSetActiveContent, 
      breadcrumb, 
      setBreadcrumb 
    }}>
      {children}
    </ContentContext.Provider>
  )
}

export function useContent() {
  const context = useContext(ContentContext)
  if (context === undefined) {
    throw new Error('useContent must be used within a ContentProvider')
  }
  return context
}
