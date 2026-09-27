const MAX_OUTPUT_BYTES = 1.5 * 1024 * 1024;
const MAX_DIMENSION = 1920;
const JPEG_QUALITIES = [0.82, 0.72, 0.62, 0.52];

function canvasToBlob(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Browser tidak dapat memproses foto"));
      },
      "image/jpeg",
      quality,
    );
  });
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Foto ${file.name} tidak dapat dibaca`));
    };
    image.src = url;
  });
}

/**
 * Compresses a selected photo before it is sent to Supabase Storage.
 * Small files are kept unchanged so screenshots/PNG files do not grow.
 */
export async function compressImageForUpload(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) {
    return file;
  }

  const image = await loadImage(file);
  const needsResize =
    Math.max(image.naturalWidth, image.naturalHeight) > MAX_DIMENSION;
  if (file.size <= MAX_OUTPUT_BYTES && !needsResize) return file;

  let scale = Math.min(1, MAX_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) throw new Error("Browser tidak mendukung pemrosesan foto");

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(image, 0, 0, width, height);

    for (const quality of JPEG_QUALITIES) {
      const blob = await canvasToBlob(canvas, quality);
      if (blob.size <= MAX_OUTPUT_BYTES || attempt === 2) {
        if (blob.size >= file.size) return file;

        return new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
          type: "image/jpeg",
          lastModified: file.lastModified,
        });
      }
    }

    scale *= 0.8;
  }

  return file;
}
