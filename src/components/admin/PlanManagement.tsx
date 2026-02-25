// ============================================================
// Plan Management Page (Admin Only)
// ============================================================
// Accessible via Subscriptions -> Plans in the sidebar.
// Features:
//   - Shadcn Table listing all plans (Rooms & Price columns)
//   - Create / Edit plan via inline card form
//   - Bulk delete via checkbox selection
//   - Plan poster generator with WhatsApp share flow
// ============================================================

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PlusIcon,
  Pencil,
  Trash2,
  X,
  Save,
  Download,
  ImagePlus,
  Send,
  Sparkles,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "";

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

type PosterLayout = "highlight" | "table";
type PlanManagementTab = "plans" | "generator";

function formatCurrency(value: number) {
  return `Rs ${value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fillRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const safeRadius = Math.min(radius, width / 2, height / 2);

  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.lineTo(x + width - safeRadius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  ctx.lineTo(x + width, y + height - safeRadius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  ctx.lineTo(x + safeRadius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  ctx.lineTo(x, y + safeRadius);
  ctx.quadraticCurveTo(x, y, x + safeRadius, y);
  ctx.closePath();
  ctx.fill();
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return y;

  const lines: string[] = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i += 1) {
    const candidate = `${currentLine} ${words[i]}`;
    if (ctx.measureText(candidate).width <= maxWidth) {
      currentLine = candidate;
    } else {
      lines.push(currentLine);
      currentLine = words[i];
    }
  }
  lines.push(currentLine);

  if (lines.length > maxLines) {
    const visible = lines.slice(0, maxLines);
    let lastLine = visible[maxLines - 1];
    while (ctx.measureText(`${lastLine}...`).width > maxWidth && lastLine.length > 0) {
      lastLine = lastLine.slice(0, -1);
    }
    visible[maxLines - 1] = `${lastLine}...`;
    visible.forEach((line, index) => {
      ctx.fillText(line, x, y + index * lineHeight, maxWidth);
    });
    return y + visible.length * lineHeight;
  }

  lines.forEach((line, index) => {
    ctx.fillText(line, x, y + index * lineHeight, maxWidth);
  });

  return y + lines.length * lineHeight;
}

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
  const [activeTab, setActiveTab] = useState<PlanManagementTab>("plans");

  // Poster generator state
  const [imagePlanId, setImagePlanId] = useState("");
  const [posterLayout, setPosterLayout] = useState<PosterLayout>("highlight");
  const [posterTitle, setPosterTitle] = useState("Grow Your PMS Business");
  const [posterSubtitle, setPosterSubtitle] = useState(
    "Flexible subscription plans for properties of every size",
  );
  const [posterCta, setPosterCta] = useState("Message us to activate your plan");
  const [whatsAppMessage, setWhatsAppMessage] = useState(
    "Hi, sharing our latest subscription plan. Let me know if you want details.",
  );
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isSharingImage, setIsSharingImage] = useState(false);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);

  const selectedPosterPlan = useMemo(
    () => plans.find((plan) => plan.id === imagePlanId) ?? null,
    [plans, imagePlanId],
  );

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

  useEffect(() => {
    if (plans.length === 0) {
      setImagePlanId("");
      return;
    }

    setImagePlanId((prevId) => {
      if (prevId && plans.some((plan) => plan.id === prevId)) {
        return prevId;
      }
      return plans[0].id;
    });
  }, [plans]);

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
    const fromRooms = parseInt(formFromRooms, 10);
    const toRooms = parseInt(formToRooms, 10);
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
    if (!confirm(`Delete plan "${plan.fromRooms} to ${plan.toRooms} rooms"?`))
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
      setSelectedIds(new Set(plans.map((plan) => plan.id)));
    }
  };

  const createPosterImage = useCallback(() => {
    if (posterLayout === "highlight" && !selectedPosterPlan) {
      setShareError("Select a plan first.");
      return;
    }

    if (posterLayout === "table" && plans.length === 0) {
      setShareError("No plans available to render in table format.");
      return;
    }

    setIsGeneratingImage(true);
    setShareError(null);
    setShareStatus(null);

    try {
      if (posterLayout === "table") {
        const canvas = document.createElement("canvas");
        const canvasWidth = 1440;
        const rowHeight = 58;
        const tableTop = 320;
        const tableLeft = 110;
        const tableWidth = 1220;
        const headerHeight = 62;
        const footerSpace = 130;
        const tableHeight = headerHeight + plans.length * rowHeight;
        const canvasHeight = Math.max(980, tableTop + tableHeight + footerSpace);

        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          throw new Error("Your browser does not support canvas generation.");
        }

        const gradient = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
        gradient.addColorStop(0, "#082f49");
        gradient.addColorStop(0.5, "#0f766e");
        gradient.addColorStop(1, "#155e75");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        ctx.fillStyle = "rgba(255,255,255,0.08)";
        ctx.beginPath();
        ctx.arc(1260, 120, 190, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(170, canvasHeight - 90, 210, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "rgba(255,255,255,0.96)";
        fillRoundedRect(ctx, 50, 50, canvasWidth - 100, canvasHeight - 100, 30);

        ctx.textBaseline = "top";
        ctx.textAlign = "left";
        ctx.fillStyle = "#0f172a";
        ctx.font = "600 30px sans-serif";
        ctx.fillText("SUBSCRIPTION PLANS", 110, 110);

        ctx.fillStyle = "#0f172a";
        ctx.font = "700 62px sans-serif";
        const titleBottom = drawWrappedText(
          ctx,
          posterTitle.trim() || "Complete Plans Table",
          110,
          160,
          980,
          72,
          2,
        );

        ctx.fillStyle = "#334155";
        ctx.font = "500 30px sans-serif";
        drawWrappedText(
          ctx,
          posterSubtitle.trim() || "Share all available pricing slabs in one image",
          110,
          titleBottom + 14,
          980,
          40,
          2,
        );

        ctx.fillStyle = "#0f766e";
        fillRoundedRect(ctx, 1110, 110, 220, 68, 20);
        ctx.fillStyle = "#ffffff";
        ctx.font = "600 27px sans-serif";
        ctx.fillText(`${plans.length} plans`, 1160, 130);

        ctx.fillStyle = "#0f172a";
        fillRoundedRect(ctx, tableLeft, tableTop, tableWidth, headerHeight, 16);

        const columns = [
          { label: "From Rooms", width: 250 },
          { label: "To Rooms", width: 250 },
          { label: "Rate / Room / Month", width: 720 },
        ];

        let xCursor = tableLeft;
        ctx.fillStyle = "#f8fafc";
        ctx.font = "600 24px sans-serif";
        columns.forEach((column, index) => {
          ctx.fillText(column.label, xCursor + 16, tableTop + 18);
          xCursor += column.width;
          if (index < columns.length - 1) {
            ctx.fillStyle = "rgba(255,255,255,0.25)";
            ctx.fillRect(xCursor, tableTop + 8, 1, headerHeight - 16);
            ctx.fillStyle = "#f8fafc";
          }
        });

        plans.forEach((plan, index) => {
          const rowY = tableTop + headerHeight + index * rowHeight;
          ctx.fillStyle = index % 2 === 0 ? "#f8fafc" : "#e2e8f0";
          ctx.fillRect(tableLeft, rowY, tableWidth, rowHeight);

          ctx.fillStyle = "#334155";
          ctx.fillRect(tableLeft, rowY + rowHeight - 1, tableWidth, 1);

          ctx.fillStyle = "#0f172a";
          ctx.font = "500 23px sans-serif";
          const values = [
            String(plan.fromRooms),
            String(plan.toRooms),
            formatCurrency(plan.ratePerRoom),
          ];

          let cellX = tableLeft;
          values.forEach((value, valueIndex) => {
            ctx.fillText(value, cellX + 16, rowY + 18);
            cellX += columns[valueIndex].width;
            if (valueIndex < values.length - 1) {
              ctx.fillStyle = "#cbd5e1";
              ctx.fillRect(cellX, rowY + 8, 1, rowHeight - 16);
              ctx.fillStyle = "#0f172a";
            }
          });
        });

        ctx.fillStyle = "#0f766e";
        ctx.font = "700 34px sans-serif";
        drawWrappedText(
          ctx,
          posterCta.trim() || "Message us to activate any plan",
          110,
          tableTop + tableHeight + 34,
          980,
          40,
          2,
        );

        ctx.fillStyle = "#64748b";
        ctx.font = "500 22px sans-serif";
        ctx.fillText(
          `Generated on ${new Date().toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}`,
          110,
          canvasHeight - 110,
        );

        setGeneratedImageUrl(canvas.toDataURL("image/png"));
        setShareStatus("Full table poster generated successfully.");
        return;
      }

      const canvas = document.createElement("canvas");
      const size = 1080;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw new Error("Your browser does not support canvas generation.");
      }

      const gradient = ctx.createLinearGradient(0, 0, size, size);
      gradient.addColorStop(0, "#052e16");
      gradient.addColorStop(0.5, "#14532d");
      gradient.addColorStop(1, "#064e3b");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);

      ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
      ctx.beginPath();
      ctx.arc(920, 140, 180, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(120, 960, 220, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(255, 255, 255, 0.96)";
      fillRoundedRect(ctx, 70, 70, 940, 940, 40);

      ctx.textBaseline = "top";
      ctx.textAlign = "left";

      ctx.fillStyle = "#0f172a";
      ctx.font = "600 30px sans-serif";
      ctx.fillText("SUBSCRIPTION PLAN", 120, 128);

      ctx.fillStyle = "#0f172a";
      ctx.font = "700 64px sans-serif";
      const titleBottom = drawWrappedText(
        ctx,
        posterTitle.trim() || "Subscription Plans",
        120,
        180,
        840,
        76,
        2,
      );

      ctx.fillStyle = "#334155";
      ctx.font = "500 34px sans-serif";
      const subtitleBottom = drawWrappedText(
        ctx,
        posterSubtitle.trim() || "Pricing that scales with room count",
        120,
        titleBottom + 20,
        840,
        46,
        3,
      );

      const pricingBoxY = Math.max(subtitleBottom + 48, 420);
      ctx.fillStyle = "#0f172a";
      fillRoundedRect(ctx, 120, pricingBoxY, 840, 230, 28);

      ctx.fillStyle = "#a7f3d0";
      ctx.font = "500 30px sans-serif";
      ctx.fillText(
        `${selectedPosterPlan.fromRooms} to ${selectedPosterPlan.toRooms} rooms`,
        170,
        pricingBoxY + 44,
      );

      ctx.fillStyle = "#ffffff";
      ctx.font = "700 64px sans-serif";
      ctx.fillText(
        `${formatCurrency(selectedPosterPlan.ratePerRoom)} / room / month`,
        170,
        pricingBoxY + 102,
      );

      ctx.fillStyle = "#dcfce7";
      ctx.font = "500 28px sans-serif";
      ctx.fillText("* Exclusive pricing for selected room slab", 170, pricingBoxY + 180);

      ctx.fillStyle = "#14532d";
      ctx.font = "700 40px sans-serif";
      drawWrappedText(
        ctx,
        posterCta.trim() || "Message us to activate your plan",
        120,
        720,
        840,
        54,
        2,
      );

      ctx.fillStyle = "#64748b";
      ctx.font = "500 22px sans-serif";
      ctx.fillText(
        `Generated on ${new Date().toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })}`,
        120,
        940,
      );

      const dataUrl = canvas.toDataURL("image/png");
      setGeneratedImageUrl(dataUrl);
      setShareStatus("Poster generated successfully.");
    } catch (err) {
      setShareError(err instanceof Error ? err.message : "Failed to generate poster.");
    } finally {
      setIsGeneratingImage(false);
    }
  }, [plans, posterCta, posterLayout, posterSubtitle, posterTitle, selectedPosterPlan]);

  const downloadPoster = useCallback(() => {
    if (!generatedImageUrl) {
      setShareError("Generate a poster before downloading.");
      return;
    }

    const link = document.createElement("a");
    link.href = generatedImageUrl;
    link.download =
      posterLayout === "table"
        ? "plans-table.png"
        : `plan-${selectedPosterPlan?.fromRooms ?? "custom"}-${selectedPosterPlan?.toRooms ?? "poster"}.png`;
    link.click();
    setShareStatus("Poster downloaded.");
  }, [generatedImageUrl, posterLayout, selectedPosterPlan]);

  const sharePosterToWhatsApp = useCallback(async () => {
    if (!generatedImageUrl) {
      setShareError("Generate a poster before sharing.");
      return;
    }

    setIsSharingImage(true);
    setShareError(null);
    setShareStatus(null);

    try {
      const defaultMessage =
        posterLayout === "table"
          ? `Sharing our complete subscription plans table (${plans.length} plans).`
          : selectedPosterPlan
            ? `Plan ${selectedPosterPlan.fromRooms} to ${selectedPosterPlan.toRooms} rooms at ${formatCurrency(selectedPosterPlan.ratePerRoom)} per room.`
            : "Sharing our subscription plan.";

      const message = whatsAppMessage.trim() || defaultMessage;

      const imgResponse = await fetch(generatedImageUrl);
      const imgBlob = await imgResponse.blob();
      const fileName =
        posterLayout === "table"
          ? "plans-table.png"
          : selectedPosterPlan
            ? `plan-${selectedPosterPlan.fromRooms}-${selectedPosterPlan.toRooms}.png`
            : "plan-poster.png";
      const posterFile = new File([imgBlob], fileName, { type: "image/png" });

      const canShareFiles =
        typeof navigator !== "undefined" &&
        typeof navigator.share === "function" &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [posterFile] });

      if (canShareFiles) {
        await navigator.share({
          title: "Subscription Plan",
          text: message,
          files: [posterFile],
        });
        setShareStatus("Share sheet opened. Choose WhatsApp to send directly.");
        return;
      }

      window.open(
        `https://wa.me/?text=${encodeURIComponent(message)}`,
        "_blank",
        "noopener,noreferrer",
      );
      setShareStatus(
        "WhatsApp opened with your message. If image attach is unavailable, use Download PNG and attach manually.",
      );
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setShareStatus("Share cancelled.");
      } else {
        setShareError(err instanceof Error ? err.message : "Failed to share poster.");
      }
    } finally {
      setIsSharingImage(false);
    }
  }, [generatedImageUrl, plans.length, posterLayout, selectedPosterPlan, whatsAppMessage]);

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
        <p className="mt-1 text-sm">{error}</p>
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
          <h2 className="text-2xl font-bold tracking-tight">Subscription Plans</h2>
          <p className="text-sm text-muted-foreground">
            Manage room-based pricing plans
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === "plans" && (
            <>
              {selectedIds.size > 0 && (
                <Button
                  variant="destructive"
                  onClick={handleBulkDelete}
                  disabled={isDeleting}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {isDeleting ? "Deleting..." : `Delete (${selectedIds.size})`}
                </Button>
              )}
              {!isFormOpen && (
                <Button onClick={openCreate}>
                  <PlusIcon className="mr-2 h-4 w-4" />
                  New Plan
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="inline-flex w-fit rounded-lg border bg-muted/30 p-1">
        <Button
          size="sm"
          variant={activeTab === "plans" ? "default" : "ghost"}
          onClick={() => setActiveTab("plans")}
        >
          Plan Listing
        </Button>
        <Button
          size="sm"
          variant={activeTab === "generator" ? "default" : "ghost"}
          onClick={() => setActiveTab("generator")}
        >
          Image Generator
        </Button>
      </div>

      {/* Create/Edit Form */}
      {activeTab === "plans" && isFormOpen && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">
              {editingPlan
                ? `Edit Plan: ${editingPlan.fromRooms} to ${editingPlan.toRooms} rooms`
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

            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />
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
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Poster Generator */}
      {activeTab === "generator" && (
      <Card className="border-primary/30 bg-gradient-to-br from-background via-background to-primary/5">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-4 w-4 text-primary" />
                Plan Poster Generator
              </CardTitle>
              <CardDescription>
                Create a ready-to-share marketing image and send it to WhatsApp.
              </CardDescription>
            </div>
            {posterLayout === "highlight" && selectedPosterPlan && (
              <Badge variant="secondary" className="w-fit text-xs">
                {selectedPosterPlan.fromRooms} to {selectedPosterPlan.toRooms} rooms
              </Badge>
            )}
            {posterLayout === "table" && (
              <Badge variant="secondary" className="w-fit text-xs">
                {plans.length} total plans
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="poster-layout">Design Type</Label>
                <select
                  id="poster-layout"
                  value={posterLayout}
                  onChange={(e) => setPosterLayout(e.target.value as PosterLayout)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                >
                  <option value="highlight">Highlighted Plan</option>
                  <option value="table">Full Plans Table</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  Full Plans Table renders every row into one long shareable image.
                </p>
              </div>

              {posterLayout === "highlight" && (
                <div className="space-y-2">
                  <Label htmlFor="poster-plan">Plan</Label>
                  <select
                    id="poster-plan"
                    value={imagePlanId}
                    onChange={(e) => setImagePlanId(e.target.value)}
                    disabled={plans.length === 0}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                  >
                    {plans.length === 0 ? (
                      <option value="">Create a plan first</option>
                    ) : (
                      plans.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {`${plan.fromRooms} to ${plan.toRooms} rooms | ${formatCurrency(plan.ratePerRoom)} / room`}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="poster-title">Headline</Label>
                <Input
                  id="poster-title"
                  value={posterTitle}
                  onChange={(e) => setPosterTitle(e.target.value)}
                  placeholder="Main title for poster"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="poster-subtitle">Sub headline</Label>
                <Textarea
                  id="poster-subtitle"
                  value={posterSubtitle}
                  onChange={(e) => setPosterSubtitle(e.target.value)}
                  placeholder="Additional context"
                  className="min-h-20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="poster-cta">Call to action</Label>
                <Input
                  id="poster-cta"
                  value={posterCta}
                  onChange={(e) => setPosterCta(e.target.value)}
                  placeholder="Example: Message us to activate"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp-message">WhatsApp message</Label>
                <Textarea
                  id="whatsapp-message"
                  value={whatsAppMessage}
                  onChange={(e) => setWhatsAppMessage(e.target.value)}
                  placeholder="Message that goes with the shared image"
                  className="min-h-24"
                />
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  onClick={createPosterImage}
                  disabled={
                    isGeneratingImage ||
                    (posterLayout === "highlight"
                      ? !selectedPosterPlan
                      : plans.length === 0)
                  }
                >
                  <ImagePlus className="mr-2 h-4 w-4" />
                  {isGeneratingImage ? "Generating..." : "Generate Image"}
                </Button>

                <Button
                  variant="outline"
                  onClick={downloadPoster}
                  disabled={!generatedImageUrl}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download PNG
                </Button>

                <Button
                  variant="secondary"
                  onClick={sharePosterToWhatsApp}
                  disabled={!generatedImageUrl || isSharingImage}
                >
                  <Send className="mr-2 h-4 w-4" />
                  {isSharingImage ? "Sharing..." : "Share to WhatsApp"}
                </Button>
              </div>

              {shareStatus && (
                <p className="text-sm text-emerald-600">{shareStatus}</p>
              )}
              {shareError && (
                <p className="text-sm text-destructive">{shareError}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Direct image share works on devices/browsers that support file sharing.
                On desktop, WhatsApp opens with text and you can attach the downloaded image.
              </p>
            </div>

            <div className="rounded-xl border bg-muted/20 p-4">
              <div
                className={`relative mx-auto w-full max-w-[420px] overflow-auto rounded-xl border border-dashed bg-background/80 ${
                  posterLayout === "table" ? "max-h-[460px] min-h-[300px]" : "aspect-square"
                }`}
              >
                {generatedImageUrl ? (
                  <img
                    src={generatedImageUrl}
                    alt="Generated plan poster"
                    className={
                      posterLayout === "table"
                        ? "h-auto w-full object-contain"
                        : "h-full w-full object-cover"
                    }
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-6 text-center">
                    <Sparkles className="h-8 w-8 text-primary/70" />
                    <p className="text-sm font-medium">Poster preview appears here</p>
                    <p className="text-xs text-muted-foreground">
                      Choose a design type, customize the text, and click Generate Image.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      )}

      {/* Plans Table */}
      {activeTab === "plans" && (plans.length === 0 && !isFormOpen ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <h3 className="text-lg font-semibold">No plans yet</h3>
            <p className="mb-4 mt-1 text-sm text-muted-foreground">
              Create your first subscription plan
            </p>
            <Button onClick={openCreate}>
              <PlusIcon className="mr-2 h-4 w-4" />
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
                      aria-label={`Select plan ${plan.fromRooms} to ${plan.toRooms}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    {plan.fromRooms}
                  </TableCell>
                  <TableCell className="font-medium">{plan.toRooms}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(plan.ratePerRoom)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {plan.createdBy.name}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
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
      ))}
    </div>
  );
}
