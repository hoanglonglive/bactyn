import { getStores } from "@/app/actions/store-actions";
import { getUserProfile } from "@/app/actions/photo-actions";
import { cleanupExpiredCompletedOrders } from "@/app/actions/cleanup-actions";
import { StoreList } from "@/components/store-list";
import type { StoreWithCounts, Profile } from "@/lib/types";

export default async function StoresPage() {
  // Fire background cleanup for items > 14 days (non-blocking)
  cleanupExpiredCompletedOrders().catch((err) => {
    console.error("On-load background cleanup error:", err);
  });

  const [storesResult, profileResult] = await Promise.all([
    getStores(),
    getUserProfile(),
  ]);

  const stores = (storesResult.data || []) as StoreWithCounts[];
  const profile = profileResult.data as Profile | null;

  return <StoreList stores={stores} profile={profile} />;
}
