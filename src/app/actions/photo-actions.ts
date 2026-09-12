"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { OrderItem, OrderStatus } from "@/lib/types";

export async function uploadOrderPhotos(storeId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const files = formData.getAll("files") as File[];
  const thumbnails = formData.getAll("thumbnails") as File[];

  if (files.length === 0) {
    return { error: "No files uploaded" };
  }

  const results = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const thumb = thumbnails[i] || file;
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");

    const fullPath = `orders/${storeId}/${timestamp}_${i}_full_${safeName}`;
    const thumbPath = `orders/${storeId}/${timestamp}_${i}_thumb_${safeName}`;

    // Upload full-size image
    const { error: fullErr } = await supabase.storage
      .from("order-photos")
      .upload(fullPath, file, { contentType: file.type, upsert: false });

    if (fullErr) {
      console.error("Full upload error:", fullErr);
      continue;
    }

    // Upload thumbnail
    const { error: thumbErr } = await supabase.storage
      .from("order-photos")
      .upload(thumbPath, thumb, { contentType: thumb.type, upsert: false });

    if (thumbErr) {
      console.error("Thumb upload error:", thumbErr);
    }

    const {
      data: { publicUrl: image_url },
    } = supabase.storage.from("order-photos").getPublicUrl(fullPath);

    const {
      data: { publicUrl: thumbnail_url },
    } = supabase.storage.from("order-photos").getPublicUrl(thumbPath);

    // Insert order_item DB record
    const { data: item, error: dbErr } = await supabase
      .from("order_items")
      .insert({
        store_id: storeId,
        image_url,
        thumbnail_url: thumbErr ? image_url : thumbnail_url,
        status: "PENDING_ORDER" as OrderStatus,
        created_by: user.id,
      })
      .select()
      .single();

    if (!dbErr && item) {
      results.push(item);
    }
  }

  revalidatePath(`/stores/${storeId}`);
  revalidatePath("/stores");
  return { results };
}

export async function updatePhotoStatus(
  photoId: string,
  newStatus: OrderStatus
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const { data: item, error } = await supabase
    .from("order_items")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", photoId)
    .select("store_id")
    .single();

  if (error) {
    return { error: error.message };
  }

  if (item?.store_id) {
    revalidatePath(`/stores/${item.store_id}`);
  }
  revalidatePath("/stores");
  return { success: true };
}

export async function updatePhotoInfo(
  photoId: string,
  data: {
    order_code?: string;
    customer_name?: string;
    size?: string;
    color?: string;
    note?: string;
  }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const { data: item, error } = await supabase
    .from("order_items")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", photoId)
    .select("store_id")
    .single();

  if (error) {
    return { error: error.message };
  }

  if (item?.store_id) {
    revalidatePath(`/stores/${item.store_id}`);
  }
  revalidatePath("/stores");
  return { success: true };
}

export async function movePhotoToStore(
  photoId: string,
  targetStoreId: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // Get previous store_id
  const { data: oldItem } = await supabase
    .from("order_items")
    .select("store_id")
    .eq("id", photoId)
    .single();

  const { error } = await supabase
    .from("order_items")
    .update({ store_id: targetStoreId, updated_at: new Date().toISOString() })
    .eq("id", photoId);

  if (error) {
    return { error: error.message };
  }

  if (oldItem?.store_id) {
    revalidatePath(`/stores/${oldItem.store_id}`);
  }
  revalidatePath(`/stores/${targetStoreId}`);
  revalidatePath("/stores");
  return { success: true };
}

