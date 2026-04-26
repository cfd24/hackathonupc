import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, LayoutDashboard, Layers, Package, Database, 
  Copy, Download, Check, ArrowUp, ArrowDown, Info
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import benchmarkData from '../data/benchmark-data.json';
import realisticResults from '../data/realistic-results.json';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const CAPACITY_LEVELS = [0, 25, 50, 75];

export default function RawDataPage() {
  const [copied, setCopied] = useState(false);
  const [sortConfigs, setSortConfigs] = useState(
    CAPACITY_LEVELS.reduce((acc, cap) => ({
      ...acc,
      [cap]: { key: 'throughput_per_h', dir: 'desc' }
    }), {})
  );

  const jsonString = JSON.stringify(realisticResults, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'realistic_benchmark_results.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toggleSort = (cap, key) => {
    setSortConfigs(prev => {
      const current = prev[cap];
      if (current.key === key) {
        return { ...prev, [cap]: { key, dir: current.dir === 'asc' ? 'desc' : 'asc' } };
      }
      return { ...prev, [cap]: { key, dir: 'desc' } };
    });
  };

  const getSortedData = (cap) => {
    const config = sortConfigs[cap];
    const blockData = benchmarkData.filter(d => d.capacity_pct === cap);
    
    return [...blockData].sort((a, b) => {
      // Rule: FAILED rows always at the bottom
      if (a.status === 'failed' && b.status !== 'failed') return 1;
      if (a.status !== 'failed' && b.status === 'failed') return -1;
      if (a.status === 'failed' && b.status === 'failed') return a.algorithm.localeCompare(b.algorithm);

      const valA = a[config.key];
      const valB = b[config.key];

      if (valA === null) return 1;
      if (valB === null) return -1;

      let comparison = 0;
      if (typeof valA === 'string') comparison = valA.localeCompare(valB);
      else comparison = valA - valB;

      return config.dir === 'asc' ? comparison : -comparison;
    });
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 font-sans flex flex-col h-screen overflow-hidden">
      <header className="px-8 py-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-950/80 backdrop-blur-md z-30">
        <div className="flex items-center gap-6">
          <Link to="/visualizer" className="absolute top-0 left-0 w-32 h-32 z-50 opacity-0 cursor-pointer" />
          <div className="p-2 text-slate-800"><ChevronLeft className="w-5 h-5" /></div>
          <div className="space-y-0.5">
            <h1 className="text-lg font-bold text-slate-50 flex items-center gap-2"><Database className="w-5 h-5 text-amber-400" /> Raw Benchmark Data</h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-emerald-400/80 underline decoration-emerald-500/30">Terminal Output & Simulation JSON</p>
          </div>
        </div>

        <nav className="flex items-center gap-2 bg-slate-900/50 p-1 rounded-xl border border-slate-800">
          <div className="px-4 py-2 rounded-lg text-xs font-bold bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 flex items-center gap-2">
            <Database className="w-4 h-4 text-amber-400" /> Raw Data
          </div>
        </nav>
      </header>

      <main className="flex-1 overflow-y-auto p-8 space-y-12 scrollbar-hide">
        {/* Section 1: Split Table Blocks */}
        <section className="space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Original Terminal Benchmark Table
            </h2>
            <div className="text-[10px] text-slate-600 font-mono italic">Source: src/data/benchmark-data.json</div>
          </div>

          <div className="grid grid-cols-1 gap-8">
            {CAPACITY_LEVELS.map(cap => {
              const sortedData = getSortedData(cap);
              const config = sortConfigs[cap];

              return (
                <div key={cap} className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-500 text-xs font-bold uppercase tracking-wider">{cap}% Capacity</div>
                    <div className="h-px flex-1 bg-slate-800/50" />
                  </div>
                  
                  <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/50 shadow-xl">
                    <table className="w-full text-left border-collapse font-mono text-[11px]">
                      <thead>
                        <tr className="bg-slate-900/50 border-b border-slate-800">
                          {[
                            { label: 'Algorithm', key: 'algorithm', align: 'left' },
                            { label: 'Sim Time (s)', key: 'sim_time_s', align: 'right' },
                            { label: 'Pallets', key: 'pallets', align: 'right' },
                            { label: 'BOXES/HR', key: 'throughput_per_h', align: 'right' },
                            { label: 'Z-Blocks', key: 'z_blocks', align: 'right' },
                            { label: 'Status', key: null, align: 'center' }
                          ].map(col => (
                            <th 
                              key={col.label} 
                              onClick={() => col.key && toggleSort(cap, col.key)}
                              className={cn(
                                "px-4 py-3 text-slate-500 font-bold uppercase tracking-wider",
                                col.key && "cursor-pointer hover:text-slate-300 transition-colors select-none",
                                col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'
                              )}
                            >
                              <div className={cn("flex items-center gap-1", col.align === 'right' && "justify-end", col.align === 'center' && "justify-center")}>
                                {col.label}
                                {config.key === col.key && (
                                  config.dir === 'asc' ? <ArrowUp className="w-3 h-3 text-amber-500" /> : <ArrowDown className="w-3 h-3 text-amber-500" />
                                )}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900/50">
                        {sortedData.map((row, i) => (
                          <tr key={i} className={cn(
                            "hover:bg-slate-900/40 transition-colors",
                            row.status === 'failed' ? "bg-rose-500/5 text-rose-400" : "text-slate-300"
                          )}>
                            <td className="px-4 py-2.5 font-bold">{row.algorithm}</td>
                            <td className="px-4 py-2.5 text-right">{row.sim_time_s ? row.sim_time_s.toLocaleString() : '---'}</td>
                            <td className="px-4 py-2.5 text-right">{row.pallets || '---'}</td>
                            <td className="px-4 py-2.5 text-right text-indigo-400/90 font-bold">{row.throughput_per_h ? (row.throughput_per_h * 12).toFixed(1) : '---'}</td>
                            <td className="px-4 py-2.5 text-right">{row.z_blocks !== null ? row.z_blocks : '---'}</td>
                            <td className="px-4 py-2.5 text-center">
                              <span className={cn(
                                "px-1.5 py-0.5 rounded text-[9px] font-bold",
                                row.status === 'ok' ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/20 text-rose-500"
                              )}>
                                {row.status.toUpperCase()}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Section 2: JSON Viewer */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              Raw Simulation JSON (Realistic Mode)
            </h2>
            <div className="flex items-center gap-3">
              <button 
                onClick={handleCopy}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-[10px] font-bold text-slate-400 transition-all active:scale-95"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy to Clipboard'}
              </button>
              <button 
                onClick={handleDownload}
                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-bold transition-all active:scale-95 shadow-lg shadow-indigo-500/20"
              >
                <Download className="w-3.5 h-3.5" />
                Download JSON
              </button>
            </div>
          </div>

          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent rounded-2xl pointer-events-none" />
            <pre className="bg-slate-950 border border-slate-800 rounded-2xl p-8 h-[600px] overflow-auto font-mono text-xs leading-relaxed scrollbar-hide text-indigo-300/80">
              {jsonString}
            </pre>
          </div>
        </section>
      </main>
    </div>
  );
}
