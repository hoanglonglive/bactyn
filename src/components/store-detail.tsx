"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera, ShieldCheck, Search, X, LayoutGrid, List, Download } from "lucide-react";
import Link from "next/link";
import type { Store, OrderItem, OrderStatus, Profile } from "@/lib/types";
import { StatusFilter } from "./status-filter";
import { PhotoGrid } from "./photo-grid";
import { PhotoUpload } from "./photo-upload";
import { PhotoDetailModal } from "./photo-detail-modal";

interface StatusCounts {
  total: number;
  PURCHASED: number;
  PARTIALLY_PURCHASED: number;
  PENDING_ORDER: number;
  DELIVERED: number;
  IN_STOCK: number;
  OUT_OF_STOCK: number;
}

interface Props {
  store: Store;
  initialItems: OrderItem[];
  initialCounts: StatusCounts;
  profile: Profile | null;
  otherStores: { id: string; name: string }[];
}

export function StoreDetail({
  store,
  initialItems,
  initialCounts,
  profile,
  otherStores,
}: Props) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [counts, setCounts] = useState(initialCounts);
  const [activeFilter, setActiveFilter] = useState<OrderStatus | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showUpload, setShowUpload] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<OrderItem | null>(null);
  const isAdmin = profile?.role === "admin";

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // 1. Status Filter
      if (activeFilter && item.status !== activeFilter) return false;

      // 2. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchCode = item.order_code?.toLowerCase().includes(q);
        const matchName = item.customer_name?.toLowerCase().includes(q);
        const matchNote = item.note?.toLowerCase().includes(q);
        const matchSize = item.size?.toLowerCase().includes(q);
        const matchColor = item.color?.toLowerCase().includes(q);
        return matchCode || matchName || matchNote || matchSize || matchColor;
      }

      return true;
    });
  }, [items, activeFilter, searchQuery]);

  const handleFilterChange = useCallback((status: OrderStatus | null) => {
    setActiveFilter(status);
  }, []);

  const handleUploadComplete = useCallback(() => {
    setShowUpload(false);
    router.refresh();
  }, [router]);

  const handleStatusUpdate = useCallback(
    (photoId: string, newStatus: OrderStatus) => {
      setItems((prev) =>
        prev.map((item) =>
          item.id === photoId ? { ...item, status: newStatus } : item
        )
      );
      // Update counts
      const oldItem = items.find((i) => i.id === photoId);
      if (oldItem) {
        setCounts((prev) => ({
          ...prev,
          [oldItem.status]: Math.max(0, prev[oldItem.status] - 1),
          [newStatus]: prev[newStatus] + 1,
        }));
      }
    },
    [items]
  );

  const handlePhotoMoved = useCallback(
    (photoId: string) => {
      setItems((prev) => prev.filter((item) => item.id !== photoId));
      const movedItem = items.find((i) => i.id === photoId);
      if (movedItem) {
        setCounts((prev) => ({
          ...prev,
          total: Math.max(0, prev.total - 1),
          [movedItem.status]: Math.max(0, prev[movedItem.status] - 1),
        }));
      }
      setSelectedPhoto(null);
    },
    [items]
  );

  const handlePhotoDeleted = useCallback(
    (photoId: string) => {
      setItems((prev) => prev.filter((item) => item.id !== photoId));
      const deletedItem = items.find((i) => i.id === photoId);
      if (deletedItem) {
        setCounts((prev) => ({
          ...prev,
          total: Math.max(0, prev.total - 1),
          [deletedItem.status]: Math.max(0, prev[deletedItem.status] - 1),
        }));
      }
      setSelectedPhoto(null);
    },
    [items]
  );

  const handleInfoUpdate = useCallback(
    (photoId: string, data: Partial<OrderItem>) => {
      setItems((prev) =>
        prev.map((item) =>
          item.id === photoId ? { ...item, ...data } : item
        )
      );
    },
    []
  );

  const exportStoreOrdersCSV = useCallback(() => {
    if (!items || items.length === 0) return;

    const statusLabels: Record<string, string> = {
      PURCHASED: "Đã mua xong",
      PARTIALLY_PURCHASED: "Chưa mua xong",
      PENDING_ORDER: "Chờ gom order",
      DELIVERED: "Đã giao hàng",
      IN_STOCK: "Tồn kho",
      OUT_OF_STOCK: "Hết hàng",
    };

    const headers = ["Mã đơn", "Tên khách", "Size", "Màu sắc", "Trạng thái", "Ghi chú", "Ngày tạo"];
    const rows = items.map((item) => [
      `"${(item.order_code || "").replace(/"/g, '""')}"`,
      `"${(item.customer_name || "").replace(/"/g, '""')}"`,
      `"${(item.size || "").replace(/"/g, '""')}"`,
      `"${(item.color || "").replace(/"/g, '""')}"`,
      `"${statusLabels[item.status] || item.status}"`,
      `"${(item.note || "").replace(/"/g, '""')}"`,
      `"${new Date(item.created_at).toLocaleString("vi-VN")}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `DonHang_${store.name}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [items, store.name]);

  return (
    <div className="min-h-dvh bg-surface">
      {/* Header */}
      <header className="sticky top-0 z-30 glass border-b border-border-subtle shadow-md">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Link
              href="/stores"
              className="p-1.5 -ml-1.5 rounded-full bg-white/5 hover:bg-white/15 text-white/70 hover:text-white transition-all active:scale-95 flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold text-white truncate">
                {store.name}
              </h1>
              <p className="text-[10px] text-white/40 flex items-center gap-1.5">
                <span>Hiển thị {filteredItems.length} / {items.length} ảnh đơn</span>
                {isAdmin && (
                  <span className="inline-flex items-center gap-0.5 text-amber-400 font-semibold bg-amber-400/10 px-1.5 py-0.2 rounded border border-amber-400/20">
                    <ShieldCheck className="w-3 h-3" />
                    Admin
                  </span>
                )}
              </p>
            </div>
          </div>

          <button
            onClick={exportStoreOrdersCSV}
            className="p-2 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 hover:text-white transition-all active:scale-95 border border-indigo-500/30 flex items-center gap-1.5 text-xs font-semibold flex-shrink-0"
            title="Xuất danh sách đơn hàng ra CSV"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Xuất CSV</span>
          </button>
        </div>

        {/* Instant Search Bar & View Mode Toggle */}
        <div className="px-4 pb-2 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo mã đơn, tên khách, size, ghi chú..."
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-surface-elevated border border-border-subtle text-xs text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Grid / List Mode Toggle */}
          <div className="flex items-center bg-surface-elevated rounded-xl p-1 border border-border-subtle shadow-sm flex-shrink-0">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === "grid"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-white/40 hover:text-white/70"
              }`}
              title="Xem dạng lưới"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === "list"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-white/40 hover:text-white/70"
              }`}
              title="Xem dạng danh sách"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Status Filter Chips */}
        <StatusFilter
          counts={counts}
          activeFilter={activeFilter}
          onFilterChange={handleFilterChange}
        />
      </header>

      {/* Photo Grid / List View */}
      <main className="px-3 py-3 pb-28 max-w-6xl mx-auto">
        <PhotoGrid
          items={filteredItems}
          viewMode={viewMode}
          onPhotoClick={setSelectedPhoto}
        />
      </main>

      {/* Floating Action Button (FAB) - Add Photos (Admin Only) */}
      {isAdmin && (
        <button
          onClick={() => setShowUpload(true)}
          className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-violet-600 shadow-xl shadow-indigo-500/30 flex items-center justify-center hover:shadow-indigo-500/50 active:scale-90 transition-all border border-white/20"
          title="Tải ảnh đơn hàng"
        >
          <Camera className="w-6 h-6 text-white" />
        </button>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <PhotoUpload
          storeId={store.id}
          onClose={() => setShowUpload(false)}
          onComplete={handleUploadComplete}
        />
      )}

      {/* Photo Detail Lightbox Modal */}
      {selectedPhoto && (
        <PhotoDetailModal
          key={selectedPhoto.id}
          photo={selectedPhoto}
          allPhotos={filteredItems}
          isAdmin={isAdmin}
          otherStores={otherStores}
          onClose={() => setSelectedPhoto(null)}
          onStatusUpdate={handleStatusUpdate}
          onPhotoMoved={handlePhotoMoved}
          onPhotoDeleted={handlePhotoDeleted}
          onInfoUpdate={handleInfoUpdate}
          onNavigatePhoto={setSelectedPhoto}
        />
      )}
    </div>
  );
}
