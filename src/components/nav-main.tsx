"use client"

import * as React from "react"
import { ChevronRight, type LucideIcon } from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"

// Hook to manage persistent nav state
function useNavState() {
  const [openItems, setOpenItems] = React.useState<Set<string>>(new Set())
  const [isLoaded, setIsLoaded] = React.useState(false)

  // Load state from localStorage on mount
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('nav-open-items')
      if (saved) {
        setOpenItems(new Set(JSON.parse(saved)))
      }
    } catch (error) {
      console.warn('Failed to load nav state from localStorage:', error)
    } finally {
      setIsLoaded(true)
    }
  }, [])

  // Save state to localStorage when it changes
  const updateOpenItems = React.useCallback((itemTitle: string, isOpen: boolean) => {
    setOpenItems(prev => {
      const newSet = new Set(prev)
      if (isOpen) {
        newSet.add(itemTitle)
      } else {
        newSet.delete(itemTitle)
      }
      
      try {
        localStorage.setItem('nav-open-items', JSON.stringify(Array.from(newSet)))
      } catch (error) {
        console.warn('Failed to save nav state to localStorage:', error)
      }
      
      return newSet
    })
  }, [])

  return { openItems, updateOpenItems, isLoaded }
}

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon: LucideIcon
    isActive?: boolean
    onClick?: () => void
    items?: {
      title: string
      url: string
      onClick?: () => void
    }[]
  }[]
}) {
  const { openItems, updateOpenItems, isLoaded } = useNavState()

  // Don't render until we've loaded the state to prevent flash
  if (!isLoaded) {
    return (
      <SidebarGroup>
        <SidebarGroupLabel>Platform</SidebarGroupLabel>
        <SidebarMenu>
          {/* Render skeleton while loading */}
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton tooltip={item.title}>
                <item.icon className="h-4 w-4" />
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroup>
    )
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const isOpen = openItems.has(item.title) || item.isActive
          
          return (
            <Collapsible 
              key={item.title} 
              asChild 
              open={isOpen}
              onOpenChange={(open) => updateOpenItems(item.title, open)}
            >
            <SidebarMenuItem>
              {item.items?.length ? (
                <>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip={item.title}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                      <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 data-[state=open]:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items?.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton 
                            asChild={!subItem.onClick}
                            onClick={subItem.onClick}
                          >
                            {subItem.onClick ? (
                              <div className="cursor-pointer">
                                <span>{subItem.title}</span>
                              </div>
                            ) : (
                              <a href={subItem.url}>
                                <span>{subItem.title}</span>
                              </a>
                            )}
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </>
              ) : (
                <SidebarMenuButton 
                  asChild={!item.onClick} 
                  tooltip={item.title}
                  onClick={item.onClick}
                >
                  {item.onClick ? (
                    <div className="flex items-center gap-2 cursor-pointer">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </div>
                  ) : (
                    <a href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </a>
                  )}
                </SidebarMenuButton>
              )}
            </SidebarMenuItem>
            </Collapsible>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
