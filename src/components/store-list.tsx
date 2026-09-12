"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  Plus,
  LogOut,
  Package,
  ImageIcon,
  ShieldCheck,
  Search,
  LayoutGrid,
  List,
  Store as StoreIcon,
  Clock,
  CheckCircle2,
  Trash2,
  X,
  Users,
  CheckSquare,
  Square,
  Check,
  Loader2,
  Edit3,
  ListOrdered,
} from "lucide-react";
import type { StoreWithCounts, Profile, OrderItem, OrderStatus } from "@/lib/types";
import { CreateStoreDialog } from "./create-store-dialog";
import { DeleteStoreDialog } from "./delete-store-dialog";
import { EditStoreDialog } from "./edit-store-dialog";
import { ReorderStoresDialog } from "./reorder-stores-dialog";
import { AdminUserModal } from "./admin-user-modal";
import { StatusFilter } from "./status-filter";
import { PhotoGrid } from "./photo-grid";
import { PhotoDetailModal } from "./photo-detail-modal";
import { signOut } from "@/app/actions/auth-actions";
import { bulkDeleteStores } from "@/app/actions/store-actions";
import { useRouter } from "next/navigation";

interface StoreListProps {
  stores: StoreWithCounts[];
  profile: Profile | null;
  initialAllItems?: OrderItem[];
}

