import React, { useRef, useState } from 'react';
import { Upload, Trash2, Settings, Target, Loader2, Info, Clock, History, Download, Share2, Sparkles } from 'lucide-react';
import { AppSettings, CellStat, UploadStatus, GameRecord } from '../types';

interface DashboardProps {
  onFileUpload: () => void;
  uploadStatus: UploadStatus;
  settings: AppSettings;
  onUpdateSettings: (s: AppSettings) => void;
  onClearData: () => void;
  onDeleteGame: (id: string) => void;
  onExportData: () => void;
  onImportData: (file: File) => void;
  topRecommendation: CellStat | null;
  totalGames: number;
  gameHistory: GameRecord[];
}

export const Dashboard: React.FC<DashboardProps> = ({
  onFileUpload,
  uploadStatus,
  settings,
  onUpdateSettings,
  onClearData,
  onDeleteGame,
  onExportData,
  onImportData,
  topRecommendation,
  totalGames,
  gameHistory,
}) => {
  const importInputRef = useRef<HTMLInputElement>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

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

  return (
    <div className="h-full flex flex-col gap-8 p-8 overflow-hidden">
      
      {/* Brand Header */}
      <div className="shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gemini-gradient flex items-center justify-center">
                <Sparkles size={16} className="text-white" />
            </div>
            <div>
                <h1 className="text-xl font-bold tracking-tight text-white leading-tight">Tile Predictor</h1>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Powered by Gemini</p>
            </div>
        </div>
        <div className="flex gap-1">
            <button 
                title="Export database"
                onClick={onExportData}
                className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all"
            >
                <Download size={18} />
            </button>
             <button 
                title="Import database"
                onClick={() => importInputRef.current?.click()}
                className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all"
            >
                <Share2 size={18} />
            </button>
            <input type="file" ref={importInputRef} className="hidden" accept=".json" onChange={handleImportChange} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-8 pr-2 custom-scrollbar">
        
        {/* Main Intelligence Card */}
        <div className="relative group">
            <div className="absolute -inset-0.5 gemini-gradient rounded-3xl blur opacity-20 group-hover:opacity-30 transition duration-1000"></div>
            <div className="relative p-6 rounded-3xl glass-panel shadow-2xl">
              <div className="flex items-center gap-2 mb-6">
                <Target size={18} className="text-[#4787FF]" />
                <h2 className="font-bold text-white text-sm uppercase tracking-wider">AI Intelligence</h2>
              </div>
              
              {topRecommendation ? (
                <div className="space-y-6">
                  <div className="flex items-end justify-between">
                    <div>
                        <span className="text-slate-500 text-[10px] uppercase font-bold block mb-1">High Potential Cell</span>
                        <span className="text-5xl font-black text-white tracking-tighter">
                        {String.fromCharCode(65 + topRecommendation.col)}{topRecommendation.row + 1}
                        </span>
                    </div>
                    <div className="text-right">
                        <span className="text-slate-500 text-[10px] uppercase font-bold block mb-1">Probability</span>
                        <span className="text-3xl font-black gemini-text-gradient">
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
                        <span>Low Probability</span>
                        <span>High Confidence</span>
                      </div>
                  </div>
                  
                  <div className="pt-4 border-t border-white/5 flex justify-between items-center text-xs">
                    <span className="text-slate-500">Dataset Density</span>
                    <span className="text-slate-300 font-mono">{topRecommendation.highValueCount} hits / {topRecommendation.totalOccurrences} games</span>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-500 py-6 text-center border border-dashed border-white/10 rounded-2xl italic">
                  Upload board captures to generate predictive metrics.
                </div>
              )}
            </div>
        </div>

        {/* Global Controls */}
        <div className="space-y-4">
          <button
            onClick={onFileUpload}
            disabled={uploadStatus === 'analyzing'}
            className="group w-full relative flex items-center justify-center gap-3 py-5 px-6 rounded-2xl transition-all font-bold overflow-hidden"
          >
            <div className="absolute inset-0 gemini-gradient opacity-90 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative flex items-center gap-3 text-white">
                {uploadStatus === 'analyzing' ? (
                <Loader2 className="animate-spin" size={20} />
                ) : (
                <Upload size={20} />
                )}
                <span className="tracking-tight">{uploadStatus === 'analyzing' ? 'Neural Processing...' : 'Upload Game Captures'}</span>
            </div>
          </button>
          
          <div className="grid grid-cols-2 gap-3">
            <button
                onClick={() => setShowHistory(!showHistory)}
                className={`flex items-center justify-center gap-2 py-3.5 rounded-2xl transition-all text-xs font-bold border ${showHistory ? 'bg-white/10 border-white/20 text-white' : 'bg-transparent border-white/10 text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
                <History size={16} />
                Logs ({totalGames})
            </button>
            <button
                onClick={() => setShowSettings(!showSettings)}
                className={`flex items-center justify-center gap-2 py-3.5 rounded-2xl transition-all text-xs font-bold border ${showSettings ? 'bg-white/10 border-white/20 text-white' : 'bg-transparent border-white/10 text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
                <Settings size={16} />
                Configs
            </button>
          </div>
        </div>

        {/* Panels */}
        {showHistory && (
          <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Temporal Log</h3>
            </div>
            {sortedHistory.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                {sortedHistory.map((game) => (
                  <div key={game.id} className="group flex items-center justify-between p-4 glass-panel rounded-2xl hover:border-white/20 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-blue-400">
                        <Clock size={16} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[12px] font-semibold text-white">{formatDate(game.timestamp)}</span>
                        <span className="text-[10px] text-slate-500 font-mono tracking-tighter">{game.tiles.length} points detected</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => onDeleteGame(game.id)}
                      className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all md:opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-10 text-center glass-panel rounded-2xl border-dashed">
                <p className="text-[11px] text-slate-500 uppercase font-bold">No historical data</p>
              </div>
            )}
          </div>
        )}

        {showSettings && (
          <div className="p-6 glass-panel rounded-[24px] space-y-6 animate-in fade-in slide-in-from-bottom-2">
             <div className="space-y-3">
                <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Board Matrix</label>
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1.5">
                      <span className="text-[10px] text-slate-600 font-bold block">Rows</span>
                      <input 
                        type="number" 
                        value={settings.dimensions.rows}
                        onChange={(e) => onUpdateSettings({...settings, dimensions: { ...settings.dimensions, rows: parseInt(e.target.value) || 5 }})}
                        className="w-full bg-[#040715] border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-blue-500 outline-none transition-colors"
                      />
                   </div>
                   <div className="space-y-1.5">
                      <span className="text-[10px] text-slate-600 font-bold block">Columns</span>
                       <input 
                        type="number" 
                        value={settings.dimensions.cols}
                        onChange={(e) => onUpdateSettings({...settings, dimensions: { ...settings.dimensions, cols: parseInt(e.target.value) || 5 }})}
                        className="w-full bg-[#040715] border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-blue-500 outline-none transition-colors"
                      />
                   </div>
                </div>
             </div>
             
             <div className="flex items-center justify-between p-4 bg-[#040715] rounded-2xl border border-white/10">
                <div className="flex items-center gap-2">
                   <span className="text-xs font-semibold text-slate-300">Recency Bias</span>
                   <Info size={14} className="text-slate-600"/>
                </div>
                <button 
                  onClick={() => onUpdateSettings({...settings, recencyBias: !settings.recencyBias})}
                  className={`w-11 h-6 rounded-full transition-colors relative ${settings.recencyBias ? 'bg-blue-600' : 'bg-white/10'}`}
                >
                  <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.recencyBias ? 'translate-x-5' : ''}`}></div>
                </button>
             </div>

             <button 
                onClick={onClearData}
                className="w-full flex items-center justify-center gap-2 py-4 px-4 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl transition-all text-[11px] font-bold uppercase tracking-widest"
              >
                <Trash2 size={16} />
                Wipe Local History
             </button>
          </div>
        )}
      </div>

      <div className="shrink-0 pt-6 border-t border-white/5 flex flex-col items-center gap-4">
        <div className="flex items-center gap-1.5 text-slate-600 text-[10px] font-bold uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
            Private Local Instance
        </div>
      </div>
    </div>
  );
};