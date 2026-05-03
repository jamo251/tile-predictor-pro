import type { AppSettings, CellStat, GameRecord } from '../types';

export type CellStatsSettings = Pick<
  AppSettings,
  'dimensions' | 'highValueThreshold' | 'recencyBias'
>;

export function computeCellStats(games: GameRecord[], settings: CellStatsSettings): CellStat[] {
  const cellMap = new Map<string, { total: number; high: number; sum: number }>();
  const sortedGames = [...games].sort((a, b) => b.timestamp - a.timestamp);

  sortedGames.forEach((game, index) => {
    const weight = settings.recencyBias && index < 5 ? 2 : 1;
    game.tiles.forEach((tile) => {
      const key = `${tile.row}-${tile.col}`;
      const current = cellMap.get(key) || { total: 0, high: 0, sum: 0 };
      current.total += weight;
      if (tile.value >= settings.highValueThreshold) current.high += weight;
      current.sum += tile.value * weight;
      cellMap.set(key, current);
    });
  });

  const calculatedStats: CellStat[] = [];
  for (let r = 0; r < settings.dimensions.rows; r++) {
    for (let c = 0; c < settings.dimensions.cols; c++) {
      const key = `${r}-${c}`;
      const data = cellMap.get(key);
      calculatedStats.push({
        row: r,
        col: c,
        totalOccurrences: data?.total ?? 0,
        highValueCount: data?.high ?? 0,
        averageValue: data ? data.sum / data.total : 0,
        probability: data && data.total > 0 ? data.high / data.total : 0,
      });
    }
  }
  return calculatedStats;
}

export function pickTopRecommendation(stats: CellStat[]): CellStat | null {
  const sorted = [...stats].sort((a, b) => {
    if (b.probability !== a.probability) return b.probability - a.probability;
    return b.averageValue - a.averageValue;
  });
  const top = sorted[0];
  return top && top.totalOccurrences > 0 ? top : null;
}
