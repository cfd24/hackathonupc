import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Box, Package, Truck, Timer, BarChart3, 
  ChevronLeft, LayoutDashboard, Layers,
  CheckCircle2, Loader2, ArrowRight, TrendingUp,
  Clock, Warehouse, Zap, Info, Database
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const PALLET_MAX = 12;

export default function PalletizerPage() {
  const [pallets, setPallets] = useState([]);
  const [stats, setStats] = useState({
    completed: 0,
    avgTime: 0,
    throughput: 0,
    inTransit: 0
  });
  const [shippedAlert, setShippedAlert] = useState(null);

  const simTimer = useRef(null);
  const startTime = useRef(Date.now());

  // Initialize 8 slots
  const initPallets = useCallback(() => {
    const initial = Array.from({ length: 8 }).map((_, i) => ({
      id: i + 1,
      dest: Math.floor(10000000 + Math.random() * 90000000).toString(),
      count: Math.floor(Math.random() * 8), // Start with some random progress
      status: 'collecting',
      startTime: Date.now() - (Math.random() * 60000)
    }));
    setPallets(initial);
  }, []);

  useEffect(() => {
    initPallets();
  }, [initPallets]);

  const tick = useCallback(() => {
    setPallets(prev => {
      let nextCompleted = 0;
      let totalTime = 0;
      let completedCount = 0;

      const updated = prev.map(p => {
        if (p.status === 'empty') {
          if (Math.random() > 0.95) { // 5% chance to start new pallet
            return {
              ...p,
              dest: Math.floor(10000000 + Math.random() * 90000000).toString(),
              count: 0,
              status: 'collecting',
              startTime: Date.now()
            };
          }
          return p;
        }

        if (p.status === 'collecting') {
          const newCount = p.count + (Math.random() > 0.8 ? 1 : 0); // Simulate box arrival
          if (newCount >= PALLET_MAX) {
            setShippedAlert(p.id);
            setTimeout(() => setShippedAlert(null), 2000);
            
            setStats(s => ({
              ...s,
              completed: s.completed + 1,
              avgTime: Math.floor((s.avgTime * s.completed + (Date.now() - p.startTime)/1000) / (s.completed + 1))
            }));

            return { ...p, count: PALLET_MAX, status: 'complete' };
          }
          return { ...p, count: newCount };
        }

        if (p.status === 'complete') {
          // After a delay, it becomes empty
          if (Math.random() > 0.9) return { ...p, status: 'empty', count: 0, dest: '' };
        }

        return p;
      });

      return updated;
    });

    // Update derived stats
    const elapsedHrs = (Date.now() - startTime.current) / 3600000;
    setStats(s => ({
      ...s,
      throughput: elapsedHrs > 0 ? (s.completed / elapsedHrs).toFixed(1) : 0,
      inTransit: Math.floor(Math.random() * 20) + 5 // Simulated
    }));

  }, []);

  useEffect(() => {
    simTimer.current = setInterval(tick, 500);
    return () => clearInterval(simTimer.current);
  }, [tick]);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 font-sans flex flex-col h-screen overflow-hidden">
      
      {/* Navigation Header */}
      <header className="px-8 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80 backdrop-blur-md shrink-0 z-30">
        <div className="flex items-center gap-6">
          <Link to="/" className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="space-y-0.5">
            <h1 className="text-lg font-bold text-slate-50 flex items-center gap-2">
              <Package className="w-5 h-5 text-emerald-400" />
              Palletization Control
            </h1>
            <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              <span>Robot Cluster Alpha-Beta</span>
              <span className="w-1 h-1 rounded-full bg-slate-700" />
              <span>Real-time Buffer Monitoring</span>
            </div>
          </div>
        </div>

        <nav className="flex items-center gap-2 bg-slate-900/50 p-1 rounded-xl border border-slate-800">
          <Link to="/" className="px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-800 transition-all flex items-center gap-2">
            <LayoutDashboard className="w-4 h-4" /> Benchmark
          </Link>
          <Link to="/visualizer" className="px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-800 transition-all flex items-center gap-2">
            <Layers className="w-4 h-4" /> Visualizer
          </Link>
          <div className="px-4 py-2 rounded-lg text-xs font-bold bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 flex items-center gap-2">
            <Package className="w-4 h-4" /> Palletizer
          </div>
          <Link to="/raw-data" className="px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-800 transition-all flex items-center gap-2">
            <Database className="w-4 h-4 text-amber-400" /> Raw Data
          </Link>
        </nav>
      </header>

      {/* Stats Bar */}
      <div className="px-8 py-3 bg-slate-900/30 border-b border-slate-800/50 flex items-center gap-12 shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
            <Truck className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase">Shipped</p>
            <p className="text-lg font-mono font-bold text-slate-100">{stats.completed} <span className="text-xs font-normal text-slate-500">units</span></p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
            <Timer className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase">Avg Cycle</p>
            <p className="text-lg font-mono font-bold text-slate-100">{stats.avgTime}s</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
            <TrendingUp className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase">Throughput</p>
            <p className="text-lg font-mono font-bold text-slate-100">{stats.throughput} <span className="text-xs font-normal text-slate-500">P/hr</span></p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="p-2 bg-orange-500/10 rounded-lg border border-orange-500/20">
            <Zap className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase">In Transit</p>
            <p className="text-lg font-mono font-bold text-slate-100">{stats.inTransit} <span className="text-xs font-normal text-slate-500">boxes</span></p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto scrollbar-hide">
        <div className="max-w-7xl mx-auto space-y-12">
          
          <div className="grid grid-cols-2 gap-16 relative">
            {/* Divider */}
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-slate-800 to-transparent -translate-x-1/2" />

            {/* Robot 1 Cluster */}
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-xs">R1</div>
                  <h2 className="text-xl font-bold text-slate-200">Robot Cluster Alpha</h2>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/10 rounded-full border border-blue-500/20 text-[10px] font-bold text-blue-400 uppercase animate-pulse">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Sync Active
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {pallets.slice(0, 4).map(p => (
                  <PalletCard key={p.id} p={p} isShipped={shippedAlert === p.id} />
                ))}
              </div>
            </div>

            {/* Robot 2 Cluster */}
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-xs">R2</div>
                  <h2 className="text-xl font-bold text-slate-200">Robot Cluster Beta</h2>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20 text-[10px] font-bold text-emerald-400 uppercase">
                   <CheckCircle2 className="w-3 h-3" /> System Nominal
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {pallets.slice(4, 8).map(p => (
                  <PalletCard key={p.id} p={p} isShipped={shippedAlert === p.id} />
                ))}
              </div>
            </div>

          </div>

          {/* Legend / Info */}
          <footer className="grid grid-cols-3 gap-8 pt-8 border-t border-slate-800">
            <div className="bg-slate-900/30 p-6 rounded-2xl border border-slate-800/50">
              <div className="flex items-center gap-3 mb-3">
                <Info className="w-5 h-5 text-slate-500" />
                <p className="text-sm font-bold text-slate-300">Automated Dispatch</p>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Pallets are automatically dispatched to the shipping bay once 12 matching destination boxes are collected. Robot arms operate in parallel to minimize bottlenecking.
              </p>
            </div>
            <div className="bg-slate-900/30 p-6 rounded-2xl border border-slate-800/50">
              <div className="flex items-center gap-3 mb-3">
                <Warehouse className="w-5 h-5 text-slate-500" />
                <p className="text-sm font-bold text-slate-300">Slot Allocation</p>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Each robot manages 4 active pallet slots. New pallet assignments are prioritized based on the incoming stream density from the silo shuttles.
              </p>
            </div>
            <div className="bg-slate-900/30 p-6 rounded-2xl border border-slate-800/50">
              <div className="flex items-center gap-3 mb-3">
                <BarChart3 className="w-5 h-5 text-slate-500" />
                <p className="text-sm font-bold text-slate-300">Throughput Metrics</p>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Cycle time is measured from the receipt of the first box to the final palletization step. Current throughput tracks units per hour.
              </p>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}

