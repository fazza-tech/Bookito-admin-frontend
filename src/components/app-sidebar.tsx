// ============================================================
// App Sidebar — Permission-Aware
// ============================================================
// Renders the sidebar dynamically based on user permissions.
// - Reads menu items from the master menu config
// - Filters based on permissions from PermissionContext
// - Admin sees ALL menus; regular users see only permitted ones
// ============================================================

import * as React from "react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { HugeiconsIcon } from "@hugeicons/react"
import { LayoutBottomIcon, AudioWave01Icon, CommandIcon } from "@hugeicons/core-free-icons"

// -- RBAC imports --
import { usePermissions } from "@/hooks/usePermissions"
import { ALL_MENU_ITEMS } from "@/lib/menu-config"

// Team switcher data (unchanged)
const data = {
  teams: [
    {
      name: "Bookito Pvt.ltd ERP ",
      logo: (
        <HugeiconsIcon icon={LayoutBottomIcon} strokeWidth={2} />
      ),
      plan: ""
    },
    {
      name: "Acme Corp.",
      logo: (
        <HugeiconsIcon icon={AudioWave01Icon} strokeWidth={2} />
      ),
      plan: "Startup",
    },
    {
      name: "Evil Corp.",
      logo: (
        <HugeiconsIcon icon={CommandIcon} strokeWidth={2} />
      ),
      plan: "Free",
    },
  ],
}

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  user: {
    name: string
    email: string
    avatar?: string | null
  }
  onSignOut?: () => void
  isSigningOut?: boolean
}

export function AppSidebar({ user, onSignOut, isSigningOut, ...props }: AppSidebarProps) {
  // -- RBAC: get permissions to filter menu items --
  const { isAdmin, hasMenuAccess, isLoading } = usePermissions()

  // Filter the master menu list based on user's permissions
  // Admin sees everything; regular users see only accessible menus
  const filteredMenuItems = React.useMemo(() => {
    if (isLoading) return [] // Don't render anything while loading

    if (isAdmin) {
      // Admin gets all menus
      return ALL_MENU_ITEMS.map((item) => ({
        title: item.title,
        url: "#",
        icon: item.icon,
        isActive: item.title === "Dashboard", // Dashboard open by default
        items: item.items.map((sub) => ({
          title: sub.title,
          url: `#${sub.url}`,
        })),
      }))
    }

    // Regular user: filter by permissions
    return ALL_MENU_ITEMS
      .filter((item) => hasMenuAccess(item.title))  // only show accessible main menus
      .map((item) => ({
        title: item.title,
        url: "#",
        icon: item.icon,
        isActive: item.title === "Dashboard",
        items: item.items
          .filter((sub) => hasMenuAccess(item.title, sub.title))  // filter sub-items too
          .map((sub) => ({
            title: sub.title,
            url: `#${sub.url}`,
          })),
      }))
      .filter((item) => item.items.length > 0)  // remove empty main menus
  }, [isAdmin, hasMenuAccess, isLoading])

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        {/* Dynamic permission-filtered menu */}
        <NavMain items={filteredMenuItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser
          user={{
            name: user.name,
            email: user.email,
            avatar: user.avatar ?? "",
          }}
          onSignOut={onSignOut}
          isSigningOut={isSigningOut}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
