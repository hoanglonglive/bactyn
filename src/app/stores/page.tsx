import { getStores } from "@/app/actions/store-actions";
import { getUserProfile } from "@/app/actions/photo-actions";
import { StoreList } from "@/components/store-list";
import type { StoreWithCounts, Profile } from "@/lib/types";

export default async function StoresPage() {
  const [storesResult, profileResult] = await Promise.all([
    getStores(),
    getUserProfile(),
  ]);

  const stores = (storesResult.data || []) as StoreWithCounts[];
  const profile = profileResult.data as Profile | null;

  return <StoreList stores={stores} profile={profile} />;
}
