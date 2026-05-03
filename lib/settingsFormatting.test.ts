import { describe, expect, it } from 'vitest';
import {
  clampDimension,
  clampThreshold,
  sanitizeDimensions,
  sanitizeSettings,
} from './settingsFormatting';

describe('settingsFormatting', () => {
  it('clamps dimensions', () => {
    expect(clampDimension(0, 5)).toBe(1);
    expect(clampDimension(100, 5)).toBe(20);
    expect(clampDimension(7, 5)).toBe(7);
    expect(clampDimension(NaN, 5)).toBe(5);
  });

  it('clamps threshold', () => {
    expect(clampThreshold(0, 900)).toBe(1);
    expect(clampThreshold(2_000_000, 900)).toBe(999_999);
    expect(clampThreshold(NaN, 900)).toBe(900);
  });

  it('sanitizeSettings merges safely', () => {
    expect(
      sanitizeSettings({
        dimensions: { rows: 0, cols: 99 },
        highValueThreshold: -5,
        recencyBias: true,
      })
    ).toEqual({
      dimensions: { rows: 1, cols: 20 },
      highValueThreshold: 1,
      recencyBias: true,
    });
  });

  it('sanitizeDimensions', () => {
    expect(sanitizeDimensions({ rows: 3, cols: 4 })).toEqual({ rows: 3, cols: 4 });
  });
});
