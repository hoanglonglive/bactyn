"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Camera,
  ShieldCheck,
  Search,
  X,
  LayoutGrid,
  List,
  CheckSquare,
  Trash2,
  ArrowRightLeft,
  Tag,
  ChevronDown,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import type { Store, OrderItem, OrderStatus, Profile } from "@/lib/types";
import { STATUS_CONFIG } from "@/lib/types";
import { StatusFilter } from "./status-filter";
import { PhotoGrid } from "./photo-grid";
import { PhotoUpload } from "./photo-upload";
import { PhotoDetailModal } from "./photo-detail-modal";
import {
  bulkDeleteOrderPhotos,
  bulkUpdatePhotoStatus,
  bulkMovePhotosToStore,
} from "@/app/actions/photo-actions";

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

  // Bulk Selection States
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkStatusMenu, setShowBulkStatusMenu] = useState(false);
  const [showBulkMoveModal, setShowBulkMoveModal] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  const toggleSelectPhoto = useCallback((item: OrderItem) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(item.id)) {
        next.delete(item.id);
      } else {
        next.add(item.id);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map((i) => i.id)));
    }
  }, [selectedIds.size, filteredItems]);

  const handleBulkStatusChange = async (newStatus: OrderStatus) => {
    if (selectedIds.size === 0) return;
    setBulkProcessing(true);
    const ids = Array.from(selectedIds);
    const result = await bulkUpdatePhotoStatus(ids, newStatus);
    if (!result.error) {
      setItems((prev) =>
        prev.map((i) => (selectedIds.has(i.id) ? { ...i, status: newStatus } : i))
      );
      setSelectedIds(new Set());
      setSelectMode(false);
      setShowBulkStatusMenu(false);
      router.refresh();
    }
    setBulkProcessing(false);
  };

  const handleBulkMove = async (targetStoreId: string) => {
    if (selectedIds.size === 0) return;
    setBulkProcessing(true);
    const ids = Array.from(selectedIds);
    const result = await bulkMovePhotosToStore(ids, targetStoreId);
    if (!result.error) {
      setItems((prev) => prev.filter((i) => !selectedIds.has(i.id)));
      setSelectedIds(new Set());
      setSelectMode(false);
      setShowBulkMoveModal(false);
      router.refresh();
    }
    setBulkProcessing(false);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setBulkProcessing(true);
    const ids = Array.from(selectedIds);
    const result = await bulkDeleteOrderPhotos(ids);
    if (!result.error) {
      setItems((prev) => prev.filter((i) => !selectedIds.has(i.id)));
      setSelectedIds(new Set());
      setSelectMode(false);
      setShowBulkDeleteModal(false);
      router.refresh();
    }
    setBulkProcessing(false);
  };

  const handleFilterChange = useCallback((status: OrderStatus | null) => {
    setActiveFilter(status);
  }, []);

  const handleUploadComplete = useCallback(
    (newItems: OrderItem[]) => {
      setShowUpload(false);
      if (newItems && newItems.length > 0) {
        setItems((prev) => [...newItems, ...prev]);
        setCounts((prev) => ({
          ...prev,
          total: prev.total + newItems.length,
          PENDING_ORDER: (prev.PENDING_ORDER || 0) + newItems.length,
        }));
      }
      router.refresh();
    },
    [router]
  );

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
      router.refresh();
    },
    [items, router]
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
      router.refresh();
    },
    [items, router]
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
      router.refresh();
    },
    [items, router]
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

          {/* Select Mode Toggle */}
          <button
            onClick={() => {
              setSelectMode(!selectMode);
              if (selectMode) setSelectedIds(new Set());
            }}
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 flex-shrink-0 ${
              selectMode
                ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30"
                : "bg-surface-elevated text-white/70 border-border-subtle hover:text-white"
            }`}
            title="Bật/Tắt chọn nhiều ảnh đơn hàng"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{selectMode ? "Hủy chọn" : "Chọn nhiều"}</span>
          </button>
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
          selectMode={selectMode}
          selectedIds={selectedIds}
          onToggleSelectPhoto={toggleSelectPhoto}
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

      {/* Floating Bottom Bulk Action Bar for Order Photos */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 glass border border-white/20 rounded-2xl px-4 py-2.5 shadow-2xl flex items-center gap-3 animate-fade-in max-w-xl w-[94%] justify-between">
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="w-7 h-7 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-md">
              {selectedIds.size}
            </span>
            <span className="text-xs font-bold text-white hidden xs:inline">Đã chọn</span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            <button
              onClick={handleSelectAll}
              className="text-[11px] font-semibold text-white/70 hover:text-white px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 transition-all border border-white/10"
            >
              {selectedIds.size === filteredItems.length ? "Bỏ chọn" : "Tất cả"}
            </button>

            {/* Bulk Status Update Menu Button */}
            <div className="relative">
              <button
                onClick={() => setShowBulkStatusMenu(!showBulkStatusMenu)}
                className="px-2.5 py-1.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-xs font-semibold flex items-center gap-1 border border-indigo-500/30 transition-all active:scale-95 shadow-sm"
              >
                <Tag className="w-3.5 h-3.5" />
                <span>Trạng thái</span>
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>

              {/* Status Selector Popover */}
              {showBulkStatusMenu && (
                <div className="absolute bottom-full mb-2 right-0 w-48 rounded-2xl bg-surface-elevated border border-border-subtle p-1.5 shadow-2xl z-60 animate-fade-in space-y-1">
                  <p className="text-[10px] font-bold text-white/40 px-2 py-1 uppercase tracking-wider">
                    Đổi trạng thái ({selectedIds.size} ảnh)
                  </p>
                  {(isAdmin
                    ? (["PURCHASED", "PARTIALLY_PURCHASED", "PENDING_ORDER", "DELIVERED", "IN_STOCK", "OUT_OF_STOCK"] as OrderStatus[])
                    : (["DELIVERED", "IN_STOCK", "PARTIALLY_PURCHASED"] as OrderStatus[])
                  ).map((st) => {
                    const cfg = STATUS_CONFIG[st];
                    return (
                      <button
                        key={st}
                        onClick={() => handleBulkStatusChange(st)}
                        disabled={bulkProcessing}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-white/10 text-left text-xs font-semibold text-white transition-colors disabled:opacity-50"
                      >
                        <span className={`w-2 h-2 rounded-full ${cfg.dotColor}`} />
                        <span>{cfg.labelVi}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Admin Bulk Move Button */}
            {isAdmin && otherStores.length > 0 && (
              <button
                onClick={() => setShowBulkMoveModal(true)}
                className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/90 text-xs font-semibold flex items-center gap-1 border border-white/15 transition-all active:scale-95 shadow-sm"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Chuyển</span>
              </button>
            )}

            {/* Admin Bulk Delete Button */}
            {isAdmin && (
              <button
                onClick={() => setShowBulkDeleteModal(true)}
                className="px-2.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 flex items-center gap-1 transition-all active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Bulk Move Modal */}
      {showBulkMoveModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowBulkMoveModal(false)}
          />
          <div className="relative w-full max-w-sm rounded-3xl bg-surface-elevated border border-border-subtle p-5 shadow-2xl animate-fade-in">
            <h3 className="text-base font-extrabold text-white mb-1 flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-indigo-400" />
              Chuyển {selectedIds.size} ảnh đơn hàng
            </h3>
            <p className="text-xs text-white/50 mb-4">
              Chọn gian hàng bạn muốn chuyển các ảnh đơn đã chọn sang:
            </p>
            <div className="space-y-1.5 max-h-60 overflow-y-auto mb-4 pr-1">
              {otherStores.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleBulkMove(s.id)}
                  disabled={bulkProcessing}
                  className="w-full p-3 rounded-2xl bg-surface/70 border border-border-subtle hover:border-indigo-500/50 hover:bg-surface-elevated text-left text-xs font-bold text-white transition-all flex items-center justify-between group disabled:opacity-50"
                >
                  <span>{s.name}</span>
                  <span className="text-[10px] font-semibold text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    Chuyển sang &rarr;
                  </span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowBulkMoveModal(false)}
              className="w-full py-2.5 rounded-2xl border border-border-subtle text-xs font-semibold text-white/70 hover:text-white transition-all"
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      {/* Bulk Delete Order Photos Modal */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowBulkDeleteModal(false)}
          />
          <div className="relative w-full max-w-sm rounded-3xl bg-surface-elevated border border-border-subtle p-6 text-center shadow-2xl animate-fade-in">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center mb-3 border border-rose-500/30">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-extrabold text-white mb-1">
              Xóa {selectedIds.size} ảnh đơn hàng?
            </h3>
            <p className="text-xs text-white/50 mb-5">
              Hành động này sẽ xóa vĩnh viễn các ảnh đơn hàng đã chọn khỏi hệ thống và giải phóng bộ nhớ. Thao tác không thể hoàn tác!
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowBulkDeleteModal(false)}
                className="flex-1 rounded-2xl border border-border-subtle py-2.5 text-xs font-semibold text-white/70 hover:text-white transition-all active:scale-95"
              >
                Hủy
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={bulkProcessing}
                className="flex-1 rounded-2xl bg-rose-600 py-2.5 text-xs font-bold text-white hover:bg-rose-500 disabled:opacity-50 flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-rose-600/30"
              >
                {bulkProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
                Xóa tất cả
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
