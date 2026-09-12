import imageCompression from "browser-image-compression";

export interface CompressedResult {
  fullFile: File;
  thumbFile: File;
}

/**
 * Compresses an image file into two WebP variants:
 * 1. Full-size: max 1200px width, < 200KB
 * 2. Thumbnail: max 300px width, < 30KB
 */
export async function compressImage(file: File): Promise<CompressedResult> {
  const timestamp = Date.now();
  const baseName = file.name.replace(/\.[^/.]+$/, "");

  // Compress full-size version
  const fullOptions = {
    maxSizeMB: 0.195, // ~200KB
    maxWidthOrHeight: 1200,
    useWebWorker: true,
    fileType: "image/webp" as const,
    initialQuality: 0.82,
  };

  const fullBlob = await imageCompression(file, fullOptions);
  const fullFile = new File(
    [fullBlob],
    `${baseName}_${timestamp}.webp`,
    { type: "image/webp" }
  );

  // Compress thumbnail version
  const thumbOptions = {
    maxSizeMB: 0.028, // ~30KB
    maxWidthOrHeight: 300,
    useWebWorker: true,
    fileType: "image/webp" as const,
    initialQuality: 0.6,
  };

  const thumbBlob = await imageCompression(file, thumbOptions);
  const thumbFile = new File(
    [thumbBlob],
    `${baseName}_${timestamp}_thumb.webp`,
    { type: "image/webp" }
  );

  return { fullFile, thumbFile };
}

/**
 * Compresses a cover image for store albums.
 * Max 800px width, < 150KB
 */
export async function compressCoverImage(file: File): Promise<File> {
  const timestamp = Date.now();
  const baseName = file.name.replace(/\.[^/.]+$/, "");

  const options = {
    maxSizeMB: 0.145,
    maxWidthOrHeight: 800,
    useWebWorker: true,
    fileType: "image/webp" as const,
    initialQuality: 0.8,
  };

  const blob = await imageCompression(file, options);
  return new File(
    [blob],
    `cover_${baseName}_${timestamp}.webp`,
    { type: "image/webp" }
  );
}
