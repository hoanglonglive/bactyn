"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateStoresOrder } from "@/app/actions/store-actions";
import { X, ArrowUp, ArrowDown, GripVertical, Loader2, ListOrdered, Save } from "lucide-react";
import type { StoreWithCounts } from "@/lib/types";

interface Props {
  stores: StoreWithCounts[];
  onClose: () => void;
}

export function ReorderStoresDialog({ stores, onClose }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<StoreWithCounts[]>([...stores]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const moveItem = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const newItems = [...items];
    const [moved] = newItems.splice(index, 1);
    newItems.splice(targetIndex, 0, moved);
    setItems(newItems);
  };

  async function handleSave() {
    setLoading(true);
    setError("");

    const orderPayload = items.map((store, index) => ({
      id: store.id,
      display_order: index,
    }));

    const result = await updateStoresOrder(orderPayload);

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.refresh();
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog Window */}
      <div className="relative w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-black border-0 p-6 animate-slide-up shadow-2xl shadow-amber-500/10 flex flex-col max-h-[85vh]">
        {/* Mobile handle */}
        <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-4 sm:hidden flex-shrink-0" />

        <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5 flex-shrink-0">
          <div>
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              <ListOrdered className="w-5 h-5 text-amber-400" />
              Sắp xếp thứ tự Album
            </h2>
            <p className="text-[11px] text-white/50 mt-0.5">
              Thay đổi thứ tự hiển thị của các gian hàng trên trang chủ
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/5 hover:bg-white/15 text-white/60 hover:text-white transition-all active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List of Stores to Reorder */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 my-2">
          {items.map((store, index) => {
            const initials = store.name.substring(0, 2).toUpperCase();
            return (
              <div
                key={store.id}
                className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] transition-all border border-white/5 shadow-sm"
              >
                {/* Index badge */}
                <span className="w-6 h-6 rounded-lg bg-amber-400/20 text-amber-300 font-extrabold text-xs flex items-center justify-center flex-shrink-0">
                  {index + 1}
                </span>

                {/* Thumbnail */}
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-black/50 flex-shrink-0 relative">
                  {store.cover_url ? (
                    <img
                      src={store.cover_url}
                      alt={store.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-amber-500/30 via-yellow-600/20 to-black flex items-center justify-center font-black text-amber-300 text-xs">
                      {initials}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-black text-white truncate">
                    {store.name}
                  </h4>
                  <p className="text-[10px] text-white/40 truncate">
                    {store.total_items} ảnh đơn
                  </p>
                </div>

                {/* Move Controls */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => moveItem(index, "up")}
                    className="p-1.5 rounded-xl bg-white/10 hover:bg-amber-400 hover:text-black text-white/80 disabled:opacity-20 disabled:hover:bg-white/10 disabled:hover:text-white/80 transition-all active:scale-90"
                    title="Chuyển lên trên"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={index === items.length - 1}
                    onClick={() => moveItem(index, "down")}
                    className="p-1.5 rounded-xl bg-white/10 hover:bg-amber-400 hover:text-black text-white/80 disabled:opacity-20 disabled:hover:bg-white/10 disabled:hover:text-white/80 transition-all active:scale-90"
                    title="Chuyển xuống dưới"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {error && (
          <div className="my-2 rounded-xl bg-rose-500/10 border border-rose-500/20 px-4 py-2.5 text-xs font-medium text-rose-400 flex-shrink-0">
            {error}
          </div>
        )}

        {/* Action button */}
        <div className="pt-3 border-t border-white/5 flex-shrink-0">
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="w-full rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 px-4 py-3.5 text-xs font-extrabold text-black shadow-xl shadow-amber-500/20 hover:shadow-amber-500/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all active:scale-98"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-black" />
            ) : (
              <Save className="w-4 h-4 text-black" />
            )}
            Lưu vị trí album
          </button>
        </div>
      </div>
    </div>
  );
}
