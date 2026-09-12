"use client";

import { useState, useMemo } from "react";
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
} from "lucide-react";
import type { StoreWithCounts, Profile } from "@/lib/types";
import { CreateStoreDialog } from "./create-store-dialog";
import { DeleteStoreDialog } from "./delete-store-dialog";
import { AdminUserModal } from "./admin-user-modal";
import { signOut } from "@/app/actions/auth-actions";
import { bulkDeleteStores } from "@/app/actions/store-actions";
import { useRouter } from "next/navigation";

interface StoreListProps {
  stores: StoreWithCounts[];
  profile: Profile | null;
}

export function StoreList({ stores, profile }: StoreListProps) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StoreWithCounts | null>(null);
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
    setSelectMode(false);
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

  return (
    <div className="min-h-dvh bg-surface pb-28 select-none">
      {/* Top Header */}
      <header className="sticky top-0 z-30 glass border-b border-border-subtle shadow-lg">
        <div className="flex items-center justify-between px-4 py-3 max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 border border-white/20">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-white leading-tight tracking-tight">
                Bactyn Orders
              </h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[11px] font-medium text-white/50 truncate max-w-[140px]">
                  {profile?.full_name || profile?.email}
                </span>
                {isAdmin && (
                  <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-300 bg-amber-400/15 px-1.5 py-0.2 rounded-full border border-amber-400/30">
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
                className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 font-semibold text-xs flex items-center gap-1.5 border border-amber-500/30 transition-all active:scale-95 shadow-sm"
                title="Quản lý thành viên & phân quyền"
              >
                <Users className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Quản lý User</span>
              </button>
            )}

            <button
              onClick={() => signOut()}
              className="p-2 rounded-xl text-white/40 hover:text-white/80 hover:bg-white/10 transition-all active:scale-95 border border-transparent hover:border-white/10"
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
        <div className="grid grid-cols-3 gap-2.5">
          <div className="p-3 rounded-2xl bg-surface-elevated/80 border border-border-subtle shadow-md flex flex-col justify-between">
            <div className="flex items-center justify-between text-white/40 mb-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider">Gian hàng</span>
              <StoreIcon className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <p className="text-lg font-extrabold text-white">{stats.totalStores}</p>
          </div>

          <div className="p-3 rounded-2xl bg-surface-elevated/80 border border-border-subtle shadow-md flex flex-col justify-between">
            <div className="flex items-center justify-between text-white/40 mb-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider">Tổng ảnh</span>
              <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <p className="text-lg font-extrabold text-white">{stats.totalItems}</p>
          </div>

          <div className="p-3 rounded-2xl bg-surface-elevated/80 border border-border-subtle shadow-md flex flex-col justify-between">
            <div className="flex items-center justify-between text-white/40 mb-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider">Chờ gom</span>
              <Clock className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <p className="text-lg font-extrabold text-amber-400">{stats.pendingCount}</p>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm gian hàng..."
              className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-surface-elevated border border-border-subtle text-xs text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Grid / List Mode Toggle */}
          <div className="flex items-center bg-surface-elevated rounded-2xl p-1 border border-border-subtle shadow-sm">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-xl transition-all ${
                viewMode === "grid"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-white/40 hover:text-white/70"
              }`}
              title="Xem dạng lưới"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-xl transition-all ${
                viewMode === "list"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-white/40 hover:text-white/70"
              }`}
              title="Xem dạng danh sách"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Select Mode Toggle (Admin) */}
          {isAdmin && (
            <button
              onClick={() => {
                setSelectMode(!selectMode);
                if (selectMode) setSelectedIds(new Set());
              }}
              className={`px-3 py-2 rounded-2xl border text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 ${
                selectMode
                  ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30"
                  : "bg-surface-elevated text-white/70 border-border-subtle hover:text-white"
              }`}
              title="Bật/Tắt chế độ chọn hàng loạt"
            >
              <CheckSquare className="w-4 h-4" />
              <span className="hidden sm:inline">{selectMode ? "Hủy chọn" : "Chọn nhiều"}</span>
            </button>
          )}
        </div>

        {/* Store Grid / List View */}
        {filteredStores.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4 rounded-3xl border border-dashed border-white/10 bg-surface-elevated/40">
            <div className="w-16 h-16 rounded-2xl bg-surface-overlay flex items-center justify-center mb-4 shadow-xl border border-border-subtle">
              <StoreIcon className="w-8 h-8 text-white/20" />
            </div>
            <p className="text-white/60 text-sm font-semibold">
              {searchQuery ? "Không tìm thấy gian hàng phù hợp" : "Chưa có gian hàng nào"}
            </p>
            <p className="text-white/30 text-xs mt-1 max-w-xs">
              {searchQuery
                ? "Thử tìm kiếm với từ khóa khác"
                : "Bấm nút bên dưới để khởi tạo album gian hàng đầu tiên"}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowCreate(true)}
                className="mt-5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-xs font-bold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all active:scale-95 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
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
                onDelete={() => setDeleteTarget(store)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Floating Action Button (FAB) - Admin Only */}
      {isAdmin && (
        <button
          onClick={() => setShowCreate(true)}
          className="fixed bottom-6 right-6 z-40 px-4 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-600 to-violet-600 shadow-xl shadow-indigo-500/35 flex items-center gap-2.5 hover:shadow-indigo-500/50 active:scale-95 transition-all border border-white/20 text-white font-bold text-xs"
        >
          <Plus className="w-5 h-5 text-white" />
          <span className="hidden sm:inline">Tạo gian hàng mới</span>
        </button>
      )}

      {/* Dialogs */}
      {showCreate && (
        <CreateStoreDialog onClose={() => setShowCreate(false)} />
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

      {/* Floating Bottom Bulk Action Bar for Stores */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 glass border border-white/20 rounded-2xl px-5 py-3 shadow-2xl flex items-center gap-4 animate-fade-in max-w-md w-[92%] justify-between">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-md">
              {selectedIds.size}
            </span>
            <span className="text-xs font-bold text-white">Gian hàng đã chọn</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSelectAll}
              className="text-[11px] font-semibold text-white/70 hover:text-white px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 transition-all border border-white/10"
            >
              {selectedIds.size === filteredStores.length ? "Bỏ chọn" : "Tất cả"}
            </button>

            {isAdmin && (
              <button
                onClick={() => setShowBulkDeleteConfirm(true)}
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 flex items-center gap-1.5 transition-all active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa hàng loạt</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Bulk Delete Store Confirmation Modal */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowBulkDeleteConfirm(false)}
          />
          <div className="relative w-full max-w-sm rounded-3xl bg-surface-elevated border border-border-subtle p-6 text-center shadow-2xl animate-fade-in">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center mb-3 border border-rose-500/30">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-extrabold text-white mb-1">
              Xóa {selectedIds.size} gian hàng đã chọn?
            </h3>
            <p className="text-xs text-white/50 mb-5">
              Hành động này sẽ xóa vĩnh viễn các gian hàng này và tất cả các ảnh đơn hàng bên trong. Thao tác không thể hoàn tác!
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowBulkDeleteConfirm(false)}
                className="flex-1 rounded-2xl border border-border-subtle py-2.5 text-xs font-semibold text-white/70 hover:text-white transition-all active:scale-95"
              >
                Hủy
              </button>
              <button
                onClick={handleBulkDeleteStores}
                disabled={bulkDeleting}
                className="flex-1 rounded-2xl bg-rose-600 py-2.5 text-xs font-bold text-white hover:bg-rose-500 disabled:opacity-50 flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-rose-600/30"
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

function StoreCard({
  store,
  index,
  viewMode,
  isAdmin,
  selectMode,
  isSelected,
  onToggleSelect,
  onDelete,
}: {
  store: StoreWithCounts;
  index: number;
  viewMode: "grid" | "list";
  isAdmin: boolean;
  selectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
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
            className={`flex items-center gap-3.5 p-3 rounded-2xl bg-surface-elevated border transition-all cursor-pointer shadow-md ${
              isSelected
                ? "border-indigo-500 bg-indigo-500/10 ring-2 ring-indigo-500/50"
                : "border-border-subtle hover:border-white/20"
            }`}
          >
            {/* Checkbox Icon */}
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
              isSelected ? "bg-indigo-600 text-white shadow-md" : "border-2 border-white/30 bg-black/40"
            }`}>
              {isSelected && <Check className="w-4 h-4" />}
            </div>

            {/* Cover Thumbnail */}
            <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-surface-overlay flex-shrink-0 border border-white/10">
              {store.cover_url ? (
                <img
                  src={store.cover_url}
                  alt={store.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-indigo-900/60 to-purple-900/60 flex items-center justify-center font-black text-indigo-200 text-sm">
                  {storeInitials}
                </div>
              )}
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-white truncate">
                  {store.name}
                </h3>
                <span className="text-[10px] font-bold text-white/60 bg-white/10 px-2 py-0.5 rounded-full border border-white/10 flex-shrink-0">
                  {store.total_items} ảnh
                </span>
              </div>
              {store.note && (
                <p className="text-[11px] text-white/40 truncate mt-0.5">
                  {store.note}
                </p>
              )}
            </div>
          </div>
        ) : (
          <Link
            href={`/stores/${store.id}`}
            prefetch={true}
            className="flex items-center gap-3.5 p-3 rounded-2xl bg-surface-elevated border border-border-subtle hover:border-indigo-500/50 hover:bg-surface-elevated/80 transition-all active:scale-[0.99] shadow-md hover:shadow-xl"
          >
          {/* Cover Thumbnail */}
          <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-surface-overlay flex-shrink-0 border border-white/10">
            {store.cover_url ? (
              <img
                src={store.cover_url}
                alt={store.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-indigo-900/60 to-purple-900/60 flex items-center justify-center font-black text-indigo-200 text-sm">
                {storeInitials}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-white truncate group-hover:text-indigo-300 transition-colors">
                {store.name}
              </h3>
              <span className="text-[10px] font-bold text-white/60 bg-white/10 px-2 py-0.5 rounded-full border border-white/10 flex-shrink-0">
                {store.total_items} ảnh
              </span>
            </div>

            {store.note && (
              <p className="text-[11px] text-white/40 truncate mt-0.5">
                {store.note}
              </p>
            )}

            {/* Status counts mini pills */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {store.purchased_count > 0 && (
                <span className="text-[9px] font-semibold px-1.5 py-0.3 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  🟢 {store.purchased_count} đã mua xong
                </span>
              )}
              {store.partially_purchased_count > 0 && (
                <span className="text-[9px] font-semibold px-1.5 py-0.3 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  🟠 {store.partially_purchased_count} chưa mua xong
                </span>
              )}
              {store.pending_count > 0 && (
                <span className="text-[9px] font-semibold px-1.5 py-0.3 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  🟡 {store.pending_count} chờ order
                </span>
              )}
              {store.delivered_count > 0 && (
                <span className="text-[9px] font-semibold px-1.5 py-0.3 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30">
                  🔵 {store.delivered_count} đã giao
                </span>
              )}
              {store.in_stock_count > 0 && (
                <span className="text-[9px] font-semibold px-1.5 py-0.3 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  📦 {store.in_stock_count} tồn kho
                </span>
              )}
              {store.out_of_stock_count > 0 && (
                <span className="text-[9px] font-semibold px-1.5 py-0.3 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  🔴 {store.out_of_stock_count} hết hàng
                </span>
              )}
            </div>
          </div>
        </Link>
        )}

        {/* Admin Delete Button */}
        {isAdmin && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete();
            }}
            className="absolute right-3 top-3 p-1.5 rounded-xl bg-rose-500/20 text-rose-400 hover:bg-rose-600 hover:text-white transition-all opacity-0 group-hover:opacity-100 border border-rose-500/30"
            title="Xóa gian hàng"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
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
          className={`block rounded-3xl overflow-hidden bg-surface-elevated border transition-all duration-200 cursor-pointer shadow-md ${
            isSelected
              ? "border-indigo-500 bg-indigo-500/10 ring-2 ring-indigo-500/50"
              : "border-border-subtle hover:border-white/20"
          }`}
        >
          {/* Cover Aspect Box */}
          <div className="relative aspect-[4/3] bg-surface-overlay overflow-hidden">
            {store.cover_url ? (
              <img
                src={store.cover_url}
                alt={store.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-indigo-900/60 via-purple-950/60 to-slate-900 flex flex-col items-center justify-center p-2 text-center">
                <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center font-black text-indigo-300 text-base shadow-inner border border-white/15 mb-1">
                  {storeInitials}
                </div>
                <span className="text-[9px] font-semibold text-white/30">Chưa có ảnh bìa</span>
              </div>
            )}

            {/* Checkbox Badge Overlay */}
            <div className={`absolute top-2.5 left-2.5 w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
              isSelected ? "bg-indigo-600 text-white shadow-lg" : "border-2 border-white/40 bg-black/50"
            }`}>
              {isSelected && <Check className="w-4 h-4" />}
            </div>

            {/* Photo Count Badge */}
            <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md border border-white/15 text-[10px] font-bold text-white flex items-center gap-1 shadow-lg">
              <ImageIcon className="w-3 h-3 text-indigo-400" />
              <span>{store.total_items}</span>
            </div>
          </div>

          {/* Store Title & Badges */}
          <div className="p-3.5">
            <h3 className="text-sm font-bold text-white truncate">
              {store.name}
            </h3>
            {store.note && (
              <p className="text-[10px] text-white/40 truncate mt-0.5">
                {store.note}
              </p>
            )}
          </div>
        </div>
      ) : (
        <Link
          href={`/stores/${store.id}`}
          prefetch={true}
          className="block rounded-3xl overflow-hidden bg-surface-elevated border border-border-subtle hover:border-indigo-500/50 transition-all duration-200 active:scale-[0.98] shadow-md hover:shadow-2xl hover:-translate-y-1"
        >
        {/* Cover Aspect Box */}
        <div className="relative aspect-[4/3] bg-surface-overlay overflow-hidden">
          {store.cover_url ? (
            <img
              src={store.cover_url}
              alt={store.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ease-out"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-indigo-900/60 via-purple-950/60 to-slate-900 flex flex-col items-center justify-center p-2 text-center">
              <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center font-black text-indigo-300 text-base shadow-inner border border-white/15 mb-1">
                {storeInitials}
              </div>
              <span className="text-[9px] font-semibold text-white/30">Chưa có ảnh bìa</span>
            </div>
          )}

          {/* Photo Count Badge */}
          <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md border border-white/15 text-[10px] font-bold text-white flex items-center gap-1 shadow-lg">
            <ImageIcon className="w-3 h-3 text-indigo-400" />
            <span>{store.total_items}</span>
          </div>
        </div>

        {/* Store Title & Badges */}
        <div className="p-3.5">
          <h3 className="text-sm font-bold text-white truncate group-hover:text-indigo-300 transition-colors">
            {store.name}
          </h3>

          {store.note && (
            <p className="text-[10px] text-white/40 truncate mt-0.5">
              {store.note}
            </p>
          )}

          {/* Status Breakdown Pills */}
          {store.total_items > 0 ? (
            <div className="flex items-center gap-1 mt-2.5 flex-wrap">
              {store.purchased_count > 0 && (
                <span className="text-[9px] font-semibold px-1.5 py-0.3 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                  🟢 {store.purchased_count}
                </span>
              )}
              {store.partially_purchased_count > 0 && (
                <span className="text-[9px] font-semibold px-1.5 py-0.3 rounded-md bg-orange-500/15 text-orange-400 border border-orange-500/20">
                  🟠 {store.partially_purchased_count}
                </span>
              )}
              {store.pending_count > 0 && (
                <span className="text-[9px] font-semibold px-1.5 py-0.3 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/20">
                  🟡 {store.pending_count}
                </span>
              )}
              {store.delivered_count > 0 && (
                <span className="text-[9px] font-semibold px-1.5 py-0.3 rounded-md bg-sky-500/15 text-sky-400 border border-sky-500/20">
                  🔵 {store.delivered_count}
                </span>
              )}
              {store.in_stock_count > 0 && (
                <span className="text-[9px] font-semibold px-1.5 py-0.3 rounded-md bg-purple-500/15 text-purple-400 border border-purple-500/20">
                  📦 {store.in_stock_count}
                </span>
              )}
              {store.out_of_stock_count > 0 && (
                <span className="text-[9px] font-semibold px-1.5 py-0.3 rounded-md bg-rose-500/15 text-rose-400 border border-rose-500/20">
                  🔴 {store.out_of_stock_count}
                </span>
              )}
            </div>
          ) : (
            <span className="inline-block mt-2.5 text-[9px] font-medium text-white/25">
              Chưa có đơn hàng
            </span>
          )}
        </div>
      </Link>
      )}

      {/* Admin Delete Button */}
      {isAdmin && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete();
          }}
          className="absolute top-2.5 left-2.5 w-7 h-7 rounded-full bg-rose-600/90 backdrop-blur-md border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-bold shadow-lg hover:bg-rose-700 active:scale-90"
          title="Xóa gian hàng"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
