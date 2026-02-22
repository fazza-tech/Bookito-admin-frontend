import { Loader2Icon } from "lucide-react"
import { useCallback, useEffect, useState } from "react"

import { AuthPage } from "@/components/auth-page"
import { DashboardPage } from "@/components/dashboard-page"
import { authClient } from "@/lib/auth-client"

const AUTH_PATH = "/"
const DASHBOARD_PATH = "/dashboard"

function getCurrentPath() {
  if (typeof window === "undefined") {
    return AUTH_PATH
  }

  return window.location.pathname === DASHBOARD_PATH
    ? DASHBOARD_PATH
    : AUTH_PATH
}

export function App() {
  const [currentPath, setCurrentPath] = useState(getCurrentPath)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const { data: session, isPending: isCheckingSession } = authClient.useSession()
  const user = session?.user ?? null

  const navigate = useCallback((path: string, replace = false) => {
    const nextPath = path === DASHBOARD_PATH ? DASHBOARD_PATH : AUTH_PATH

    if (replace) {
      window.history.replaceState(null, "", nextPath)
    } else {
      window.history.pushState(null, "", nextPath)
    }

    setCurrentPath(nextPath)
  }, [])

  useEffect(() => {
    const syncPath = () => {
      setCurrentPath(getCurrentPath())
    }

    window.addEventListener("popstate", syncPath)
    return () => window.removeEventListener("popstate", syncPath)
  }, [])

  useEffect(() => {
    if (isCheckingSession) {
      return
    }

    if (user && currentPath === AUTH_PATH) {
      navigate(DASHBOARD_PATH, true)
    }

    if (!user && currentPath === DASHBOARD_PATH) {
      navigate(AUTH_PATH, true)
    }
  }, [currentPath, isCheckingSession, navigate, user])

  const onAuthenticated = useCallback(() => {
    navigate(DASHBOARD_PATH, true)
  }, [navigate])

  const onSignOut = useCallback(async () => {
    setIsSigningOut(true)

    try {
      const result = await authClient.signOut()
      if (!result.error) {
        navigate(AUTH_PATH, true)
      }
    } finally {
      setIsSigningOut(false)
    }
  }, [navigate])

  if (currentPath === DASHBOARD_PATH && (isCheckingSession || !user)) {
    return (
      <main className="flex min-h-screen items-center justify-center gap-2 text-muted-foreground text-sm">
        <Loader2Icon className="h-4 w-4 animate-spin" />
        Loading dashboard...
      </main>
    )
  }

  if (currentPath === DASHBOARD_PATH && user) {
    return (
      <DashboardPage
        user={user}
        onSignOut={onSignOut}
        isSigningOut={isSigningOut}
      />
    )
  }

  return <AuthPage onAuthenticated={onAuthenticated} />
}

export default App
