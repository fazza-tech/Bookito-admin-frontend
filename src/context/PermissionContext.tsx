// ============================================================
// Permission Context
// ============================================================
// Provides RBAC data (role, menus, permissions) to the entire
// app via React Context. Fetches /api/me/permissions after
// login and makes it available via usePermissions() hook.
//
// Key helpers:
//   - isAdmin: boolean
//   - hasMenuAccess(mainMenu, subMenu): can user see this menu?
//   - getPermissions(mainMenu, subMenu): { add, change, delete }
// ============================================================

import { createContext, useCallback, useEffect, useState, type ReactNode } from "react";

// -- Types --

/** Permission flags for a single submenu */
export type SubMenuPermissions = {
  add: boolean;
  change: boolean;
  delete: boolean;
};

/** A submenu item with its permissions */
export type SubMenuItem = {
  menu_name: string;
  url: string;
  permissions: SubMenuPermissions;
};

/** A main menu group containing submenus */
export type MainMenu = {
  main_menu: string;
  sub_menu: SubMenuItem[];
};

/** Full permissions response from /api/me/permissions */
export type PermissionsData = {
  role: "admin" | "user";
  groupName: string | null;
  groupId: string | null;
  menus: MainMenu[];
};

/** Context value exposed to consumers */
export type PermissionContextValue = {
  /** Raw permissions data */
  data: PermissionsData | null;
  /** Whether permissions are being loaded */
  isLoading: boolean;
  /** Is the current user an admin? */
  isAdmin: boolean;
  /** Check if user can access a specific submenu */
  hasMenuAccess: (mainMenu: string, subMenu?: string) => boolean;
  /** Get permission flags for a specific submenu */
  getPermissions: (mainMenu: string, subMenu: string) => SubMenuPermissions;
  /** Refetch permissions (e.g., after admin changes) */
  refetch: () => void;
};

// Default "no permission" object
const NO_PERMISSIONS: SubMenuPermissions = { add: false, change: false, delete: false };

// -- Context --

export const PermissionContext = createContext<PermissionContextValue>({
  data: null,
  isLoading: true,
  isAdmin: false,
  hasMenuAccess: () => false,
  getPermissions: () => NO_PERMISSIONS,
  refetch: () => {},
});

// -- Provider Component --

const API_BASE = import.meta.env.VITE_API_URL || "";

export function PermissionProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<PermissionsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch permissions from backend
  const fetchPermissions = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/me/permissions`, {
        credentials: "include",
      });

      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        // User might not be authenticated
        setData(null);
      }
    } catch {
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  // -- Helper: is admin? --
  const isAdmin = data?.role === "admin";

  // -- Helper: check menu access --
  const hasMenuAccess = useCallback(
    (mainMenu: string, subMenu?: string): boolean => {
      if (!data) return false;
      if (isAdmin) return true; // Admin has access to everything

      const mainEntry = data.menus.find((m) => m.main_menu === mainMenu);
      if (!mainEntry) return false;

      // If no submenu specified, check if any submenu is accessible
      if (!subMenu) return mainEntry.sub_menu.length > 0;

      return mainEntry.sub_menu.some((s) => s.menu_name === subMenu);
    },
    [data, isAdmin]
  );

  // -- Helper: get permissions for a submenu --
  const getPermissions = useCallback(
    (mainMenu: string, subMenu: string): SubMenuPermissions => {
      if (!data) return NO_PERMISSIONS;
      if (isAdmin) return { add: true, change: true, delete: true };

      const mainEntry = data.menus.find((m) => m.main_menu === mainMenu);
      if (!mainEntry) return NO_PERMISSIONS;

      const subEntry = mainEntry.sub_menu.find((s) => s.menu_name === subMenu);
      return subEntry?.permissions ?? NO_PERMISSIONS;
    },
    [data, isAdmin]
  );

  return (
    <PermissionContext.Provider
      value={{
        data,
        isLoading,
        isAdmin,
        hasMenuAccess,
        getPermissions,
        refetch: fetchPermissions,
      }}
    >
      {children}
    </PermissionContext.Provider>
  );
}
