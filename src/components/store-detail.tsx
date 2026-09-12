"use client";

import { useState, useCallback, useMemo } from "react";
import { ArrowLeft, Camera, ShieldCheck, Search, X } from "lucide-react";
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
  const [items, setItems] = useState(initialItems);
  const [counts, setCounts] = useState(initialCounts);
  const [activeFilter, setActiveFilter] = useState<OrderStatus | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
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

  const handleUploadComplete = useCallback((newItems: OrderItem[]) => {
    setItems((prev) => [...newItems, ...prev]);
    setCounts((prev) => ({
      ...prev,
      total: prev.total + newItems.length,
      PENDING_ORDER: prev.PENDING_ORDER + newItems.length,
    }));
    setShowUpload(false);
  }, []);

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

  return (
    <div className="min-h-dvh bg-surface">
      {/* Header */}
      <header className="sticky top-0 z-30 glass border-b border-border-subtle shadow-md">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link
            href="/stores"
            className="p-1.5 -ml-1.5 rounded-full bg-white/5 hover:bg-white/15 text-white/70 hover:text-white transition-all active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-white truncate">
              {store.name}
            </h1>
            <p className="text-[10px] text-white/40 flex items-center gap-1.5">
              <span>{counts.total} ảnh đơn</span>
              {isAdmin && (
                <span className="inline-flex items-center gap-0.5 text-amber-400 font-semibold bg-amber-400/10 px-1.5 py-0.2 rounded border border-amber-400/20">
                  <ShieldCheck className="w-3 h-3" />
                  Admin
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Instant Search Bar */}
        <div className="px-4 pb-2">
          <div className="relative">
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
        </div>

        {/* Status Filter Chips */}
        <StatusFilter
          counts={counts}
          activeFilter={activeFilter}
          onFilterChange={handleFilterChange}
        />
      </header>

      {/* Photo Grid */}
      <main className="px-3 py-3 pb-28">
        <PhotoGrid
          items={filteredItems}
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

      {/* Photo Detail Lightbox Modal with Full Prev/Next & Quick Navigation */}
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
