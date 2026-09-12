"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteStore } from "@/app/actions/store-actions";
import { AlertTriangle, Loader2, X } from "lucide-react";
import type { StoreWithCounts } from "@/lib/types";

interface Props {
  store: StoreWithCounts;
  onClose: () => void;
}

export function DeleteStoreDialog({ store, onClose }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    setLoading(true);
    setError("");

    const result = await deleteStore(store.id);

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.refresh();
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-sm rounded-3xl bg-surface-elevated border border-border-subtle p-6 animate-fade-in">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-rose-500/15 flex items-center justify-center mb-4">
            <AlertTriangle className="w-7 h-7 text-rose-400" />
          </div>

          <h3 className="text-base font-bold text-white mb-2">
            Xóa gian hàng?
          </h3>
          <p className="text-sm text-white/50 mb-1">
            Bạn sắp xóa gian hàng{" "}
            <span className="font-semibold text-white/80">{store.name}</span>
          </p>
          <p className="text-xs text-white/35 mb-1">
            {store.total_items > 0
              ? `Toàn bộ ${store.total_items} ảnh trong album cũng sẽ bị xóa vĩnh viễn.`
              : "Album này hiện không có ảnh nào."}
          </p>
          <p className="text-xs text-rose-400/70 font-medium">
            Hành động này không thể hoàn tác!
          </p>
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-rose-500/10 border border-rose-500/20 px-4 py-2.5 text-xs text-rose-400">
            {error}
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-border-subtle bg-surface px-4 py-2.5 text-sm font-medium text-white/60 hover:text-white/80 hover:bg-surface-overlay transition-all"
          >
            Hủy
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="flex-1 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Xóa
          </button>
        </div>
      </div>
    </div>
  );
}
