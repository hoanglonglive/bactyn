export type UserRole = "admin" | "staff";

export type OrderStatus =
  | "PURCHASED"
  | "PARTIALLY_PURCHASED"
  | "PENDING_ORDER"
  | "DELIVERED"
  | "IN_STOCK"
  | "OUT_OF_STOCK"
  | "PAID_NOT_RECEIVED";

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
  display_order?: number;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface StoreWithCounts extends Store {
  total_items: number;
  purchased_count: number;
  partially_purchased_count: number;
  pending_count: number;
  delivered_count: number;
  in_stock_count: number;
  out_of_stock_count: number;
  paid_not_received_count: number;
}

export interface OrderItem {
  id: string;
  store_id: string;
  store_name?: string;
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
  { label: string; labelVi: string; color: string; bgColor: string; dotColor: string; emoji: string }
> = {
  PURCHASED: {
    label: "Purchased",
    labelVi: "Đã mua xong",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/20 border-emerald-500/30",
    dotColor: "bg-emerald-400",
    emoji: "🟢",
  },
  PARTIALLY_PURCHASED: {
    label: "Partially Purchased",
    labelVi: "Chưa mua xong",
    color: "text-orange-400",
    bgColor: "bg-orange-500/20 border-orange-500/30",
    dotColor: "bg-orange-400",
    emoji: "🟠",
  },
  PENDING_ORDER: {
    label: "Pending Order",
    labelVi: "Chờ order",
    color: "text-amber-400",
    bgColor: "bg-amber-500/20 border-amber-500/30",
    dotColor: "bg-amber-400",
    emoji: "🟡",
  },
  DELIVERED: {
    label: "Delivered",
    labelVi: "Đã giao",
    color: "text-sky-400",
    bgColor: "bg-sky-500/20 border-sky-500/30",
    dotColor: "bg-sky-400",
    emoji: "🔵",
  },
  IN_STOCK: {
    label: "In Stock",
    labelVi: "Tồn kho",
    color: "text-purple-400",
    bgColor: "bg-purple-500/20 border-purple-500/30",
    dotColor: "bg-purple-400",
    emoji: "📦",
  },
  OUT_OF_STOCK: {
    label: "Out of Stock",
    labelVi: "Hết hàng",
    color: "text-rose-400",
    bgColor: "bg-rose-500/20 border-rose-500/30",
    dotColor: "bg-rose-400",
    emoji: "🔴",
  },
  PAID_NOT_RECEIVED: {
    label: "Paid - Not Received",
    labelVi: "Đã thanh toán - Chưa nhận",
    color: "text-indigo-400",
    bgColor: "bg-indigo-500/20 border-indigo-500/30",
    dotColor: "bg-indigo-400",
    emoji: "💳",
  },
};
