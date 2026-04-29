import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AppSettings, GameRecord, CellStat, UploadStatus } from './types';
import { geminiService } from './services/geminiService';
import { HeatmapGrid } from './components/HeatmapGrid';
import { Dashboard } from './components/Dashboard';
import { analytics } from './services/analyticsService';
import { computeCellStats, pickTopRecommendation } from './lib/computeCellStats';
import { Sparkles, ArrowLeft } from 'lucide-react';

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

const App: React.FC = () => {
  const [games, setGames] = useState<GameRecord[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [currentView, setCurrentView] = useState<View>('landing');
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
        console.error("Failed to parse stored games", e);
      }
    }
    
    if (storedSettings) {
      try {
        setSettings(JSON.parse(storedSettings));
      } catch (e) {
        console.error("Failed to parse stored settings", e);
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

  const handleClearData = () => {
    if (window.confirm("Are you sure you want to delete all historical game data?")) {
      setGames([]);
      localStorage.removeItem(STORAGE_KEY);
      setCurrentView('landing');
      analytics.trackEvent('Data Wiped');
    }
  };

  const handleDeleteGame = (id: string) => {
    setGames(prev => prev.filter(g => g.id !== id));
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
          if (window.confirm(`Import ${imported.length} games? This will merge with your existing data.`)) {
            setGames(prev => [...prev, ...imported]);
            setCurrentView('analysis');
          }
        }
      } catch {
        alert("Invalid database file.");
      }
    };
    reader.readAsText(file);
  };

  const handleLoadDemo = () => {
    analytics.trackEvent('Demo Loaded');
    const demoGames: GameRecord[] = Array.from({ length: 15 }).map((_, i) => ({
      id: `demo-${i}`,
      timestamp: Date.now() - (i * 86400000),
      tiles: Array.from({ length: 25 }).map((__, idx) => ({
        row: Math.floor(idx / 5),
        col: idx % 5,
        value: Math.random() > 0.82 ? 980 : 150 + Math.random() * 700
      }))
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
        if (i > 0) await new Promise(resolve => setTimeout(resolve, 1500)); 

        try {
          const base64String = await fileToBase64(file);
          const tiles = await geminiService.processImage(base64String, settings.dimensions);
          if (tiles.length === 0) continue;
          
          const gameTimestamp = file.lastModified || Date.now();
          const newGame: GameRecord = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: gameTimestamp,
            tiles: tiles
          };
          newGames.push(newGame);
        } catch (err) {
          console.error(`Error processing file ${file.name}:`, err);
        }
      }

      if (newGames.length > 0) {
        setGames(prev => [...prev, ...newGames]);
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

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-[#040715] overflow-hidden">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        multiple
        onChange={handleFileChange}
      />
      
      <main className="flex-1 relative flex flex-col h-full overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,_rgba(66,133,244,0.08)_0%,_transparent_50%),_radial-gradient(circle_at_70%_80%,_rgba(181,123,255,0.08)_0%,_transparent_50%)] -z-10"></div>
        
        {currentView === 'analysis' && games.length > 0 ? (
          <div className="flex flex-col h-full w-full">
            {/* Sticky Header for Navigation */}
            <div className="shrink-0 p-6 md:px-12 md:pt-10 flex flex-col sm:flex-row items-center sm:items-end justify-between gap-6 bg-[#040715]/40 backdrop-blur-md border-b border-white/5 z-20">
              <div className="flex items-center gap-6 w-full sm:w-auto">
                <button 
                  onClick={() => setCurrentView('landing')}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition-all hover:scale-105 active:scale-95 shadow-lg group"
                >
                  <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                  <span className="text-sm font-bold">Home</span>
                </button>
                <div className="hidden sm:block">
                  <h2 className="text-2xl font-bold tracking-tight text-white mb-1">Predictive Heatmap</h2>
                  <div className="flex items-center gap-2 text-slate-400 text-xs">
                    <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">{games.length} Samples</span>
                    <span className="text-blue-400 font-medium">Neural targets active</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Scrollable Grid Content */}
            <div className="flex-1 overflow-auto custom-scrollbar p-6 md:p-12 flex items-center justify-center min-h-0">
              <div className="w-full max-w-5xl animate-in fade-in zoom-in-95 duration-500">
                <HeatmapGrid stats={stats} dimensions={settings.dimensions} onCellClick={() => {}} />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="max-w-3xl text-center space-y-10">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-white/5 border border-white/10 text-slate-300 text-sm font-medium mb-4">
                  <Sparkles size={16} className="text-[#B57BFF]" />
                  Analyze historical patterns with Gemini AI
                </div>
                <h1 className="text-5xl sm:text-7xl font-black tracking-tight leading-none">
                  Win with <span className="gemini-text-gradient">Predictive Edge</span>
                </h1>
                <p className="text-lg sm:text-xl text-slate-400 max-w-xl mx-auto leading-relaxed">
                  Stop guessing. Upload your game boards and let our neural-assisted analysis reveal the hidden probability of high-value scores.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-5 justify-center items-center pt-6">
                <button 
                  onClick={() => fileInputRef.current?.click()} 
                  className="px-10 py-4 gemini-gradient text-white font-bold rounded-full shadow-[0_0_25px_rgba(71,135,255,0.3)] transition-all hover:scale-105 active:scale-95"
                >
                  Start Analysis
                </button>
                {games.length > 0 ? (
                   <button 
                      onClick={() => setCurrentView('analysis')} 
                      className="px-10 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-full border border-white/20 transition-all hover:scale-105"
                   >
                      Resume Session
                   </button>
                ) : (
                   <button onClick={handleLoadDemo} className="px-10 py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-full border border-white/10 transition-all hover:scale-105">
                       Explore Demo
                   </button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <aside className="w-full md:w-[400px] border-t md:border-t-0 md:border-l border-white/10 z-10 flex-shrink-0 flex flex-col h-[50vh] md:h-full overflow-hidden bg-[#040715]/40 backdrop-blur-3xl">
        <Dashboard 
            onFileUpload={() => fileInputRef.current?.click()} 
            uploadStatus={uploadStatus} 
            settings={settings} 
            onUpdateSettings={setSettings} 
            onClearData={handleClearData} 
            onDeleteGame={handleDeleteGame} 
            onExportData={handleExportData} 
            onImportData={handleImportData} 
            topRecommendation={topRecommendation} 
            totalGames={games.length} 
            gameHistory={games} 
        />
      </aside>
    </div>
  );
};

export default App;