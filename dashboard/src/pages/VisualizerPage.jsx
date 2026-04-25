import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, Pause, RotateCcw, ChevronLeft, 
  Settings2, Activity, ListTodo, Info,
  AlertTriangle, CheckCircle2, Warehouse,
  ArrowDownLeft, ArrowUpRight
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// --- CONSTANTS ---
const AISLES = 4;
const COLUMNS = 20; 
const DEPTH = 2;
const TOTAL_SLOTS = AISLES * COLUMNS * DEPTH;

const ALGORITHMS = [
  { id: 'simple', name: 'Simple Baseline', description: 'Place in first available empty slot.' },
  { id: 'zsafe', name: 'Z-Safe Simple', description: 'Prioritize Z=1 and lower columns to keep depth clear.' },
  { id: 'column', name: 'Column Grouping', description: 'Group by column modulo to minimize cross-column travel.' },
  { id: 'pro', name: 'Z-Weighted Pro', description: 'Weighted selection: Z=1 (high score), low index (high score).' },
  { id: 'greedy', name: 'Distance Greedy', description: 'Nearest slot in same aisle. High crash risk when full.' }
];

export default function VisualizerPage() {
  const [searchParams] = useSearchParams();
  
  // State
  const [algoId, setAlgoId] = useState(searchParams.get('algo')?.toLowerCase() || 'simple');
  const [startCapacity, setStartCapacity] = useState(parseInt(searchParams.get('cap')) || 50);
  const [arrivalRate, setArrivalRate] = useState(40); // 40% arrivals, 60% retrievals
  const [grid, setGrid] = useState([]); 
  const [stats, setStats] = useState({ inbound: 0, outbound: 0, relocs: 0, crashed: false });
  const [logs, setLogs] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(5); 
  const [activeCells, setActiveCells] = useState({}); 

  const simTimer = useRef(null);

  // Initialize Warehouse
  const initWarehouse = useCallback(() => {
    const newGrid = [];
    const numFilled = Math.floor(TOTAL_SLOTS * (startCapacity / 100));
    let filled = 0;

    for (let a = 1; a <= AISLES; a++) {
      for (let c = 1; c <= COLUMNS; c++) {
        newGrid.push({ id: `${a}-${c}`, aisle: a, col: c, z1: null, z2: null });
      }
    }

    while (filled < numFilled) {
      const idx = Math.floor(Math.random() * newGrid.length);
      const cell = newGrid[idx];
      if (!cell.z1) {
        cell.z1 = { id: Math.random().toString(36).substr(2, 5) };
        filled++;
      } else if (!cell.z2) {
        cell.z2 = { id: Math.random().toString(36).substr(2, 5) };
        filled++;
      }
    }

    setGrid(newGrid);
    setStats({ inbound: 0, outbound: 0, relocs: 0, crashed: false });
    setLogs([{ type: 'info', msg: `Simulation reset. Capacity: ${startCapacity}%` }]);
    setActiveCells({});
    setIsPlaying(false);
  }, [startCapacity]);

  useEffect(() => {
    initWarehouse();
  }, [initWarehouse]);

  const addLog = (msg, type = 'info') => {
    setLogs(prev => [{ type, msg, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 50));
  };

  // PLACEMENT STRATEGIES
  const findInboundSlot = (currentGrid) => {
    const emptyZ1 = currentGrid.filter(c => !c.z1);
    const emptyZ2 = currentGrid.filter(c => c.z1 && !c.z2);
    
    if (algoId === 'zsafe' || algoId === 'pro') {
      // Prioritize Z=1, then lower columns
      if (emptyZ1.length > 0) {
        const sorted = [...emptyZ1].sort((a, b) => (a.col + a.aisle) - (b.col + b.aisle));
        return { cell: sorted[0], z: 1 };
      }
      const sortedZ2 = [...emptyZ2].sort((a, b) => a.col - b.col);
      return sortedZ2.length > 0 ? { cell: sortedZ2[0], z: 2 } : null;
    }

    if (algoId === 'column') {
      // Grouping logic mock: favor even aisles for even columns etc
      const groupMatch = emptyZ1.find(c => (c.aisle % 2 === c.col % 2));
      if (groupMatch) return { cell: groupMatch, z: 1 };
    }

    if (algoId === 'greedy') {
      // Just pick a random one in current "active" aisle if we had a shuttle concept, 
      // but here we'll just pick random empty same-aisle as last action if available.
      const lastActionAisle = 1; // mock
      const aisleSlot = emptyZ1.find(c => c.aisle === lastActionAisle) || emptyZ2.find(c => c.aisle === lastActionAisle);
      if (aisleSlot) return { cell: aisleSlot, z: aisleSlot.z1 ? 2 : 1 };
    }

    // Default Simple: random or first available
    if (emptyZ1.length > 0) return { cell: emptyZ1[0], z: 1 };
    if (emptyZ2.length > 0) return { cell: emptyZ2[0], z: 2 };
    
    return null;
  };

  // Perform one simulation tick
  const tick = useCallback(() => {
    if (stats.crashed) return;

    let newGrid = [...grid];
    let newStats = { ...stats };
    let tempActive = {};

    const isArrival = Math.random() * 100 < arrivalRate;

    if (isArrival) {
      // --- ARRIVAL LOGIC ---
      const placement = findInboundSlot(newGrid);
      if (!placement) {
        addLog("ARRIVAL FAILED: Warehouse at 100% Capacity!", "warning");
        return;
      }

      const { cell, z } = placement;
      const pallet = { id: Math.random().toString(36).substr(2, 5) };
      
      if (z === 1) cell.z1 = pallet;
      else cell.z2 = pallet;

      newStats.inbound++;
      tempActive[cell.id] = 'arrival';
      addLog(`Inbound pallet placed at ${cell.id} (Z${z})`, "success");

    } else {
      // --- RETRIEVAL LOGIC ---
      const occupied = newGrid.filter(c => c.z1 || c.z2);
      if (occupied.length === 0) return;

      const targetCell = occupied[Math.floor(Math.random() * occupied.length)];
      const targetZ = targetCell.z2 ? 2 : 1;
      tempActive[targetCell.id] = 'retrieve';

      // Check for Z-Block
      if (targetZ === 2 && targetCell.z1) {
        // Relocate Z1 box first
        const relocateSpot = findInboundSlot(newGrid.filter(c => c.id !== targetCell.id));
        if (!relocateSpot) {
          newStats.crashed = true;
          addLog(`CRASH: No relocation space for ${algoId.toUpperCase()}!`, "error");
          setStats(newStats);
          setIsPlaying(false);
          tempActive[targetCell.id] = 'error';
          setActiveCells(tempActive);
          return;
        }

        const { cell: destCell, z: destZ } = relocateSpot;
        const palletToMove = targetCell.z1;
        targetCell.z1 = null;
        if (destZ === 1) destCell.z1 = palletToMove;
        else destCell.z2 = palletToMove;

        newStats.relocs++;
        tempActive[targetCell.id] = 'relocate_src';
        tempActive[destCell.id] = 'relocate_dest';
        addLog(`Z-Block! Relocated ${targetCell.id} to ${destCell.id}`, "warning");
      }

      // Retrieve
      if (targetZ === 2) targetCell.z2 = null;
      else targetCell.z1 = null;
      newStats.outbound++;
      addLog(`Retrieved pallet from ${targetCell.id} (Z${targetZ})`, "info");
    }

    setGrid(newGrid);
    setStats(newStats);
    setActiveCells(tempActive);

    setTimeout(() => setActiveCells({}), (1000 / speed) * 0.8);

  }, [grid, stats, algoId, speed, arrivalRate]);

  // Timer loop
  useEffect(() => {
    if (isPlaying && !stats.crashed) {
      simTimer.current = setInterval(tick, 1000 / speed);
    } else {
      clearInterval(simTimer.current);
    }
    return () => clearInterval(simTimer.current);
  }, [isPlaying, speed, tick, stats.crashed]);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 font-sans p-6 flex flex-col h-screen overflow-hidden">
      
      {/* Header */}
      <header className="flex items-center justify-between mb-6 shrink-0">
        <div className="flex items-center gap-4">
          <Link to="/" className="p-2 hover:bg-slate-800 rounded-lg transition-colors border border-slate-800">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-50 flex items-center gap-2">
              <Warehouse className="w-5 h-5 text-indigo-400" />
              Live Warehouse Visualizer
            </h1>
            <p className="text-xs text-slate-500 uppercase font-bold tracking-widest mt-0.5">
              Arrivals & Retrievals (Bi-directional)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 bg-slate-900/50 border border-slate-800 rounded-xl px-6 py-2 backdrop-blur-sm">
          <div className="text-center">
            <p className="text-[10px] font-bold text-slate-500 uppercase">Inbound</p>
            <p className="text-lg font-mono font-bold text-indigo-400 leading-none mt-1">{stats.inbound}</p>
          </div>
          <div className="w-px h-8 bg-slate-800" />
          <div className="text-center">
            <p className="text-[10px] font-bold text-slate-500 uppercase">Outbound</p>
            <p className="text-lg font-mono font-bold text-slate-100 leading-none mt-1">{stats.outbound}</p>
          </div>
          <div className="w-px h-8 bg-slate-800" />
          <div className="text-center">
            <p className="text-[10px] font-bold text-slate-500 uppercase">Relocations</p>
            <p className="text-lg font-mono font-bold text-orange-400 leading-none mt-1">{stats.relocs}</p>
          </div>
          <div className="w-px h-8 bg-slate-800" />
          <div className="text-center">
            <p className="text-[10px] font-bold text-slate-500 uppercase">Occupancy</p>
            <p className={cn(
              "text-lg font-mono font-bold leading-none mt-1",
              (grid.filter(c => c.z1).length + grid.filter(c => c.z2).length) / TOTAL_SLOTS > 0.9 ? "text-rose-400" : "text-emerald-400"
            )}>
              {((grid.filter(c => c.z1).length + grid.filter(c => c.z2).length) / TOTAL_SLOTS * 100).toFixed(1)}%
            </p>
          </div>
        </div>
      </header>

      <div className="flex gap-6 flex-1 overflow-hidden">
        
        {/* Main Grid Area */}
        <div className="flex-1 bg-slate-950/50 border border-slate-800 rounded-2xl overflow-auto p-8 relative scrollbar-hide">
          <div className="grid grid-cols-20 gap-2 min-w-[1000px]">
            {grid.map((cell) => {
              const activeType = activeCells[cell.id];
              return (
                <div 
                  key={cell.id}
                  className={cn(
                    "aspect-square rounded-md border border-slate-800 flex items-center justify-center transition-all duration-200 relative",
                    !cell.z1 && "bg-slate-900/20 opacity-40",
                    cell.z1 && !cell.z2 && "bg-indigo-900/20 border-indigo-500/30",
                    cell.z1 && cell.z2 && "bg-indigo-500/20 border-indigo-500/50",
                    activeType === 'retrieve' && "bg-yellow-500/40 border-yellow-400 scale-110 z-10",
                    activeType === 'arrival' && "bg-blue-500/60 border-blue-400 scale-110 z-10",
                    activeType === 'relocate_src' && "bg-orange-500/40 border-orange-400 scale-110 z-10",
                    activeType === 'relocate_dest' && "bg-emerald-500/40 border-emerald-400 scale-110 z-10",
                    activeType === 'error' && "bg-rose-500/40 border-rose-400 scale-110 z-10"
                  )}
                >
                  {cell.z2 && <div className="w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.5)]" />}
                  {!cell.z2 && cell.z1 && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500/50" />}
                </div>
              );
            })}
          </div>
          
          {stats.crashed && (
            <div className="absolute inset-0 bg-rose-500/5 backdrop-blur-[2px] flex items-center justify-center">
              <div className="bg-rose-500 text-white px-8 py-4 rounded-xl shadow-2xl font-bold flex items-center gap-3 animate-bounce">
                <AlertTriangle className="w-6 h-6" />
                SIMULATION CRASHED: NO SPACE TO RELOCATE
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Controls */}
        <div className="w-80 flex flex-col gap-6 shrink-0 overflow-y-auto pr-2">
          
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-slate-100 font-bold text-sm">
              <Settings2 className="w-4 h-4 text-indigo-400" />
              Simulation Settings
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1.5">Algorithm</label>
                <select 
                  value={algoId} onChange={(e) => setAlgoId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500"
                >
                  {ALGORITHMS.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1.5">Starting Capacity ({startCapacity}%)</label>
                <input 
                  type="range" min="0" max="95" step="5"
                  value={startCapacity} onChange={(e) => setStartCapacity(parseInt(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1.5 flex justify-between">
                  Arrival Rate <span>{arrivalRate}%</span>
                </label>
                <input 
                  type="range" min="0" max="100" 
                  value={arrivalRate} onChange={(e) => setArrivalRate(parseInt(e.target.value))}
                  className="w-full accent-blue-500"
                />
                <div className="flex justify-between text-[8px] font-bold text-slate-600 mt-1 uppercase">
                  <span>Pure Retrieval</span>
                  <span>Pure Arrival</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setIsPlaying(!isPlaying)} disabled={stats.crashed}
                  className={cn("py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition-all", isPlaying ? "bg-slate-800" : "bg-indigo-600 text-white")}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {isPlaying ? 'Pause' : 'Start'}
                </button>
                <button onClick={initWarehouse} className="py-2 bg-slate-800 hover:bg-slate-700 rounded-lg font-bold flex items-center justify-center gap-2">
                  <RotateCcw className="w-4 h-4" /> Reset
                </button>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1.5">Speed ({speed} ticks/s)</label>
                <input 
                  type="range" min="1" max="60" value={speed} onChange={(e) => setSpeed(parseInt(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>
            </div>
          </section>

          {/* Live Log */}
          <section className="flex-1 flex flex-col overflow-hidden min-h-0">
            <div className="flex items-center gap-2 text-slate-100 font-bold text-sm mb-4">
              <ListTodo className="w-4 h-4 text-emerald-400" />
              Event Log
            </div>
            <div className="flex-1 bg-slate-950/80 border border-slate-900 rounded-xl overflow-y-auto p-4 space-y-3 font-mono text-[10px] scrollbar-hide">
              {logs.map((log, i) => (
                <div key={i} className={cn(
                  "flex gap-3 animate-in slide-in-from-right-2 duration-300",
                  log.type === 'warning' && "text-orange-400",
                  log.type === 'error' && "text-rose-400 font-bold",
                  log.type === 'success' && "text-blue-400",
                  log.type === 'info' && "text-slate-400"
                )}>
                  <span className="opacity-30 shrink-0">{log.time}</span>
                  <span className="break-words">
                    {log.msg.includes('Inbound') && <ArrowDownLeft className="w-3 h-3 inline mr-1" />}
                    {log.msg.includes('Retrieved') && <ArrowUpRight className="w-3 h-3 inline mr-1" />}
                    {log.msg}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Legend */}
          <section className="bg-slate-900/30 border border-slate-800 rounded-xl p-4 grid grid-cols-2 gap-2 text-[8px] font-bold uppercase tracking-wider">
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded bg-blue-500" /> Inbound</div>
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded bg-yellow-400" /> Outbound</div>
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded bg-orange-400" /> Relocate</div>
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded bg-emerald-400" /> Destination</div>
          </section>

        </div>

      </div>
    </div>
  );
}
