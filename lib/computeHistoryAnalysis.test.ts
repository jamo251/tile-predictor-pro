import { describe, expect, it } from 'vitest';
import { computeHistoryAnalysis } from './computeHistoryAnalysis';
import type { GameRecord } from '../types';

function tile(row: number, col: number, value: number) {
  return { row, col, value };
}

function game(id: string, timestamp: number, tiles: GameRecord['tiles']): GameRecord {
  return { id, timestamp, tiles };
}

const twoByTwo = { rows: 2, cols: 2 };

describe('computeHistoryAnalysis', () => {
  it('returns empty analysis when there are no games', () => {
    const analysis = computeHistoryAnalysis([], {
      dimensions: twoByTwo,
      highValueThreshold: 900,
    });
    expect(analysis).toEqual({
      boardCount: 0,
      firstTimestamp: null,
      lastTimestamp: null,
      averageTileScore: 0,
      hitRate: 0,
      trend: 'flat',
      hottest: [],
      coldest: [],
    });
  });

  it('computes board count, date range, average score, and hit rate', () => {
    const games: GameRecord[] = [
      game('a', 200, [tile(0, 0, 900), tile(0, 1, 100)]),
      game('b', 100, [tile(0, 0, 500), tile(1, 1, 500)]),
    ];
    const analysis = computeHistoryAnalysis(games, {
      dimensions: twoByTwo,
      highValueThreshold: 900,
    });
    expect(analysis.boardCount).toBe(2);
    expect(analysis.firstTimestamp).toBe(100);
    expect(analysis.lastTimestamp).toBe(200);
    expect(analysis.averageTileScore).toBe(500);
    expect(analysis.hitRate).toBe(0.25);
    expect(analysis.trend).toBe('flat');
  });

  it('marks trend up when the newest third hits more often than the oldest third', () => {
    const games: GameRecord[] = [
      game('old-1', 1, [tile(0, 0, 100)]),
      game('old-2', 2, [tile(0, 0, 100)]),
      game('mid', 3, [tile(0, 0, 100)]),
      game('new-1', 4, [tile(0, 0, 950)]),
      game('new-2', 5, [tile(0, 0, 950)]),
      game('new-3', 6, [tile(0, 0, 950)]),
    ];
    const analysis = computeHistoryAnalysis(games, {
      dimensions: { rows: 1, cols: 1 },
      highValueThreshold: 900,
    });
    expect(analysis.trend).toBe('up');
  });

  it('marks trend down when the newest third hits less often', () => {
    const games: GameRecord[] = [
      game('old-1', 1, [tile(0, 0, 950)]),
      game('old-2', 2, [tile(0, 0, 950)]),
      game('mid', 3, [tile(0, 0, 950)]),
      game('new-1', 4, [tile(0, 0, 100)]),
      game('new-2', 5, [tile(0, 0, 100)]),
      game('new-3', 6, [tile(0, 0, 100)]),
    ];
    const analysis = computeHistoryAnalysis(games, {
      dimensions: { rows: 1, cols: 1 },
      highValueThreshold: 900,
    });
    expect(analysis.trend).toBe('down');
  });

  it('keeps trend flat when the thirds are within two percentage points', () => {
    const games: GameRecord[] = [
      game('a', 1, [tile(0, 0, 950)]),
      game('b', 2, [tile(0, 0, 950)]),
      game('c', 3, [tile(0, 0, 950)]),
    ];
    const analysis = computeHistoryAnalysis(games, {
      dimensions: { rows: 1, cols: 1 },
      highValueThreshold: 900,
    });
    expect(analysis.trend).toBe('flat');
  });

  it('ranks hottest and coldest cells without recency weighting', () => {
    const games: GameRecord[] = [
      game('1', 1, [tile(0, 0, 950), tile(0, 1, 100), tile(1, 0, 400)]),
      game('2', 2, [tile(0, 0, 950), tile(0, 1, 100), tile(1, 0, 950)]),
    ];
    const analysis = computeHistoryAnalysis(games, {
      dimensions: twoByTwo,
      highValueThreshold: 900,
    });
    expect(analysis.hottest[0]).toMatchObject({ row: 0, col: 0, probability: 1 });
    expect(analysis.hottest[1]).toMatchObject({ row: 1, col: 0, probability: 0.5 });
    expect(analysis.coldest[0]).toMatchObject({ row: 0, col: 1, probability: 0 });
    expect(analysis.hottest).toHaveLength(3);
    expect(analysis.coldest).toHaveLength(3);
  });
});
