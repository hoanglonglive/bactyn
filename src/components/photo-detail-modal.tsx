"use client";

import { useState, useEffect, useCallback } from "react";
import {
  X,
  Trash2,
  ArrowRightLeft,
  ChevronDown,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Maximize2,
} from "lucide-react";
import type { OrderItem, OrderStatus } from "@/lib/types";
import { STATUS_CONFIG } from "@/lib/types";
import {
  updatePhotoStatus,
  updatePhotoInfo,
  movePhotoToStore,
  deleteOrderPhoto,
} from "@/app/actions/photo-actions";
import { cn } from "@/lib/utils";

interface Props {
  photo: OrderItem;
  allPhotos?: OrderItem[];
  isAdmin: boolean;
  otherStores: { id: string; name: string }[];
  onClose: () => void;
  onStatusUpdate: (photoId: string, newStatus: OrderStatus) => void;
  onPhotoMoved: (photoId: string) => void;
  onPhotoDeleted: (photoId: string) => void;
  onInfoUpdate: (photoId: string, data: Partial<OrderItem>) => void;
  onNavigatePhoto?: (targetPhoto: OrderItem) => void;
}

const STATUSES: OrderStatus[] = [
  "PURCHASED",
  "PENDING_ORDER",
  "DELIVERED",
  "OUT_OF_STOCK",
];

