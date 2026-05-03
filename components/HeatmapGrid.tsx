import React, { useMemo } from 'react';
import { CellStat, GridDimensions } from '../types';

interface HeatmapGridProps {
  stats: CellStat[];
  dimensions: GridDimensions;
  highValueThreshold: number;
  topPick: { row: number; col: number } | null;
  selectedCell: { row: number; col: number } | null;
  onCellClick: (row: number, col: number) => void;
}

export const HeatmapGrid: React.FC<HeatmapGridProps> = ({
  stats,
  dimensions,
  highValueThreshold,
  topPick,
  selectedCell,
  onCellClick,
}) => {
  const { rows, cols } = dimensions;

  const gridCells = useMemo(() => {
    const grid: (CellStat | null)[][] = Array.from({ length: rows }, () => Array(cols).fill(null));
    stats.forEach((stat) => {
      if (stat.row < rows && stat.col < cols) {
        grid[stat.row][stat.col] = stat;
      }
    });
    return grid;
  }, [stats, rows, cols]);

  const getCellColor = (probability: number, total: number) => {
    if (total === 0) return 'bg-white/5 border-white/5';

    if (probability < 0.2) return 'bg-[#1a1c2e] border-white/5 text-slate-400';
    if (probability < 0.4) return 'bg-[#2d3250] border-white/10 text-slate-300';
    if (probability < 0.6)
      return 'bg-[#4a55a2] border-blue-500/20 text-blue-100 shadow-[inset_0_0_10px_rgba(74,85,162,0.3)]';

    if (probability < 0.75)
      return 'bg-[#4787FF] border-blue-400/40 text-white shadow-[0_0_15px_rgba(71,135,255,0.2)]';
    if (probability < 0.85)
      return 'bg-[#5e97ff] border-blue-300/50 text-white shadow-[0_0_20px_rgba(71,135,255,0.4)]';
    if (probability < 0.95)
      return 'bg-cyan-400 text-slate-900 font-black shadow-[0_0_25px_rgba(34,211,238,0.5)]';

    return 'gemini-gradient text-white font-black shadow-[0_0_30px_rgba(181,123,255,0.6)] ring-2 ring-white/30';
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 glass-panel rounded-[40px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] border border-white/5">
      <p className="text-[11px] text-slate-500 text-center max-w-lg mb-6 leading-relaxed">
        Each cell shows the share of weighted games where that tile&apos;s score was ≥{' '}
        <span className="text-slate-400 font-mono">{highValueThreshold}</span> (your high-score
        threshold). Colors are grouped into bands from low to strongest pattern.
      </p>
      <div
        className="grid gap-3 sm:gap-6"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: rows }).map((_, r) =>
          Array.from({ length: cols }).map((_, c) => {
            const cell = gridCells[r][c];
            const probability = cell?.probability || 0;
            const total = cell?.totalOccurrences || 0;
            const isJackpot = probability >= 0.95 && total > 0;

            const colLabel = String.fromCharCode(65 + c);
            const rowLabel = r + 1;
            const coord = `${colLabel}${rowLabel}`;
            const isTopPick = topPick !== null && topPick.row === r && topPick.col === c;
            const isSelected =
              selectedCell !== null && selectedCell.row === r && selectedCell.col === c;

            const handleActivate = () => onCellClick(r, c);

            return (
              <div
                key={`${r}-${c}`}
                role="button"
                tabIndex={0}
                aria-label={
                  total > 0
                    ? `Cell ${coord}, ${Math.round(probability * 100)} percent high-score share, ${total} games`
                    : `Cell ${coord}, no data yet`
                }
                aria-pressed={isSelected}
                onClick={handleActivate}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleActivate();
                  }
                }}
                className={`
                  relative w-16 h-16 sm:w-24 sm:h-24 lg:w-28 lg:h-28
                  flex flex-col items-center justify-center
                  rounded-3xl cursor-pointer transition-all duration-500
                  hover:scale-110 active:scale-95 border-2 group
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0e1a]
                  ${getCellColor(probability, total)}
                  ${isJackpot ? 'z-10' : ''}
                  ${isTopPick ? 'ring-2 ring-amber-400/90 shadow-[0_0_20px_rgba(251,191,36,0.35)]' : ''}
                  ${isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0a0e1a]' : ''}
                `}
              >
                {isTopPick && (
                  <span className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-md bg-amber-500/90 text-[9px] font-black text-slate-900 uppercase tracking-tighter z-20 shadow-lg">
                    Top
                  </span>
                )}

                <span className={`absolute top-2 left-3 text-[10px] font-bold opacity-40`}>
                  {coord}
                </span>

                <div className={`text-xl sm:text-3xl font-black tracking-tighter`}>
                  {total > 0 ? `${Math.round(probability * 100)}%` : '—'}
                </div>

                {total > 0 && (
                  <div className="hidden sm:block text-[10px] mt-1 font-bold opacity-60">
                    {cell?.highValueCount}/{total} hits
                  </div>
                )}

                {total > 0 && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 hidden group-hover:block group-focus-within:block z-50 w-52 p-4 bg-[#0b1021]/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] pointer-events-none animate-in fade-in zoom-in-95 duration-200">
                    <div className="text-[10px] font-black text-blue-400 mb-3 border-b border-white/5 pb-2 uppercase tracking-[0.15em]">
                      Cell {coord}
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">High-score share</span>
                        <span className="text-white font-bold">
                          {(probability * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">Times seen</span>
                        <span className="text-white font-bold">{total}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">Avg score</span>
                        <span className="text-white font-bold">
                          {Math.round(cell?.averageValue || 0)}
                        </span>
                      </div>
                    </div>
                    <div className="absolute w-3 h-3 bg-[#0b1021]/95 border-r border-b border-white/20 rotate-45 left-1/2 -translate-x-1/2 -bottom-1.5"></div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="flex flex-wrap justify-center gap-6 mt-12 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-white/5 px-8 py-4 rounded-full border border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-[#1a1c2e] rounded-full"></div> No signal
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-[#4787FF] rounded-full"></div> Mid heat (under 75%)
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.5)]"></div>{' '}
          High heat (75–95%)
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 gemini-gradient rounded-full shadow-[0_0_10px_rgba(181,123,255,0.6)]"></div>{' '}
          Strongest (≥95%)
        </div>
      </div>
    </div>
  );
};
