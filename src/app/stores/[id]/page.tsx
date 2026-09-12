import { getStore } from "@/app/actions/store-actions";
import {
  getStoreItems,
  getUserProfile,
  getAllStoresSimple,
} from "@/app/actions/photo-actions";
import { StoreDetail } from "@/components/store-detail";
import { notFound } from "next/navigation";
import type { OrderItem, Profile, Store } from "@/lib/types";

export default async function StoreDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [storeResult, itemsResult, profileResult, allStores] =
    await Promise.all([
      getStore(id),
      getStoreItems(id),
      getUserProfile(),
      getAllStoresSimple(),
    ]);

  if (storeResult.error || !storeResult.data) {
    notFound();
  }

  const store = storeResult.data as Store;
  const items = (itemsResult.data || []) as OrderItem[];
  const counts = {
    total: 0,
    PURCHASED: 0,
    PENDING_ORDER: 0,
    DELIVERED: 0,
    OUT_OF_STOCK: 0,
  };
  for (const item of items) {
    counts.total++;
    counts[item.status]++;
  }
  const profile = profileResult.data as Profile | null;
  const otherStores = allStores.filter((s) => s.id !== id);

  return (
    <StoreDetail
      store={store}
      initialItems={items}
      initialCounts={counts}
      profile={profile}
      otherStores={otherStores}
    />
  );
}
