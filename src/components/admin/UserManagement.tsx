// ============================================================
// User Management Page (Admin Only)
// ============================================================
// Accessible via Team → Users in the sidebar.
// Features:
//   - List all users with their roles and assigned groups
//   - Create new user (email, password, name, assign to group)
//   - Edit user (change name, group, role)
//   - Delete user with confirmation
//
// Admin creates users here — they don't self-register.
// Each user is assigned to a Group which controls their
// sidebar permissions.
// ============================================================

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { PlusIcon, Pencil, Trash2, X, Save, UserPlus, ShieldCheck, User } from "lucide-react"

const API_BASE = import.meta.env.VITE_API_URL || ""

// -- Types --

type GroupInfo = {
  id: string
  name: string
}

type UserData = {
  id: string
  name: string
  email: string
  role: string
  groupId: string | null
  group: GroupInfo | null
  createdAt: string
}

// -- Main Component --

export function UserManagement() {
  const [users, setUsers] = useState<UserData[]>([])
  const [groups, setGroups] = useState<GroupInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserData | null>(null)
  const [formName, setFormName] = useState("")
  const [formEmail, setFormEmail] = useState("")
  const [formPassword, setFormPassword] = useState("")
  const [formRole, setFormRole] = useState<"admin" | "user">("user")
  const [formGroupId, setFormGroupId] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // -- Fetch users and groups --
  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [usersRes, groupsRes] = await Promise.all([
        fetch(`${API_BASE}/api/users`, { credentials: "include" }),
        fetch(`${API_BASE}/api/groups`, { credentials: "include" }),
      ])

      if (!usersRes.ok) throw new Error("Failed to fetch users")
      if (!groupsRes.ok) throw new Error("Failed to fetch groups")

      const usersJson = await usersRes.json()
      const groupsJson = await groupsRes.json()

      setUsers(usersJson.data)
      setGroups(groupsJson.data.map((g: { id: string; name: string }) => ({ id: g.id, name: g.name })))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // -- Open create form --
  const openCreate = () => {
    setEditingUser(null)
    setFormName("")
    setFormEmail("")
    setFormPassword("")
    setFormRole("user")
    setFormGroupId("")
    setFormError(null)
    setIsFormOpen(true)
  }

  // -- Open edit form --
  const openEdit = (user: UserData) => {
    setEditingUser(user)
    setFormName(user.name)
    setFormEmail(user.email)
    setFormPassword("")  // Don't show existing password
    setFormRole(user.role as "admin" | "user")
    setFormGroupId(user.groupId ?? "")
    setFormError(null)
    setIsFormOpen(true)
  }

  // -- Save (create or update) --
  const handleSave = async () => {
    // Validation
    if (!formName.trim()) { setFormError("Name is required"); return }
    if (!editingUser && !formEmail.trim()) { setFormError("Email is required"); return }
    if (!editingUser && !formPassword) { setFormError("Password is required"); return }
    if (!editingUser && formPassword.length < 6) { setFormError("Password must be at least 6 characters"); return }

    setIsSaving(true)
    setFormError(null)

    try {
      if (editingUser) {
        // Update user
        const body: Record<string, unknown> = {
          name: formName.trim(),
          role: formRole,
          groupId: formGroupId || null,
        }

        const res = await fetch(`${API_BASE}/api/users/${editingUser.id}`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })

        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.message || "Failed to update user")
        }
      } else {
        // Create new user
        const body = {
          name: formName.trim(),
          email: formEmail.trim(),
          password: formPassword,
          role: formRole,
          groupId: formGroupId || undefined,
        }

        const res = await fetch(`${API_BASE}/api/users`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })

        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.message || "Failed to create user")
        }
      }

      setIsFormOpen(false)
      fetchData()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setIsSaving(false)
    }
  }

  // -- Delete user --
  const handleDelete = async (user: UserData) => {
    if (!confirm(`Delete user "${user.name}" (${user.email})? This cannot be undone.`)) return

    try {
      const res = await fetch(`${API_BASE}/api/users/${user.id}`, {
        method: "DELETE",
        credentials: "include",
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || "Failed to delete user")
      }
      fetchData()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete user")
    }
  }

  // -- Loading --
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    )
  }

  // -- Error --
  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 p-4 text-destructive">
        <p className="font-medium">Error loading users</p>
        <p className="text-sm mt-1">{error}</p>
        <Button variant="outline" size="sm" className="mt-2" onClick={fetchData}>
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Users</h2>
          <p className="text-muted-foreground text-sm">
            Create and manage user accounts
          </p>
        </div>
        {!isFormOpen && (
          <Button onClick={openCreate}>
            <PlusIcon className="h-4 w-4 mr-2" />
            New User
          </Button>
        )}
      </div>

      {/* Create/Edit Form */}
      {isFormOpen && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">
              {editingUser ? `Edit: ${editingUser.name}` : "Create New User"}
            </CardTitle>
            <CardDescription>
              {editingUser
                ? "Update user details and group assignment"
                : "Create a new user account with login credentials"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="user-name">Name *</Label>
                <Input
                  id="user-name"
                  placeholder="e.g. John Doe"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>

              {/* Email (only on create) */}
              {!editingUser && (
                <div className="space-y-2">
                  <Label htmlFor="user-email">Email *</Label>
                  <Input
                    id="user-email"
                    type="email"
                    placeholder="e.g. john@company.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                  />
                </div>
              )}

              {/* Password (only on create) */}
              {!editingUser && (
                <div className="space-y-2">
                  <Label htmlFor="user-password">Password *</Label>
                  <Input
                    id="user-password"
                    type="password"
                    placeholder="Min 6 characters"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                  />
                </div>
              )}

              {/* Role */}
              <div className="space-y-2">
                <Label htmlFor="user-role">Role</Label>
                <select
                  id="user-role"
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as "admin" | "user")}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {/* Group assignment */}
              <div className="space-y-2">
                <Label htmlFor="user-group">Assign Group</Label>
                <select
                  id="user-group"
                  value={formGroupId}
                  onChange={(e) => setFormGroupId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">No Group</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  {formRole === "admin"
                    ? "Admins have full access regardless of group"
                    : "Group determines which menus the user can see"}
                </p>
              </div>
            </div>

            {/* Error */}
            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Saving..." : editingUser ? "Update User" : "Create User"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsFormOpen(false)}
                disabled={isSaving}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Users List */}
      {users.length === 0 && !isFormOpen ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <UserPlus className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-semibold text-lg">No users yet</h3>
            <p className="text-muted-foreground text-sm mt-1 mb-4">
              Create your first user to get started
            </p>
            <Button onClick={openCreate}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Create First User
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {users.map((user) => (
            <Card key={user.id} className="group/card hover:border-primary/30 transition-colors">
              <CardContent className="flex items-center justify-between py-3 px-4">
                {/* User info */}
                <div className="flex items-center gap-3 min-w-0">
                  {/* Avatar placeholder */}
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                    {user.role === "admin" ? (
                      <ShieldCheck className="h-4 w-4 text-primary" />
                    ) : (
                      <User className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{user.name}</p>
                      <Badge
                        variant={user.role === "admin" ? "default" : "secondary"}
                        className="text-[10px] px-1.5 py-0"
                      >
                        {user.role}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                </div>

                {/* Group & actions */}
                <div className="flex items-center gap-3">
                  {user.group ? (
                    <Badge variant="outline" className="text-xs">
                      {user.group.name}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">No group</span>
                  )}

                  <div className="flex gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => openEdit(user)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(user)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
