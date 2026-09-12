export type UserRole = "admin" | "staff";

export type OrderStatus =
  | "PURCHASED"
  | "PENDING_ORDER"
  | "DELIVERED"
  | "OUT_OF_STOCK";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Store {
  id: string;
  name: string;
  note: string;
  cover_url: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface StoreWithCounts extends Store {
  total_items: number;
  purchased_count: number;
  pending_count: number;
  delivered_count: number;
  out_of_stock_count: number;
}

export interface OrderItem {
  id: string;
  store_id: string;
  image_url: string;
  thumbnail_url: string;
  status: OrderStatus;
  order_code: string;
  customer_name: string;
  size: string;
  color: string;
  note: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; labelVi: string; color: string; bgColor: string; emoji: string }
> = {
  PURCHASED: {
    label: "Purchased",
    labelVi: "Đã mua",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/20 border-emerald-500/30",
    emoji: "🟢",
  },
  PENDING_ORDER: {
    label: "Pending Order",
    labelVi: "Chờ order",
    color: "text-amber-400",
    bgColor: "bg-amber-500/20 border-amber-500/30",
    emoji: "🟡",
  },
  DELIVERED: {
    label: "Delivered",
    labelVi: "Đã giao",
    color: "text-sky-400",
    bgColor: "bg-sky-500/20 border-sky-500/30",
    emoji: "🔵",
  },
  OUT_OF_STOCK: {
    label: "Out of Stock",
    labelVi: "Hết hàng",
    color: "text-rose-400",
    bgColor: "bg-rose-500/20 border-rose-500/30",
    emoji: "🔴",
  },
};
