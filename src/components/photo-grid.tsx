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
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-surface-elevated flex items-center justify-center mb-4">
          <ImageIcon className="w-8 h-8 text-white/20" />
        </div>
        <p className="text-white/40 text-sm">Chưa có ảnh nào</p>
        <p className="text-white/25 text-xs mt-1">
          Nhấn nút 📷 để chụp hoặc chọn ảnh
        </p>
      </div>
    );
  }

  return (
    <div className="columns-2 gap-2 space-y-2">
      {items.map((item, i) => (
        <div
          key={item.id}
          className="break-inside-avoid animate-fade-in"
          style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}
        >
          <button
            onClick={() => onPhotoClick(item)}
            className="relative w-full rounded-xl overflow-hidden bg-surface-elevated border border-border-subtle photo-card block"
          >
            <img
              src={item.thumbnail_url}
              alt={item.order_code || "Order photo"}
              className="w-full h-auto object-cover"
              loading="lazy"
              decoding="async"
            />

            {/* Status indicator */}
            <div className="absolute top-1.5 left-1.5">
              <span className="text-sm drop-shadow-lg">
                {STATUS_CONFIG[item.status].emoji}
              </span>
            </div>

            {/* Info overlay */}
            {(item.order_code || item.customer_name) && (
              <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 bg-gradient-to-t from-black/70 to-transparent">
                {item.order_code && (
                  <p className="text-[10px] font-semibold text-white truncate">
                    #{item.order_code}
                  </p>
                )}
                {item.customer_name && (
                  <p className="text-[9px] text-white/60 truncate">
                    {item.customer_name}
                  </p>
                )}
              </div>
            )}
          </button>
        </div>
      ))}
    </div>
  );
}
