import { TaskAttachment } from "@/types";

/**
 * Format bytes into human readable format (KB, MB)
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Process uploaded browser file into a TaskAttachment.
 * If image is large, it automatically compresses it on client canvas.
 */
export async function processFileToAttachment(
  file: File,
  stage: "creation" | "resolution"
): Promise<TaskAttachment> {
  const isImage = file.type.startsWith("image/");
  let dataUrl = "";

  if (isImage) {
    dataUrl = await compressImageFile(file, 1400, 0.82);
  } else {
    dataUrl = await readFileAsDataUrl(file);
  }

  return {
    id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    name: file.name,
    size: file.size,
    type: file.type || "application/octet-stream",
    url: dataUrl,
    created_at: new Date().toISOString(),
    stage,
  };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

function compressImageFile(file: File, maxDimension = 1400, quality = 0.82): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const mimeType = file.type === "image/png" ? "image/png" : "image/jpeg";
          resolve(canvas.toDataURL(mimeType, quality));
        } else {
          resolve(e.target?.result as string);
        }
      };
      img.onerror = () => {
        resolve(e.target?.result as string);
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}

