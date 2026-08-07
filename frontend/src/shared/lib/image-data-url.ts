export const ACCEPTED_LOCAL_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
export const ACCEPTED_LOCAL_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";
export const MAX_LOCAL_IMAGE_BYTES = 12 * 1024 * 1024;

export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string" && reader.result.startsWith("data:image/")) {
        resolve(reader.result);
        return;
      }
      reject(new Error("invalid image data url"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("failed to read image file"));
    reader.readAsDataURL(file);
  });
}

export function isAcceptedLocalImage(file: File): boolean {
  return ACCEPTED_LOCAL_IMAGE_TYPES.has(file.type);
}

export function isLocalImageWithinSizeLimit(file: File, maxBytes = MAX_LOCAL_IMAGE_BYTES): boolean {
  return file.size <= maxBytes;
}
