import { MAX_UPLOAD_BYTES, MAX_UPLOAD_IMAGE_HEIGHT, MAX_UPLOAD_IMAGE_WIDTH } from './limits';

export type FileToBase64Result = { base64: string; mimeType: string };

export function assertFileSizeAllowed(file: File): void {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(
      `Each image must be under ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))}MB after compression limits.`
    );
  }
}

export async function assertImageDimensionsAllowed(file: File): Promise<void> {
  const bmp = await createImageBitmap(file);
  try {
    if (bmp.width > MAX_UPLOAD_IMAGE_WIDTH || bmp.height > MAX_UPLOAD_IMAGE_HEIGHT) {
      throw new Error(
        `Images must be at most ${MAX_UPLOAD_IMAGE_WIDTH}×${MAX_UPLOAD_IMAGE_HEIGHT}px for this demo.`
      );
    }
  } finally {
    bmp.close();
  }
}

/** Size + bitmap check, then extract base64 and mime from FileReader data URL. */
export async function fileToBase64(file: File): Promise<FileToBase64Result> {
  assertFileSizeAllowed(file);
  await assertImageDimensionsAllowed(file);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const match = /^data:([^;]+);base64,(.+)$/.exec(result);
      if (!match) {
        reject(new Error('Could not read image.'));
        return;
      }
      const mimeType = match[1];
      const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowed.includes(mimeType)) {
        reject(new Error('Use JPEG, PNG, WebP, or GIF screenshots.'));
        return;
      }
      resolve({ mimeType, base64: match[2] });
    };
    reader.onerror = () => reject(reader.error ?? new Error('File read failed'));
  });
}
