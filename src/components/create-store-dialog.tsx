"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createStore } from "@/app/actions/store-actions";
import { compressCoverImage } from "@/lib/image-compressor";
import { X, ImagePlus, Loader2 } from "lucide-react";

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

    // Replace original file with compressed version
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
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-surface-elevated border-t border-border-subtle p-6 animate-slide-up">
        {/* Handle bar */}
        <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-5 sm:hidden" />

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white">Tạo gian hàng mới</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Cover Image */}
          <div>
            <label className="block text-xs font-medium text-white/60 mb-2">
              Ảnh bìa
            </label>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full aspect-[16/9] rounded-xl border-2 border-dashed border-border-subtle bg-surface-overlay flex flex-col items-center justify-center gap-2 hover:border-indigo-500/50 transition-colors overflow-hidden"
            >
              {coverPreview ? (
                <img
                  src={coverPreview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <>
                  <ImagePlus className="w-8 h-8 text-white/20" />
                  <span className="text-xs text-white/30">
                    Chọn ảnh bìa
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

          {/* Name */}
          <div>
            <label
              htmlFor="store-name"
              className="block text-xs font-medium text-white/60 mb-1.5"
            >
              Tên gian hàng *
            </label>
            <input
              id="store-name"
              name="name"
              type="text"
              required
              className="w-full rounded-xl border border-border-subtle bg-surface px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
              placeholder="Ví dụ: Zara, H&M, Uniqlo..."
            />
          </div>

          {/* Note */}
          <div>
            <label
              htmlFor="store-note"
              className="block text-xs font-medium text-white/60 mb-1.5"
            >
              Ghi chú
            </label>
            <textarea
              id="store-note"
              name="note"
              rows={2}
              className="w-full rounded-xl border border-border-subtle bg-surface px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all resize-none"
              placeholder="Ghi chú về gian hàng..."
            />
          </div>

          {error && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-4 py-2.5 text-xs text-rose-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Tạo gian hàng
          </button>
        </form>
      </div>
    </div>
  );
}