export function StoreList({ stores, profile, initialAllItems = [] }: StoreListProps) {
  const router = useRouter();

  // Auto refresh on mount so homepage status counts stay 100% up to date after updates
  useEffect(() => {
    router.refresh();
  }, [router]);

  const [allItems, setAllItems] = useState<OrderItem[]>(initialAllItems);
  const [activeTab, setActiveTab] = useState<"stores" | "all-photos">("stores");
  const [activeStatusFilter, setActiveStatusFilter] = useState<OrderStatus | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<OrderItem | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StoreWithCounts | null>(null);
  const [editTarget, setEditTarget] = useState<StoreWithCounts | null>(null);
  const [showReorder, setShowReorder] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Bulk Selection States
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const isAdmin = profile?.role === "admin";

  const toggleSelectStore = (storeId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(storeId)) {
        next.delete(storeId);
      } else {
        next.add(storeId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredStores.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredStores.map((s) => s.id)));
    }
  };

  const handleBulkDeleteStores = async () => {
    if (selectedIds.size === 0) return;
    setBulkDeleting(true);
    const ids = Array.from(selectedIds);
    await bulkDeleteStores(ids);
    setBulkDeleting(false);
    setShowBulkDeleteConfirm(false);
    setSelectedIds(new Set());
    router.refresh();
  };

  // Filter stores by search query
  const filteredStores = useMemo(() => {
    if (!searchQuery.trim()) return stores;
    const q = searchQuery.toLowerCase().trim();
    return stores.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.note && s.note.toLowerCase().includes(q))
    );
  }, [stores, searchQuery]);

  // Aggregate stats across all stores
  const stats = useMemo(() => {
    let totalItems = 0;
    let pendingCount = 0;
    let purchasedCount = 0;

    for (const s of stores) {
      totalItems += s.total_items || 0;
      pendingCount += s.pending_count || 0;
      purchasedCount += s.purchased_count || 0;
    }

    return {
      totalStores: stores.length,
      totalItems,
      pendingCount,
      purchasedCount,
    };
  }, [stores]);

  // Sync initialAllItems when props update
  useEffect(() => {
    if (initialAllItems && initialAllItems.length > 0) {
      setAllItems(initialAllItems);
    }
  }, [initialAllItems]);

  // Aggregate global status counts across ALL stores
  const globalStatusCounts = useMemo(() => {
    const counts = {
      total: allItems.length,
      PURCHASED: 0,
      PARTIALLY_PURCHASED: 0,
      PENDING_ORDER: 0,
      DELIVERED: 0,
      IN_STOCK: 0,
      OUT_OF_STOCK: 0,
      PAID_NOT_RECEIVED: 0,
    };
    for (const item of allItems) {
      if (item.status in counts) {
        counts[item.status]++;
      }
    }
    return counts;
  }, [allItems]);

  // Filter all order items when on "all-photos" tab or when status filter is selected
  const filteredAllPhotos = useMemo(() => {
    return allItems.filter((item) => {
      // 1. Status Filter
      if (activeStatusFilter && item.status !== activeStatusFilter) return false;

      // 2. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchCode = item.order_code?.toLowerCase().includes(q);
        const matchName = item.customer_name?.toLowerCase().includes(q);
        const matchNote = item.note?.toLowerCase().includes(q);
        const matchSize = item.size?.toLowerCase().includes(q);
        const matchColor = item.color?.toLowerCase().includes(q);
        const matchStore = item.store_name?.toLowerCase().includes(q);
        return matchCode || matchName || matchNote || matchSize || matchColor || matchStore;
      }

      return true;
    });
  }, [allItems, activeStatusFilter, searchQuery]);

  const handleStatusFilterChange = (status: OrderStatus | null) => {
    setActiveStatusFilter(status);
    if (status !== null) {
      setActiveTab("all-photos");
    }
  };

  const handlePhotoStatusUpdate = (photoId: string, newStatus: OrderStatus) => {
    setAllItems((prev) =>
      prev.map((item) => (item.id === photoId ? { ...item, status: newStatus } : item))
    );
    router.refresh();
  };

  const handlePhotoMoved = (photoId: string) => {
    setAllItems((prev) => prev.filter((item) => item.id !== photoId));
    setSelectedPhoto(null);
    router.refresh();
  };

  const handlePhotoDeleted = (photoId: string) => {
    setAllItems((prev) => prev.filter((item) => item.id !== photoId));
    setSelectedPhoto(null);
    router.refresh();
  };

  const handlePhotoInfoUpdate = (photoId: string, data: Partial<OrderItem>) => {
    setAllItems((prev) =>
      prev.map((item) => (item.id === photoId ? { ...item, ...data } : item))
    );
  };

  const otherStores = useMemo(
    () => stores.map((s) => ({ id: s.id, name: s.name })),
    [stores]
  );

  return (
    <div className="min-h-dvh bg-surface pb-28 select-none">
      {/* Top Header */}
      <header className="sticky top-0 z-30 glass-header">
        <div className="flex items-center justify-between px-4 py-3 max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Package className="w-5 h-5 text-black" />
            </div>
            <div>
              <h1 className="text-base font-black text-white leading-tight tracking-tight drop-shadow-sm">
                Bactyn Orders
              </h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[11px] font-medium text-white/60 truncate max-w-[140px]">
                  {profile?.full_name || profile?.email}
                </span>
                {isAdmin && (
                  <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold text-amber-300 bg-amber-400/20 px-2 py-0.5 rounded-full shadow-inner">
                    <ShieldCheck className="w-2.5 h-2.5" />
                    Admin
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={() => setShowUserModal(true)}
                className="px-3.5 py-2 rounded-2xl bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 font-extrabold text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow-md backdrop-blur-md"
                title="Quản lý thành viên & phân quyền"
              >
                <Users className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Quản lý User</span>
              </button>
            )}

            <button
              onClick={() => signOut()}
              className="p-2 rounded-2xl text-white/50 hover:text-white hover:bg-white/10 transition-all active:scale-95 backdrop-blur-md"
              title="Đăng xuất"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto px-4 pt-4 space-y-4">
        {/* Overview Stats Widgets */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3.5 rounded-3xl glass-card flex flex-col justify-between">
            <div className="flex items-center justify-between text-white/50 mb-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider">Gian hàng</span>
              <StoreIcon className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-xl font-black text-white drop-shadow-sm">{stats.totalStores}</p>
          </div>

          <div className="p-3.5 rounded-3xl glass-card flex flex-col justify-between">
            <div className="flex items-center justify-between text-white/50 mb-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider">Tổng ảnh</span>
              <ImageIcon className="w-4 h-4 text-amber-300" />
            </div>
            <p className="text-xl font-black text-white drop-shadow-sm">{stats.totalItems}</p>
          </div>

          <div className="p-3.5 rounded-3xl glass-card flex flex-col justify-between">
            <div className="flex items-center justify-between text-white/50 mb-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider">Chờ gom</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-xl font-black text-amber-400 drop-shadow-sm">{stats.pendingCount}</p>
          </div>
        </div>

        {/* Global Status Filter Bar */}
        <div className="-mx-4">
          <StatusFilter
            counts={globalStatusCounts}
            activeFilter={activeStatusFilter}
            onFilterChange={handleStatusFilterChange}
          />
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex items-center gap-2 p-1.5 rounded-3xl glass-panel">
          <button
            onClick={() => {
              setActiveTab("stores");
              setActiveStatusFilter(null);
            }}
            className={`flex-1 py-3 px-3 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
              activeTab === "stores" && !activeStatusFilter
                ? "bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 text-black shadow-lg shadow-amber-500/30"
                : "text-white/60 hover:text-white hover:bg-white/5"
            }`}
          >
            <StoreIcon className={`w-4 h-4 ${activeTab === "stores" && !activeStatusFilter ? "text-black" : "text-amber-400"}`} />
            <span>Album Gian Hàng ({filteredStores.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("all-photos")}
            className={`flex-1 py-3 px-3 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
              activeTab === "all-photos" || activeStatusFilter
                ? "bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 text-black shadow-lg shadow-amber-500/30"
                : "text-white/60 hover:text-white hover:bg-white/5"
            }`}
          >
            <ImageIcon className={`w-4 h-4 ${activeTab === "all-photos" || activeStatusFilter ? "text-black" : "text-amber-400"}`} />
            <span>Tất Cả Ảnh Đơn Hàng ({filteredAllPhotos.length})</span>
          </button>
        </div>

        {/* Search & View Mode Toolbar */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activeTab === "all-photos" || activeStatusFilter
                  ? "Tìm theo mã đơn, tên khách, gian hàng, size..."
                  : "Tìm kiếm gian hàng..."
              }
              className="w-full pl-11 pr-10 py-3 rounded-2xl glass-input text-xs text-white placeholder-white/30 focus:outline-none transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Grid / List Mode Toggle */}
          <div className="flex items-center glass-panel rounded-2xl p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2.5 rounded-xl transition-all ${
                viewMode === "grid"
                  ? "bg-amber-400 text-black font-extrabold shadow-md"
                  : "text-white/40 hover:text-white/80"
              }`}
              title="Xem dạng lưới"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2.5 rounded-xl transition-all ${
                viewMode === "list"
                  ? "bg-amber-400 text-black font-extrabold shadow-md"
                  : "text-white/40 hover:text-white/80"
              }`}
              title="Xem dạng danh sách"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Reorder Stores Button - Only for stores tab */}
          {activeTab === "stores" && !activeStatusFilter && (
            <button
              onClick={() => setShowReorder(true)}
              className="px-3.5 py-2.5 rounded-2xl text-xs font-black flex items-center gap-1.5 transition-all active:scale-95 glass-panel text-white/70 hover:text-white"
              title="Sắp xếp vị trí hiển thị album"
            >
              <ListOrdered className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Sắp xếp album</span>
            </button>
          )}

          {/* Select Mode Toggle (Admin) - Only for stores tab */}
          {isAdmin && activeTab === "stores" && !activeStatusFilter && (
            <button
              onClick={() => {
                setSelectMode(!selectMode);
                if (selectMode) setSelectedIds(new Set());
              }}
              className={`px-3.5 py-2.5 rounded-2xl text-xs font-black flex items-center gap-1.5 transition-all active:scale-95 ${
                selectMode
                  ? "bg-amber-400 text-black shadow-lg shadow-amber-500/30"
                  : "glass-panel text-white/70 hover:text-white"
              }`}
              title="Bật/Tắt chế độ chọn hàng loạt"
            >
              <CheckSquare className="w-4 h-4" />
              <span className="hidden sm:inline">{selectMode ? "Hủy chọn" : "Chọn nhiều"}</span>
            </button>
          )}
        </div>

        {/* Tab 1: Store Grid / List View */}
        {activeTab === "stores" && !activeStatusFilter ? (
          filteredStores.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4 rounded-3xl glass-panel">
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4 shadow-xl">
                <StoreIcon className="w-8 h-8 text-white/20" />
              </div>
              <p className="text-white/70 text-sm font-bold">
                {searchQuery ? "Không tìm thấy gian hàng phù hợp" : "Chưa có gian hàng nào"}
              </p>
              <p className="text-white/40 text-xs mt-1 max-w-xs">
                {searchQuery
                  ? "Thử tìm kiếm với từ khóa khác"
                  : "Bấm nút bên dưới để khởi tạo album gian hàng đầu tiên"}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => setShowCreate(true)}
                  className="mt-5 px-4 py-3 rounded-2xl btn-gold text-xs font-black shadow-lg shadow-amber-500/25 transition-all active:scale-95 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4 text-black" />
                  Tạo gian hàng mới
                </button>
              )}
            </div>
          ) : (
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3"
                  : "flex flex-col gap-3"
              }
            >
              {filteredStores.map((store, i) => (
                <StoreCard
                  key={store.id}
                  store={store}
                  index={i}
                  viewMode={viewMode}
                  isAdmin={isAdmin}
                  selectMode={selectMode}
                  isSelected={selectedIds.has(store.id)}
                  onToggleSelect={() => toggleSelectStore(store.id)}
                  onEdit={() => setEditTarget(store)}
                  onDelete={() => setDeleteTarget(store)}
                />
              ))}
            </div>
          )
        ) : (
          /* Tab 2: Unified All Order Photos Grid / List View across ALL stores */
          <PhotoGrid
            items={filteredAllPhotos}
            viewMode={viewMode}
            onPhotoClick={setSelectedPhoto}
          />
        )}
      </main>

      {/* Floating Action Button (FAB) - Admin Only */}
      {isAdmin && (
        <button
          onClick={() => setShowCreate(true)}
          className="fixed bottom-6 right-6 z-40 px-4 py-3.5 rounded-2xl btn-gold shadow-xl flex items-center gap-2.5 active:scale-95 transition-all text-black font-extrabold text-xs"
        >
          <Plus className="w-5 h-5 text-black" />
          <span className="hidden sm:inline">Tạo gian hàng mới</span>
        </button>
      )}

      {/* Dialogs */}
      {showCreate && (
        <CreateStoreDialog onClose={() => setShowCreate(false)} />
      )}
      {editTarget && (
        <EditStoreDialog
          store={editTarget}
          onClose={() => setEditTarget(null)}
        />
      )}
      {showReorder && (
        <ReorderStoresDialog
          stores={filteredStores}
          onClose={() => setShowReorder(false)}
        />
      )}
      {deleteTarget && (
        <DeleteStoreDialog
          store={deleteTarget}
          onClose={() => setDeleteTarget(null)}
        />
      )}
      {showUserModal && (
        <AdminUserModal
          onClose={() => setShowUserModal(false)}
          currentUserId={profile?.id}
        />
      )}

      {/* Photo Detail Lightbox Modal for All Photos View */}
      {selectedPhoto && (
        <PhotoDetailModal
          key={selectedPhoto.id}
          photo={selectedPhoto}
          allPhotos={filteredAllPhotos}
          isAdmin={isAdmin}
          otherStores={otherStores}
          onClose={() => setSelectedPhoto(null)}
          onStatusUpdate={handlePhotoStatusUpdate}
          onPhotoMoved={handlePhotoMoved}
          onPhotoDeleted={handlePhotoDeleted}
          onInfoUpdate={handlePhotoInfoUpdate}
          onNavigatePhoto={setSelectedPhoto}
        />
      )}

      {/* Floating Bottom Bulk Action Bar for Stores (Borderless Modal Layout) */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 glass-modal rounded-2xl px-5 py-3 shadow-2xl flex items-center gap-4 animate-fade-in max-w-md w-[92%] justify-between">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-amber-400 text-black font-black text-xs flex items-center justify-center shadow-md">
              {selectedIds.size}
            </span>
            <span className="text-xs font-extrabold text-white">Gian hàng đã chọn</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSelectAll}
              className="text-[11px] font-bold text-white/70 hover:text-white px-3 py-1.5 rounded-xl bg-white/10 transition-all"
            >
              {selectedIds.size === filteredStores.length ? "Bỏ chọn" : "Tất cả"}
            </button>

            {isAdmin && (
              <button
                onClick={() => setShowBulkDeleteConfirm(true)}
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow-lg flex items-center gap-1.5 transition-all active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa hàng loạt</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Bulk Delete Store Confirmation Modal (Borderless) */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/85 backdrop-blur-md"
            onClick={() => setShowBulkDeleteConfirm(false)}
          />
          <div className="relative w-full max-w-sm rounded-3xl glass-modal p-6 text-center shadow-2xl animate-fade-in border-none">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-extrabold text-white mb-1">
              Xóa {selectedIds.size} gian hàng đã chọn?
            </h3>
            <p className="text-xs text-white/60 mb-5">
              Hành động này sẽ xóa vĩnh viễn các gian hàng này và tất cả các ảnh đơn hàng bên trong. Thao tác không thể hoàn tác!
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowBulkDeleteConfirm(false)}
                className="flex-1 rounded-2xl bg-white/10 py-2.5 text-xs font-bold text-white/80 hover:text-white transition-all active:scale-95"
              >
                Hủy
              </button>
              <button
                onClick={handleBulkDeleteStores}
                disabled={bulkDeleting}
                className="flex-1 rounded-2xl bg-rose-600 py-2.5 text-xs font-black text-white hover:bg-rose-500 disabled:opacity-50 flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg"
              >
                {bulkDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
                Xóa tất cả
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


function StoreStatusBreakdown({ store }: { store: StoreWithCounts }) {
  const items = [
    { key: "purchased", label: "Đã mua", emoji: "🟢", color: "text-emerald-300 bg-emerald-500/15 border-emerald-500/30", count: store.purchased_count || 0 },
    { key: "partially", label: "Chưa mua xong", emoji: "🟠", color: "text-orange-300 bg-orange-500/15 border-orange-500/30", count: store.partially_purchased_count || 0 },
    { key: "pending", label: "Chờ order", emoji: "🟡", color: "text-amber-300 bg-amber-500/15 border-amber-500/30", count: store.pending_count || 0 },
    { key: "delivered", label: "Đã giao", emoji: "🔵", color: "text-sky-300 bg-sky-500/15 border-sky-500/30", count: store.delivered_count || 0 },
    { key: "in_stock", label: "Tồn kho", emoji: "📦", color: "text-purple-300 bg-purple-500/15 border-purple-500/30", count: store.in_stock_count || 0 },
    { key: "out_of_stock", label: "Hết hàng", emoji: "🔴", color: "text-rose-300 bg-rose-500/15 border-rose-500/30", count: store.out_of_stock_count || 0 },
    { key: "paid_not_received", label: "Đã thanh toán - Chưa nhận", emoji: "💳", color: "text-indigo-300 bg-indigo-500/15 border-indigo-500/30", count: store.paid_not_received_count || 0 },
  ].filter((st) => st.count > 0);

  if (store.total_items === 0 || items.length === 0) {
    return (
      <div className="mt-2 text-[10px] font-medium text-white/30 italic">
        Chưa có đơn hàng
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-2">
      {items.map((st) => (
        <span
          key={st.key}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-bold backdrop-blur-md shadow-sm ${st.color}`}
        >
          <span>{st.emoji}</span>
          <span>{st.label}:</span>
          <span className="font-extrabold">{st.count}</span>
        </span>
      ))}
    </div>
  );
}

function StoreCard({
  store,
  index,
  viewMode,
  isAdmin,
  selectMode,
  isSelected,
  onToggleSelect,
  onEdit,
  onDelete,
}: {
  store: StoreWithCounts;
  index: number;
  viewMode: "grid" | "list";
  isAdmin: boolean;
  selectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const storeInitials = store.name.substring(0, 2).toUpperCase();

  if (viewMode === "list") {
    return (
      <div
        className="animate-fade-in relative group"
        style={{ animationDelay: `${Math.min(index * 30, 200)}ms` }}
      >
        {selectMode ? (
          <div
            onClick={onToggleSelect}
            className={`flex items-center gap-3.5 p-3.5 rounded-3xl glass-card transition-all cursor-pointer ${
              isSelected
                ? "bg-amber-400/15 ring-2 ring-amber-400 shadow-lg shadow-amber-500/25"
                : "hover:bg-white/[0.08]"
            }`}
          >
            {/* Checkbox Icon */}
            <div className={`w-6 h-6 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
              isSelected ? "bg-amber-400 text-black font-bold shadow-md" : "bg-black/50"
            }`}>
              {isSelected && <Check className="w-4 h-4" />}
            </div>

            {/* Cover Thumbnail */}
            <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-black/50 flex-shrink-0 shadow-md">
              {store.cover_url ? (
                <img
                  src={store.cover_url}
                  alt={store.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-amber-500/30 via-yellow-600/20 to-black flex items-center justify-center font-black text-amber-300 text-sm">
                  {storeInitials}
                </div>
              )}
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-black text-white truncate">
                  {store.name}
                </h3>
                <span className="text-[10px] font-extrabold text-white/80 bg-white/10 px-2.5 py-0.5 rounded-full flex-shrink-0 backdrop-blur-md shadow-sm">
                  {store.total_items} ảnh
                </span>
              </div>
              {store.note && (
                <p className="text-[11px] text-white/50 truncate mt-0.5">
                  {store.note}
                </p>
              )}
              <StoreStatusBreakdown store={store} />
            </div>
          </div>
        ) : (
          <Link
            href={`/stores/${store.id}`}
            prefetch={true}
            className="flex items-center gap-3.5 p-3.5 rounded-3xl glass-card hover:bg-white/[0.08] transition-all active:scale-[0.99]"
          >
            {/* Cover Thumbnail */}
            <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-black/50 flex-shrink-0 shadow-md">
              {store.cover_url ? (
                <img
                  src={store.cover_url}
                  alt={store.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-amber-500/30 via-yellow-600/20 to-black flex items-center justify-center font-black text-amber-300 text-sm">
                  {storeInitials}
                </div>
              )}
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-black text-white truncate group-hover:text-amber-300 transition-colors">
                  {store.name}
                </h3>
                <span className="text-[10px] font-extrabold text-white/80 bg-white/10 px-2.5 py-0.5 rounded-full flex-shrink-0 backdrop-blur-md shadow-sm">
                  {store.total_items} ảnh
                </span>
              </div>

              {store.note && (
                <p className="text-[11px] text-white/50 truncate mt-0.5">
                  {store.note}
                </p>
              )}

              {/* Status Breakdown Pills */}
              <StoreStatusBreakdown store={store} />
            </div>
          </Link>
        )}

        {/* Card Action Buttons (Edit / Delete) */}
        <div className="absolute right-3.5 top-3.5 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onEdit();
            }}
            className="p-2 rounded-xl bg-amber-500/90 text-black hover:bg-amber-400 transition-all backdrop-blur-md shadow-lg"
            title="Sửa album gian hàng"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          {isAdmin && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete();
              }}
              className="p-2 rounded-xl bg-rose-600/90 text-white hover:bg-rose-600 transition-all backdrop-blur-md shadow-lg"
              title="Xóa gian hàng"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Grid View Card
  return (
    <div
      className="animate-fade-in relative group"
      style={{ animationDelay: `${Math.min(index * 30, 200)}ms` }}
    >
      {selectMode ? (
        <div
          onClick={onToggleSelect}
          className={`block rounded-3xl overflow-hidden glass-card transition-all duration-300 cursor-pointer ${
            isSelected
              ? "bg-amber-400/15 ring-2 ring-amber-400 shadow-lg shadow-amber-500/25"
              : "hover:bg-white/[0.08]"
          }`}
        >
          {/* Cover Aspect Box */}
          <div className="relative aspect-[4/3] bg-black/50 overflow-hidden">
            {store.cover_url ? (
              <img
                src={store.cover_url}
                alt={store.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-amber-500/30 via-yellow-700/20 to-black flex flex-col items-center justify-center p-2 text-center">
                <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center font-black text-amber-300 text-base shadow-inner mb-1">
                  {storeInitials}
                </div>
                <span className="text-[9px] font-semibold text-white/40">Chưa có ảnh bìa</span>
              </div>
            )}

            {/* Checkbox Badge Overlay */}
            <div className={`absolute top-2.5 left-2.5 w-6 h-6 rounded-xl flex items-center justify-center transition-all ${
              isSelected ? "bg-amber-400 text-black font-bold shadow-lg" : "bg-black/60 backdrop-blur-md"
            }`}>
              {isSelected && <Check className="w-4 h-4" />}
            </div>

            {/* Photo Count Badge */}
            <div className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full bg-black/75 backdrop-blur-md text-[10px] font-black text-white flex items-center gap-1 shadow-lg">
              <ImageIcon className="w-3 h-3 text-amber-400" />
              <span>{store.total_items}</span>
            </div>
          </div>

          {/* Store Title & Badges */}
          <div className="p-3.5">
            <h3 className="text-sm font-black text-white truncate">
              {store.name}
            </h3>
            {store.note && (
              <p className="text-[10px] text-white/50 truncate mt-0.5">
                {store.note}
              </p>
            )}
            <StoreStatusBreakdown store={store} />
          </div>
        </div>
      ) : (
        <Link
          href={`/stores/${store.id}`}
          prefetch={true}
          className="block rounded-3xl overflow-hidden glass-card hover:bg-white/[0.08] transition-all duration-300 active:scale-[0.98]"
        >
          {/* Cover Aspect Box */}
          <div className="relative aspect-[4/3] bg-black/50 overflow-hidden">
            {store.cover_url ? (
              <img
                src={store.cover_url}
                alt={store.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ease-out"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-amber-500/30 via-yellow-700/20 to-black flex flex-col items-center justify-center p-2 text-center">
                <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center font-black text-amber-300 text-base shadow-inner mb-1">
                  {storeInitials}
                </div>
                <span className="text-[9px] font-semibold text-white/40">Chưa có ảnh bìa</span>
              </div>
            )}

            {/* Photo Count Badge */}
            <div className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full bg-black/75 backdrop-blur-md text-[10px] font-black text-white flex items-center gap-1 shadow-lg">
              <ImageIcon className="w-3 h-3 text-amber-400" />
              <span>{store.total_items}</span>
            </div>
          </div>

          {/* Store Title & Badges */}
          <div className="p-3.5">
            <h3 className="text-sm font-black text-white truncate group-hover:text-amber-300 transition-colors">
              {store.name}
            </h3>

            {store.note && (
              <p className="text-[10px] text-white/50 truncate mt-0.5">
                {store.note}
              </p>
            )}

            {/* Status Breakdown Pills */}
            <StoreStatusBreakdown store={store} />
          </div>
        </Link>
      )}

      {/* Card Action Buttons (Edit / Delete) */}
      <div className="absolute top-2.5 left-2.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onEdit();
          }}
          className="w-7 h-7 rounded-full bg-amber-400 text-black backdrop-blur-md flex items-center justify-center transition-all shadow-lg hover:bg-amber-300 active:scale-90"
          title="Sửa album gian hàng"
        >
          <Edit3 className="w-3.5 h-3.5" />
        </button>
        {isAdmin && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete();
            }}
            className="w-7 h-7 rounded-full bg-rose-600/90 backdrop-blur-md flex items-center justify-center text-white text-xs font-bold shadow-lg hover:bg-rose-700 active:scale-90"
            title="Xóa gian hàng"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}


