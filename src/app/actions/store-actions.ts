"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createStore(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const name = formData.get("name") as string;
  const note = (formData.get("note") as string) || "";
  const coverFile = formData.get("cover") as File | null;

  if (!name?.trim()) {
    return { error: "Store name is required" };
  }

  let cover_url = "";

  if (coverFile && coverFile.size > 0) {
    const filePath = `covers/${user.id}/${Date.now()}_${coverFile.name}`;
    const { error: uploadError } = await supabase.storage
      .from("order-photos")
      .upload(filePath, coverFile, {
        contentType: coverFile.type,
        upsert: false,
      });

    if (uploadError) {
      return { error: `Cover upload failed: ${uploadError.message}` };
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("order-photos").getPublicUrl(filePath);
    cover_url = publicUrl;
  }

  const { data, error } = await supabase
    .from("stores")
    .insert({
      name: name.trim(),
      note,
      cover_url,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/stores");
  return { data };
}

export async function deleteStore(storeId: string) {
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
    return { error: "Only admins can delete stores" };
  }

  // 1. Collect all file paths for cleanup
  const { data: items } = await supabase
    .from("order_items")
    .select("image_url, thumbnail_url")
    .eq("store_id", storeId);

  // 2. Get store cover_url
  const { data: store } = await supabase
    .from("stores")
    .select("cover_url")
    .eq("id", storeId)
    .single();

  // 3. Delete files from storage
  if (items && items.length > 0) {
    const filePaths: string[] = [];
    for (const item of items) {
      const imgPath = extractStoragePath(item.image_url);
      const thumbPath = extractStoragePath(item.thumbnail_url);
      if (imgPath) filePaths.push(imgPath);
      if (thumbPath) filePaths.push(thumbPath);
    }
    if (filePaths.length > 0) {
      await supabase.storage.from("order-photos").remove(filePaths);
    }
  }

  // Delete cover image
  if (store?.cover_url) {
    const coverPath = extractStoragePath(store.cover_url);
    if (coverPath) {
      await supabase.storage.from("order-photos").remove([coverPath]);
    }
  }

  // 4. Delete store (order_items cascade via FK ON DELETE CASCADE)
  const { error } = await supabase.from("stores").delete().eq("id", storeId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/stores");
  return { success: true };
}

export async function getStores() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stores_with_counts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    // Fallback directly to stores table if view is unavailable
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("stores")
      .select("*")
      .order("created_at", { ascending: false });

    if (fallbackError) {
      return { error: fallbackError.message, data: null };
    }

    const storesFormatted = (fallbackData || []).map((s) => ({
      ...s,
      total_items: 0,
      purchased_count: 0,
      pending_count: 0,
      delivered_count: 0,
      out_of_stock_count: 0,
    }));

    return { data: storesFormatted, error: null };
  }

  return { data, error: null };
}

export async function getStore(storeId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .eq("id", storeId)
    .single();

  if (error) {
    return { error: error.message, data: null };
  }

  return { data, error: null };
}

function extractStoragePath(publicUrl: string): string | null {
  if (!publicUrl) return null;
  const marker = "/object/public/order-photos/";
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return publicUrl.substring(idx + marker.length);
}