export async function deleteOrderPhoto(photoId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // Get photo info for storage cleanup
  const { data: photo } = await supabase
    .from("order_items")
    .select("image_url, thumbnail_url, store_id")
    .eq("id", photoId)
    .single();

  if (!photo) {
    return { error: "Photo not found" };
  }

  // Delete from storage
  const filePaths: string[] = [];
  const imgPath = extractStoragePath(photo.image_url);
  const thumbPath = extractStoragePath(photo.thumbnail_url);
  if (imgPath) filePaths.push(imgPath);
  if (thumbPath) filePaths.push(thumbPath);

  if (filePaths.length > 0) {
    await supabase.storage.from("order-photos").remove(filePaths);
  }

  // Delete from DB
  const { error } = await supabase
    .from("order_items")
    .delete()
    .eq("id", photoId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/stores/${photo.store_id}`);
  revalidatePath("/stores");
  return { success: true };
}

export async function bulkDeleteOrderPhotos(photoIds: string[]) {
  if (!photoIds || photoIds.length === 0) {
    return { success: true, count: 0 };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // Check admin role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return { error: "Only admins can delete photos" };
  }

  // Get photo info for storage cleanup
  const { data: photos } = await supabase
    .from("order_items")
    .select("image_url, thumbnail_url, store_id")
    .in("id", photoIds);

  if (photos && photos.length > 0) {
    const filePaths: string[] = [];
    const affectedStoreIds = new Set<string>();

    for (const p of photos) {
      if (p.store_id) affectedStoreIds.add(p.store_id);
      const imgPath = extractStoragePath(p.image_url);
      const thumbPath = extractStoragePath(p.thumbnail_url);
      if (imgPath) filePaths.push(imgPath);
      if (thumbPath && thumbPath !== imgPath) filePaths.push(thumbPath);
    }

    if (filePaths.length > 0) {
      await supabase.storage.from("order-photos").remove(filePaths);
    }

    // Delete from DB
    const { error } = await supabase
      .from("order_items")
      .delete()
      .in("id", photoIds);

    if (error) {
      return { error: error.message };
    }

    affectedStoreIds.forEach((sId) => revalidatePath(`/stores/${sId}`));
  }

  return { success: true, count: photoIds.length };
}

export async function bulkUpdatePhotoStatus(
  photoIds: string[],
  newStatus: OrderStatus
) {
  if (!photoIds || photoIds.length === 0) {
    return { success: true, count: 0 };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const STAFF_ALLOWED_STATUSES: OrderStatus[] = [
    "DELIVERED",
    "IN_STOCK",
    "PARTIALLY_PURCHASED",
    "PAID_NOT_RECEIVED",
  ];

  // Check staff role permissions
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin" && !STAFF_ALLOWED_STATUSES.includes(newStatus)) {
    return { error: "Bạn không có quyền chuyển sang trạng thái này" };
  }

  const { error } = await supabase
    .from("order_items")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .in("id", photoIds);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/stores");
  return { success: true, count: photoIds.length };
}

export async function bulkMovePhotosToStore(
  photoIds: string[],
  targetStoreId: string
) {
  if (!photoIds || photoIds.length === 0) {
    return { success: true, count: 0 };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return { error: "Only admins can move photos" };
  }

  const { error } = await supabase
    .from("order_items")
    .update({ store_id: targetStoreId })
    .in("id", photoIds);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/stores");
  revalidatePath(`/stores/${targetStoreId}`);
  return { success: true, count: photoIds.length };
}

export async function getStoreItems(
  storeId: string,
  statusFilter?: OrderStatus | null
) {
  const supabase = await createClient();

  let query = supabase
    .from("order_items")
    .select("id, store_id, image_url, thumbnail_url, status, order_code, customer_name, size, color, note, display_order, created_at, updated_at, created_by")
    .eq("store_id", storeId)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }

  const { data, error } = await query;

  if (error) {
    return { error: error.message, data: null };
  }

  return { data, error: null };
}

export async function getStatusCounts(storeId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("order_items")
    .select("status")
    .eq("store_id", storeId);

  if (error) {
    return { error: error.message, data: null };
  }

  const counts = {
    total: data.length,
    PURCHASED: 0,
    PARTIALLY_PURCHASED: 0,
    PENDING_ORDER: 0,
    DELIVERED: 0,
    IN_STOCK: 0,
    OUT_OF_STOCK: 0,
    PAID_NOT_RECEIVED: 0,
  };

  for (const item of data) {
    if (item.status in counts) {
      counts[item.status as OrderStatus]++;
    }
  }

  return { data: counts, error: null };
}

export async function getUserProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null };
  }

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return { data };
}

export async function getAllStoresSimple() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("stores")
    .select("id, name")
    .order("name");

  return data || [];
}

export async function getAllOrderItems(statusFilter?: OrderStatus | null) {
  const supabase = await createClient();

  let query = supabase
    .from("order_items")
    .select("id, store_id, image_url, thumbnail_url, status, order_code, customer_name, size, color, note, display_order, created_at, updated_at, created_by, stores(id, name)")
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }

  const { data, error } = await query;

  if (error) {
    // Fallback if relation syntax varies
    const { data: fallbackData, error: fallbackErr } = await supabase
      .from("order_items")
      .select("id, store_id, image_url, thumbnail_url, status, order_code, customer_name, size, color, note, display_order, created_at, updated_at, created_by")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (fallbackErr) {
      return { error: fallbackErr.message, data: null };
    }

    return { data: fallbackData as OrderItem[], error: null };
  }

  const formattedData = (data || []).map((item: any) => {
    const storeObj = Array.isArray(item.stores) ? item.stores[0] : item.stores;
    return {
      ...item,
      store_name: storeObj?.name || "",
    } as OrderItem;
  });

  return { data: formattedData, error: null };
}

export async function groupPhotosTogether(storeId: string, selectedPhotoIds: string[]) {
  if (!selectedPhotoIds || selectedPhotoIds.length <= 1) {
    return { success: true };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // Fetch all photos in the store sorted by current order
  const { data: storePhotos, error: fetchErr } = await supabase
    .from("order_items")
    .select("id, display_order, created_at")
    .eq("store_id", storeId)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (fetchErr || !storePhotos) {
    return { error: fetchErr?.message || "Failed to fetch photos" };
  }

  const selectedSet = new Set(selectedPhotoIds);
  const selectedItems = storePhotos.filter((p) => selectedSet.has(p.id));
  const unselectedItems = storePhotos.filter((p) => !selectedSet.has(p.id));

  // Find target insertion index: index of the first selected item in original array
  let insertIndex = storePhotos.findIndex((p) => selectedSet.has(p.id));
  if (insertIndex === -1) insertIndex = 0;

  // Insert all selected items together at target index
  const newOrderList: typeof storePhotos = [];
  let unselectedIdx = 0;

  for (let i = 0; i < storePhotos.length; i++) {
    if (i === insertIndex) {
      newOrderList.push(...selectedItems);
    }
    if (unselectedIdx < unselectedItems.length && !selectedSet.has(storePhotos[i].id)) {
      newOrderList.push(unselectedItems[unselectedIdx]);
      unselectedIdx++;
    }
  }

  // Fallback: append any remaining unselected items
  while (unselectedIdx < unselectedItems.length) {
    newOrderList.push(unselectedItems[unselectedIdx]);
    unselectedIdx++;
  }

  // Update display_order for all items in order
  const updates = newOrderList.map((item, index) => ({
    id: item.id,
    display_order: index + 1,
  }));

  for (const update of updates) {
    await supabase
      .from("order_items")
      .update({ display_order: update.display_order })
      .eq("id", update.id);
  }

  revalidatePath(`/stores/${storeId}`);
  revalidatePath("/stores");
  return { success: true };
}

export async function updatePhotosOrder(
  storeId: string,
  photoOrders: { id: string; display_order: number }[]
) {
  if (!photoOrders || photoOrders.length === 0) {
    return { success: true };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  for (const item of photoOrders) {
    await supabase
      .from("order_items")
      .update({ display_order: item.display_order })
      .eq("id", item.id);
  }

  revalidatePath(`/stores/${storeId}`);
  revalidatePath("/stores");
  return { success: true };
}

function extractStoragePath(publicUrl: string): string | null {
  if (!publicUrl) return null;
  const marker = "/object/public/order-photos/";
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return publicUrl.substring(idx + marker.length);
}

