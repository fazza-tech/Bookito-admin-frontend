// ============================================================
// Menu Configuration (Master List)
// ============================================================
// This is the single source of truth for ALL sidebar menu items.
// Used by:
//   - app-sidebar.tsx: to render the dynamic sidebar
//   - Group management UI: to show the permission matrix
//   - Backend: also maintains a copy in routes/permissions.ts
//
// Each menu has an icon (from @hugeicons) and sub-items.
// The sidebar filters this list based on user permissions.
// ============================================================

import { HugeiconsIcon } from "@hugeicons/react";
import {
  ComputerTerminalIcon,
  Home05Icon,
  MoneyReceive01Icon,
  Invoice02Icon,
  MoneyBag02Icon,
  MoneyExchange01Icon,
  ChartAverageIcon,
  PieChartIcon,
  UserGroup03Icon,
  Settings01Icon,
} from "@hugeicons/core-free-icons";
import type { ReactNode } from "react";

// -- Types --

export type MenuSubItem = {
  title: string;     // Display name (matches subMenu in MenuPermission)
  url: string;       // Route URL
};

export type MenuItem = {
  title: string;     // Display name (matches mainMenu in MenuPermission)
  icon: ReactNode;
  items: MenuSubItem[];
};

// -- Master menu list --
// This matches the structure your backend uses in routes/permissions.ts
// Admin sees ALL of these; other users only see what their Group permits.

export const ALL_MENU_ITEMS: MenuItem[] = [
  {
    title: "Dashboard",
    icon: <HugeiconsIcon icon={ComputerTerminalIcon} strokeWidth={2} />,
    items: [
      { title: "Overview", url: "dashboard" },
    ],
  },
  {
    title: "Properties",
    icon: <HugeiconsIcon icon={Home05Icon} strokeWidth={2} />,
    items: [
      { title: "Property List", url: "properties" },
      { title: "Property Settings", url: "property-settings" },
    ],
  },
  {
    title: "Subscriptions",
    icon: <HugeiconsIcon icon={MoneyReceive01Icon} strokeWidth={2} />,
    items: [
      { title: "Plans", url: "subscription-plans" },
      { title: "Active Subscriptions", url: "active-subscriptions" },
    ],
  },
  {
    title: "Invoices",
    icon: <HugeiconsIcon icon={Invoice02Icon} strokeWidth={2} />,
    items: [
      { title: "Invoice List", url: "invoices" },
      { title: "Create Invoice", url: "create-invoice" },
    ],
  },
  {
    title: "Payments",
    icon: <HugeiconsIcon icon={MoneyBag02Icon} strokeWidth={2} />,
    items: [
      { title: "Payment List", url: "payments" },
      { title: "Payment History", url: "payment-history" },
    ],
  },
  {
    title: "Expenses",
    icon: <HugeiconsIcon icon={MoneyExchange01Icon} strokeWidth={2} />,
    items: [
      { title: "Expense List", url: "expenses" },
      { title: "Expense Categories", url: "expense-categories" },
    ],
  },
  {
    title: "Sales",
    icon: <HugeiconsIcon icon={ChartAverageIcon} strokeWidth={2} />,
    items: [
      { title: "Sales List", url: "sales" },
      { title: "Sales Reports", url: "sales-reports" },
    ],
  },
  {
    title: "Reports",
    icon: <HugeiconsIcon icon={PieChartIcon} strokeWidth={2} />,
    items: [
      { title: "Financial Reports", url: "financial-reports" },
      { title: "Analytics", url: "analytics" },
    ],
  },
  {
    title: "Team",
    icon: <HugeiconsIcon icon={UserGroup03Icon} strokeWidth={2} />,
    items: [
      { title: "Users", url: "team-users" },
      { title: "Groups", url: "team-groups" },
    ],
  },
  {
    title: "Settings",
    icon: <HugeiconsIcon icon={Settings01Icon} strokeWidth={2} />,
    items: [
      { title: "General", url: "settings-general" },
      { title: "Account", url: "settings-account" },
    ],
  },
];
