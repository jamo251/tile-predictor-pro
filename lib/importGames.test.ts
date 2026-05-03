import { describe, expect, it } from 'vitest';
import { parseImportedGames } from './importGames';

describe('parseImportedGames', () => {
  it('filters tiles outside grid', () => {
    const { games, error } = parseImportedGames(
      [
        {
          id: 'a',
          timestamp: 1,
          tiles: [
            { row: 0, col: 0, value: 10 },
            { row: 10, col: 0, value: 1 },
          ],
        },
      ],
      { rows: 2, cols: 2 }
    );
    expect(error).toBeUndefined();
    expect(games[0].tiles).toEqual([{ row: 0, col: 0, value: 10 }]);
  });

  it('rejects non-array', () => {
    const { games, error } = parseImportedGames({}, { rows: 5, cols: 5 });
    expect(error).toBeDefined();
    expect(games).toHaveLength(0);
  });
});
