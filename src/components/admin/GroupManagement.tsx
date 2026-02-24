// ============================================================
// Group Management Page (Admin Only)
// ============================================================
// Accessible via Team → Groups in the sidebar.
// Features:
//   - List all groups with user counts
//   - Create new group with permission matrix (checkboxes)
//   - Edit group name/description and permissions
//   - Delete group with confirmation
//
// The permission matrix shows all available menus from the
// master menu list, with add/change/delete checkboxes per submenu.
// ============================================================

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { ALL_MENU_ITEMS } from "@/lib/menu-config"
import { PlusIcon, Pencil, Trash2, X, Save, Users } from "lucide-react"

const API_BASE = import.meta.env.VITE_API_URL || ""

// -- Types --

type MenuPermissionData = {
  mainMenu: string
  subMenu: string
  url: string
  canAdd: boolean
  canChange: boolean
  canDelete: boolean
}

type GroupData = {
  id: string
  name: string
  description: string | null
  permissions: MenuPermissionData[]
  _count: { users: number }
  createdAt: string
}

// -- Permission Matrix Component --
// Shows all menus with checkboxes for add/change/delete per submenu

function PermissionMatrix({
  permissions,
  onChange,
}: {
  permissions: MenuPermissionData[]
  onChange: (updated: MenuPermissionData[]) => void
}) {
  // Build a lookup map for quick access: "mainMenu|subMenu" -> permission
  const permMap = new Map<string, MenuPermissionData>()
  permissions.forEach((p) => permMap.set(`${p.mainMenu}|${p.subMenu}`, p))

  // Toggle a specific permission
  const toggle = (mainMenu: string, subMenu: string, url: string, field: "canAdd" | "canChange" | "canDelete") => {
    const key = `${mainMenu}|${subMenu}`
    const existing = permMap.get(key)

    if (existing) {
      // Update existing permission
      const updated = permissions.map((p) =>
        p.mainMenu === mainMenu && p.subMenu === subMenu
          ? { ...p, [field]: !p[field] }
          : p
      )
      // If all permissions are false, remove the entry
      const target = updated.find((p) => p.mainMenu === mainMenu && p.subMenu === subMenu)
      if (target && !target.canAdd && !target.canChange && !target.canDelete) {
        onChange(updated.filter((p) => !(p.mainMenu === mainMenu && p.subMenu === subMenu)))
      } else {
        onChange(updated)
      }
    } else {
      // Add new permission entry with the toggled field
      onChange([
        ...permissions,
        {
          mainMenu,
          subMenu,
          url,
          canAdd: field === "canAdd",
          canChange: field === "canChange",
          canDelete: field === "canDelete",
        },
      ])
    }
  }

  // Toggle all permissions for a submenu (select/deselect all)
  const toggleAll = (mainMenu: string, subMenu: string, url: string) => {
    const key = `${mainMenu}|${subMenu}`
    const existing = permMap.get(key)
    const allChecked = existing && existing.canAdd && existing.canChange && existing.canDelete

    if (allChecked) {
      // Deselect all
      onChange(permissions.filter((p) => !(p.mainMenu === mainMenu && p.subMenu === subMenu)))
    } else {
      // Select all
      const filtered = permissions.filter((p) => !(p.mainMenu === mainMenu && p.subMenu === subMenu))
      onChange([
        ...filtered,
        { mainMenu, subMenu, url, canAdd: true, canChange: true, canDelete: true },
      ])
    }
  }

  return (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
      {ALL_MENU_ITEMS.map((menu) => (
        <div key={menu.title} className="rounded-lg border p-3">
          {/* Main Menu Header */}
          <h4 className="font-semibold text-sm mb-2 text-primary">{menu.title}</h4>

          {/* Sub-menu permission rows */}
          <div className="space-y-2">
            {menu.items.map((sub) => {
              const key = `${menu.title}|${sub.title}`
              const perm = permMap.get(key)
              const hasAny = perm && (perm.canAdd || perm.canChange || perm.canDelete)

              return (
                <div
                  key={key}
                  className={`flex items-center gap-4 rounded-md px-3 py-2 text-sm transition-colors ${
                    hasAny ? "bg-primary/5" : "bg-muted/30"
                  }`}
                >
                  {/* Submenu name + select all toggle */}
                  <button
                    type="button"
                    onClick={() => toggleAll(menu.title, sub.title, sub.url)}
                    className="min-w-[140px] text-left font-medium hover:text-primary transition-colors"
                    title="Toggle all permissions"
                  >
                    {sub.title}
                  </button>

                  {/* Permission checkboxes */}
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={perm?.canAdd ?? false}
                      onChange={() => toggle(menu.title, sub.title, sub.url, "canAdd")}
                      className="h-4 w-4 rounded border-gray-300 accent-primary"
                    />
                    <span className="text-xs text-muted-foreground">Add</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={perm?.canChange ?? false}
                      onChange={() => toggle(menu.title, sub.title, sub.url, "canChange")}
                      className="h-4 w-4 rounded border-gray-300 accent-primary"
                    />
                    <span className="text-xs text-muted-foreground">Change</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={perm?.canDelete ?? false}
                      onChange={() => toggle(menu.title, sub.title, sub.url, "canDelete")}
                      className="h-4 w-4 rounded border-gray-300 accent-primary"
                    />
                    <span className="text-xs text-muted-foreground">Delete</span>
                  </label>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// -- Main Page Component --

export function GroupManagement() {
  const [groups, setGroups] = useState<GroupData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Form state for create/edit
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<GroupData | null>(null)
  const [formName, setFormName] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [formPermissions, setFormPermissions] = useState<MenuPermissionData[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // -- Fetch groups --
  const fetchGroups = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/groups`, { credentials: "include" })
      if (!res.ok) throw new Error("Failed to fetch groups")
      const json = await res.json()
      setGroups(json.data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetchGroups() }, [fetchGroups])

  // -- Open create form --
  const openCreate = () => {
    setEditingGroup(null)
    setFormName("")
    setFormDescription("")
    setFormPermissions([])
    setFormError(null)
    setIsFormOpen(true)
  }

  // -- Open edit form --
  const openEdit = (group: GroupData) => {
    setEditingGroup(group)
    setFormName(group.name)
    setFormDescription(group.description ?? "")
    setFormPermissions(
      group.permissions.map((p) => ({
        mainMenu: p.mainMenu,
        subMenu: p.subMenu,
        url: p.url,
        canAdd: p.canAdd,
        canChange: p.canChange,
        canDelete: p.canDelete,
      }))
    )
    setFormError(null)
    setIsFormOpen(true)
  }

  // -- Save (create or update) --
  const handleSave = async () => {
    if (!formName.trim()) {
      setFormError("Group name is required")
      return
    }
    setIsSaving(true)
    setFormError(null)

    try {
      const body = {
        name: formName.trim(),
        description: formDescription.trim() || undefined,
        permissions: formPermissions,
      }

      const url = editingGroup
        ? `${API_BASE}/api/groups/${editingGroup.id}`
        : `${API_BASE}/api/groups`

      const res = await fetch(url, {
        method: editingGroup ? "PUT" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || "Failed to save group")
      }

      setIsFormOpen(false)
      fetchGroups()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setIsSaving(false)
    }
  }

  // -- Delete group --
  const handleDelete = async (group: GroupData) => {
    if (!confirm(`Delete group "${group.name}"? Users in this group will be unassigned.`)) return

    try {
      const res = await fetch(`${API_BASE}/api/groups/${group.id}`, {
        method: "DELETE",
        credentials: "include",
      })
      if (!res.ok) throw new Error("Failed to delete group")
      fetchGroups()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete group")
    }
  }

  // -- Loading state --
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  // -- Error state --
  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 p-4 text-destructive">
        <p className="font-medium">Error loading groups</p>
        <p className="text-sm mt-1">{error}</p>
        <Button variant="outline" size="sm" className="mt-2" onClick={fetchGroups}>
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
          <h2 className="text-2xl font-bold tracking-tight">Groups</h2>
          <p className="text-muted-foreground text-sm">
            Create permission groups and assign menu access
          </p>
        </div>
        {!isFormOpen && (
          <Button onClick={openCreate}>
            <PlusIcon className="h-4 w-4 mr-2" />
            New Group
          </Button>
        )}
      </div>

      {/* Create/Edit Form */}
      {isFormOpen && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">
              {editingGroup ? `Edit: ${editingGroup.name}` : "Create New Group"}
            </CardTitle>
            <CardDescription>
              Set group name and select menu permissions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Name & Description */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="group-name">Group Name *</Label>
                <Input
                  id="group-name"
                  placeholder="e.g. Front Desk Staff"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="group-desc">Description</Label>
                <Input
                  id="group-desc"
                  placeholder="e.g. Can manage front desk operations"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                />
              </div>
            </div>

            <Separator />

            {/* Permission Matrix */}
            <div>
              <Label className="mb-2 block">Menu Permissions</Label>
              <p className="text-xs text-muted-foreground mb-3">
                Click a submenu name to toggle all permissions. Check individual boxes for granular control.
              </p>
              <PermissionMatrix
                permissions={formPermissions}
                onChange={setFormPermissions}
              />
            </div>

            {/* Error message */}
            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Saving..." : editingGroup ? "Update Group" : "Create Group"}
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

      {/* Groups List */}
      {groups.length === 0 && !isFormOpen ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-semibold text-lg">No groups yet</h3>
            <p className="text-muted-foreground text-sm mt-1 mb-4">
              Create your first group to start assigning permissions
            </p>
            <Button onClick={openCreate}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Create First Group
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <Card key={group.id} className="relative group/card hover:border-primary/30 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{group.name}</CardTitle>
                    {group.description && (
                      <CardDescription className="mt-1 text-xs">
                        {group.description}
                      </CardDescription>
                    )}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => openEdit(group)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(group)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className="text-xs">
                    <Users className="h-3 w-3 mr-1" />
                    {group._count.users} user{group._count.users !== 1 ? "s" : ""}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {group.permissions.length} permission{group.permissions.length !== 1 ? "s" : ""}
                  </Badge>
                </div>

                {/* Mini permission preview */}
                {group.permissions.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {/* Show unique main menus as small badges */}
                    {[...new Set(group.permissions.map((p) => p.mainMenu))].map((menu) => (
                      <span
                        key={menu}
                        className="inline-block rounded bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
                      >
                        {menu}
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
