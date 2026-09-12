"use client";

import type { OrderStatus } from "@/lib/types";
import { STATUS_CONFIG } from "@/lib/types";
import { cn } from "@/lib/utils";

interface StatusCounts {
  total: number;
  PURCHASED: number;
  PARTIALLY_PURCHASED: number;
  PENDING_ORDER: number;
  DELIVERED: number;
  IN_STOCK: number;
  OUT_OF_STOCK: number;
}

interface Props {
  counts: StatusCounts;
  activeFilter: OrderStatus | null;
  onFilterChange: (status: OrderStatus | null) => void;
}

const FILTERS: { key: OrderStatus | null; label: string; emoji?: string }[] = [
  { key: null, label: "Tất cả" },
  { key: "PURCHASED", label: "Đã mua xong", emoji: "🟢" },
  { key: "PARTIALLY_PURCHASED", label: "Chưa mua xong", emoji: "🟠" },
  { key: "PENDING_ORDER", label: "Chờ order", emoji: "🟡" },
  { key: "DELIVERED", label: "Đã giao", emoji: "🔵" },
  { key: "IN_STOCK", label: "Tồn kho", emoji: "📦" },
  { key: "OUT_OF_STOCK", label: "Hết hàng", emoji: "🔴" },
];

export function StatusFilter({ counts, activeFilter, onFilterChange }: Props) {
  function getCount(key: OrderStatus | null): number {
    if (key === null) return counts.total;
    return counts[key] || 0;
  }

  return (
    <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-none">
      {FILTERS.map((filter) => {
        const isActive = activeFilter === filter.key;
        const count = getCount(filter.key);

        return (
          <button
            key={filter.key ?? "all"}
            onClick={() => onFilterChange(filter.key)}
            aria-pressed={isActive}
            className={cn(
              "min-h-11 flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 active:scale-95 shadow-sm",
              isActive
                ? filter.key
                  ? STATUS_CONFIG[filter.key].bgColor +
                    " " +
                    STATUS_CONFIG[filter.key].color +
                    " ring-2 ring-indigo-500/30"
                  : "bg-white/20 border-white/30 text-white shadow-md"
                : "bg-surface-overlay/80 border-border-subtle text-white/50 hover:text-white/80 hover:bg-surface-overlay"
            )}
          >
            {filter.key && (
              <span
                aria-hidden="true"
                className={`w-2 h-2 rounded-full ${STATUS_CONFIG[filter.key].dotColor}`}
              />
            )}
            <span>{filter.label}</span>
            <span
              className={cn(
                "min-w-[18px] px-1.5 h-[18px] rounded-full flex items-center justify-center text-[10px] font-extrabold",
                isActive
                  ? "bg-white/20 text-white"
                  : "bg-surface-elevated text-white/60"
              )}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
