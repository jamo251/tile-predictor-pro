import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AppSettings, GameRecord, CellStat, UploadStatus } from './types';
import { geminiService } from './services/geminiService';
import { HeatmapGrid } from './components/HeatmapGrid';
import { Dashboard } from './components/Dashboard';
import { analytics } from './services/analyticsService';
import { computeCellStats, pickTopRecommendation } from './lib/computeCellStats';
import { sanitizeSettings } from './lib/settingsFormatting';
import { Sparkles, ArrowLeft, LayoutGrid, PanelRight } from 'lucide-react';

const STORAGE_KEY = 'tile_predictor_data_v1';
const SETTINGS_KEY = 'tile_predictor_settings_v1';

const DEFAULT_SETTINGS: AppSettings = {
  dimensions: { rows: 5, cols: 5 },
  highValueThreshold: 900,
  recencyBias: true,
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

type View = 'landing' | 'analysis';

type MobileTab = 'main' | 'panel';

const tabFocusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/90 focus-visible:ring-offset-2 focus-visible:ring-offset-[#040715]';

const App: React.FC = () => {
  const [games, setGames] = useState<GameRecord[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [currentView, setCurrentView] = useState<View>('landing');
  const [mobileTab, setMobileTab] = useState<MobileTab>('main');
  const [selectedCoords, setSelectedCoords] = useState<{ row: number; col: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        if (Array.isArray(imported)) {
          if (
            window.confirm(
              `Import ${imported.length} saved boards? They will merge with what you already have here.`
            )
          ) {
            setGames((prev) => [...prev, ...imported]);
            setCurrentView('analysis');
          }
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
    setUploadStatus('analyzing');
    const newGames: GameRecord[] = [];
    const fileArray = Array.from(files);

    try {
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        if (i > 0) await new Promise((resolve) => setTimeout(resolve, 1500));

        try {
          const base64String = await fileToBase64(file);
          const tiles = await geminiService.processImage(base64String, settings.dimensions);
          if (tiles.length === 0) continue;

          const gameTimestamp = file.lastModified || Date.now();
          const newGame: GameRecord = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: gameTimestamp,
            tiles: tiles,
          };
          newGames.push(newGame);
        } catch (err) {
          console.error(`Error processing file ${file.name}:`, err);
        }
      }

      if (newGames.length > 0) {
        setGames((prev) => [...prev, ...newGames]);
        setCurrentView('analysis');
        setUploadStatus('success');
      } else {
        setUploadStatus('error');
      }
      setTimeout(() => setUploadStatus('idle'), 3000);
    } catch {
      setUploadStatus('error');
      setTimeout(() => setUploadStatus('idle'), 3000);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFileUpload(e.target.files);
    }
    e.target.value = '';
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

  const topPickCoords = useMemo(
    () =>
      topRecommendation ? { row: topRecommendation.row, col: topRecommendation.col } : null,
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
    if (
      next &&
      typeof window !== 'undefined' &&
      window.matchMedia('(max-width: 767px)').matches
    ) {
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
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        multiple
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
                  <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" aria-hidden />
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
                  Tile Predictor{' '}
                  <span className="gemini-text-gradient">Pro</span>
                </h1>
                <p className="text-lg sm:text-xl text-slate-400 max-w-xl mx-auto leading-relaxed">
                  Upload screenshots of the same grid layout. Tile Predictor Pro builds a heatmap of where high scores
                  showed up across <span className="text-slate-300">your</span> saved boards—everything stays in this
                  browser.
                </p>
                <div className="max-w-md mx-auto text-left rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-4 sm:px-6">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">How it works</p>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-slate-400 leading-relaxed">
                    <li className="pl-1 -indent-1">Upload screenshots of your board.</li>
                    <li className="pl-1 -indent-1">Gemini reads each tile’s score from the image.</li>
                    <li className="pl-1 -indent-1">The heatmap updates from every board you add (local only).</li>
                  </ol>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-5 justify-center items-center pt-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`px-10 py-4 gemini-gradient text-white font-bold rounded-full shadow-[0_0_25px_rgba(71,135,255,0.3)] transition-all hover:scale-105 active:scale-95 ${tabFocusRing}`}
                >
                  Upload board screenshots
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
            </div>
          </div>
        )}
      </main>

      <aside
        className={`w-full md:w-[400px] border-t md:border-t-0 md:border-l border-white/10 z-10 flex-shrink-0 flex flex-col min-h-0 overflow-hidden bg-[#040715]/40 backdrop-blur-3xl md:h-full ${panelHiddenMobile ? 'hidden md:flex' : 'flex flex-1 md:flex-none md:h-full'}`}
      >
        <Dashboard
          variant={currentView === 'landing' ? 'compact' : 'full'}
          onFileUpload={() => fileInputRef.current?.click()}
          uploadStatus={uploadStatus}
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
