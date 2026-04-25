import React, { useState, useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { 
  TrendingUp, ShieldAlert, Award, Zap, Eraser, 
  Import, AlertCircle, CheckCircle2, LayoutDashboard,
  Play, Package
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import initialData from '../data/benchmark-data.json';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const CAPACITY_LEVELS = [0, 25, 50, 75];

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

export default function BenchmarkPage() {
  const [data, setData] = useState(initialData);
  const [pastedData, setPastedData] = useState('');
  const [showImporter, setShowImporter] = useState(false);
  const [importerError, setImporterError] = useState('');

  const algorithms = useMemo(() => {
    return Array.from(new Set(data.map(d => d.algorithm)));
  }, [data]);

  const bestPerformers = useMemo(() => {
    const best = {};
    CAPACITY_LEVELS.forEach(cap => {
      const capData = data.filter(d => d.capacity_pct === cap && d.status === 'ok');
      if (capData.length === 0) return;
      const maxThroughput = Math.max(...capData.map(d => d.throughput_per_h));
      best[`throughput-${cap}`] = capData.find(d => d.throughput_per_h === maxThroughput)?.algorithm;
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
      }
    } catch (e) {
      setImporterError('Invalid JSON format.');
    }
  };

  const getAlgoData = (algo, cap) => {
    return data.find(d => d.algorithm === algo && d.capacity_pct === cap);
  };

  const colors = ['#818cf8', '#34d399', '#f472b6', '#fbbf24', '#a78bfa', '#f87171'];

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 font-sans p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                <LayoutDashboard className="w-6 h-6 text-indigo-400" />
              </div>
              <h1 className="text-3xl font-bold text-slate-50 tracking-tight">Warehouse Algorithm Benchmark</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Link 
              to="/visualizer"
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg transition-all border border-slate-700"
            >
              <Play className="w-4 h-4" />
              Live Visualizer
            </Link>
            <Link 
              to="/palletizer"
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg transition-all border border-slate-700"
            >
              <Package className="w-4 h-4 text-emerald-400" />
              Palletizer
            </Link>
            <button 
              onClick={() => setShowImporter(!showImporter)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
            >
              <Import className="w-4 h-4" />
              Import JSON
            </button>
          </div>
        </header>

        {showImporter && (
          <Card className="border-indigo-500/30 bg-indigo-500/5">
            <div className="space-y-4">
              <textarea 
                value={pastedData}
                onChange={(e) => setPastedData(e.target.value)}
                placeholder="Paste benchmark JSON here..."
                className="w-full h-40 bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
              />
              <button onClick={handleImport} className="w-full py-2 bg-indigo-500 hover:bg-indigo-400 text-white rounded-lg font-bold">Sync Dashboard</button>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-br from-indigo-500/10 to-transparent border-indigo-500/20">
            <p className="text-slate-400 text-sm font-medium">Top Performer (75%)</p>
            <h4 className="text-2xl font-bold text-slate-50 mt-1">{bestPerformers['throughput-75']}</h4>
            <div className="mt-4 flex items-center gap-2">
              <Badge variant="indigo">Best Throughput</Badge>
            </div>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/20">
            <p className="text-slate-400 text-sm font-medium">Efficiency King</p>
            <h4 className="text-2xl font-bold text-slate-50 mt-1">{bestPerformers['relocs-75']}</h4>
            <div className="mt-4 flex items-center gap-2">
              <Badge variant="success">Zero Blocks</Badge>
            </div>
          </Card>
          <Card className="bg-gradient-to-br from-amber-500/10 to-transparent border-amber-500/20">
            <p className="text-slate-400 text-sm font-medium">Total Scenarios</p>
            <h4 className="text-2xl font-bold text-slate-50 mt-1">{data.length} Runs</h4>
            <div className="mt-4 flex items-center gap-2">
              <Badge variant="warning">{algorithms.length} Algorithms</Badge>
            </div>
          </Card>
        </div>

        <Card title="Performance Matrix" icon={Award}>
          <div className="overflow-x-auto -mx-6">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500">Algorithm</th>
                  {CAPACITY_LEVELS.map(cap => <th key={cap} className="px-6 py-4 text-xs font-bold uppercase text-slate-500 text-center">{cap}%</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {algorithms.map(algo => (
                  <tr key={algo} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-slate-200">{algo}</span>
                        <div className="flex gap-1">
                          <Link to={`/visualizer?algo=${encodeURIComponent(algo)}&cap=75`} className="text-[10px] text-indigo-400 hover:text-indigo-300 underline font-bold uppercase">▶ Watch</Link>
                        </div>
                      </div>
                    </td>
                    {CAPACITY_LEVELS.map(cap => {
                      const run = getAlgoData(algo, cap);
                      if (!run || run.status === 'failed') return <td key={cap} className="px-6 py-4 text-center"><Badge variant="danger">FAILED</Badge></td>;
                      return (
                        <td key={cap} className="px-6 py-4 text-center">
                          <div className="text-sm font-mono font-bold text-slate-200">{run.throughput_per_h.toFixed(1)}</div>
                          <div className="text-[10px] text-slate-500">{run.z_blocks} Blocks</div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card title="Throughput vs. Capacity" icon={Zap}>
            <div className="h-80 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} />
                  <Legend />
                  {algorithms.map((algo, i) => <Line key={algo} type="monotone" dataKey={algo} stroke={colors[i % colors.length]} strokeWidth={3} dot={{ r: 4 }} connectNulls />)}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card title="Relocation Penalty" icon={Eraser}>
            <div className="h-80 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} />
                  <Legend />
                  {algorithms.map((algo, i) => <Line key={algo} type="monotone" dataKey={`${algo}-blocks`} stroke={colors[i % colors.length]} strokeWidth={2} dot={{ r: 4 }} connectNulls />)}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

      </div>
    </div>
  );
}
