import { MAX_BATCH_FILES } from './limits';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

export type CollectImageFilesResult = {
  files: File[];
  skippedNonImages: number;
  truncated: boolean;
};

export type CollectImageFilesOptions = {
  maxFiles?: number;
};

function fileBasename(file: File): string {
  const relative =
    'webkitRelativePath' in file
      ? String((file as File & { webkitRelativePath?: string }).webkitRelativePath || '')
      : '';
  const fromRelative = relative.split(/[/\\]/).filter(Boolean).pop();
  const fromName = file.name.split(/[/\\]/).filter(Boolean).pop();
  return fromRelative || fromName || file.name;
}

function isHiddenFile(file: File): boolean {
  return fileBasename(file).startsWith('.');
}

function isAllowedImage(file: File): boolean {
  if (ALLOWED_MIME.has(file.type)) return true;
  const name = fileBasename(file).toLowerCase();
  return ALLOWED_EXT.some((ext) => name.endsWith(ext));
}

/** Filter a folder or multi-select into a sorted, capped list of board screenshots. */
export function collectImageFiles(
  input: FileList | File[],
  options: CollectImageFilesOptions = {}
): CollectImageFilesResult {
  const maxFiles = options.maxFiles ?? MAX_BATCH_FILES;
  const cap = Number.isFinite(maxFiles) ? Math.max(0, Math.trunc(maxFiles)) : 0;

  let skippedNonImages = 0;
  const images: File[] = [];

  for (const file of Array.from(input)) {
    if (isHiddenFile(file) || !isAllowedImage(file)) {
      skippedNonImages += 1;
      continue;
    }
    images.push(file);
  }

  images.sort((a, b) => {
    if (a.lastModified !== b.lastModified) return a.lastModified - b.lastModified;
    return fileBasename(a).localeCompare(fileBasename(b));
  });

  const truncated = images.length > cap;
  return {
    files: images.slice(0, cap),
    skippedNonImages,
    truncated,
  };
}
