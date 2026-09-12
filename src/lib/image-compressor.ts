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

  // Balanced screenshot compression options:
  // Sharp & clear text readability, optimized for ultra-fast mobile loading & performance.
  const fullOptions = {
    maxSizeMB: 0.35, // ~250KB - 350KB target max for fast modal loading
    maxWidthOrHeight: 1800, // 1800px max height preserves text sharpness on mobile screenshots
    useWebWorker: true,
    fileType: "image/webp" as const,
    initialQuality: 0.88, // 88% WebP quality prevents blur while keeping file size small
  };

  const thumbOptions = {
    maxSizeMB: 0.08, // ~60KB - 80KB target max for instant grid/list scrolling
    maxWidthOrHeight: 800,
    useWebWorker: true,
    fileType: "image/webp" as const,
    initialQuality: 0.78,
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
 * Max 1000px width, ~180KB max
 */
export async function compressCoverImage(file: File): Promise<File> {
  const timestamp = Date.now();
  const baseName = file.name.replace(/\.[^/.]+$/, "");

  const options = {
    maxSizeMB: 0.18,
    maxWidthOrHeight: 1000,
    useWebWorker: true,
    fileType: "image/webp" as const,
    initialQuality: 0.82,
  };

  const blob = await imageCompression(file, options);
  return new File(
    [blob],
    `cover_${baseName}_${timestamp}.webp`,
    { type: "image/webp" }
  );
}
