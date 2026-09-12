"use client";

import { useState, useRef, useCallback } from "react";
import { compressImage } from "@/lib/image-compressor";
import { uploadOrderPhotosDirect } from "@/lib/upload-order-photos";
import type { OrderItem } from "@/lib/types";
import {
  X,
  Camera,
  ImagePlus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
} from "lucide-react";

interface Props {
  storeId: string;
  onClose: () => void;
  onComplete: (items: OrderItem[]) => void;
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
  const [isDragging, setIsDragging] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (inputFiles: FileList | Array<File> | null) => {
    if (!inputFiles || inputFiles.length === 0) return;

    const fileArray = Array.from(inputFiles);
    const newFiles: FilePreview[] = [];

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      const id = `${Date.now()}-${i}-${Math.random().toString(36).substring(2, 7)}`;
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
    await Promise.all(fileArray.map(async (file, i) => {
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
      } catch {
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
    }));
  }, []);

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
    setUploadProgress(`Đang chuẩn bị tải lên ${readyFiles.length} ảnh...`);

    setFiles((prev) =>
      prev.map((f) =>
        f.status === "ready" ? { ...f, status: "uploading" as const } : f
      )
    );

    let uploadedCount = 0;
    const result = await uploadOrderPhotosDirect(
      storeId,
      readyFiles.map((file) => ({
        id: file.id,
        originalName: file.originalName,
        fullFile: file.fullFile!,
        thumbFile: file.thumbFile!,
      })),
      () => {
        uploadedCount++;
        setUploadProgress(`${uploadedCount}/${readyFiles.length}`);
      }
    );

    const uploadedIds = new Set(result.uploadedIds);
    const errors = new Map(result.errors.map((error) => [error.id, error.message]));
    setFiles((prev) =>
      prev.map((file) => {
        if (errors.has(file.id)) {
          return { ...file, status: "error" as const, error: errors.get(file.id) };
        }
        if (uploadedIds.has(file.id)) {
          return { ...file, status: "done" as const };
        }
        return file;
      })
    );

    setUploadProgress("Tải lên hoàn tất!");
    setUploading(false);

    if (result.items.length > 0) {
      setTimeout(() => onComplete(result.items), result.errors.length ? 1200 : 400);
    }
  }

  const readyCount = files.filter((f) => f.status === "ready").length;
  const compressingCount = files.filter((f) => f.status === "compressing").length;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
        }}
        className={`relative w-full max-w-md max-h-[85dvh] rounded-t-3xl sm:rounded-3xl bg-black border-0 flex flex-col animate-slide-up shadow-2xl shadow-amber-500/10 transition-all ${
          isDragging ? "ring-2 ring-amber-400 bg-amber-950/20" : ""
        }`}
      >
        {/* Handle bar on mobile */}
        <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mt-3 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-amber-400" />
              Tải ảnh đơn hàng
            </h2>
            <p className="text-[11px] text-white/40">
              Chọn hoặc kéo thả nhiều ảnh chụp sản phẩm
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/5 hover:bg-white/15 text-white/60 hover:text-white transition-all active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Source Quick Buttons */}
        <div className="flex gap-3 px-6 pt-4 pb-2">
          <button
            onClick={() => cameraRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-medium text-xs transition-all active:scale-95 border-0"
          >
            <Camera className="w-4 h-4 text-amber-400" />
            <span>Chụp ảnh</span>
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-medium text-xs transition-all active:scale-95 border-0"
          >
            <ImagePlus className="w-4 h-4 text-amber-400" />
            <span>Chọn từ album</span>
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

        {/* Dropzone Hint when empty */}
        {files.length === 0 && (
          <div
            onClick={() => fileRef.current?.click()}
            className="mx-6 my-4 p-8 border border-dashed border-amber-500/30 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-amber-400 hover:bg-white/[0.03] transition-all text-center group"
          >
            <UploadCloud className="w-10 h-10 text-white/20 group-hover:text-amber-400 transition-colors mb-2" />
            <p className="text-xs font-semibold text-white/70">
              Kéo & thả ảnh vào đây hoặc nhấp để chọn
            </p>
            <p className="text-[10px] text-white/30 mt-1">
              Ảnh sẽ được nén tự động siêu nhanh (&lt;200KB)
            </p>
          </div>
        )}

        {/* Selected Photos Grid */}
        {files.length > 0 && (
          <div className="flex-1 overflow-y-auto px-6 py-3">
            <div className="grid grid-cols-3 gap-2.5">
              {files.map((f) => (
                <div
                  key={f.id}
                  className="relative aspect-square rounded-2xl overflow-hidden bg-white/5 border-0 shadow-md"
                >
                  <img
                    src={f.previewUrl}
                    alt={f.originalName}
                    className="w-full h-full object-cover"
                  />

                  {/* Status Overlay Indicator */}
                  {f.status === "compressing" && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center">
                      <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
                    </div>
                  )}
                  {f.status === "uploading" && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center">
                      <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
                    </div>
                  )}
                  {f.status === "done" && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center">
                      <CheckCircle2 className="w-7 h-7 text-amber-400 drop-shadow-md animate-bounce" />
                    </div>
                  )}
                  {f.status === "error" && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center">
                      <AlertCircle className="w-5 h-5 text-rose-400" />
                    </div>
                  )}

                  {/* Remove Button */}
                  {(f.status === "ready" || f.status === "error") && (
                    <button
                      onClick={() => removeFile(f.id)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 border border-white/20 flex items-center justify-center text-white text-xs hover:bg-rose-600 transition-all active:scale-90"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Button Bar */}
        {files.length > 0 && (
          <div className="p-6 border-t border-white/5 bg-black rounded-b-3xl">
            {uploadProgress && (
              <p className="text-xs text-amber-400 mb-2 text-center font-medium animate-pulse">
                {uploadProgress}
              </p>
            )}
            <button
              onClick={handleUpload}
              disabled={uploading || readyCount === 0}
              className="w-full rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 px-4 py-3.5 text-xs font-extrabold text-black shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all active:scale-98"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                  Đang tải ảnh lên...
                </>
              ) : compressingCount > 0 ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                  Đang nén {compressingCount} ảnh...
                </>
              ) : (
                <>Tải lên ngay ({readyCount} ảnh)</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
