"use client";

import { ImageIcon } from "lucide-react";
import type { OrderItem } from "@/lib/types";
import { STATUS_CONFIG } from "@/lib/types";

interface Props {
  items: OrderItem[];
  onPhotoClick: (item: OrderItem) => void;
}

export function PhotoGrid({ items, onPhotoClick }: Props) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-surface-elevated flex items-center justify-center mb-4 border border-border-subtle shadow-xl">
          <ImageIcon className="w-8 h-8 text-white/20" />
        </div>
        <p className="text-white/60 font-semibold text-sm">Chưa có ảnh đơn hàng nào</p>
        <p className="text-white/30 text-xs mt-1 max-w-xs">
          Nhấn nút biểu tượng camera 📷 ở góc dưới màn hình để chụp hoặc chọn nhiều ảnh cùng lúc
        </p>
      </div>
    );
  }

  return (
    <div className="columns-2 sm:columns-3 md:columns-4 xl:columns-5 gap-2 sm:gap-3 space-y-2 sm:space-y-3">
      {items.map((item, i) => {
        const statusConfig = STATUS_CONFIG[item.status];

        return (
          <div
            key={item.id}
            className="break-inside-avoid animate-fade-in"
            style={{ animationDelay: `${Math.min(i * 20, 200)}ms` }}
          >
            <button
              onClick={() => onPhotoClick(item)}
              aria-label={`Mở ảnh ${item.order_code || "đơn hàng"}`}
              className="group relative w-full cursor-zoom-in rounded-2xl overflow-hidden bg-surface-elevated border border-white/[0.08] hover:border-white/25 block text-left transition-[transform,box-shadow,border-color] duration-200 active:scale-[0.98] shadow-md hover:shadow-2xl hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
            >
              {/* Photo Image */}
              <div className="relative aspect-[9/16] w-full overflow-hidden bg-black/30">
                <img
                  src={item.image_url}
                  alt={item.order_code || "Order photo"}
                  width={675}
                  height={1200}
                  className="w-full h-full object-contain group-hover:scale-[1.02] transition-transform duration-300 ease-out"
                  loading={i < 6 ? "eager" : "lazy"}
                  fetchPriority={i < 6 ? "high" : "auto"}
                  decoding="async"
                />
              </div>

              {/* Status Badge Tag */}
              <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/60 backdrop-blur-md px-2 py-1 rounded-full border border-white/10 shadow-lg">
                <span
                  aria-hidden="true"
                  className={`w-2 h-2 rounded-full shadow-[0_0_0_2px_rgba(255,255,255,0.12)] ${statusConfig.dotColor}`}
                />
                <span className="text-[10px] font-bold text-white/90">
                  {statusConfig.labelVi}
                </span>
              </div>

              {/* Info Overlay */}
              {(item.order_code || item.customer_name || item.size || item.color) && (
                <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/85 via-black/40 to-transparent flex flex-col justify-end">
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
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {item.size && (
                        <span className="text-[9px] font-semibold bg-white/20 px-1.5 py-0.5 rounded text-white">
                          {item.size}
                        </span>
                      )}
                      {item.color && (
                        <span className="text-[9px] font-semibold bg-white/20 px-1.5 py-0.5 rounded text-white truncate max-w-[60px]">
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
