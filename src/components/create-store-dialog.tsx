"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createStore } from "@/app/actions/store-actions";
import { compressCoverImage } from "@/lib/image-compressor";
import { X, ImagePlus, Loader2, Store as StoreIcon } from "lucide-react";

interface Props {
  onClose: () => void;
}

export function CreateStoreDialog({ onClose }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [compressedCover, setCompressedCover] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressCoverImage(file);
      setCompressedCover(compressed);
      setCoverPreview(URL.createObjectURL(compressed));
    } catch {
      setError("Không thể nén ảnh bìa");
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = e.currentTarget;
    const formData = new FormData(form);

    if (compressedCover) {
      formData.set("cover", compressedCover);
    }

    const result = await createStore(formData);

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
      <div className="relative w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-surface-elevated border-t sm:border border-border-subtle p-6 animate-slide-up shadow-2xl">
        {/* Mobile handle */}
        <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-4 sm:hidden" />

        <div className="flex items-center justify-between mb-5 pb-3 border-b border-border-subtle">
          <div>
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              <StoreIcon className="w-5 h-5 text-indigo-400" />
              Tạo gian hàng mới
            </h2>
            <p className="text-[11px] text-white/40 mt-0.5">
              Khởi tạo album lưu trữ đơn hàng cho gian hàng
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/5 hover:bg-white/15 text-white/60 hover:text-white transition-all active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Cover Image Upload Area */}
          <div>
            <label className="block text-xs font-semibold text-white/60 mb-1.5">
              Ảnh bìa gian hàng (Tùy chọn)
            </label>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="relative w-full aspect-[16/9] rounded-2xl border-2 border-dashed border-white/15 bg-surface-overlay flex flex-col items-center justify-center gap-2 hover:border-indigo-500/50 hover:bg-white/[0.02] transition-all overflow-hidden group shadow-inner"
            >
              {coverPreview ? (
                <img
                  src={coverPreview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <>
                  <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <ImagePlus className="w-5 h-5 text-indigo-400" />
                  </div>
                  <span className="text-xs font-semibold text-white/50 group-hover:text-white/80 transition-colors">
                    Tải lên ảnh bìa đại diện
                  </span>
                  <span className="text-[10px] text-white/25">
                    Tự động tối ưu dung lượng WebP
                  </span>
                </>
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              name="cover"
              accept="image/*"
              onChange={handleCoverChange}
              className="hidden"
            />
          </div>

          {/* Store Name Input */}
          <div>
            <label
              htmlFor="store-name"
              className="block text-xs font-semibold text-white/70 mb-1.5"
            >
              Tên gian hàng *
            </label>
            <input
              id="store-name"
              name="name"
              type="text"
              required
              className="w-full rounded-2xl border border-border-subtle bg-surface px-4 py-3 text-xs text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all shadow-inner"
              placeholder="Ví dụ: Zara, H&M, Uniqlo, Store A..."
            />
          </div>

          {/* Store Note Input */}
          <div>
            <label
              htmlFor="store-note"
              className="block text-xs font-semibold text-white/70 mb-1.5"
            >
              Ghi chú mô tả
            </label>
            <textarea
              id="store-note"
              name="note"
              rows={2}
              className="w-full rounded-2xl border border-border-subtle bg-surface px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all resize-none shadow-inner"
              placeholder="Ghi chú thêm về địa điểm, số gian..."
            />
          </div>

          {error && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-4 py-2.5 text-xs font-medium text-rose-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-600 to-violet-600 px-4 py-3.5 text-xs font-bold text-white shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all active:scale-98"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Tạo gian hàng mới
          </button>
        </form>
      </div>
    </div>
  );
}
