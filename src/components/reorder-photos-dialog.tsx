"use client";

import { useState } from "react";
import { X, ArrowUp, ArrowDown, GripVertical, Check, Loader2 } from "lucide-react";
import Image from "next/image";
import type { OrderItem } from "@/lib/types";
import { updatePhotosOrder } from "@/app/actions/photo-actions";

interface Props {
  storeId: string;
  items: OrderItem[];
  onClose: () => void;
  onSaved: (orderedItems: OrderItem[]) => void;
}

export function ReorderPhotosDialog({
  storeId,
  items: initialItems,
  onClose,
  onSaved,
}: Props) {
  const [items, setItems] = useState<OrderItem[]>(initialItems);
  const [saving, setSaving] = useState(false);

  const moveItem = (index: number, direction: "up" | "down") => {
    const newItems = [...items];
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newItems.length) return;

    const [moved] = newItems.splice(index, 1);
    newItems.splice(targetIndex, 0, moved);
    setItems(newItems);
  };

  const handleSave = async () => {
    setSaving(true);
    const photoOrders = items.map((item, index) => ({
      id: item.id,
      display_order: index + 1,
    }));

    const result = await updatePhotosOrder(storeId, photoOrders);
    setSaving(false);

    if (!result.error) {
      onSaved(items);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/85 backdrop-blur-md"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg rounded-3xl glass-modal p-6 shadow-2xl animate-fade-in flex flex-col max-h-[85vh] border-none">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <GripVertical className="w-5 h-5 text-amber-400" />
              Sắp xếp thứ tự ảnh đơn hàng
            </h3>
            <p className="text-xs text-white/60">
              Dùng nút mũi tên để di chuyển vị trí hiển thị các ảnh
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 text-white/70 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-3 space-y-2 pr-1">
          {items.map((item, idx) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 transition-all gap-3 border border-white/5"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xs font-black text-amber-400 w-5 text-center">
                  #{idx + 1}
                </span>
                <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-black/40 flex-shrink-0">
                  <Image
                    src={item.thumbnail_url || item.image_url}
                    alt={item.order_code || "Order"}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black text-white truncate">
                    {item.order_code || "Chưa có mã đơn"}
                  </p>
                  <p className="text-[11px] text-white/60 truncate">
                    {item.customer_name || "Chưa có tên khách"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  disabled={idx === 0}
                  onClick={() => moveItem(idx, "up")}
                  className="p-2 rounded-xl bg-white/10 text-white hover:bg-amber-400 hover:text-black transition-all disabled:opacity-30 disabled:hover:bg-white/10 disabled:hover:text-white"
                  title="Di chuyển lên"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button
                  disabled={idx === items.length - 1}
                  onClick={() => moveItem(idx, "down")}
                  className="p-2 rounded-xl bg-white/10 text-white hover:bg-amber-400 hover:text-black transition-all disabled:opacity-30 disabled:hover:bg-white/10 disabled:hover:text-white"
                  title="Di chuyển xuống"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-white/10 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-2xl bg-white/10 py-2.5 text-xs font-bold text-white/80 hover:text-white transition-all"
          >
            Hủy
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-2xl btn-gold py-2.5 text-xs font-black text-black flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            Lưu thứ tự
          </button>
        </div>
      </div>
    </div>
  );
}