export function PhotoDetailModal({
  photo,
  allPhotos = [],
  isAdmin,
  otherStores,
  onClose,
  onStatusUpdate,
  onPhotoMoved,
  onPhotoDeleted,
  onInfoUpdate,
  onNavigatePhoto,
}: Props) {
  const currentPhoto = photo;
  const [currentStatus, setCurrentStatus] = useState(photo.status);
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [moving, setMoving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [statusAnimating, setStatusAnimating] = useState<OrderStatus | null>(null);

  // Editable fields
  const [orderCode, setOrderCode] = useState(photo.order_code || "");
  const [customerName, setCustomerName] = useState(photo.customer_name || "");
  const [size, setSize] = useState(photo.size || "");
  const [color, setColor] = useState(photo.color || "");
  const [note, setNote] = useState(photo.note || "");
  const [saving, setSaving] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Indexing for prev / next navigation
  const currentIndex = allPhotos.findIndex((p) => p.id === currentPhoto.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < allPhotos.length - 1;

  // Warm the browser/CDN cache for adjacent photos while the user reads the
  // current one. Navigation then usually paints without another visible wait.
  useEffect(() => {
    const adjacent = [allPhotos[currentIndex - 1], allPhotos[currentIndex + 1]];
    for (const item of adjacent) {
      if (item) {
        const preload = new window.Image();
        preload.src = item.image_url;
      }
    }
  }, [allPhotos, currentIndex]);

  const handlePrev = useCallback(() => {
    if (hasPrev && onNavigatePhoto) {
      onNavigatePhoto(allPhotos[currentIndex - 1]);
    }
  }, [hasPrev, currentIndex, allPhotos, onNavigatePhoto]);

  const handleNext = useCallback(() => {
    if (hasNext && onNavigatePhoto) {
      onNavigatePhoto(allPhotos[currentIndex + 1]);
    }
  }, [hasNext, currentIndex, allPhotos, onNavigatePhoto]);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlePrev, handleNext, onClose]);

  async function handleStatusChange(newStatus: OrderStatus) {
    if (newStatus === currentStatus) return;

    setStatusAnimating(newStatus);
    setCurrentStatus(newStatus);
    onStatusUpdate(currentPhoto.id, newStatus);

    await updatePhotoStatus(currentPhoto.id, newStatus);
    setTimeout(() => setStatusAnimating(null), 250);
  }

  async function handleSaveInfo() {
    setSaving(true);
    const data = {
      order_code: orderCode.trim(),
      customer_name: customerName.trim(),
      size: size.trim(),
      color: color.trim(),
      note: note.trim(),
    };

    await updatePhotoInfo(currentPhoto.id, data);
    onInfoUpdate(currentPhoto.id, data);
    setSaving(false);
  }

  async function handleMove(targetStoreId: string) {
    setMoving(true);
    const result = await movePhotoToStore(currentPhoto.id, targetStoreId);

    if (!result.error) {
      onPhotoMoved(currentPhoto.id);
      onClose();
    }
    setMoving(false);
    setShowMoveMenu(false);
  }

  async function handleDelete() {
    setDeleting(true);
    const result = await deleteOrderPhoto(currentPhoto.id);

    if (!result.error) {
      onPhotoDeleted(currentPhoto.id);
      onClose();
    }
    setDeleting(false);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col animate-fade-in select-none">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 safe-top">
        <button
          onClick={onClose}
          className="p-2 -ml-2 rounded-full bg-white/5 hover:bg-white/15 text-white/70 hover:text-white transition-all active:scale-95"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Counter */}
        {allPhotos.length > 0 && (
          <div className="text-xs font-semibold text-white/70 bg-white/10 px-3 py-1 rounded-full border border-white/10">
            {currentIndex + 1} / {allPhotos.length}
          </div>
        )}

        <div className="flex items-center gap-2">
          {/* Move Button */}
          <button
            onClick={() => setShowMoveMenu(!showMoveMenu)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 text-white/80 text-xs font-medium hover:bg-white/20 transition-all active:scale-95 border border-white/10"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Chuyển</span>
            <ChevronDown className="w-3 h-3 opacity-60" />
          </button>

          {/* Admin Delete */}
          {isAdmin && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/20 text-rose-300 text-xs font-medium hover:bg-rose-500/30 transition-all active:scale-95 border border-rose-500/30"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 min-h-0 flex flex-col overflow-y-auto lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(360px,420px)] lg:overflow-hidden">
        {/* Image Preview Container with Arrow Controls */}
        <div className="relative flex items-center justify-center p-2 h-[calc(100dvh-57px)] min-h-[calc(100dvh-57px)] shrink-0 group lg:h-full lg:min-h-0 lg:p-4">
          {/* Previous Arrow */}
          {hasPrev && (
            <button
              onClick={handlePrev}
              className="absolute left-3 z-10 w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-white/80 hover:text-white hover:bg-black/80 flex items-center justify-center transition-all active:scale-90 shadow-2xl"
              title="Ảnh trước (←)"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Next Arrow */}
          {hasNext && (
            <button
              onClick={handleNext}
              className="absolute right-3 z-10 w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-white/80 hover:text-white hover:bg-black/80 flex items-center justify-center transition-all active:scale-90 shadow-2xl"
              title="Ảnh sau (→)"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          <img
            src={currentPhoto.thumbnail_url}
            alt=""
            aria-hidden="true"
            className={`absolute inset-2 w-[calc(100%-1rem)] h-[calc(100%-1rem)] rounded-2xl object-contain blur-[2px] transition-opacity duration-150 lg:inset-4 lg:w-[calc(100%-2rem)] lg:h-[calc(100%-2rem)] ${
              imageLoaded ? "opacity-0" : "opacity-100"
            }`}
          />
          <img
            key={currentPhoto.image_url}
            src={currentPhoto.image_url}
            alt={currentPhoto.order_code || "Order photo"}
            loading="eager"
            decoding="async"
            fetchPriority="high"
            onLoad={() => setImageLoaded(true)}
            className={`relative w-full h-full max-w-full max-h-full rounded-2xl object-contain shadow-2xl transition-opacity duration-150 ${
              imageLoaded ? "opacity-100" : "opacity-0"
            }`}
          />

          <a
            href={currentPhoto.image_url}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute z-10 bottom-4 right-4 p-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/15 text-white/70 hover:text-white transition-all active:scale-95"
            title="Xem ảnh gốc"
          >
            <Maximize2 className="w-4 h-4" />
          </a>
        </div>

        <div className="lg:min-h-0 lg:overflow-y-auto lg:border-l lg:border-white/10">
        {/* Status Selector Bar (1-Click Instant Upgrade) */}
        <div className="px-4 py-3 bg-surface/50 border-y border-white/10 lg:border-t-0">
          <p className="text-[11px] font-semibold text-white/40 mb-2 uppercase tracking-wider">
            Trạng thái đơn hàng
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {STATUSES.map((status) => {
              const config = STATUS_CONFIG[status];
              const isActive = currentStatus === status;

              return (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  className={cn(
                    "flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all active:scale-95 shadow-md",
                    isActive
                      ? config.bgColor + " " + config.color + " border-white/30 shadow-indigo-500/20 ring-2 ring-indigo-500/30"
                      : "border-border-subtle bg-surface-overlay/60 text-white/40 hover:text-white/70 hover:bg-surface-overlay",
                    statusAnimating === status && "animate-bounce"
                  )}
                >
                  <span className="text-base">{config.emoji}</span>
                  <span>{config.labelVi}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Fast Editable Details with Auto-Save on Blur */}
        <div className="p-4 space-y-3 max-w-lg mx-auto w-full">
          <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">
            Chi tiết thông tin đơn
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-medium text-white/50 mb-1 block">
                Mã đơn hàng
              </label>
              <input
                value={orderCode}
                onChange={(e) => setOrderCode(e.target.value)}
                onBlur={handleSaveInfo}
                className="w-full rounded-xl border border-border-subtle bg-surface-elevated px-3 py-2.5 text-xs text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                placeholder="Ví dụ: ORD-102"
              />
            </div>

            <div>
              <label className="text-[10px] font-medium text-white/50 mb-1 block">
                Tên khách hàng
              </label>
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                onBlur={handleSaveInfo}
                className="w-full rounded-xl border border-border-subtle bg-surface-elevated px-3 py-2.5 text-xs text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                placeholder="Nguyễn Văn A"
              />
            </div>

            <div>
              <label className="text-[10px] font-medium text-white/50 mb-1 block">
                Kích thước (Size)
              </label>
              <input
                value={size}
                onChange={(e) => setSize(e.target.value)}
                onBlur={handleSaveInfo}
                className="w-full rounded-xl border border-border-subtle bg-surface-elevated px-3 py-2.5 text-xs text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                placeholder="M, L, XL, 42..."
              />
            </div>

            <div>
              <label className="text-[10px] font-medium text-white/50 mb-1 block">
                Màu sắc
              </label>
              <input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                onBlur={handleSaveInfo}
                className="w-full rounded-xl border border-border-subtle bg-surface-elevated px-3 py-2.5 text-xs text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                placeholder="Đen, Trắng, Đỏ..."
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-medium text-white/50 mb-1 block">
              Ghi chú thêm
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onBlur={handleSaveInfo}
              rows={2}
              className="w-full rounded-xl border border-border-subtle bg-surface-elevated px-3 py-2.5 text-xs text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all resize-none"
              placeholder="Nhập thêm chi tiết ghi chú..."
            />
          </div>

          {saving && (
            <p className="text-[10px] text-indigo-400 flex items-center justify-end gap-1 font-medium animate-pulse">
              <Loader2 className="w-3 h-3 animate-spin" />
              Đang tự động lưu...
            </p>
          )}
        </div>
        </div>
      </div>

      {/* Move Menu Dropdown */}
      {showMoveMenu && (
        <div className="fixed inset-0 z-60" onClick={() => setShowMoveMenu(false)}>
          <div
            className="absolute top-14 right-4 w-60 rounded-2xl bg-surface-elevated border border-border-subtle shadow-2xl py-2 animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="px-4 py-2 text-[10px] font-bold text-white/40 uppercase tracking-wider">
              Chuyển sang gian hàng khác
            </p>
            {otherStores.length === 0 ? (
              <p className="px-4 py-3 text-xs text-white/40">
                Chưa có gian hàng khác
              </p>
            ) : (
              otherStores.map((store) => (
                <button
                  key={store.id}
                  onClick={() => handleMove(store.id)}
                  disabled={moving}
                  className="w-full text-left px-4 py-2.5 text-xs text-white/80 hover:bg-white/10 hover:text-white transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {moving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-400" />
                  )}
                  <span className="truncate">{store.name}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center px-6">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowDeleteConfirm(false)}
          />
          <div className="relative w-full max-w-xs rounded-2xl bg-surface-elevated border border-border-subtle p-5 text-center shadow-2xl animate-fade-in">
            <p className="text-base font-bold text-white mb-1.5">Xóa ảnh đơn này?</p>
            <p className="text-xs text-white/50 mb-5">
              Hành động này không thể hoàn tác. Ảnh sẽ bị xóa vĩnh viễn.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 rounded-xl border border-border-subtle py-2.5 text-xs font-semibold text-white/70 hover:text-white transition-all active:scale-95"
              >
                Hủy
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 rounded-xl bg-rose-600 py-2.5 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50 flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-rose-600/30"
              >
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                Xóa ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
