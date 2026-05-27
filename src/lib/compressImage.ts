/** Reduz foto/logo antes de enviar ao servidor (evita travar cadastro por payload grande). */
export async function compressImageFile(
  file: File,
  options?: {
    maxWidth?: number;
    maxHeight?: number;
    maxBytes?: number;
    quality?: number;
  },
): Promise<string> {
  const maxWidth = options?.maxWidth ?? 512;
  const maxHeight = options?.maxHeight ?? 512;
  const maxBytes = options?.maxBytes ?? 200_000;
  let quality = options?.quality ?? 0.82;

  if (!file.type.startsWith('image/')) {
    throw new Error('Arquivo inválido');
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxWidth / bitmap.width, maxHeight / bitmap.height);
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    throw new Error('Não foi possível processar a imagem');
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let dataUrl = canvas.toDataURL('image/jpeg', quality);
  while (estimateDataUrlBytes(dataUrl) > maxBytes && quality > 0.45) {
    quality -= 0.08;
    dataUrl = canvas.toDataURL('image/jpeg', quality);
  }

  if (estimateDataUrlBytes(dataUrl) > maxBytes) {
    throw new Error('Imagem muito grande mesmo após compressão');
  }

  return dataUrl;
}

function estimateDataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.split(',')[1] || '';
  return Math.ceil((base64.length * 3) / 4);
}
