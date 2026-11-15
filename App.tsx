import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  AppSettings,
  GameRecord,
  CellStat,
  UploadStatus,
  BatchProgress,
  LastImportSummary,
} from './types';
import { geminiService } from './services/geminiService';
import { HeatmapGrid } from './components/HeatmapGrid';
import { Dashboard } from './components/Dashboard';
import { analytics } from './services/analyticsService';
import { computeCellStats, pickTopRecommendation } from './lib/computeCellStats';
import { computeHistoryAnalysis } from './lib/computeHistoryAnalysis';
import { sanitizeSettings } from './lib/settingsFormatting';
import { parseImportedGames } from './lib/importGames';
import { collectImageFiles } from './lib/collectImageFiles';
import { MAX_BATCH_FILES, MAX_IMPORTED_GAMES_TOTAL } from './lib/limits';
import { fileToBase64 } from './lib/imageValidation';
import { Sparkles, ArrowLeft, LayoutGrid, PanelRight } from 'lucide-react';

const STORAGE_KEY = 'tile_predictor_data_v1';
const SETTINGS_KEY = 'tile_predictor_settings_v1';

const DEFAULT_SETTINGS: AppSettings = {
  dimensions: { rows: 5, cols: 5 },
  highValueThreshold: 900,
  recencyBias: true,
};

const tabFocusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/90 focus-visible:ring-offset-2 focus-visible:ring-offset-[#040715]';

const uploadHintFromFailure = (message: string): string => {
  const m = message.toLowerCase();
  if (m.includes('service unavailable') || m.includes('503')) {
    return 'Vercel env: set GEMINI_API_KEY (server-only) on the project and redeploy. It is never bundled into the browser.';
  }
  if (m.includes('failed to fetch') || m.includes('network')) {
    return 'Network error: if you use `npm run vite` alone, run `npx vercel dev` on port 3000 (default) so `/api` proxies, or deploy to Vercel where /api is served with the static app.';
  }
  if (m.includes('too many requests') || m.includes('429')) {
    return 'Rate limited — try again in a minute or add Upstash Redis env vars for fairer limits.';
  }
  return message.length > 220 ? `${message.slice(0, 217)}…` : message;
};

type View = 'landing' | 'analysis';

type MobileTab = 'main' | 'panel';

const App: React.FC = () => {
  const [games, setGames] = useState<GameRecord[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [uploadErrorHint, setUploadErrorHint] = useState<string | null>(null);
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(null);
  const [lastImportSummary, setLastImportSummary] = useState<LastImportSummary | null>(null);
  const [currentView, setCurrentView] = useState<View>('landing');
  const [mobileTab, setMobileTab] = useState<MobileTab>('main');
  const [selectedCoords, setSelectedCoords] = useState<{ row: number; col: number } | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const cancelUploadRef = useRef(false);
  const isUploadingRef = useRef(false);

  useEffect(() => {
    analytics.init();
    analytics.trackEvent('App Loaded');

    const storedGames = localStorage.getItem(STORAGE_KEY);
    const storedSettings = localStorage.getItem(SETTINGS_KEY);

    if (storedGames) {
      try {
        const parsed = JSON.parse(storedGames);
        setGames(parsed);
        if (parsed.length > 0) setCurrentView('analysis');
      } catch (e) {
        console.error('Failed to parse stored games', e);
      }
    }

    if (storedSettings) {
      try {
        const parsed = JSON.parse(storedSettings);
        setSettings(sanitizeSettings({ ...DEFAULT_SETTINGS, ...parsed }));
      } catch (e) {
        console.error('Failed to parse stored settings', e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(games));
    if (games.length === 0 && currentView === 'analysis') {
      setCurrentView('landing');
    }
  }, [games, currentView]);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (
      selectedCoords &&
      (selectedCoords.row >= settings.dimensions.rows ||
        selectedCoords.col >= settings.dimensions.cols)
    ) {
      setSelectedCoords(null);
    }
  }, [settings.dimensions.rows, settings.dimensions.cols, selectedCoords]);

  const handleClearData = () => {
    if (window.confirm('Delete all saved boards in this browser?')) {
      setGames([]);
      localStorage.removeItem(STORAGE_KEY);
      setCurrentView('landing');
      setSelectedCoords(null);
      analytics.trackEvent('Data Wiped');
    }
  };

  const handleDeleteGame = (id: string) => {
    setGames((prev) => prev.filter((g) => g.id !== id));
  };

  const handleExportData = () => {
    const dataStr = JSON.stringify(games, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tile-predictor-kb-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        const { games: incoming, error } = parseImportedGames(imported, settings.dimensions);
        if (error) {
          alert(error);
          return;
        }
        if (incoming.length === 0) {
          alert('No valid boards were found in that file.');
          return;
        }
        if (
          window.confirm(
            `Import ${incoming.length} saved boards? They will merge with what you already have here.`
          )
        ) {
          setGames((prev) => [...prev, ...incoming]);
          setCurrentView('analysis');
        }
      } catch {
        alert('That file is not valid saved-board data.');
      }
    };
    reader.readAsText(file);
  };

  const handleLoadDemo = () => {
    analytics.trackEvent('Demo Loaded');
    const demoGames: GameRecord[] = Array.from({ length: 15 }).map((_, i) => ({
      id: `demo-${i}`,
      timestamp: Date.now() - i * 86400000,
      tiles: Array.from({ length: 25 }).map((__, idx) => ({
        row: Math.floor(idx / 5),
        col: idx % 5,
        value: Math.random() > 0.82 ? 980 : 150 + Math.random() * 700,
      })),
    }));
    setGames(demoGames);
    setCurrentView('analysis');
  };

  const processFileUpload = async (files: FileList) => {
    if (isUploadingRef.current) return;
    isUploadingRef.current = true;
    cancelUploadRef.current = false;

    const remainingSlots = Math.max(0, MAX_IMPORTED_GAMES_TOTAL - games.length);
    const maxFiles = Math.min(MAX_BATCH_FILES, remainingSlots);
    const idleSoon = () => {
      window.setTimeout(() => setUploadStatus('idle'), 3000);
    };

    if (maxFiles <= 0) {
      setUploadStatus('error');
      setUploadErrorHint(
        `You already have ${MAX_IMPORTED_GAMES_TOTAL} saved boards. Export or delete some before adding more.`
      );
      setBatchProgress(null);
      isUploadingRef.current = false;
      idleSoon();
      return;
    }

    const collected = collectImageFiles(files, { maxFiles });
    if (collected.files.length === 0) {
      setUploadStatus('error');
      setLastImportSummary({
        processed: 0,
        added: 0,
        failed: 0,
        skippedNonImages: collected.skippedNonImages,
        truncated: collected.truncated,
        cancelled: false,
      });
      setUploadErrorHint(
        collected.skippedNonImages > 0
          ? 'No supported images found. Use JPEG, PNG, WebP, or GIF screenshots.'
          : 'No files were selected.'
      );
      setBatchProgress(null);
      isUploadingRef.current = false;
      idleSoon();
      return;
    }

    setUploadStatus('analyzing');
    setUploadErrorHint(null);
    setLastImportSummary(null);
    setMobileTab('panel');
    setBatchProgress({
      current: 0,
      total: collected.files.length,
      succeeded: 0,
      failed: 0,
      currentFilename: collected.files[0].name,
    });

    const dimensions = settings.dimensions;
    let succeeded = 0;
    let failed = 0;
    let lastFailureMessage = '';
    let cancelled = false;

    try {
      for (let i = 0; i < collected.files.length; i++) {
        if (cancelUploadRef.current) {
          cancelled = true;
          break;
        }
        if (i > 0) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
          if (cancelUploadRef.current) {
            cancelled = true;
            break;
          }
        }

        const file = collected.files[i];
        const progressFor = (nextSucceeded: number, nextFailed: number): BatchProgress => ({
          current: i + 1,
          total: collected.files.length,
          succeeded: nextSucceeded,
          failed: nextFailed,
          currentFilename: file.name,
        });
        setBatchProgress(progressFor(succeeded, failed));

        try {
          const { base64, mimeType } = await fileToBase64(file);
          const tiles = await geminiService.processImage(base64, mimeType, dimensions);
          if (tiles.length === 0) {
            failed += 1;
            setBatchProgress(progressFor(succeeded, failed));
            continue;
          }

          const newGame: GameRecord = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: file.lastModified || Date.now(),
            tiles,
          };
          setGames((prev) => [...prev, newGame]);
          setCurrentView('analysis');
          succeeded += 1;
          setBatchProgress(progressFor(succeeded, failed));
        } catch (err) {
          console.error(`Error processing file ${file.name}:`, err);
          lastFailureMessage = err instanceof Error ? err.message : String(err);
          failed += 1;
          setBatchProgress(progressFor(succeeded, failed));
        }
      }

      setLastImportSummary({
        processed: succeeded + failed,
        added: succeeded,
        failed,
        skippedNonImages: collected.skippedNonImages,
        truncated: collected.truncated,
        cancelled,
      });
      setBatchProgress(null);

      if (succeeded > 0) {
        setUploadStatus('success');
        setUploadErrorHint(null);
      } else {
        setUploadStatus('error');
        setUploadErrorHint(lastFailureMessage ? uploadHintFromFailure(lastFailureMessage) : null);
      }
      idleSoon();
    } catch {
      setUploadStatus('error');
      setUploadErrorHint(null);
      setBatchProgress(null);
      idleSoon();
    } finally {
      isUploadingRef.current = false;
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      void processFileUpload(e.target.files);
    }
    e.target.value = '';
  };

  const handleCancelUpload = () => {
    cancelUploadRef.current = true;
  };

  const stats = useMemo<CellStat[]>(
    () =>
      computeCellStats(games, {
        dimensions: settings.dimensions,
        highValueThreshold: settings.highValueThreshold,
        recencyBias: settings.recencyBias,
      }),
    [games, settings.dimensions, settings.highValueThreshold, settings.recencyBias]
  );

  const topRecommendation = useMemo(
    () => (games.length === 0 ? null : pickTopRecommendation(stats)),
    [stats, games.length]
  );

  const historyAnalysis = useMemo(
    () =>
      computeHistoryAnalysis(games, {
        dimensions: settings.dimensions,
        highValueThreshold: settings.highValueThreshold,
      }),
    [games, settings.dimensions, settings.highValueThreshold]
  );

  const topPickCoords = useMemo(
    () => (topRecommendation ? { row: topRecommendation.row, col: topRecommendation.col } : null),
    [topRecommendation]
  );

  const selectedCellStat = useMemo(() => {
    if (!selectedCoords) return null;
    return stats.find((s) => s.row === selectedCoords.row && s.col === selectedCoords.col) ?? null;
  }, [stats, selectedCoords]);

  const handleCellClick = (row: number, col: number) => {
    const isToggleOff = selectedCoords?.row === row && selectedCoords?.col === col;
    const next = isToggleOff ? null : { row, col };
    setSelectedCoords(next);
    if (next && typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches) {
      setMobileTab('panel');
    }
  };

  const showAnalysis = currentView === 'analysis' && games.length > 0;

  const mainHiddenMobile = mobileTab === 'panel';
  const panelHiddenMobile = mobileTab === 'main';

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] md:h-screen w-full bg-[#040715] overflow-hidden">
      <input
        type="file"
        ref={photoInputRef}
        className="hidden"
        accept="image/*"
        multiple
        onChange={handleFileChange}
      />
      <input
        type="file"
        ref={(el) => {
          folderInputRef.current = el;
          if (el) {
            el.setAttribute('webkitdirectory', '');
            el.setAttribute('directory', '');
            el.multiple = true;
          }
        }}
        className="hidden"
        onChange={handleFileChange}
      />

      <main
        className={`flex-1 relative flex flex-col min-h-0 overflow-hidden ${mainHiddenMobile ? 'hidden md:flex' : 'flex'}`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,_rgba(66,133,244,0.08)_0%,_transparent_50%),_radial-gradient(circle_at_70%_80%,_rgba(181,123,255,0.08)_0%,_transparent_50%)] -z-10"></div>

        {showAnalysis ? (
          <div className="flex flex-col h-full w-full min-h-0">
            <div className="shrink-0 p-4 sm:p-6 md:px-12 md:pt-10 flex flex-row flex-wrap items-center justify-between gap-4 bg-[#040715]/40 backdrop-blur-md border-b border-white/5 z-20">
              <div className="flex items-center gap-3 sm:gap-6 min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => setCurrentView('landing')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition-all hover:scale-105 active:scale-95 shadow-lg group shrink-0 ${tabFocusRing}`}
                >
                  <ArrowLeft
                    size={18}
                    className="group-hover:-translate-x-1 transition-transform"
                    aria-hidden
                  />
                  <span className="text-sm font-bold">Back</span>
                </button>
                <div className="min-w-0 flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg sm:text-2xl font-bold tracking-tight text-white truncate">
                      Tile Predictor Pro
                    </h2>
                    <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-400 text-[10px] sm:text-xs whitespace-nowrap">
                      {games.length} board{games.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <span className="text-slate-500 text-[11px] sm:text-xs">
                    Heatmap uses your settings (threshold {settings.highValueThreshold})
                  </span>
                  {batchProgress && (
                    <span className="text-slate-400 text-[11px] sm:text-xs truncate">
                      Reading {batchProgress.current}/{batchProgress.total}
                      {batchProgress.currentFilename ? ` · ${batchProgress.currentFilename}` : ''}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar p-6 md:p-12 flex items-center justify-center min-h-0">
              <div className="w-full max-w-5xl animate-in fade-in zoom-in-95 duration-500">
                <HeatmapGrid
                  stats={stats}
                  dimensions={settings.dimensions}
                  highValueThreshold={settings.highValueThreshold}
                  topPick={topPickCoords}
                  selectedCell={selectedCoords}
                  onCellClick={handleCellClick}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-6 animate-in fade-in slide-in-from-bottom-4 duration-700 min-h-0 overflow-auto">
            <div className="max-w-3xl text-center space-y-10">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-white/5 border border-white/10 text-slate-300 text-sm font-medium mb-4">
                  <Sparkles size={16} className="text-[#B57BFF]" aria-hidden />
                  Board screenshots → score heatmap · Gemini vision
                </div>
                <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[1.05]">
                  Tile Predictor <span className="gemini-text-gradient">Pro</span>
                </h1>
                <p className="text-lg sm:text-xl text-slate-400 max-w-xl mx-auto leading-relaxed">
                  Upload screenshots of the same grid layout. Each image is sent to Google&apos;s
                  Gemini API to read tile scores; your heatmap history is stored only in{' '}
                  <span className="text-slate-300">this browser</span>.
                </p>
                <div className="max-w-md mx-auto text-left rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-4 sm:px-6">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">
                    How it works
                  </p>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-slate-400 leading-relaxed">
                    <li className="pl-1 -indent-1">
                      Add a folder of screenshots on a computer, or many photos from your phone
                      gallery.
                    </li>
                    <li className="pl-1 -indent-1">
                      Gemini reads tile scores from each image over the network (server-side key).
                    </li>
                    <li className="pl-1 -indent-1">
                      Scores aggregate into a heatmap and play analysis saved locally in this
                      browser.
                    </li>
                  </ol>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row flex-wrap gap-4 justify-center items-center pt-2">
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={uploadStatus === 'analyzing'}
                  className={`px-8 py-4 gemini-gradient text-white font-bold rounded-full shadow-[0_0_25px_rgba(71,135,255,0.3)] transition-all hover:scale-105 active:scale-95 disabled:opacity-70 disabled:pointer-events-none ${tabFocusRing}`}
                >
                  Add from photos
                </button>
                <button
                  type="button"
                  onClick={() => folderInputRef.current?.click()}
                  disabled={uploadStatus === 'analyzing'}
                  className={`px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-full border border-white/20 transition-all hover:scale-105 disabled:opacity-70 disabled:pointer-events-none ${tabFocusRing}`}
                >
                  Add folder
                </button>
                {games.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentView('analysis')}
                    className={`px-10 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-full border border-white/20 transition-all hover:scale-105 ${tabFocusRing}`}
                  >
                    Resume heatmap
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleLoadDemo}
                    className={`px-10 py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-full border border-white/10 transition-all hover:scale-105 ${tabFocusRing}`}
                  >
                    Try sample data
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                On a phone, use Add from photos and multi-select from your gallery. Folder pick
                works on a computer.
              </p>
            </div>
          </div>
        )}
      </main>

      <aside
        className={`w-full md:w-[400px] border-t md:border-t-0 md:border-l border-white/10 z-10 flex-shrink-0 flex flex-col min-h-0 overflow-hidden bg-[#040715]/40 backdrop-blur-3xl md:h-full ${panelHiddenMobile ? 'hidden md:flex' : 'flex flex-1 md:flex-none md:h-full'}`}
      >
        <Dashboard
          variant={currentView === 'landing' ? 'compact' : 'full'}
          onPhotoUpload={() => photoInputRef.current?.click()}
          onFolderUpload={() => folderInputRef.current?.click()}
          onCancelUpload={handleCancelUpload}
          uploadStatus={uploadStatus}
          uploadErrorHint={uploadErrorHint}
          batchProgress={batchProgress}
          lastImport={lastImportSummary}
          historyAnalysis={historyAnalysis}
          settings={settings}
          onUpdateSettings={(s) => setSettings(sanitizeSettings(s))}
          onClearData={handleClearData}
          onDeleteGame={handleDeleteGame}
          onExportData={handleExportData}
          onImportData={handleImportData}
          topRecommendation={topRecommendation}
          selectedCell={selectedCellStat}
          onClearSelectedCell={() => setSelectedCoords(null)}
          totalGames={games.length}
          gameHistory={games}
        />
      </aside>

      <nav
        className="md:hidden shrink-0 grid grid-cols-2 border-t border-white/10 bg-[#040715]/95 backdrop-blur-xl z-30 pb-[max(0.25rem,env(safe-area-inset-bottom))]"
        aria-label="Primary mobile navigation"
      >
        <button
          type="button"
          onClick={() => setMobileTab('main')}
          className={`flex items-center justify-center gap-2 py-3.5 text-xs font-bold transition-colors ${tabFocusRing} ${
            mobileTab === 'main'
              ? 'text-white bg-white/10 border-t-2 border-t-blue-500'
              : 'text-slate-500 border-t-2 border-t-transparent'
          }`}
        >
          <LayoutGrid size={16} aria-hidden />
          {showAnalysis ? 'Heatmap' : 'Home'}
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('panel')}
          className={`flex items-center justify-center gap-2 py-3.5 text-xs font-bold transition-colors ${tabFocusRing} ${
            mobileTab === 'panel'
              ? 'text-white bg-white/10 border-t-2 border-t-blue-500'
              : 'text-slate-500 border-t-2 border-t-transparent'
          }`}
        >
          <PanelRight size={16} aria-hidden />
          Controls
        </button>
      </nav>
    </div>
  );
};

export default App;
