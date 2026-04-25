import React, { useState, useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  BarChart, Bar, Cell
} from 'recharts';
import { 
  TrendingUp, ShieldAlert, Award, Zap, Eraser, 
  ChevronDown, ChevronUp, Import, AlertCircle, 
  CheckCircle2, Info, LayoutDashboard
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import initialData from './data/benchmark-data.json';

// --- UTILS ---
function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const CAPACITY_LEVELS = [0, 25, 50, 75];

// --- COMPONENTS ---

const Card = ({ children, title, icon: Icon, className }) => (
  <div className={cn("bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden backdrop-blur-sm", className)}>
    {title && (
      <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
          {Icon && <Icon className="w-5 h-5 text-indigo-400" />}
          {title}
        </h3>
      </div>
    )}
    <div className="p-6">{children}</div>
  </div>
);

const Badge = ({ children, variant = 'default' }) => {
  const variants = {
    default: 'bg-slate-800 text-slate-300',
    success: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    danger: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
    indigo: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
    gold: 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20',
  };
  return (
    <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider", variants[variant])}>
      {children}
    </span>
  );
};

export default function App() {
  const [data, setData] = useState(initialData);
  const [pastedData, setPastedData] = useState('');
  const [showImporter, setShowImporter] = useState(false);
  const [importerError, setImporterError] = useState('');

  // --- DATA PROCESSING ---
  const algorithms = useMemo(() => {
    return Array.from(new Set(data.map(d => d.algorithm)));
  }, [data]);

  const bestPerformers = useMemo(() => {
    const best = {};
    CAPACITY_LEVELS.forEach(cap => {
      const capData = data.filter(d => d.capacity_pct === cap && d.status === 'ok');
      if (capData.length === 0) return;

      // Best Throughput
      const maxThroughput = Math.max(...capData.map(d => d.throughput_per_h));
      best[`throughput-${cap}`] = capData.find(d => d.throughput_per_h === maxThroughput)?.algorithm;

      // Best Time (lowest sim_time_s)
      const minTime = Math.min(...capData.map(d => d.sim_time_s));
      best[`time-${cap}`] = capData.find(d => d.sim_time_s === minTime)?.algorithm;

      // Lowest Relocations (Z-Blocks)
      const minRelocs = Math.min(...capData.map(d => d.z_blocks));
      best[`relocs-${cap}`] = capData.find(d => d.z_blocks === minRelocs)?.algorithm;
    });
    return best;
  }, [data]);

  const chartData = useMemo(() => {
    return CAPACITY_LEVELS.map(cap => {
      const entry = { name: `${cap}%` };
      algorithms.forEach(algo => {
        const d = data.find(item => item.algorithm === algo && item.capacity_pct === cap);
        if (d && d.status === 'ok') {
          entry[algo] = d.throughput_per_h;
          entry[`${algo}-blocks`] = d.z_blocks;
        }
      });
      return entry;
    });
  }, [data, algorithms]);

  const handleImport = () => {
    try {
      const parsed = JSON.parse(pastedData);
      if (Array.isArray(parsed)) {
        setData(parsed);
        setImporterError('');
        setShowImporter(false);
      } else {
        setImporterError('Input must be a JSON array of records.');
      }
    } catch (e) {
      setImporterError('Invalid JSON format.');
    }
  };

  const getAlgoData = (algo, cap) => {
    return data.find(d => d.algorithm === algo && d.capacity_pct === cap);
  };

  const colors = [
    '#818cf8', '#6366f1', '#4f46e5', '#3730a3', // Indigo range
    '#34d399', '#10b981', '#059669', '#047857', // Emerald range
    '#f472b6', '#ec4899', '#db2777', '#be185d', // Pink range
    '#fbbf24', '#f59e0b', '#d97706', '#b45309', // Amber range
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 font-sans p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* --- HEADER --- */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                <LayoutDashboard className="w-6 h-6 text-indigo-400" />
              </div>
              <h1 className="text-3xl font-bold text-slate-50 tracking-tight">Warehouse Algorithm Benchmark</h1>
            </div>
            <p className="text-slate-400 max-w-2xl">
              Comparative analysis of storage strategies across varying silo occupancy levels.
              Visualizing throughput, efficiency, and relocation penalties.
            </p>
          </div>
          
          <button 
            onClick={() => setShowImporter(!showImporter)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
          >
            <Import className="w-4 h-4" />
            Import Benchmark JSON
          </button>
        </header>

        {/* --- IMPORTER PANEL --- */}
        {showImporter && (
          <Card className="border-indigo-500/30 bg-indigo-500/5 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-slate-100 font-medium">Paste Terminal Output JSON</h4>
                <button onClick={() => setShowImporter(false)} className="text-slate-500 hover:text-slate-300">Close</button>
              </div>
              <textarea 
                value={pastedData}
                onChange={(e) => setPastedData(e.target.value)}
                placeholder='[{"algorithm": "...", "capacity_pct": 0, ...}, ...]'
                className="w-full h-40 bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
              />
              {importerError && <p className="text-rose-400 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {importerError}</p>}
              <button 
                onClick={handleImport}
                className="w-full py-2 bg-indigo-500 hover:bg-indigo-400 text-white rounded-lg font-bold transition-all"
              >
                Sync Dashboard
              </button>
            </div>
          </Card>
        )}

        {/* --- SUMMARY CARDS --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-br from-indigo-500/10 to-transparent border-indigo-500/20">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-400 text-sm font-medium">Top Performer (75%)</p>
                <h4 className="text-2xl font-bold text-slate-50 mt-1">{bestPerformers['throughput-75']}</h4>
              </div>
              <Award className="w-8 h-8 text-indigo-400 opacity-50" />
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Badge variant="indigo">Best Throughput</Badge>
              <span className="text-xs text-slate-500">60.6 P/h</span>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/20">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-400 text-sm font-medium">Best Efficiency (Zero Block)</p>
                <h4 className="text-2xl font-bold text-slate-50 mt-1">{bestPerformers['relocs-75']}</h4>
              </div>
              <ShieldAlert className="w-8 h-8 text-emerald-400 opacity-50" />
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Badge variant="success">0 Relocations</Badge>
              <span className="text-xs text-slate-500">at 75% Capacity</span>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500/10 to-transparent border-amber-500/20">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-400 text-sm font-medium">Benchmark Stats</p>
                <h4 className="text-2xl font-bold text-slate-50 mt-1">{algorithms.length} Algorithms</h4>
              </div>
              <TrendingUp className="w-8 h-8 text-amber-400 opacity-50" />
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
              <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-400" /> {data.filter(d => d.status === 'ok').length} OK</span>
              <span className="flex items-center gap-1"><AlertCircle className="w-3 h-3 text-rose-400" /> {data.filter(d => d.status === 'failed').length} Failed</span>
            </div>
          </Card>
        </div>

        {/* --- COMPARISON TABLE --- */}
        <Card title="Algorithm Performance Matrix" icon={Award}>
          <div className="overflow-x-auto -mx-6">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500">Algorithm</th>
                  {CAPACITY_LEVELS.map(cap => (
                    <th key={cap} className="px-6 py-4 text-xs font-bold uppercase text-slate-500 text-center">
                      {cap}% Capacity
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {algorithms.map(algo => (
                  <tr key={algo} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className={cn(
                          "font-bold",
                          algo.includes('Z-Safe') ? "text-indigo-300" : "text-slate-200"
                        )}>
                          {algo}
                        </span>
                        <div className="flex gap-1">
                          {getAlgoData(algo, 75)?.z_blocks === 0 && <Badge variant="gold">🏆 Zero Block</Badge>}
                          {algo === bestPerformers['throughput-75'] && <Badge variant="indigo">⚡ Speed King</Badge>}
                        </div>
                      </div>
                    </td>
                    {CAPACITY_LEVELS.map(cap => {
                      const run = getAlgoData(algo, cap);
                      if (!run || run.status === 'failed') {
                        return (
                          <td key={cap} className="px-6 py-4 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <Badge variant="danger">FAILED</Badge>
                              <span className="text-[10px] text-slate-600 uppercase font-bold">Reloc Error</span>
                            </div>
                          </td>
                        );
                      }
                      
                      const isBestThroughput = bestPerformers[`throughput-${cap}`] === algo;
                      const isBestRelocs = bestPerformers[`relocs-${cap}`] === algo;

                      return (
                        <td key={cap} className="px-6 py-4">
                          <div className="flex flex-col items-center gap-1.5">
                            <div className={cn(
                              "text-sm font-mono font-bold",
                              isBestThroughput ? "text-emerald-400 underline decoration-emerald-400/30 underline-offset-4" : "text-slate-200"
                            )}>
                              {run.throughput_per_h.toFixed(1)} <span className="text-[10px] opacity-40 font-sans">P/h</span>
                            </div>
                            <div className={cn(
                              "text-xs font-mono",
                              isBestRelocs ? "text-indigo-400" : "text-slate-500"
                            )}>
                              {run.z_blocks} <span className="text-[10px] opacity-40 font-sans">Blocks</span>
                            </div>
                            <div className="text-[10px] font-mono text-slate-600">
                              {(run.sim_time_s / 60).toFixed(1)}m
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* --- CHARTS --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card title="Throughput vs. Capacity" icon={Zap}>
            <div className="h-80 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} dx={-10} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }}
                    itemStyle={{ fontSize: '12px' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px' }} />
                  {algorithms.map((algo, i) => (
                    <Line 
                      key={algo} 
                      type="monotone" 
                      dataKey={algo} 
                      stroke={colors[i % colors.length]} 
                      strokeWidth={3} 
                      dot={{ r: 4, strokeWidth: 2, fill: '#0f172a' }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-slate-500 mt-6 flex items-center gap-1 uppercase tracking-widest font-bold">
              <Info className="w-3 h-3" /> Higher is better (Pallets per Hour)
            </p>
          </Card>

          <Card title="Relocation Penalty (Z-Blocks)" icon={Eraser}>
            <div className="h-80 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} dx={-10} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }}
                    itemStyle={{ fontSize: '12px' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px' }} />
                  {algorithms.map((algo, i) => (
                    <Line 
                      key={algo} 
                      type="monotone" 
                      dataKey={`${algo}-blocks`} 
                      stroke={colors[i % colors.length]} 
                      strokeWidth={2} 
                      strokeDasharray={algo.includes('Baseline') ? "5 5" : "0"}
                      dot={{ r: 4, strokeWidth: 2, fill: '#0f172a' }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-slate-500 mt-6 flex items-center gap-1 uppercase tracking-widest font-bold">
              <Info className="w-3 h-3" /> Lower is better (Number of relocations)
            </p>
          </Card>
        </div>

        {/* --- FOOTER --- */}
        <footer className="text-center py-12 border-t border-slate-800 text-slate-500 text-sm">
          <p>© 2026 HackUPC Warehouse Simulation — Hardware Constraints: 4 Aisles, 8 Shuttles, 7680 Slots.</p>
          <div className="flex items-center justify-center gap-4 mt-2">
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-indigo-500" /> Z-Safe Series</span>
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-slate-500" /> Baseline Series</span>
          </div>
        </footer>

      </div>
    </div>
  );
}
