import type { CellStat, GameRecord, GridDimensions, HistoryAnalysis } from '../types';
import { computeCellStats } from './computeCellStats';

/** Hit-rate delta below this is treated as flat (2 percentage points). */
const TREND_EPSILON = 0.02;

function hitRateForGames(games: GameRecord[], threshold: number): number {
  let total = 0;
  let high = 0;
  for (const game of games) {
    for (const tile of game.tiles) {
      total += 1;
      if (tile.value >= threshold) high += 1;
    }
  }
  return total > 0 ? high / total : 0;
}

function sortHottest(a: CellStat, b: CellStat): number {
  if (b.probability !== a.probability) return b.probability - a.probability;
  return b.averageValue - a.averageValue;
}

function sortColdest(a: CellStat, b: CellStat): number {
  if (a.probability !== b.probability) return a.probability - b.probability;
  return a.averageValue - b.averageValue;
}

export type HistoryAnalysisSettings = {
  dimensions: GridDimensions;
  highValueThreshold: number;
};

/** Unweighted summary of saved boards for the play-analysis card. */
export function computeHistoryAnalysis(
  games: GameRecord[],
  settings: HistoryAnalysisSettings
): HistoryAnalysis {
  if (games.length === 0) {
    return {
      boardCount: 0,
      firstTimestamp: null,
      lastTimestamp: null,
      averageTileScore: 0,
      hitRate: 0,
      trend: 'flat',
      hottest: [],
      coldest: [],
    };
  }

  const sorted = [...games].sort((a, b) => a.timestamp - b.timestamp);
  let tileCount = 0;
  let tileSum = 0;
  let highCount = 0;
  for (const game of sorted) {
    for (const tile of game.tiles) {
      tileCount += 1;
      tileSum += tile.value;
      if (tile.value >= settings.highValueThreshold) highCount += 1;
    }
  }

  let trend: HistoryAnalysis['trend'] = 'flat';
  if (sorted.length >= 3) {
    const third = Math.max(1, Math.floor(sorted.length / 3));
    const oldest = sorted.slice(0, third);
    const newest = sorted.slice(-third);
    const delta =
      hitRateForGames(newest, settings.highValueThreshold) -
      hitRateForGames(oldest, settings.highValueThreshold);
    if (delta > TREND_EPSILON) trend = 'up';
    else if (delta < -TREND_EPSILON) trend = 'down';
  }

  const withData = computeCellStats(games, {
    dimensions: settings.dimensions,
    highValueThreshold: settings.highValueThreshold,
    recencyBias: false,
  }).filter((cell) => cell.totalOccurrences > 0);

  return {
    boardCount: games.length,
    firstTimestamp: sorted[0].timestamp,
    lastTimestamp: sorted[sorted.length - 1].timestamp,
    averageTileScore: tileCount > 0 ? tileSum / tileCount : 0,
    hitRate: tileCount > 0 ? highCount / tileCount : 0,
    trend,
    hottest: [...withData].sort(sortHottest).slice(0, 3),
    coldest: [...withData].sort(sortColdest).slice(0, 3),
  };
}
