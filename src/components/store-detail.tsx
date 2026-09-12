"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera, Plus, ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { Store, OrderItem, OrderStatus, Profile } from "@/lib/types";
import { STATUS_CONFIG } from "@/lib/types";
import { StatusFilter } from "./status-filter";
import { PhotoGrid } from "./photo-grid";
import { PhotoUpload } from "./photo-upload";
import { PhotoDetailModal } from "./photo-detail-modal";

interface StatusCounts {
  total: number;
  PURCHASED: number;
  PENDING_ORDER: number;
  DELIVERED: number;
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
  const [showUpload, setShowUpload] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<OrderItem | null>(null);
  const isAdmin = profile?.role === "admin";

  const filteredItems = activeFilter
    ? items.filter((item) => item.status === activeFilter)
    : items;

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
          [oldItem.status]: prev[oldItem.status] - 1,
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
          total: prev.total - 1,
          [movedItem.status]: prev[movedItem.status] - 1,
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
          total: prev.total - 1,
          [deletedItem.status]: prev[deletedItem.status] - 1,
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
      <header className="sticky top-0 z-30 glass border-b border-border-subtle">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link
            href="/stores"
            className="p-1.5 -ml-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-white truncate">
              {store.name}
            </h1>
            <p className="text-[10px] text-white/40 flex items-center gap-1">
              {counts.total} ảnh
              {isAdmin && (
                <span className="inline-flex items-center gap-0.5 ml-1 text-amber-400">
                  <ShieldCheck className="w-3 h-3" />
                  Admin
                </span>
              )}
            </p>
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
      <main className="px-2 py-3 pb-24">
        <PhotoGrid
          items={filteredItems}
          onPhotoClick={setSelectedPhoto}
        />
      </main>

      {/* FAB - Add Photos */}
      <button
        onClick={() => setShowUpload(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30 flex items-center justify-center hover:shadow-indigo-500/50 active:scale-95 transition-all"
      >
        <Camera className="w-6 h-6 text-white" />
      </button>

      {/* Upload Modal */}
      {showUpload && (
        <PhotoUpload
          storeId={store.id}
          onClose={() => setShowUpload(false)}
          onComplete={handleUploadComplete}
        />
      )}

      {/* Photo Detail Modal */}
      {selectedPhoto && (
        <PhotoDetailModal
          photo={selectedPhoto}
          isAdmin={isAdmin}
          otherStores={otherStores}
          onClose={() => setSelectedPhoto(null)}
          onStatusUpdate={handleStatusUpdate}
          onPhotoMoved={handlePhotoMoved}
          onPhotoDeleted={handlePhotoDeleted}
          onInfoUpdate={handleInfoUpdate}
        />
      )}
    </div>
  );
}
