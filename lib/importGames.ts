import { z } from 'zod';
import type { GameRecord, GridDimensions, TileData } from '../types';
import { MAX_IMPORTED_GAMES_TOTAL, MAX_TILES_PER_GAME } from './limits';
import { sanitizeDimensions } from './settingsFormatting';

const tileSchema = z.object({
  row: z.number().finite(),
  col: z.number().finite(),
  value: z.number().finite(),
});

const gameRecordSchema = z.object({
  id: z.union([z.string().max(256), z.number()]).optional(),
  timestamp: z.number().finite(),
  tiles: z.array(tileSchema).max(MAX_TILES_PER_GAME),
});

export function parseImportedGames(
  raw: unknown,
  dimensions: GridDimensions
): { games: GameRecord[]; error?: string } {
  const dims = sanitizeDimensions(dimensions);
  const arr = z.array(gameRecordSchema).max(MAX_IMPORTED_GAMES_TOTAL).safeParse(raw);
  if (!arr.success) {
    return { games: [], error: 'Invalid file format or file is too large.' };
  }

  const games: GameRecord[] = [];
  for (const g of arr.data) {
    const id =
      g.id === undefined
        ? `import-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
        : String(g.id);
    const tiles: TileData[] = [];
    const seen = new Set<string>();
    for (const t of g.tiles) {
      const row = Math.trunc(t.row);
      const col = Math.trunc(t.col);
      if (!Number.isFinite(t.value) || row < 0 || col < 0 || row >= dims.rows || col >= dims.cols) {
        continue;
      }
      const key = `${row}-${col}`;
      if (seen.has(key)) continue;
      seen.add(key);
      tiles.push({ row, col, value: t.value });
    }
    games.push({ id, timestamp: g.timestamp, tiles });
  }

  return { games };
}
