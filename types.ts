export interface GridDimensions {
  rows: number;
  cols: number;
}

export interface TileData {
  row: number;
  col: number;
  value: number;
}

export interface GameRecord {
  id: string;
  timestamp: number;
  tiles: TileData[];
}

export interface CellStat {
  row: number;
  col: number;
  totalOccurrences: number;
  highValueCount: number; // >= 900
  averageValue: number;
  probability: number; // 0 to 1
}

export interface AppSettings {
  dimensions: GridDimensions;
  highValueThreshold: number; // e.g., 900
  recencyBias: boolean; // If true, weight recent games more
}

export type UploadStatus = 'idle' | 'analyzing' | 'success' | 'error';
