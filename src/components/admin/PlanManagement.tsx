// ============================================================
// Plan Management Page (Admin Only)
// ============================================================
// Accessible via Subscriptions → Plans in the sidebar.
// Features:
//   - Shadcn Table listing all plans (Rooms & Price columns)
//   - Create / Edit plan via inline card form
//   - Bulk delete via checkbox selection
//   - Shows createdBy / updatedBy user info
// ============================================================

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PlusIcon, Pencil, Trash2, X, Save } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "";

// -- Types --

type UserRef = {
  id: string;
  name: string;
  email: string;
};

type PlanData = {
  id: string;
  fromRooms: number;
  toRooms: number;
  ratePerRoom: number;
  createdBy: UserRef;
  updatedBy: UserRef;
  createdAt: string;
  updatedAt: string;
};

// -- Main Component --

export function PlanManagement() {
  const [plans, setPlans] = useState<PlanData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanData | null>(null);
  const [formFromRooms, setFormFromRooms] = useState("");
  const [formToRooms, setFormToRooms] = useState("");
  const [formRatePerRoom, setFormRatePerRoom] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  // -- Fetch plans --
  const fetchPlans = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/plans`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch plans");
      const json = await res.json();
      setPlans(json.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  // -- Open create form --
  const openCreate = () => {
    setEditingPlan(null);
    setFormFromRooms("");
    setFormToRooms("");
    setFormRatePerRoom("");
    setFormError(null);
    setIsFormOpen(true);
  };

  // -- Open edit form --
  const openEdit = (plan: PlanData) => {
    setEditingPlan(plan);
    setFormFromRooms(String(plan.fromRooms));
    setFormToRooms(String(plan.toRooms));
    setFormRatePerRoom(String(plan.ratePerRoom));
    setFormError(null);
    setIsFormOpen(true);
  };

  // -- Save (create or update) --
  const handleSave = async () => {
    const fromRooms = parseInt(formFromRooms);
    const toRooms = parseInt(formToRooms);
    const ratePerRoom = parseFloat(formRatePerRoom);

    if (isNaN(fromRooms) || fromRooms < 1) {
      setFormError("From rooms must be at least 1");
      return;
    }
    if (isNaN(toRooms) || toRooms < fromRooms) {
      setFormError("To rooms must be >= From rooms");
      return;
    }
    if (isNaN(ratePerRoom) || ratePerRoom < 0) {
      setFormError("Rate per room must be a valid number >= 0");
      return;
    }

    setIsSaving(true);
    setFormError(null);

    try {
      const body = { fromRooms, toRooms, ratePerRoom };

      const url = editingPlan
        ? `${API_BASE}/api/plans/${editingPlan.id}`
        : `${API_BASE}/api/plans`;

      const res = await fetch(url, {
        method: editingPlan ? "PUT" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to save plan");
      }

      setIsFormOpen(false);
      fetchPlans();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsSaving(false);
    }
  };

  // -- Delete single plan --
  const handleDelete = async (plan: PlanData) => {
    if (!confirm(`Delete plan "${plan.fromRooms}–${plan.toRooms} rooms"?`))
      return;

    try {
      const res = await fetch(`${API_BASE}/api/plans/${plan.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete plan");
      fetchPlans();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete plan");
    }
  };

  // -- Bulk delete --
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} selected plan(s)?`)) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/api/plans/bulk-delete`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      if (!res.ok) throw new Error("Failed to delete plans");
      setSelectedIds(new Set());
      fetchPlans();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete plans");
    } finally {
      setIsDeleting(false);
    }
  };

  // -- Checkbox helpers --
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === plans.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(plans.map((p) => p.id)));
    }
  };

  // -- Loading state --
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // -- Error state --
  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 p-4 text-destructive">
        <p className="font-medium">Error loading plans</p>
        <p className="text-sm mt-1">{error}</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={fetchPlans}
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Subscription Plans
          </h2>
          <p className="text-muted-foreground text-sm">
            Manage room-based pricing plans
          </p>
        </div>
        <div className="flex gap-2">
          {selectedIds.size > 0 && (
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {isDeleting ? "Deleting..." : `Delete (${selectedIds.size})`}
            </Button>
          )}
          {!isFormOpen && (
            <Button onClick={openCreate}>
              <PlusIcon className="h-4 w-4 mr-2" />
              New Plan
            </Button>
          )}
        </div>
      </div>

      {/* Create/Edit Form */}
      {isFormOpen && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">
              {editingPlan
                ? `Edit Plan: ${editingPlan.fromRooms}–${editingPlan.toRooms} rooms`
                : "Create New Plan"}
            </CardTitle>
            <CardDescription>
              Define room count range and pricing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="from-rooms">From Rooms *</Label>
                <Input
                  id="from-rooms"
                  type="number"
                  min={1}
                  placeholder="e.g. 1"
                  value={formFromRooms}
                  onChange={(e) => setFormFromRooms(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="to-rooms">To Rooms *</Label>
                <Input
                  id="to-rooms"
                  type="number"
                  min={1}
                  placeholder="e.g. 50"
                  value={formToRooms}
                  onChange={(e) => setFormToRooms(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rate-room">Rate / Room *</Label>
                <Input
                  id="rate-room"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="e.g. 59.99"
                  value={formRatePerRoom}
                  onChange={(e) => setFormRatePerRoom(e.target.value)}
                />
              </div>
            </div>

            {/* Error message */}
            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" />
                {isSaving
                  ? "Saving..."
                  : editingPlan
                    ? "Update Plan"
                    : "Create Plan"}
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

      {/* Plans Table */}
      {plans.length === 0 && !isFormOpen ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <h3 className="font-semibold text-lg">No plans yet</h3>
            <p className="text-muted-foreground text-sm mt-1 mb-4">
              Create your first subscription plan
            </p>
            <Button onClick={openCreate}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Create First Plan
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={
                      plans.length > 0 && selectedIds.size === plans.length
                    }
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead>From Rooms</TableHead>
                <TableHead>To Rooms</TableHead>
                <TableHead className="text-right">Rate / Room</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead>Updated By</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((plan) => (
                <TableRow
                  key={plan.id}
                  data-state={selectedIds.has(plan.id) ? "selected" : undefined}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(plan.id)}
                      onCheckedChange={() => toggleSelect(plan.id)}
                      aria-label={`Select plan ${plan.fromRooms}–${plan.toRooms}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    {plan.fromRooms}
                  </TableCell>
                  <TableCell className="font-medium">{plan.toRooms}</TableCell>
                  <TableCell className="text-right">
                    ₹
                    {plan.ratePerRoom.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {plan.createdBy.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {plan.updatedBy.name}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => openEdit(plan)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(plan)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
