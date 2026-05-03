import type { GridDimensions, TileData } from '../types';

const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 2000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function normalizeOrigin(u: string): string {
  return u.trim().replace(/\/$/, '');
}

async function postAnalyzeBoard(
  base64Image: string,
  mimeType: string,
  dimensions: GridDimensions,
  retryCount: number
): Promise<TileData[]> {
  const origin = normalizeOrigin(import.meta.env.VITE_API_ORIGIN ?? '');
  const url = `${origin}/api/analyze-board`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      base64Image,
      mimeType,
      dimensions: { rows: dimensions.rows, cols: dimensions.cols },
    }),
  });

  const isRateLimited = res.status === 429;
  if (isRateLimited && retryCount < MAX_RETRIES) {
    await sleep(INITIAL_DELAY_MS * Math.pow(2, retryCount));
    return postAnalyzeBoard(base64Image, mimeType, dimensions, retryCount + 1);
  }

  if (!res.ok) {
    let message = '';
    try {
      const j = (await res.json()) as { error?: string };
      message = j.error ?? '';
    } catch {
      message = await res.text();
    }
    throw new Error(message.trim() || `Analysis failed (${res.status})`);
  }

  const data = (await res.json()) as { tiles?: TileData[] };
  return data.tiles ?? [];
}

async function processImage(base64Image: string, mimeType: string, dimensions: GridDimensions) {
  return postAnalyzeBoard(base64Image, mimeType, dimensions, 0);
}

export const geminiService = { processImage };
