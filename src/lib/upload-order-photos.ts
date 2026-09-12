"use client";

import { createClient } from "@/lib/supabase/client";
import type { OrderItem, OrderStatus } from "@/lib/types";

const BUCKET = "order-photos";
const CACHE_SECONDS = "31536000";
const UPLOAD_CONCURRENCY = 4;

export interface PhotoUploadInput {
  id: string;
  originalName: string;
  fullFile: File;
  thumbFile: File;
}

export interface PhotoUploadResult {
  items: OrderItem[];
  uploadedIds: string[];
  errors: Array<{ id: string; message: string }>;
}

interface UploadedPhoto {
  id: string;
  imageUrl: string;
  thumbnailUrl: string;
}

/**
 * Uploads directly to Supabase's CDN instead of proxying image bytes through
 * Next.js. Each full/thumbnail pair is uploaded in parallel and photo jobs use
 * a small pool so mobile browsers stay responsive.
 */
export async function uploadOrderPhotosDirect(
  storeId: string,
  photos: PhotoUploadInput[],
  onUploaded?: (id: string) => void
): Promise<PhotoUploadResult> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return {
      items: [],
      uploadedIds: [],
      errors: photos.map(({ id }) => ({ id, message: "Unauthorized" })),
    };
  }

  const uploads = await mapWithConcurrency(
    photos,
    UPLOAD_CONCURRENCY,
    async (photo): Promise<UploadedPhoto> => {
      const objectId = crypto.randomUUID();
      const basePath = `orders/${storeId}/${objectId}`;
      const fullPath = `${basePath}.webp`;
      const thumbPath = `${basePath}_thumb.webp`;

      const [fullResult, thumbResult] = await Promise.all([
        supabase.storage.from(BUCKET).upload(fullPath, photo.fullFile, {
          contentType: "image/webp",
          cacheControl: CACHE_SECONDS,
          upsert: false,
        }),
        supabase.storage.from(BUCKET).upload(thumbPath, photo.thumbFile, {
          contentType: "image/webp",
          cacheControl: CACHE_SECONDS,
          upsert: false,
        }),
      ]);

      if (fullResult.error || thumbResult.error) {
        throw new Error(
          fullResult.error?.message || thumbResult.error?.message || "Upload failed"
        );
      }

      const { data: fullUrl } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(fullPath);
      const { data: thumbUrl } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(thumbPath);

      onUploaded?.(photo.id);
      return {
        id: photo.id,
        imageUrl: fullUrl.publicUrl,
        thumbnailUrl: thumbUrl.publicUrl,
      };
    }
  );

  const successfulUploads: UploadedPhoto[] = [];
  const errors: PhotoUploadResult["errors"] = [];

  uploads.forEach((result, index) => {
    if (result.status === "fulfilled") {
      successfulUploads.push(result.value);
    } else {
      errors.push({
        id: photos[index].id,
        message:
          result.reason instanceof Error ? result.reason.message : "Upload failed",
      });
    }
  });

  if (successfulUploads.length === 0) {
    return { items: [], uploadedIds: [], errors };
  }

  const rows = successfulUploads.map((photo) => ({
    store_id: storeId,
    image_url: photo.imageUrl,
    thumbnail_url: photo.thumbnailUrl,
    status: "PENDING_ORDER" as OrderStatus,
    created_by: session.user.id,
  }));

  // One database roundtrip for the whole batch.
  const { data, error } = await supabase
    .from("order_items")
    .insert(rows)
    .select("id, store_id, image_url, thumbnail_url, status, order_code, customer_name, size, color, note, created_at, updated_at, created_by");

  if (error) {
    return {
      items: [],
      uploadedIds: [],
      errors: [
        ...errors,
        ...successfulUploads.map(({ id }) => ({ id, message: error.message })),
      ],
    };
  }

  return {
    items: (data || []) as OrderItem[],
    uploadedIds: successfulUploads.map(({ id }) => id),
    errors,
  };
}

async function mapWithConcurrency<T, R>(
  values: T[],
  concurrency: number,
  mapper: (value: T) => Promise<R>
): Promise<PromiseSettledResult<R>[]> {
  const results = new Array<PromiseSettledResult<R>>(values.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < values.length) {
      const index = nextIndex++;
      try {
        results[index] = { status: "fulfilled", value: await mapper(values[index]) };
      } catch (reason) {
        results[index] = { status: "rejected", reason };
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, () => worker())
  );
  return results;
}
