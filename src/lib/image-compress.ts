/**
 * Browser-side photo preparation. Phone cameras produce 4–12 MB pictures, far above our 3 MB limit,
 * so instead of rejecting them we shrink them here (longest side 2000 px, JPEG) before upload.
 * If the browser cannot decode a file, the original is returned unchanged and the normal size check applies.
 */
const MAX_SIDE = 2000;

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
}

export async function shrinkPhoto(file: File, maxBytes: number): Promise<File> {
  // Small enough already: keep the original bytes untouched.
  if (file.size <= maxBytes / 2) return file;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }
  try {
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.fillStyle = '#ffffff'; // PNG transparency becomes white instead of black
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.85, 0.75, 0.65, 0.5]) {
      const blob = await toBlob(canvas, quality);
      if (blob && blob.size <= maxBytes) {
        if (blob.size >= file.size) return file; // never make a file bigger
        const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
        return new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() });
      }
    }
    return file;
  } finally {
    bitmap.close();
  }
}
