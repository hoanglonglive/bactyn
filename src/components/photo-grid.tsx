"use client";

import { ImageIcon, FileText, Check, Clock } from "lucide-react";
import type { OrderItem } from "@/lib/types";
import { STATUS_CONFIG } from "@/lib/types";

function formatUploadedAt(isoString?: string) {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "";
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${hours}:${minutes} ${day}/${month}/${year}`;
  } catch {
    return "";
  }
}

interface Props {
  items: OrderItem[];
  viewMode?: "grid" | "list";
  selectMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelectPhoto?: (item: OrderItem) => void;
  onPhotoClick: (item: OrderItem) => void;
}

export function PhotoGrid({
  items,
  viewMode = "grid",
  selectMode = false,
  selectedIds = new Set(),
  onToggleSelectPhoto,
  onPhotoClick,
}: Props) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4 rounded-3xl glass-panel">
        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4 shadow-xl">
          <ImageIcon className="w-8 h-8 text-white/20" />
        </div>
        <p className="text-white/70 font-bold text-sm">Chưa có ảnh đơn hàng nào</p>
        <p className="text-white/40 text-xs mt-1 max-w-xs leading-relaxed">
          Nhấn nút biểu tượng camera 📷 ở góc dưới màn hình để tải lên ảnh chụp màn hình đơn hàng
        </p>
      </div>
    );
  }

  if (viewMode === "list") {
    return (
      <div className="flex flex-col gap-2.5">
        {items.map((item, i) => {
          const statusConfig = STATUS_CONFIG[item.status];
          const displayImg = item.image_url || item.thumbnail_url;
          const isSelected = selectedIds.has(item.id);

          return (
            <div
              key={item.id}
              className="animate-fade-in"
              style={{ animationDelay: `${Math.min(i * 15, 150)}ms` }}
            >
              <button
                onClick={() =>
                  selectMode && onToggleSelectPhoto
                    ? onToggleSelectPhoto(item)
                    : onPhotoClick(item)
                }
                className={`w-full flex items-center gap-3.5 p-3 rounded-3xl glass-card text-left transition-all active:scale-[0.99] group ${
                  isSelected
                    ? "bg-amber-400/15 ring-2 ring-amber-400 shadow-lg shadow-amber-500/20"
                    : "hover:bg-white/[0.08]"
                }`}
              >
                {/* Checkbox Icon when selectMode */}
                {selectMode && (
                  <div
                    className={`w-6 h-6 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                      isSelected
                        ? "bg-amber-400 text-black font-bold shadow-md"
                        : "bg-black/50"
                    }`}
                  >
                    {isSelected && <Check className="w-4 h-4" />}
                  </div>
                )}

                {/* Thumbnail */}
                <div className="relative w-16 h-20 rounded-2xl overflow-hidden bg-black/50 flex-shrink-0 shadow-md">
                  <img
                    src={displayImg}
                    alt={item.order_code || "Order photo"}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading={i < 8 ? "eager" : "lazy"}
                    decoding="async"
                  />
                  <div className="absolute top-1 left-1 bg-black/80 backdrop-blur-md px-1.5 py-0.5 rounded-full text-[9px]">
                    {statusConfig.emoji}
                  </div>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0 truncate">
                      <p className="text-xs font-black text-white truncate">
                        {item.order_code ? `#${item.order_code}` : "Đơn hàng mới"}
                      </p>
                      {item.store_name && (
                        <span className="text-[9px] font-extrabold bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-lg flex-shrink-0 backdrop-blur-md shadow-sm">
                          🏪 {item.store_name}
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-[9px] font-extrabold px-2.5 py-0.5 rounded-full border-none flex-shrink-0 backdrop-blur-md shadow-sm ${statusConfig.bgColor} ${statusConfig.color}`}
                    >
                      {statusConfig.labelVi}
                    </span>
                  </div>

                  <p className="text-[11px] font-medium text-white/70 truncate mt-0.5">
                    {item.customer_name ? `Khách: ${item.customer_name}` : "Chưa có tên khách"}
                  </p>

                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    {item.size && (
                      <span className="text-[9px] font-bold bg-white/10 px-2 py-0.5 rounded-md text-white/90">
                        Size: {item.size}
                      </span>
                    )}
                    {item.color && (
                      <span className="text-[9px] font-bold bg-white/10 px-2 py-0.5 rounded-md text-white/90">
                        Màu: {item.color}
                      </span>
                    )}
                    {item.note && (
                      <span className="text-[9px] font-medium text-white/50 truncate max-w-[150px]">
                        📝 {item.note}
                      </span>
                    )}
                    {item.created_at && (
                      <span className="text-[9px] font-bold text-white/50 flex items-center gap-1 ml-auto bg-black/40 px-2 py-0.5 rounded-md">
                        <Clock className="w-2.5 h-2.5 text-amber-400" />
                        <span>{formatUploadedAt(item.created_at)}</span>
                      </span>
                    )}
                  </div>
                </div>
              </button>
            </div>
          );
        })}
      </div>
    );
  }

  // Grid Layout Mode
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-3.5">
      {items.map((item, i) => {
        const statusConfig = STATUS_CONFIG[item.status];
        const displayImg = item.image_url || item.thumbnail_url;
        const isSelected = selectedIds.has(item.id);

        return (
          <div
            key={item.id}
            className="animate-fade-in"
            style={{ animationDelay: `${Math.min(i * 15, 150)}ms` }}
          >
            <button
              onClick={() =>
                selectMode && onToggleSelectPhoto
                  ? onToggleSelectPhoto(item)
                  : onPhotoClick(item)
              }
              aria-label={`Mở ảnh ${item.order_code || "đơn hàng"}`}
              className={`group relative w-full cursor-pointer rounded-3xl overflow-hidden glass-card block text-left transition-all duration-300 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                isSelected
                  ? "bg-amber-400/15 ring-2 ring-amber-400 shadow-lg shadow-amber-500/25"
                  : "hover:bg-white/[0.08]"
              }`}
            >
              {/* Photo Image Aspect Container */}
              <div className="relative aspect-[3/4] w-full overflow-hidden bg-black/50">
                <img
                  src={displayImg}
                  alt={item.order_code || "Order photo"}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ease-out"
                  loading={i < 8 ? "eager" : "lazy"}
                  decoding="async"
                />

                {/* Checkbox Overlay in Select Mode */}
                {selectMode && (
                  <div
                    className={`absolute top-2.5 right-2.5 w-6 h-6 rounded-xl flex items-center justify-center transition-all z-10 ${
                      isSelected
                        ? "bg-amber-400 text-black font-bold shadow-lg scale-105"
                        : "bg-black/60 backdrop-blur-md"
                    }`}
                  >
                    {isSelected && <Check className="w-4 h-4" />}
                  </div>
                )}
              </div>

              {/* Status Badge Tag */}
              <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-full shadow-lg">
                <span
                  aria-hidden="true"
                  className={`w-2 h-2 rounded-full ${statusConfig.dotColor} shadow-sm`}
                />
                <span className="text-[10px] font-extrabold text-white">
                  {statusConfig.labelVi}
                </span>
              </div>

              {/* Store Name Badge Tag */}
              {item.store_name && !selectMode && (
                <div className="absolute top-2.5 right-2.5 bg-black/80 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[9px] font-extrabold text-amber-300 shadow-lg truncate max-w-[110px]">
                  🏪 {item.store_name}
                </div>
              )}

              {/* Info Overlay */}
              <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/95 via-black/70 to-transparent flex flex-col justify-end pointer-events-none">
                {item.order_code && (
                  <p className="text-xs font-black text-white truncate drop-shadow-md">
                    #{item.order_code}
                  </p>
                )}
                {item.customer_name && (
                  <p className="text-[10px] font-semibold text-white/85 truncate">
                    {item.customer_name}
                  </p>
                )}
                {(item.size || item.color) && (
                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                    {item.size && (
                      <span className="text-[9px] font-bold bg-white/20 backdrop-blur-md px-1.5 py-0.2 rounded text-white shadow-sm">
                        {item.size}
                      </span>
                    )}
                    {item.color && (
                      <span className="text-[9px] font-bold bg-white/20 backdrop-blur-md px-1.5 py-0.2 rounded text-white truncate max-w-[65px] shadow-sm">
                        {item.color}
                      </span>
                    )}
                  </div>
                )}
                {item.note && (
                  <p className="text-[10px] font-semibold text-amber-300 truncate mt-1 flex items-center gap-1 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-lg border border-amber-400/30 shadow-md">
                    <FileText className="w-2.5 h-2.5 flex-shrink-0 text-amber-400" />
                    <span className="truncate">{item.note}</span>
                  </p>
                )}
                {item.created_at && (
                  <p className="text-[9px] font-bold text-white/60 truncate mt-1 flex items-center gap-1 drop-shadow-sm">
                    <Clock className="w-2.5 h-2.5 flex-shrink-0 text-amber-400" />
                    <span>{formatUploadedAt(item.created_at)}</span>
                  </p>
                )}
              </div>
            </button>
          </div>
        );
      })}
    </div>
  );
}