function PalletCard({ p, isShipped }) {
  const progress = (p.count / PALLET_MAX) * 100;
  
  return (
    <div className={cn(
      "relative bg-slate-900/50 border-2 rounded-2xl p-6 transition-all duration-500 overflow-hidden group",
      p.status === 'empty' ? "border-slate-800 opacity-50" : 
      p.status === 'complete' ? "border-emerald-500/50 bg-emerald-500/5 shadow-[0_0_20px_rgba(16,185,129,0.1)]" : 
      "border-blue-500/30 hover:border-blue-500/50",
      isShipped && "scale-105 border-emerald-400 bg-emerald-400/20 z-10 shadow-[0_0_40px_rgba(52,211,153,0.3)]"
    )}>
      
      {/* Background Icon */}
      <Package className={cn(
        "absolute -right-4 -bottom-4 w-24 h-24 opacity-[0.03] transition-transform duration-700 group-hover:scale-110",
        p.status === 'complete' && "text-emerald-500 opacity-[0.07]",
        p.status === 'collecting' && "text-blue-500"
      )} />

      <div className="relative flex flex-col h-full gap-4">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-tighter">Slot 0{p.id}</p>
            <p className="text-sm font-mono font-bold text-slate-100 mt-1">
              {p.status === 'empty' ? 'WAITING...' : `#${p.dest.slice(-8)}`}
            </p>
          </div>
          {p.status === 'collecting' && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
          {p.status === 'complete' && <CheckCircle2 className="w-5 h-5 text-emerald-500 animate-bounce" />}
        </div>

        <div className="flex-1 space-y-3 py-2">
          <div className="flex justify-between items-end">
            <span className={cn(
              "text-[10px] font-bold uppercase",
              p.status === 'complete' ? "text-emerald-400" : "text-slate-500"
            )}>
              {p.status === 'complete' ? 'COMPLETE' : p.status === 'empty' ? 'NO ACTIVE UNIT' : 'COLLECTING BOXES'}
            </span>
            <span className="text-xs font-mono font-bold text-slate-300">{p.count} / {PALLET_MAX}</span>
          </div>

          <div className="h-3 bg-slate-950 rounded-full border border-slate-800 overflow-hidden p-0.5">
            <div 
              className={cn(
                "h-full rounded-full transition-all duration-500",
                p.status === 'complete' ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-blue-500"
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between">
           {isShipped ? (
             <div className="flex items-center gap-2 text-emerald-400 font-bold animate-in fade-in zoom-in">
               <Truck className="w-4 h-4" />
               <span className="text-xs uppercase tracking-widest">SHIPPED ✓</span>
             </div>
           ) : p.status === 'complete' ? (
             <div className="text-emerald-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                READY FOR DISPATCH <ArrowRight className="w-3 h-3" />
             </div>
           ) : p.status === 'collecting' ? (
             <div className="text-blue-500/50 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
               BUFFERING LOAD <div className="flex gap-1">
                 <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                 <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
                 <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '400ms' }} />
               </div>
             </div>
           ) : (
             <span className="text-slate-700 text-[10px] font-bold uppercase tracking-widest">AWAITING ASSIGNMENT</span>
           )}
        </div>
      </div>
    </div>
  );
}
