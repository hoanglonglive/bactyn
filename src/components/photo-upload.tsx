"use client";

import { useState, useRef } from "react";
import { uploadOrderPhotos } from "@/app/actions/photo-actions";
import { compressImage } from "@/lib/image-compressor";
import { X, Camera, ImagePlus, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface Props {
  storeId: string;
  onClose: () => void;
  onComplete: () => void;
}

interface FilePreview {
  id: string;
  originalName: string;
  previewUrl: string;
  fullFile: File | null;
  thumbFile: File | null;
  status: "compressing" | "ready" | "uploading" | "done" | "error";
  error?: string;
}

export function PhotoUpload({ storeId, onClose, onComplete }: Props) {
  const [files, setFiles] = useState<FilePreview[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  async function handleFiles(inputFiles: FileList | null) {
    if (!inputFiles) return;

    const newFiles: FilePreview[] = [];

    for (let i = 0; i < inputFiles.length; i++) {
      const file = inputFiles[i];
      const id = `${Date.now()}-${i}`;
      const preview: FilePreview = {
        id,
        originalName: file.name,
        previewUrl: URL.createObjectURL(file),
        fullFile: null,
        thumbFile: null,
        status: "compressing",
      };
      newFiles.push(preview);
    }

    setFiles((prev) => [...prev, ...newFiles]);

    // Compress in parallel
    for (let i = 0; i < inputFiles.length; i++) {
      const file = inputFiles[i];
      const id = newFiles[i].id;

      try {
        const { fullFile, thumbFile } = await compressImage(file);
        setFiles((prev) =>
          prev.map((f) =>
            f.id === id
              ? { ...f, fullFile, thumbFile, status: "ready" as const }
              : f
          )
        );
      } catch (err) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === id
              ? {
                  ...f,
                  status: "error" as const,
                  error: "Nén ảnh thất bại",
                }
              : f
          )
        );
      }
    }
  }

  function removeFile(id: string) {
    setFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file) URL.revokeObjectURL(file.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
  }

  async function handleUpload() {
    const readyFiles = files.filter((f) => f.status === "ready");
    if (readyFiles.length === 0) return;

    setUploading(true);

    const formData = new FormData();
    for (const f of readyFiles) {
      if (f.fullFile && f.thumbFile) {
        formData.append("files", f.fullFile);
        formData.append("thumbnails", f.thumbFile);
      }
    }

    setUploadProgress(`Đang tải lên ${readyFiles.length} ảnh...`);

    // Mark all as uploading
    setFiles((prev) =>
      prev.map((f) =>
        f.status === "ready" ? { ...f, status: "uploading" as const } : f
      )
    );

    const result = await uploadOrderPhotos(storeId, formData);

    if (result.results) {
      setFiles((prev) =>
        prev.map((f) => {
          if (f.status === "uploading") {
            return { ...f, status: "done" as const };
          }
          return f;
        })
      );
    }

    setUploadProgress("");
    setUploading(false);

    // Auto close after brief delay
    setTimeout(() => {
      onComplete();
    }, 800);
  }

  const readyCount = files.filter((f) => f.status === "ready").length;
  const compressingCount = files.filter(
    (f) => f.status === "compressing"
  ).length;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md max-h-[85dvh] rounded-t-3xl sm:rounded-3xl bg-surface-elevated border-t border-border-subtle flex flex-col animate-slide-up">
        {/* Handle */}
        <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mt-3 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4">
          <h2 className="text-lg font-bold text-white">Thêm ảnh</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Source buttons */}
        <div className="flex gap-3 px-6 pb-4">
          <button
            onClick={() => cameraRef.current?.click()}
            className="flex-1 flex flex-col items-center gap-2 py-4 rounded-xl border border-border-subtle bg-surface-overlay hover:bg-surface-overlay/80 transition-all"
          >
            <Camera className="w-6 h-6 text-indigo-400" />
            <span className="text-xs text-white/60">Chụp ảnh</span>
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="flex-1 flex flex-col items-center gap-2 py-4 rounded-xl border border-border-subtle bg-surface-overlay hover:bg-surface-overlay/80 transition-all"
          >
            <ImagePlus className="w-6 h-6 text-violet-400" />
            <span className="text-xs text-white/60">Chọn từ thư viện</span>
          </button>

          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
          />
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
          />
        </div>

        {/* Preview grid */}
        {files.length > 0 && (
          <div className="flex-1 overflow-y-auto px-6 pb-4">
            <div className="grid grid-cols-3 gap-2">
              {files.map((f) => (
                <div
                  key={f.id}
                  className="relative aspect-square rounded-xl overflow-hidden bg-surface-overlay"
                >
                  <img
                    src={f.previewUrl}
                    alt={f.originalName}
                    className="w-full h-full object-cover"
                  />

                  {/* Status overlay */}
                  {f.status === "compressing" && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                    </div>
                  )}
                  {f.status === "uploading" && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                    </div>
                  )}
                  {f.status === "done" && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    </div>
                  )}
                  {f.status === "error" && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <AlertCircle className="w-5 h-5 text-rose-400" />
                    </div>
                  )}

                  {/* Remove button */}
                  {(f.status === "ready" || f.status === "error") && (
                    <button
                      onClick={() => removeFile(f.id)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center text-white text-[10px]"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action bar */}
        {files.length > 0 && (
          <div className="px-6 py-4 border-t border-border-subtle">
            {uploadProgress && (
              <p className="text-xs text-indigo-400 mb-2 text-center">
                {uploadProgress}
              </p>
            )}
            <button
              onClick={handleUpload}
              disabled={uploading || readyCount === 0}
              className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : compressingCount > 0 ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang nén {compressingCount} ảnh...
                </>
              ) : (
                <>Tải lên {readyCount} ảnh</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
