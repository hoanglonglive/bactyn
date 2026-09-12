"use client";

import { useState } from "react";
import {
  X,
  Trash2,
  ArrowRightLeft,
  ChevronDown,
  Loader2,
  Save,
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
  isAdmin: boolean;
  otherStores: { id: string; name: string }[];
  onClose: () => void;
  onStatusUpdate: (photoId: string, newStatus: OrderStatus) => void;
  onPhotoMoved: (photoId: string) => void;
  onPhotoDeleted: (photoId: string) => void;
  onInfoUpdate: (photoId: string, data: Partial<OrderItem>) => void;
}

const STATUSES: OrderStatus[] = [
  "PURCHASED",
  "PENDING_ORDER",
  "DELIVERED",
  "OUT_OF_STOCK",
];

export function PhotoDetailModal({
  photo,
  isAdmin,
  otherStores,
  onClose,
  onStatusUpdate,
  onPhotoMoved,
  onPhotoDeleted,
  onInfoUpdate,
}: Props) {
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
  const [infoChanged, setInfoChanged] = useState(false);

  async function handleStatusChange(newStatus: OrderStatus) {
    if (newStatus === currentStatus) return;

    setStatusAnimating(newStatus);
    setCurrentStatus(newStatus);
    onStatusUpdate(photo.id, newStatus);

    await updatePhotoStatus(photo.id, newStatus);

    setTimeout(() => setStatusAnimating(null), 300);
  }

  async function handleMove(targetStoreId: string) {
    setMoving(true);
    const result = await movePhotoToStore(photo.id, targetStoreId);

    if (!result.error) {
      onPhotoMoved(photo.id);
    }
    setMoving(false);
    setShowMoveMenu(false);
  }

  async function handleDelete() {
    setDeleting(true);
    const result = await deleteOrderPhoto(photo.id);

    if (!result.error) {
      onPhotoDeleted(photo.id);
    }
    setDeleting(false);
  }

  async function handleSaveInfo() {
    setSaving(true);
    const data = {
      order_code: orderCode,
      customer_name: customerName,
      size,
      color,
      note,
    };

    await updatePhotoInfo(photo.id, data);
    onInfoUpdate(photo.id, data);

    setSaving(false);
    setInfoChanged(false);
  }

  function markChanged() {
    setInfoChanged(true);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 safe-top">
        <button
          onClick={onClose}
          className="p-2 -ml-2 rounded-lg text-white/60 hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="flex items-center gap-2">
          {/* Move button */}
          <button
            onClick={() => setShowMoveMenu(!showMoveMenu)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 text-white/70 text-xs font-medium hover:bg-white/15 transition-all"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            Chuyển
            <ChevronDown className="w-3 h-3" />
          </button>

          {/* Admin Delete button */}
          {isAdmin && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/15 text-rose-400 text-xs font-medium hover:bg-rose-500/25 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Xóa
            </button>
          )}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Full-size image */}
        <div className="px-2">
          <img
            src={photo.image_url}
            alt={photo.order_code || "Order photo"}
            className="w-full h-auto rounded-2xl object-contain max-h-[50dvh]"
          />
        </div>

        {/* Status Buttons */}
        <div className="px-4 py-4">
          <p className="text-xs font-medium text-white/40 mb-2">Trạng thái</p>
          <div className="grid grid-cols-2 gap-2">
            {STATUSES.map((status) => {
              const config = STATUS_CONFIG[status];
              const isActive = currentStatus === status;

              return (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all",
                    isActive
                      ? config.bgColor + " " + config.color
                      : "border-border-subtle bg-surface-overlay text-white/40 hover:text-white/60",
                    statusAnimating === status && "status-pop"
                  )}
                >
                  <span>{config.emoji}</span>
                  <span>{config.labelVi}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Editable Info Fields */}
        <div className="px-4 pb-6 space-y-3">
          <p className="text-xs font-medium text-white/40">Thông tin đơn</p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-white/30 mb-1 block">
                Mã đơn hàng
              </label>
              <input
                value={orderCode}
                onChange={(e) => {
                  setOrderCode(e.target.value);
                  markChanged();
                }}
                className="w-full rounded-lg border border-border-subtle bg-surface-overlay px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all"
                placeholder="VD: ORD-001"
              />
            </div>
            <div>
              <label className="text-[10px] text-white/30 mb-1 block">
                Tên khách
              </label>
              <input
                value={customerName}
                onChange={(e) => {
                  setCustomerName(e.target.value);
                  markChanged();
                }}
                className="w-full rounded-lg border border-border-subtle bg-surface-overlay px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all"
                placeholder="Nguyễn Văn A"
              />
            </div>
            <div>
              <label className="text-[10px] text-white/30 mb-1 block">
                Size
              </label>
              <input
                value={size}
                onChange={(e) => {
                  setSize(e.target.value);
                  markChanged();
                }}
                className="w-full rounded-lg border border-border-subtle bg-surface-overlay px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all"
                placeholder="M, L, XL..."
              />
            </div>
            <div>
              <label className="text-[10px] text-white/30 mb-1 block">
                Màu sắc
              </label>
              <input
                value={color}
                onChange={(e) => {
                  setColor(e.target.value);
                  markChanged();
                }}
                className="w-full rounded-lg border border-border-subtle bg-surface-overlay px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all"
                placeholder="Đen, Trắng..."
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-white/30 mb-1 block">
              Ghi chú
            </label>
            <textarea
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                markChanged();
              }}
              rows={2}
              className="w-full rounded-lg border border-border-subtle bg-surface-overlay px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all resize-none"
              placeholder="Ghi chú thêm..."
            />
          </div>

          {infoChanged && (
            <button
              onClick={handleSaveInfo}
              disabled={saving}
              className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Lưu thông tin
            </button>
          )}
        </div>
      </div>

      {/* Move Menu Dropdown */}
      {showMoveMenu && (
        <div className="fixed inset-0 z-60" onClick={() => setShowMoveMenu(false)}>
          <div
            className="absolute top-14 right-4 w-56 rounded-2xl bg-surface-elevated border border-border-subtle shadow-2xl py-2 animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="px-4 py-2 text-[10px] font-medium text-white/30 uppercase tracking-wider">
              Chuyển sang gian hàng
            </p>
            {otherStores.length === 0 ? (
              <p className="px-4 py-3 text-xs text-white/40">
                Không có gian hàng khác
              </p>
            ) : (
              otherStores.map((store) => (
                <button
                  key={store.id}
                  onClick={() => handleMove(store.id)}
                  disabled={moving}
                  className="w-full text-left px-4 py-2.5 text-sm text-white/70 hover:bg-white/5 hover:text-white transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {moving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ArrowRightLeft className="w-3.5 h-3.5 text-white/30" />
                  )}
                  {store.name}
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
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowDeleteConfirm(false)}
          />
          <div className="relative w-full max-w-xs rounded-2xl bg-surface-elevated border border-border-subtle p-5 text-center animate-fade-in">
            <p className="text-base font-bold text-white mb-2">Xóa ảnh?</p>
            <p className="text-xs text-white/40 mb-4">
              Ảnh sẽ bị xóa vĩnh viễn khỏi hệ thống.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 rounded-xl border border-border-subtle py-2.5 text-sm text-white/60 hover:text-white/80 transition-all"
              >
                Hủy
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 rounded-xl bg-rose-600 py-2.5 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
              >
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
