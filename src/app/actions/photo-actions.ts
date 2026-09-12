"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { OrderStatus } from "@/lib/types";

export async function uploadOrderPhotos(
  storeId: string,
  formData: FormData
) {
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
    return { error: "No files to upload" };
  }

  const results = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const thumb = thumbnails[i];
    const timestamp = Date.now();
    const baseName = file.name.replace(/\.[^/.]+$/, "");

    // Upload full-size image
    const fullPath = `orders/${storeId}/${timestamp}_${baseName}.webp`;
    const { error: fullError } = await supabase.storage
      .from("order-photos")
      .upload(fullPath, file, {
        contentType: "image/webp",
        upsert: false,
      });

    if (fullError) {
      results.push({ error: `Failed to upload ${file.name}: ${fullError.message}` });
      continue;
    }

    // Upload thumbnail
    const thumbPath = `orders/${storeId}/${timestamp}_${baseName}_thumb.webp`;
    const { error: thumbError } = await supabase.storage
      .from("order-photos")
      .upload(thumbPath, thumb, {
        contentType: "image/webp",
        upsert: false,
      });

    if (thumbError) {
      results.push({ error: `Failed to upload thumbnail for ${file.name}: ${thumbError.message}` });
      continue;
    }

    const { data: { publicUrl: imageUrl } } = supabase.storage
      .from("order-photos")
      .getPublicUrl(fullPath);

    const { data: { publicUrl: thumbnailUrl } } = supabase.storage
      .from("order-photos")
      .getPublicUrl(thumbPath);

    // Insert DB record
    const { error: dbError } = await supabase
      .from("order_items")
      .insert({
        store_id: storeId,
        image_url: imageUrl,
        thumbnail_url: thumbnailUrl,
        status: "PENDING_ORDER" as OrderStatus,
        created_by: user.id,
      });

    if (dbError) {
      results.push({ error: `DB error for ${file.name}: ${dbError.message}` });
    } else {
      results.push({ success: true, name: file.name });
    }
  }

  revalidatePath(`/stores/${storeId}`);
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

  const { error } = await supabase
    .from("order_items")
    .update({ status: newStatus })
    .eq("id", photoId);

  if (error) {
    return { error: error.message };
  }

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

  const { error } = await supabase
    .from("order_items")
    .update(data)
    .eq("id", photoId);

  if (error) {
    return { error: error.message };
  }

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

  const { error } = await supabase
    .from("order_items")
    .update({ store_id: targetStoreId })
    .eq("id", photoId);

  if (error) {
    return { error: error.message };
  }

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
  return { success: true };
}

export async function getStoreItems(
  storeId: string,
  statusFilter?: OrderStatus | null
) {
  const supabase = await createClient();

  let query = supabase
    .from("order_items")
    .select("*")
    .eq("store_id", storeId)
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
    PENDING_ORDER: 0,
    DELIVERED: 0,
    OUT_OF_STOCK: 0,
  };

  for (const item of data) {
    counts[item.status as OrderStatus]++;
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

function extractStoragePath(publicUrl: string): string | null {
  if (!publicUrl) return null;
  const marker = "/object/public/order-photos/";
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return publicUrl.substring(idx + marker.length);
}
