"use client";

import { ImageIcon, FileText } from "lucide-react";
import type { OrderItem } from "@/lib/types";
import { STATUS_CONFIG } from "@/lib/types";

interface Props {
  items: OrderItem[];
  viewMode?: "grid" | "list";
  onPhotoClick: (item: OrderItem) => void;
}

export function PhotoGrid({ items, viewMode = "grid", onPhotoClick }: Props) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4 rounded-3xl border border-dashed border-white/10 bg-surface-elevated/40">
        <div className="w-16 h-16 rounded-2xl bg-surface-elevated flex items-center justify-center mb-4 border border-border-subtle shadow-xl">
          <ImageIcon className="w-8 h-8 text-white/20" />
        </div>
        <p className="text-white/60 font-semibold text-sm">Chưa có ảnh đơn hàng nào</p>
        <p className="text-white/30 text-xs mt-1 max-w-xs">
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
          const displayImg = item.thumbnail_url || item.image_url;

          return (
            <div
              key={item.id}
              className="animate-fade-in"
              style={{ animationDelay: `${Math.min(i * 15, 150)}ms` }}
            >
              <button
                onClick={() => onPhotoClick(item)}
                className="w-full flex items-center gap-3 p-2.5 rounded-2xl bg-surface-elevated border border-border-subtle hover:border-indigo-500/50 hover:bg-surface-elevated/80 transition-all text-left active:scale-[0.99] shadow-md group"
              >
                {/* Thumbnail */}
                <div className="relative w-16 h-20 rounded-xl overflow-hidden bg-black/40 border border-white/10 flex-shrink-0">
                  <img
                    src={displayImg}
                    alt={item.order_code || "Order photo"}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    loading={i < 8 ? "eager" : "lazy"}
                    decoding="async"
                  />
                  <div className="absolute top-1 left-1 bg-black/70 backdrop-blur-md px-1.5 py-0.5 rounded-full text-[9px]">
                    {statusConfig.emoji}
                  </div>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-extrabold text-white truncate">
                      {item.order_code ? `#${item.order_code}` : "Đơn hàng mới"}
                    </p>
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${statusConfig.bgColor} ${statusConfig.color}`}
                    >
                      {statusConfig.labelVi}
                    </span>
                  </div>

                  <p className="text-[11px] text-white/70 truncate mt-0.5">
                    {item.customer_name ? `Khách: ${item.customer_name}` : "Chưa có tên khách"}
                  </p>

                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {item.size && (
                      <span className="text-[9px] font-semibold bg-white/10 px-1.5 py-0.2 rounded text-white/80">
                        Size: {item.size}
                      </span>
                    )}
                    {item.color && (
                      <span className="text-[9px] font-semibold bg-white/10 px-1.5 py-0.2 rounded text-white/80">
                        Màu: {item.color}
                      </span>
                    )}
                    {item.note && (
                      <span className="text-[9px] text-white/40 truncate max-w-[150px]">
                        📝 {item.note}
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

  // Grid Layout Mode (Fast, Non-clipping CSS Grid)
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-3">
      {items.map((item, i) => {
        const statusConfig = STATUS_CONFIG[item.status];
        const displayImg = item.thumbnail_url || item.image_url;

        return (
          <div
            key={item.id}
            className="animate-fade-in"
            style={{ animationDelay: `${Math.min(i * 15, 150)}ms` }}
          >
            <button
              onClick={() => onPhotoClick(item)}
              aria-label={`Mở ảnh ${item.order_code || "đơn hàng"}`}
              className="group relative w-full cursor-pointer rounded-2xl overflow-hidden bg-surface-elevated border border-white/10 hover:border-indigo-500/50 block text-left transition-all duration-200 active:scale-[0.98] shadow-md hover:shadow-xl hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/80"
            >
              {/* Photo Image Aspect Container (Optimized 9:16 for Screenshots) */}
              <div className="relative aspect-[3/4] w-full overflow-hidden bg-black/40">
                <img
                  src={displayImg}
                  alt={item.order_code || "Order photo"}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ease-out"
                  loading={i < 8 ? "eager" : "lazy"}
                  decoding="async"
                />
              </div>

              {/* Status Badge Tag */}
              <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/15 shadow-lg">
                <span
                  aria-hidden="true"
                  className={`w-2 h-2 rounded-full ${statusConfig.dotColor}`}
                />
                <span className="text-[10px] font-bold text-white">
                  {statusConfig.labelVi}
                </span>
              </div>

              {/* Info Overlay */}
              {(item.order_code || item.customer_name || item.size || item.color) && (
                <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col justify-end">
                  {item.order_code && (
                    <p className="text-xs font-extrabold text-white truncate drop-shadow-sm">
                      #{item.order_code}
                    </p>
                  )}
                  {item.customer_name && (
                    <p className="text-[10px] font-medium text-white/80 truncate">
                      {item.customer_name}
                    </p>
                  )}
                  {(item.size || item.color) && (
                    <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                      {item.size && (
                        <span className="text-[9px] font-semibold bg-white/20 px-1.5 py-0.2 rounded text-white">
                          {item.size}
                        </span>
                      )}
                      {item.color && (
                        <span className="text-[9px] font-semibold bg-white/20 px-1.5 py-0.2 rounded text-white truncate max-w-[65px]">
                          {item.color}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}
