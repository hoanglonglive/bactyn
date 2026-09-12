import imageCompression from "browser-image-compression";

export interface CompressedResult {
  fullFile: File;
  thumbFile: File;
}

/**
 * Compresses an image file into two WebP variants:
 * 1. Full-size: max 1200px width, < 200KB
 * 2. Thumbnail: max 600px width, < 60KB
 */
export async function compressImage(file: File): Promise<CompressedResult> {
  const timestamp = Date.now();
  const baseName = file.name.replace(/\.[^/.]+$/, "");

  // Generate both independent variants concurrently using Web Workers.
  // High quality screenshot options (preserving small text, prices & order codes):
  const fullOptions = {
    maxSizeMB: 1.5, // Ultra sharp detail for screenshots (up to 1.5MB)
    maxWidthOrHeight: 2800, // Preserves native phone screenshot heights (e.g. 2796px / 3088px)
    useWebWorker: true,
    fileType: "image/webp" as const,
    initialQuality: 0.95, // 95% quality preserves sharp vector-like text contrast
  };

  const thumbOptions = {
    maxSizeMB: 0.35, // Crisp 3x Retina display thumbnail (~350KB)
    maxWidthOrHeight: 1000,
    useWebWorker: true,
    fileType: "image/webp" as const,
    initialQuality: 0.88,
  };

  const [fullBlob, thumbBlob] = await Promise.all([
    imageCompression(file, fullOptions),
    imageCompression(file, thumbOptions),
  ]);
  const fullFile = new File(
    [fullBlob],
    `${baseName}_${timestamp}.webp`,
    { type: "image/webp" }
  );
  const thumbFile = new File(
    [thumbBlob],
    `${baseName}_${timestamp}_thumb.webp`,
    { type: "image/webp" }
  );

  return { fullFile, thumbFile };
}

/**
 * Compresses a cover image for store albums.
 * Max 1400px width, high quality
 */
export async function compressCoverImage(file: File): Promise<File> {
  const timestamp = Date.now();
  const baseName = file.name.replace(/\.[^/.]+$/, "");

  const options = {
    maxSizeMB: 0.6,
    maxWidthOrHeight: 1400,
    useWebWorker: true,
    fileType: "image/webp" as const,
    initialQuality: 0.92,
  };

  const blob = await imageCompression(file, options);
  return new File(
    [blob],
    `cover_${baseName}_${timestamp}.webp`,
    { type: "image/webp" }
  );
}
