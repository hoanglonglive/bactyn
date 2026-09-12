"use client";

import type { OrderStatus } from "@/lib/types";
import { STATUS_CONFIG } from "@/lib/types";
import { cn } from "@/lib/utils";

interface StatusCounts {
  total: number;
  PURCHASED: number;
  PENDING_ORDER: number;
  DELIVERED: number;
  OUT_OF_STOCK: number;
}

interface Props {
  counts: StatusCounts;
  activeFilter: OrderStatus | null;
  onFilterChange: (status: OrderStatus | null) => void;
}

const FILTERS: { key: OrderStatus | null; label: string; emoji?: string }[] = [
  { key: null, label: "Tất cả" },
  { key: "PURCHASED", label: "Đã mua", emoji: "🟢" },
  { key: "PENDING_ORDER", label: "Chờ order", emoji: "🟡" },
  { key: "DELIVERED", label: "Đã giao", emoji: "🔵" },
  { key: "OUT_OF_STOCK", label: "Hết hàng", emoji: "🔴" },
];

export function StatusFilter({ counts, activeFilter, onFilterChange }: Props) {
  function getCount(key: OrderStatus | null): number {
    if (key === null) return counts.total;
    return counts[key];
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
              "min-h-11 flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80",
              isActive
                ? filter.key
                  ? STATUS_CONFIG[filter.key].bgColor +
                    " " +
                    STATUS_CONFIG[filter.key].color
                  : "bg-white/15 border-white/20 text-white"
                : "bg-surface-overlay border-border-subtle text-white/40 hover:text-white/60"
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
                "min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold",
                isActive
                  ? "bg-white/15"
                  : "bg-surface-elevated"
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
