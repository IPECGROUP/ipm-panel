const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const IMAGE_EXTENSIONS = /\.(jpe?g|png|webp)$/i;

const imageName = (name) => `${String(name || "image").replace(IMAGE_EXTENSIONS, "") || "image"}.webp`;

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("image_decode_failed")); };
    image.src = url;
  });
}

function canvasBlob(canvas, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/webp", quality));
}

/** Keeps documents intact and optimizes only supported raster images before upload. */
export async function optimizeUploadFile(file, { maxEdge = 3000, quality = 0.84 } = {}) {
  if (!(file instanceof File) || (!IMAGE_TYPES.has(file.type) && !IMAGE_EXTENSIONS.test(file.name))) return file;
  try {
    const image = await loadImage(file);
    const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d", { alpha: true })?.drawImage(image, 0, 0, width, height);
    const blob = await canvasBlob(canvas, quality);
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], imageName(file.name), { type: "image/webp", lastModified: file.lastModified });
  } catch {
    return file;
  }
}
