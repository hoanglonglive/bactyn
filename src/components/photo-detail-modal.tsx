"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  X,
  Trash2,
  ArrowRightLeft,
  ChevronDown,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Lock,
  Eye,
  FileText,
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

const ALL_STATUSES: OrderStatus[] = [
  "PURCHASED",
  "PARTIALLY_PURCHASED",
  "PENDING_ORDER",
  "DELIVERED",
  "IN_STOCK",
  "OUT_OF_STOCK",
  "PAID_NOT_RECEIVED",
];

const STAFF_ALLOWED_STATUSES: OrderStatus[] = [
  "DELIVERED",
  "IN_STOCK",
  "PARTIALLY_PURCHASED",
  "PAID_NOT_RECEIVED",
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
  const [expandedImage, setExpandedImage] = useState(true);

  // Editable fields
  const [orderCode, setOrderCode] = useState(photo.order_code || "");
  const [customerName, setCustomerName] = useState(photo.customer_name || "");
  const [size, setSize] = useState(photo.size || "");
  const [color, setColor] = useState(photo.color || "");
  const [note, setNote] = useState(photo.note || "");
  const [saving, setSaving] = useState(false);

  // Indexing for prev / next navigation
  const currentIndex = allPhotos.findIndex((p) => p.id === currentPhoto.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < allPhotos.length - 1;

  // Pre-load adjacent images for smooth instant transitions
  useEffect(() => {
    if (currentIndex >= 0 && allPhotos.length > 0) {
      const prevItem = allPhotos[currentIndex - 1];
      const nextItem = allPhotos[currentIndex + 1];
      if (prevItem) {
        const img = new window.Image();
        img.src = prevItem.image_url;
      }
      if (nextItem) {
        const img = new window.Image();
        img.src = nextItem.image_url;
      }
    }
  }, [currentIndex, allPhotos]);

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

  // Mobile gestures: left/right navigates; only a deliberate downward swipe closes.
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || e.changedTouches.length === 0) return;

    const startX = touchStartRef.current.x;
    const startY = touchStartRef.current.y;
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;

    const deltaX = endX - startX;
    const deltaY = endY - startY;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    const minHorizontalSwipe = 50; // Threshold in px for left/right photo navigation
    const minVerticalSwipe = 110;  // Deliberate threshold in px for vertical close gesture

    if (absX > absY * 1.2 && absX > minHorizontalSwipe) {
      // Horizontal swipe (Left / Right)
      if (deltaX < 0 && hasNext) {
        handleNext(); // Swipe Left -> Next Photo
      } else if (deltaX > 0 && hasPrev) {
        handlePrev(); // Swipe Right -> Prev Photo
      }
    } else if (deltaY > minVerticalSwipe && absY > absX * 1.5) {
      // Swipe DOWN -> Close modal back to the photo list.
      onClose();
    }

    touchStartRef.current = null;
  };

  async function handleStatusChange(newStatus: OrderStatus) {
    // Check staff permissions
    if (!isAdmin && !STAFF_ALLOWED_STATUSES.includes(newStatus)) {
      return;
    }

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
    if (!isAdmin) return;
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
    if (!isAdmin) return;
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
      {/* Top Bar (Borderless) */}
      <div className="flex items-center justify-between px-4 py-3 border-b-0 safe-top bg-black/60 backdrop-blur-md">
        <button
          onClick={onClose}
          className="p-2 -ml-2 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all active:scale-95"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Counter & Toggle Full Screenshot Mode */}
        <div className="flex items-center gap-2">
          {allPhotos.length > 0 && (
            <div className="text-xs font-black text-white/90 bg-white/10 px-3 py-1 rounded-full">
              {currentIndex + 1} / {allPhotos.length}
            </div>
          )}

          <button
            onClick={() => setExpandedImage(!expandedImage)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-black"
          >
            {expandedImage ? (
              <>
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span>Chi tiết</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5 text-amber-400" />
                <span>Toàn màn hình</span>
              </>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Admin Move Button */}
          {isAdmin && (
            <button
              onClick={() => setShowMoveMenu(!showMoveMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 text-white/90 text-xs font-bold hover:bg-white/20 transition-all active:scale-95"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400" />
              <span>Chuyển</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>
          )}

          {/* Admin Delete Button ONLY */}
          {isAdmin && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600/80 text-white text-xs font-extrabold hover:bg-rose-600 transition-all active:scale-95 shadow-md"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Full Mobile Screenshot Container (Optimized 9:16 Aspect Ratio View) */}
        <div
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className={cn(
            "relative flex-1 flex items-center justify-center p-2 group transition-all duration-300 select-none",
            expandedImage
              ? "h-[calc(100dvh-68px)] min-h-[calc(100dvh-68px)] shrink-0"
              : "min-h-[480px] max-h-[72dvh]"
          )}
        >
          {/* Previous Arrow */}
          {hasPrev && (
            <button
              onClick={handlePrev}
              className="absolute left-3 z-20 w-11 h-11 rounded-full bg-black/80 backdrop-blur-md text-white hover:bg-black flex items-center justify-center transition-all active:scale-90 shadow-2xl"
              title="Ảnh trước (←)"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Next Arrow */}
          {hasNext && (
            <button
              onClick={handleNext}
              className="absolute right-3 z-20 w-11 h-11 rounded-full bg-black/80 backdrop-blur-md text-white hover:bg-black flex items-center justify-center transition-all active:scale-90 shadow-2xl"
              title="Ảnh sau (→)"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          {/* High Definition Mobile Screenshot Image */}
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
            <img
              key={currentPhoto.id}
              src={currentPhoto.image_url || currentPhoto.thumbnail_url}
              alt={currentPhoto.order_code || "Ảnh đơn hàng màn hình chụp"}
              className="max-w-full max-h-full rounded-xl object-contain shadow-2xl transition-transform duration-200"
            />
          </div>

          {/* Full Screen Toggle Button at bottom right */}
          <button
            onClick={() => setExpandedImage(!expandedImage)}
            className="absolute z-10 bottom-4 right-4 px-3.5 py-2 rounded-xl bg-black/80 backdrop-blur-md text-white hover:text-amber-300 transition-all active:scale-95 shadow-xl flex items-center gap-1.5 text-xs font-bold"
            title={expandedImage ? "Thu nhỏ xem thông tin" : "Xem toàn màn hình đầy đủ"}
          >
            {expandedImage ? (
              <>
                <Minimize2 className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">Thu nhỏ</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">Toàn màn hình</span>
              </>
            )}
          </button>
        </div>

        {/* Status Selector Bar with Role-Based Permission Enforcements */}
        <div className="px-4 py-3 bg-black/80 backdrop-blur-md border-none">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-black text-white/50 uppercase tracking-wider">
              Cập nhật trạng thái đơn
            </p>
            {!isAdmin && (
              <span className="text-[10px] text-amber-300 font-bold flex items-center gap-1">
                <Lock className="w-3 h-3" />
                Nhân viên (Quyền hạn chế)
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {ALL_STATUSES.map((status) => {
              const config = STATUS_CONFIG[status];
              const isActive = currentStatus === status;
              const isAllowedForStaff = STAFF_ALLOWED_STATUSES.includes(status);
              const canClick = isAdmin || isAllowedForStaff;

              return (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  disabled={!canClick}
                  className={cn(
                    "relative flex items-center justify-center gap-1.5 px-2.5 py-2.5 rounded-2xl text-xs font-black transition-all active:scale-95 shadow-md border-none",
                    isActive
                      ? config.bgColor + " " + config.color + " ring-2 ring-amber-400/80 shadow-amber-500/30"
                      : canClick
                      ? "bg-white/10 text-white/60 hover:text-white hover:bg-white/15"
                      : "bg-white/5 text-white/20 cursor-not-allowed opacity-40",
                    statusAnimating === status && "animate-bounce"
                  )}
                  title={!canClick ? "Trạng thái này chỉ dành cho Admin" : config.labelVi}
                >
                  <span className="text-base">{config.emoji}</span>
                  <span className="truncate">{config.labelVi}</span>
                  {!canClick && (
                    <Lock className="w-3 h-3 absolute top-1 right-1 text-white/30" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Editable Details Form */}
        {!expandedImage && (
          <div className="p-4 space-y-3 max-w-lg mx-auto w-full">
            <p className="text-[11px] font-black text-white/50 uppercase tracking-wider">
              Chi tiết thông tin đơn hàng
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-white/60 mb-1 block">
                  Mã đơn hàng
                </label>
                <input
                  value={orderCode}
                  onChange={(e) => setOrderCode(e.target.value)}
                  onBlur={handleSaveInfo}
                  className="w-full rounded-2xl glass-input px-3.5 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none transition-all border-none"
                  placeholder="Ví dụ: ORD-102"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-white/60 mb-1 block">
                  Tên khách hàng
                </label>
                <input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  onBlur={handleSaveInfo}
                  className="w-full rounded-2xl glass-input px-3.5 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none transition-all border-none"
                  placeholder="Nguyễn Văn A"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-white/60 mb-1 block">
                  Kích thước (Size)
                </label>
                <input
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  onBlur={handleSaveInfo}
                  className="w-full rounded-2xl glass-input px-3.5 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none transition-all border-none"
                  placeholder="M, L, XL, 42..."
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-white/60 mb-1 block">
                  Màu sắc
                </label>
                <input
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  onBlur={handleSaveInfo}
                  className="w-full rounded-2xl glass-input px-3.5 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none transition-all border-none"
                  placeholder="Đen, Trắng, Đỏ..."
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-white/60 mb-1 block">
                Ghi chú thêm
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onBlur={handleSaveInfo}
                rows={2}
                className="w-full rounded-2xl glass-input px-3.5 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none transition-all resize-none border-none"
                placeholder="Nhập thêm chi tiết ghi chú..."
              />
            </div>

            {saving && (
              <p className="text-[10px] text-amber-400 flex items-center justify-end gap-1 font-bold animate-pulse">
                <Loader2 className="w-3 h-3 animate-spin" />
                Đang tự động lưu...
              </p>
            )}
          </div>
        )}
      </div>

      {/* Admin Move Menu Dropdown (Borderless) */}
      {showMoveMenu && isAdmin && (
        <div className="fixed inset-0 z-60" onClick={() => setShowMoveMenu(false)}>
          <div
            className="absolute top-14 right-4 w-60 rounded-3xl glass-modal shadow-2xl py-2 animate-fade-in border-none"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="px-4 py-2 text-[10px] font-black text-white/50 uppercase tracking-wider">
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
                  className="w-full text-left px-4 py-2.5 text-xs font-bold text-white/80 hover:bg-white/10 hover:text-white transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {moving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400" />
                  )}
                  <span className="truncate">{store.name}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Admin Delete Confirmation (Borderless) */}
      {showDeleteConfirm && isAdmin && (
        <div className="fixed inset-0 z-60 flex items-center justify-center px-6">
          <div
            className="absolute inset-0 bg-black/85 backdrop-blur-md"
            onClick={() => setShowDeleteConfirm(false)}
          />
          <div className="relative w-full max-w-xs rounded-3xl glass-modal p-6 text-center shadow-2xl animate-fade-in border-none">
            <p className="text-base font-black text-white mb-1.5">Xóa ảnh đơn này?</p>
            <p className="text-xs text-white/60 mb-5">
              Hành động này không thể hoàn tác. Ảnh sẽ bị xóa vĩnh viễn khỏi hệ thống.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 rounded-2xl bg-white/10 py-2.5 text-xs font-bold text-white/80 hover:text-white transition-all active:scale-95"
              >
                Hủy
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 rounded-2xl bg-rose-600 py-2.5 text-xs font-black text-white hover:bg-rose-500 disabled:opacity-50 flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg"
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
