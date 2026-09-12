"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

export interface CleanupResult {
  success: boolean;
  deletedCount: number;
  cleanedStorageFiles: number;
  error?: string;
}

function extractStoragePath(publicUrl: string): string | null {
  if (!publicUrl) return null;
  const marker = "/object/public/order-photos/";
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return publicUrl.substring(idx + marker.length);
}

/**
 * Automatically cleans up order photos marked as DELIVERED or OUT_OF_STOCK
 * that are older than 14 days.
 */
export async function cleanupExpiredCompletedOrders(): Promise<CleanupResult> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 14 days ago ISO timestamp
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

    // Query items with status DELIVERED or OUT_OF_STOCK updated or created > 14 days ago
    const { data: expiredItems, error: fetchErr } = await supabase
      .from("order_items")
      .select("id, image_url, thumbnail_url, store_id, updated_at, created_at")
      .in("status", ["DELIVERED", "OUT_OF_STOCK"])
      .or(`updated_at.lte.${fourteenDaysAgo},and(updated_at.is.null,created_at.lte.${fourteenDaysAgo})`);

    if (fetchErr) {
      console.error("Error fetching expired order items:", fetchErr);
      return { success: false, deletedCount: 0, cleanedStorageFiles: 0, error: fetchErr.message };
    }

    if (!expiredItems || expiredItems.length === 0) {
      return { success: true, deletedCount: 0, cleanedStorageFiles: 0 };
    }

    // Extract storage paths to delete
    const storagePaths: string[] = [];
    const itemIds: string[] = [];
    const affectedStoreIds = new Set<string>();

    for (const item of expiredItems) {
      itemIds.push(item.id);
      if (item.store_id) affectedStoreIds.add(item.store_id);

      const imgPath = extractStoragePath(item.image_url);
      const thumbPath = extractStoragePath(item.thumbnail_url);
      if (imgPath) storagePaths.push(imgPath);
      if (thumbPath && thumbPath !== imgPath) storagePaths.push(thumbPath);
    }

    // Delete files from Supabase Storage
    let cleanedStorageFiles = 0;
    if (storagePaths.length > 0) {
      const { data: removedFiles, error: storageErr } = await supabase.storage
        .from("order-photos")
        .remove(storagePaths);

      if (storageErr) {
        console.error("Error removing expired storage files:", storageErr);
      } else if (removedFiles) {
        cleanedStorageFiles = removedFiles.length;
      }
    }

    // Delete DB records
    const { error: deleteErr } = await supabase
      .from("order_items")
      .delete()
      .in("id", itemIds);

    if (deleteErr) {
      console.error("Error deleting expired DB records:", deleteErr);
      return { success: false, deletedCount: 0, cleanedStorageFiles, error: deleteErr.message };
    }

    // Revalidate paths for affected stores and main store list
    revalidatePath("/stores");
    affectedStoreIds.forEach((storeId) => {
      revalidatePath(`/stores/${storeId}`);
    });

    return {
      success: true,
      deletedCount: itemIds.length,
      cleanedStorageFiles,
    };
  } catch (err: any) {
    console.error("Unexpected error during 14-day order cleanup:", err);
    return {
      success: false,
      deletedCount: 0,
      cleanedStorageFiles: 0,
      error: err?.message || "Internal server error",
    };
  }
}

/**
 * Instantly purges ALL order photos marked as DELIVERED
 * regardless of age to free up server storage and clear database rows immediately.
 */
export async function purgeAllDeliveredOrdersNow(): Promise<CleanupResult> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch ALL items with status DELIVERED
    const { data: deliveredItems, error: fetchErr } = await supabase
      .from("order_items")
      .select("id, image_url, thumbnail_url, store_id")
      .eq("status", "DELIVERED");

    if (fetchErr) {
      console.error("Error fetching DELIVERED order items:", fetchErr);
      return { success: false, deletedCount: 0, cleanedStorageFiles: 0, error: fetchErr.message };
    }

    if (!deliveredItems || deliveredItems.length === 0) {
      return { success: true, deletedCount: 0, cleanedStorageFiles: 0 };
    }

    const storagePaths: string[] = [];
    const itemIds: string[] = [];
    const affectedStoreIds = new Set<string>();

    for (const item of deliveredItems) {
      itemIds.push(item.id);
      if (item.store_id) affectedStoreIds.add(item.store_id);

      const imgPath = extractStoragePath(item.image_url);
      const thumbPath = extractStoragePath(item.thumbnail_url);
      if (imgPath) storagePaths.push(imgPath);
      if (thumbPath && thumbPath !== imgPath) storagePaths.push(thumbPath);
    }

    // Delete files from Supabase Storage in batches of 100
    let cleanedStorageFiles = 0;
    if (storagePaths.length > 0) {
      const batchSize = 100;
      for (let i = 0; i < storagePaths.length; i += batchSize) {
        const batch = storagePaths.slice(i, i + batchSize);
        const { data: removedFiles, error: storageErr } = await supabase.storage
          .from("order-photos")
          .remove(batch);

        if (!storageErr && removedFiles) {
          cleanedStorageFiles += removedFiles.length;
        }
      }
    }

    // Delete DB records
    const { error: deleteErr } = await supabase
      .from("order_items")
      .delete()
      .in("id", itemIds);

    if (deleteErr) {
      console.error("Error deleting DELIVERED DB records:", deleteErr);
      return { success: false, deletedCount: 0, cleanedStorageFiles, error: deleteErr.message };
    }

    revalidatePath("/stores");
    affectedStoreIds.forEach((storeId) => {
      revalidatePath(`/stores/${storeId}`);
    });

    return {
      success: true,
      deletedCount: itemIds.length,
      cleanedStorageFiles,
    };
  } catch (err: any) {
    console.error("Unexpected error during instant delivered order purge:", err);
    return {
      success: false,
      deletedCount: 0,
      cleanedStorageFiles: 0,
      error: err?.message || "Internal server error",
    };
  }
}
