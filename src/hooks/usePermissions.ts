// ============================================================
// usePermissions Hook
// ============================================================
// Convenience hook to access the PermissionContext.
// Usage:
//   const { isAdmin, hasMenuAccess, getPermissions } = usePermissions();
//   if (hasMenuAccess("Dashboard")) { ... }
//   const { add, change, delete: canDelete } = getPermissions("Booking", "New Booking");
// ============================================================

import { useContext } from "react";
import { PermissionContext, type PermissionContextValue } from "@/context/PermissionContext";

export function usePermissions(): PermissionContextValue {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error("usePermissions must be used within a PermissionProvider");
  }
  return context;
}
