import { describe, expect, it } from 'vitest';
import { computeCellStats, pickTopRecommendation } from './computeCellStats';
import type { GameRecord } from '../types';

const fiveByFive = { rows: 5, cols: 5 };

function tile(row: number, col: number, value: number) {
  return { row, col, value };
}

describe('computeCellStats', () => {
  it('returns empty grid stats when there are no games', () => {
    const stats = computeCellStats([], {
      dimensions: fiveByFive,
      highValueThreshold: 900,
      recencyBias: false,
    });
    expect(stats).toHaveLength(25);
    expect(stats.every((s) => s.totalOccurrences === 0)).toBe(true);
    expect(stats.every((s) => s.probability === 0)).toBe(true);
  });

  it('computes probability from high-value threshold', () => {
    const games: GameRecord[] = [
      {
        id: '1',
        timestamp: 1,
        tiles: [tile(0, 0, 950), tile(0, 0, 950), tile(1, 1, 100)],
      },
    ];
    const stats = computeCellStats(games, {
      dimensions: { rows: 2, cols: 2 },
      highValueThreshold: 900,
      recencyBias: false,
    });
    const cell00 = stats.find((s) => s.row === 0 && s.col === 0)!;
    expect(cell00.totalOccurrences).toBe(2);
    expect(cell00.highValueCount).toBe(2);
    expect(cell00.probability).toBe(1);
    const cell11 = stats.find((s) => s.row === 1 && s.col === 1)!;
    expect(cell11.probability).toBe(0);
  });

  it('doubles weight for the five most recent games when recencyBias is on', () => {
    const games: GameRecord[] = Array.from({ length: 6 }).map((_, i) => ({
      id: `g-${i}`,
      timestamp: i,
      tiles: [tile(0, 0, 950)],
    }));
    const withBias = computeCellStats(games, {
      dimensions: { rows: 1, cols: 1 },
      highValueThreshold: 900,
      recencyBias: true,
    });
    const withoutBias = computeCellStats(games, {
      dimensions: { rows: 1, cols: 1 },
      highValueThreshold: 900,
      recencyBias: false,
    });
    expect(withBias[0].totalOccurrences).toBe(11);
    expect(withoutBias[0].totalOccurrences).toBe(6);
  });
});

describe('pickTopRecommendation', () => {
  it('returns null when no cell has data', () => {
    const stats = computeCellStats([], {
      dimensions: { rows: 2, cols: 2 },
      highValueThreshold: 900,
      recencyBias: false,
    });
    expect(pickTopRecommendation(stats)).toBeNull();
  });

  it('prefers higher probability then higher average', () => {
    const games: GameRecord[] = [
      { id: 'a', timestamp: 2, tiles: [tile(0, 0, 950), tile(0, 0, 100)] },
      { id: 'b', timestamp: 1, tiles: [tile(1, 0, 950), tile(1, 0, 950)] },
    ];
    const stats = computeCellStats(games, {
      dimensions: { rows: 2, cols: 2 },
      highValueThreshold: 900,
      recencyBias: false,
    });
    const top = pickTopRecommendation(stats);
    expect(top?.row).toBe(1);
    expect(top?.col).toBe(0);
  });
});
