import React, { useRef, useState } from 'react';
import {
  Upload,
  Trash2,
  Settings,
  Target,
  Loader2,
  Info,
  Clock,
  History,
  Download,
  FolderInput,
  Sparkles,
  X,
} from 'lucide-react';
import { AppSettings, CellStat, UploadStatus, GameRecord } from '../types';
import { clampDimension, clampThreshold } from '../lib/settingsFormatting';

interface DashboardProps {
  variant?: 'full' | 'compact';
  onFileUpload: () => void;
  uploadStatus: UploadStatus;
  uploadErrorHint?: string | null;
  settings: AppSettings;
  onUpdateSettings: (s: AppSettings) => void;
  onClearData: () => void;
  onDeleteGame: (id: string) => void;
  onExportData: () => void;
  onImportData: (file: File) => void;
  topRecommendation: CellStat | null;
  selectedCell: CellStat | null;
  onClearSelectedCell: () => void;
  totalGames: number;
  gameHistory: GameRecord[];
}

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/90 focus-visible:ring-offset-2 focus-visible:ring-offset-[#040715]';

export const Dashboard: React.FC<DashboardProps> = ({
  variant = 'full',
  onFileUpload,
  uploadStatus,
  uploadErrorHint = null,
  settings,
  onUpdateSettings,
  onClearData,
  onDeleteGame,
  onExportData,
  onImportData,
  topRecommendation,
  selectedCell,
  onClearSelectedCell,
  totalGames,
  gameHistory,
}) => {
  const importInputRef = useRef<HTMLInputElement>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const compact = variant === 'compact';

  const handleImportChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImportData(e.target.files[0]);
    }
    e.target.value = '';
  };

  const sortedHistory = [...gameHistory].sort((a, b) => b.timestamp - a.timestamp);

  const formatDate = (timestamp: number) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(timestamp));
  };

  const coordLabel = (cell: CellStat) => `${String.fromCharCode(65 + cell.col)}${cell.row + 1}`;

  return (
    <div className={`h-full flex flex-col overflow-hidden ${compact ? 'gap-4 p-4' : 'gap-8 p-8'}`}>
      <div className="shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg gemini-gradient flex items-center justify-center shrink-0">
            <Sparkles size={16} className="text-white" />
          </div>
          {!compact && (
            <div className="min-w-0">
              <h1 className="text-lg font-bold tracking-tight text-white leading-tight sm:text-xl truncate">
                Tile Predictor Pro
              </h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                Powered by Gemini
              </p>
            </div>
          )}
          {compact && (
            <span className="text-sm font-bold text-white tracking-tight truncate">Controls</span>
          )}
        </div>
        <div className="flex gap-1 shrink-0">
          <button
            type="button"
            title="Export saved boards"
            aria-label="Export saved boards"
            onClick={onExportData}
            className={`p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all ${focusRing}`}
          >
            <Download size={18} />
          </button>
          <button
            type="button"
            title="Import saved boards from JSON"
            aria-label="Import saved boards from JSON"
            onClick={() => importInputRef.current?.click()}
            className={`p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all ${focusRing}`}
          >
            <FolderInput size={18} />
          </button>
          <input
            type="file"
            ref={importInputRef}
            className="hidden"
            accept=".json,application/json"
            onChange={handleImportChange}
          />
        </div>
      </div>

      <div
        className={`flex-1 overflow-y-auto ${compact ? 'space-y-4 pr-1' : 'space-y-8 pr-2'} custom-scrollbar`}
      >
        <div className="relative group">
          {!compact && (
            <div className="absolute -inset-0.5 gemini-gradient rounded-3xl blur opacity-20 group-hover:opacity-30 transition duration-1000"></div>
          )}
          <div className={`relative rounded-3xl glass-panel shadow-2xl ${compact ? 'p-4' : 'p-6'}`}>
            <div className={`flex items-center gap-2 ${compact ? 'mb-3' : 'mb-6'}`}>
              <Target size={18} className="text-[#4787FF] shrink-0" />
              <h2 className="font-bold text-white text-sm uppercase tracking-wider">
                Best pick from your data
              </h2>
            </div>

            {topRecommendation ? (
              <div className={compact ? 'space-y-4' : 'space-y-6'}>
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-bold block mb-1">
                      Top cell
                    </span>
                    <span
                      className={`font-black text-white tracking-tighter ${compact ? 'text-4xl' : 'text-5xl'}`}
                    >
                      {coordLabel(topRecommendation)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 text-[10px] uppercase font-bold block mb-1">
                      Probability
                    </span>
                    <span
                      className={`font-black gemini-text-gradient ${compact ? 'text-2xl' : 'text-3xl'}`}
                    >
                      {Math.round(topRecommendation.probability * 100)}%
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/5 p-[1px]">
                    <div
                      className="gemini-gradient h-full rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(181,123,255,0.4)]"
                      style={{ width: `${topRecommendation.probability * 100}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[10px] font-bold text-slate-600 uppercase tracking-tighter">
                    <span>Lower share</span>
                    <span>Higher share</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5 flex justify-between items-center text-xs gap-2">
                  <span className="text-slate-500 shrink-0">In your history</span>
                  <span className="text-slate-300 font-mono text-right">
                    {topRecommendation.highValueCount} hits / {topRecommendation.totalOccurrences}{' '}
                    games
                  </span>
                </div>
                <p className="text-[10px] text-slate-600 leading-relaxed">
                  The heatmap highlights this cell with an amber ring.
                </p>
              </div>
            ) : (
              <div
                className={`text-slate-500 border border-dashed border-white/10 rounded-2xl leading-relaxed text-center ${
                  compact ? 'text-xs py-4 px-3' : 'text-sm py-6 px-3'
                }`}
              >
                {compact
                  ? 'Upload boards to see which cells hit your threshold most often.'
                  : 'Add board screenshots to see which cells most often hit your high-score threshold.'}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <button
            type="button"
            onClick={onFileUpload}
            disabled={uploadStatus === 'analyzing'}
            className={`group w-full relative flex items-center justify-center gap-3 py-5 px-6 rounded-2xl transition-all font-bold overflow-hidden disabled:opacity-70 disabled:pointer-events-none ${focusRing}`}
          >
            <div className="absolute inset-0 gemini-gradient opacity-90 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative flex items-center gap-3 text-white">
              {uploadStatus === 'analyzing' ? (
                <Loader2 className="animate-spin" size={20} aria-hidden />
              ) : (
                <Upload size={20} aria-hidden />
              )}
              <span className="tracking-tight">
                {uploadStatus === 'analyzing' ? 'Reading boards…' : 'Add board screenshots'}
              </span>
            </div>
          </button>

          {uploadStatus === 'success' && (
            <div
              role="status"
              className="rounded-xl px-4 py-3 text-sm bg-emerald-500/10 border border-emerald-500/25 text-emerald-200"
            >
              Boards added successfully.
            </div>
          )}
          {uploadStatus === 'error' && (
            <div
              role="alert"
              className="rounded-xl px-4 py-3 text-sm bg-red-500/10 border border-red-500/25 text-red-300 space-y-1"
            >
              <p>
                No boards could be read. Try clearer screenshots or confirm grid size in Settings.
              </p>
              {uploadErrorHint ? (
                <p className="text-red-200/90 text-xs leading-relaxed whitespace-pre-wrap">
                  {uploadErrorHint}
                </p>
              ) : null}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              className={`flex items-center justify-center gap-2 py-3.5 rounded-2xl transition-all text-xs font-bold border ${focusRing} ${
                showHistory
                  ? 'bg-white/10 border-white/20 text-white'
                  : 'bg-transparent border-white/10 text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <History size={16} aria-hidden />
              History ({totalGames})
            </button>
            <button
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              className={`flex items-center justify-center gap-2 py-3.5 rounded-2xl transition-all text-xs font-bold border ${focusRing} ${
                showSettings
                  ? 'bg-white/10 border-white/20 text-white'
                  : 'bg-transparent border-white/10 text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Settings size={16} aria-hidden />
              Settings
            </button>
          </div>
        </div>

        {selectedCell && selectedCell.totalOccurrences > 0 && (
          <div className="p-5 glass-panel rounded-2xl border border-white/10 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                  Selected cell
                </p>
                <p className="text-2xl font-black text-white tracking-tighter">
                  {coordLabel(selectedCell)}
                </p>
              </div>
              <button
                type="button"
                aria-label="Clear cell selection"
                onClick={onClearSelectedCell}
                className={`p-2 rounded-xl text-slate-500 hover:text-white hover:bg-white/10 transition-colors ${focusRing}`}
              >
                <X size={18} />
              </button>
            </div>
            <dl className="grid gap-2 text-xs">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">High-score share</dt>
                <dd className="text-white font-semibold tabular-nums">
                  {(selectedCell.probability * 100).toFixed(1)}%
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Times seen</dt>
                <dd className="text-white font-semibold tabular-nums">
                  {selectedCell.totalOccurrences}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Avg score</dt>
                <dd className="text-white font-semibold tabular-nums">
                  {Math.round(selectedCell.averageValue)}
                </dd>
              </div>
            </dl>
          </div>
        )}

        {selectedCell && selectedCell.totalOccurrences === 0 && (
          <div className="p-4 glass-panel rounded-2xl border border-dashed border-white/15 text-xs text-slate-500 flex items-center justify-between gap-2">
            <span>
              Cell {coordLabel(selectedCell)} has no data yet. Select another tile or add boards.
            </span>
            <button
              type="button"
              onClick={onClearSelectedCell}
              className={`shrink-0 text-slate-400 hover:text-white underline-offset-2 hover:underline ${focusRing} rounded px-1`}
            >
              Clear
            </button>
          </div>
        )}

        {showHistory && (
          <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Board history
              </h3>
            </div>
            {sortedHistory.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                {sortedHistory.map((game) => (
                  <div
                    key={game.id}
                    className="group flex items-center justify-between p-4 glass-panel rounded-2xl hover:border-white/20 transition-all"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-blue-400 shrink-0">
                        <Clock size={16} aria-hidden />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[12px] font-semibold text-white truncate">
                          {formatDate(game.timestamp)}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono tracking-tighter">
                          {game.tiles.length} tiles read
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label={`Delete board from ${formatDate(game.timestamp)}`}
                      onClick={() => onDeleteGame(game.id)}
                      className={`p-2 text-slate-600 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all md:opacity-0 group-hover:opacity-100 ${focusRing}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-10 text-center glass-panel rounded-2xl border-dashed">
                <p className="text-[11px] text-slate-500 uppercase font-bold">No boards yet</p>
              </div>
            )}
          </div>
        )}

        {showSettings && (
          <div className="p-6 glass-panel rounded-[24px] space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="space-y-3">
              <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">
                Board matrix
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <span className="text-[10px] text-slate-600 font-bold block">Rows</span>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={settings.dimensions.rows}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      onUpdateSettings({
                        ...settings,
                        dimensions: {
                          ...settings.dimensions,
                          rows: clampDimension(v, settings.dimensions.rows),
                        },
                      });
                    }}
                    className={`w-full bg-[#040715] border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-blue-500 outline-none transition-colors ${focusRing}`}
                  />
                </div>
                <div className="space-y-1.5">
                  <span className="text-[10px] text-slate-600 font-bold block">Columns</span>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={settings.dimensions.cols}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      onUpdateSettings({
                        ...settings,
                        dimensions: {
                          ...settings.dimensions,
                          cols: clampDimension(v, settings.dimensions.cols),
                        },
                      });
                    }}
                    className={`w-full bg-[#040715] border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-blue-500 outline-none transition-colors ${focusRing}`}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="threshold-input"
                className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block"
              >
                High-score threshold
              </label>
              <input
                id="threshold-input"
                type="number"
                min={1}
                value={settings.highValueThreshold}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  onUpdateSettings({
                    ...settings,
                    highValueThreshold: clampThreshold(v, settings.highValueThreshold),
                  });
                }}
                className={`w-full bg-[#040715] border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-blue-500 outline-none transition-colors ${focusRing}`}
              />
              <p className="text-[11px] text-slate-600 leading-relaxed">
                A tile counts as a &quot;hit&quot; when its score is greater than or equal to this
                value (typical game tiles use hundreds–thousands).
              </p>
            </div>

            <div className="flex items-center justify-between p-4 bg-[#040715] rounded-2xl border border-white/10 gap-3">
              <p id="recency-help" className="sr-only">
                When on, your five most recent boards are weighted more heavily in the heatmap.
              </p>
              <div className="flex items-center gap-2 min-w-0">
                <span id="recency-label" className="text-xs font-semibold text-slate-300">
                  Recency bias
                </span>
                <span
                  className="inline-flex text-slate-600 shrink-0"
                  title="When on, your five most recent boards are weighted more heavily in the heatmap."
                >
                  <Info size={14} aria-hidden />
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.recencyBias}
                aria-labelledby="recency-label"
                aria-describedby="recency-help"
                onClick={() =>
                  onUpdateSettings({ ...settings, recencyBias: !settings.recencyBias })
                }
                className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${focusRing} ${
                  settings.recencyBias ? 'bg-blue-600' : 'bg-white/10'
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    settings.recencyBias ? 'translate-x-5' : ''
                  }`}
                />
              </button>
            </div>

            <button
              type="button"
              onClick={onClearData}
              className={`w-full flex items-center justify-center gap-2 py-4 px-4 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl transition-all text-[11px] font-bold uppercase tracking-widest ${focusRing}`}
            >
              <Trash2 size={16} aria-hidden />
              Clear saved boards
            </button>
          </div>
        )}
      </div>

      <div className="shrink-0 pt-6 border-t border-white/5 flex flex-col items-center gap-4">
        <div className="flex items-center gap-1.5 text-slate-600 text-[10px] font-medium tracking-wide">
          <span
            className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shrink-0"
            aria-hidden
          ></span>
          Data stays in this browser
        </div>
      </div>
    </div>
  );
};
