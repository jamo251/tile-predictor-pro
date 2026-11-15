import { describe, expect, it } from 'vitest';
import { collectImageFiles } from './collectImageFiles';

function file(name: string, opts: { type?: string; lastModified?: number; path?: string } = {}) {
  const f = new File(['x'], name, {
    type: opts.type ?? '',
    lastModified: opts.lastModified ?? 0,
  });
  if (opts.path) {
    Object.defineProperty(f, 'webkitRelativePath', { value: opts.path });
  }
  return f;
}

describe('collectImageFiles', () => {
  it('keeps jpeg/png/webp/gif and skips other files', () => {
    const result = collectImageFiles([
      file('board.jpg', { type: 'image/jpeg' }),
      file('board.png', { type: 'image/png' }),
      file('board.webp', { type: 'image/webp' }),
      file('board.gif', { type: 'image/gif' }),
      file('notes.txt', { type: 'text/plain' }),
      file('clip.mp4', { type: 'video/mp4' }),
      file('.DS_Store'),
    ]);
    expect(result.files.map((f) => f.name)).toEqual([
      'board.gif',
      'board.jpg',
      'board.png',
      'board.webp',
    ]);
    expect(result.skippedNonImages).toBe(3);
    expect(result.truncated).toBe(false);
  });

  it('accepts allowed extensions when MIME type is missing', () => {
    const result = collectImageFiles([file('Shot.PNG'), file('board.HEIC')]);
    expect(result.files.map((f) => f.name)).toEqual(['Shot.PNG']);
    expect(result.skippedNonImages).toBe(1);
  });

  it('skips hidden files even when they look like images', () => {
    const result = collectImageFiles([
      file('.hidden.png', { type: 'image/png' }),
      file('visible.png', { type: 'image/png', path: 'album/.secret.png' }),
      file('ok.png', { type: 'image/png' }),
    ]);
    expect(result.files.map((f) => f.name)).toEqual(['ok.png']);
    expect(result.skippedNonImages).toBe(2);
  });

  it('sorts by lastModified then name', () => {
    const result = collectImageFiles([
      file('b.png', { type: 'image/png', lastModified: 20 }),
      file('a.png', { type: 'image/png', lastModified: 20 }),
      file('z.png', { type: 'image/png', lastModified: 10 }),
    ]);
    expect(result.files.map((f) => f.name)).toEqual(['z.png', 'a.png', 'b.png']);
  });

  it('caps at maxFiles and reports truncated', () => {
    const files = Array.from({ length: 5 }, (_, i) =>
      file(`board-${i}.png`, { type: 'image/png', lastModified: i })
    );
    const result = collectImageFiles(files, { maxFiles: 3 });
    expect(result.files).toHaveLength(3);
    expect(result.files.map((f) => f.name)).toEqual(['board-0.png', 'board-1.png', 'board-2.png']);
    expect(result.truncated).toBe(true);
  });

  it('returns no files when the cap is zero', () => {
    const result = collectImageFiles([file('a.png', { type: 'image/png' })], { maxFiles: 0 });
    expect(result.files).toHaveLength(0);
    expect(result.truncated).toBe(true);
  });
});
