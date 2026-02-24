import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { useTranslation } from "react-i18next"
import { useCallback, useEffect, useState } from "react"

// -- RBAC: wrap dashboard with permission provider --
import { PermissionProvider } from "@/context/PermissionContext"

// -- Admin pages --
import { GroupManagement } from "@/components/admin/GroupManagement"
import { UserManagement } from "@/components/admin/UserManagement"
import { PlanManagement } from "@/components/admin/PlanManagement";


type DashboardUser = {
  name?: string | null
  email?: string | null
  image?: string | null
  language?: string | null
}

type DashboardPageProps = {
  user: DashboardUser
  onSignOut: () => void
  isSigningOut: boolean
}

export function DashboardPage({
  user,
  onSignOut,
  isSigningOut,
}: DashboardPageProps) {
  const { t, i18n } = useTranslation()

  // Sync i18n language with user's saved language on mount
  useEffect(() => {
    if (user.language && !i18n.language.startsWith(user.language)) {
      i18n.changeLanguage(user.language)
    }
  }, [user.language, i18n])

  // -- Hash-based page routing --
  const [currentPage, setCurrentPage] = useState(window.location.hash.slice(1) || "dashboard")

  const handleHashChange = useCallback(() => {
    setCurrentPage(window.location.hash.slice(1) || "dashboard")
  }, [])

  useEffect(() => {
    window.addEventListener("hashchange", handleHashChange)
    return () => window.removeEventListener("hashchange", handleHashChange)
  }, [handleHashChange])

  // Determine page title for breadcrumb
  const getPageTitle = () => {
    switch (currentPage) {
      case "team-users": return "Users"
      case "team-groups": return "Groups"
      case "subscription-plans": return "Plans"

      default: return t("dashboard.overview")
    }
  }

  // Render the correct page content based on hash
  const renderContent = () => {
    switch (currentPage) {
      case "team-users":
        return <UserManagement />
      case "team-groups":
        return <GroupManagement />
            case "subscription-plans":
        return <PlanManagement />

      default:
        return (
          <>
            <div className="grid auto-rows-min gap-4 md:grid-cols-3">
              <div className="bg-muted/50 aspect-video rounded-xl p-4">
                <p className="text-muted-foreground text-sm">{t("dashboard.welcome")}</p>
                <p className="mt-2 font-semibold text-lg">
                  {user.name ?? "Authenticated User"}
                </p>
              </div>
              <div className="bg-muted/50 aspect-video rounded-xl p-4">
                <p className="text-muted-foreground text-sm">{t("dashboard.email")}</p>
                <p className="mt-2 break-all font-medium">
                  {user.email ?? t("dashboard.no_email")}
                </p>
              </div>
              <div className="bg-muted/50 aspect-video rounded-xl p-4">
                <p className="text-muted-foreground text-sm">{t("dashboard.session")}</p>
                <p className="mt-2 font-medium">{t("dashboard.active")}</p>
              </div>
            </div>
            <div className="bg-muted/50 min-h-[50vh] rounded-xl p-6">
              <h2 className="font-semibold text-xl">{t("dashboard.workspace_title")}</h2>
              <p className="mt-2 text-muted-foreground text-sm">
                {t("dashboard.workspace_desc")}
              </p>
            </div>
          </>
        )
    }
  }

  return (
    <PermissionProvider>
    <SidebarProvider>
      <AppSidebar
        user={{
          name: user.name ?? "User",
          email: user.email ?? "",
          avatar: user.image,
        }}
        onSignOut={onSignOut}
        isSigningOut={isSigningOut}
      />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ms-1" />
          <Separator orientation="vertical" className="me-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>{t("dashboard.title")}</BreadcrumbPage>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{getPageTitle()}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
         
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          {renderContent()}
        </div>
      </SidebarInset>
    </SidebarProvider>
    </PermissionProvider>
  )
}
