import type { AppSettings, GridDimensions } from '../types';

const DIM_MIN = 1;
const DIM_MAX = 20;
const THRESHOLD_MIN = 1;
const THRESHOLD_MAX = 999_999;

export function clampDimension(n: number, fallback: number): number {
  const raw = Number.isFinite(n) ? Math.floor(n) : fallback;
  const safe = Number.isFinite(raw) ? raw : DIM_MIN;
  return Math.min(DIM_MAX, Math.max(DIM_MIN, safe));
}

export function clampThreshold(n: number, fallback: number): number {
  const raw = Number.isFinite(n) ? Math.floor(n) : fallback;
  const safe = Number.isFinite(raw) ? raw : THRESHOLD_MIN;
  return Math.min(THRESHOLD_MAX, Math.max(THRESHOLD_MIN, safe));
}

export function sanitizeDimensions(d: GridDimensions): GridDimensions {
  return {
    rows: clampDimension(d.rows, 5),
    cols: clampDimension(d.cols, 5),
  };
}

export function sanitizeSettings(partial: AppSettings): AppSettings {
  return {
    dimensions: sanitizeDimensions(partial.dimensions),
    highValueThreshold: clampThreshold(partial.highValueThreshold, 900),
    recencyBias: Boolean(partial.recencyBias),
  };
}
