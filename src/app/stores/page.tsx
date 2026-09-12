import { getStores } from "@/app/actions/store-actions";
import { getUserProfile, getAllOrderItems } from "@/app/actions/photo-actions";
import { cleanupExpiredCompletedOrders } from "@/app/actions/cleanup-actions";
import { StoreList } from "@/components/store-list";
import type { StoreWithCounts, Profile, OrderItem } from "@/lib/types";

export default async function StoresPage() {
  // Fire background cleanup for items > 14 days (non-blocking)
  cleanupExpiredCompletedOrders().catch((err) => {
    console.error("On-load background cleanup error:", err);
  });

  const [storesResult, profileResult, allItemsResult] = await Promise.all([
    getStores(),
    getUserProfile(),
    getAllOrderItems(),
  ]);

  const stores = (storesResult.data || []) as StoreWithCounts[];
  const profile = profileResult.data as Profile | null;
  const allItems = (allItemsResult.data || []) as OrderItem[];

  return (
    <StoreList
      stores={stores}
      profile={profile}
      initialAllItems={allItems}
    />
  );
}
