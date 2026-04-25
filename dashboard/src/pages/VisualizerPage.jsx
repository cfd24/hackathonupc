import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Play, Pause, RotateCcw, ChevronLeft, 
  Settings2, Activity, ListTodo, Info,
  AlertTriangle, CheckCircle2, Warehouse,
  ArrowDownLeft, ArrowUpRight, Cpu, 
  Layers, Navigation, Box
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// --- CONSTANTS ---
const AISLES = 4;
const SIDES = 2; // 1: Left, 2: Right
const X_POS = 60;
const Y_LEVELS = 8;
const Z_DEPTH = 2;

const ALGORITHMS = [
  { id: 'simple', name: 'Simple Baseline', description: 'Fill slots sequentially by X, Y, Z.' },
  { id: 'zsafe', name: 'Z-Safe Simple', description: 'Always fill Z=1 first before Z=2.' },
  { id: 'column', name: 'Column Grouping', description: 'Group by X-axis zones (e.g. 1-20, 21-40).' },
  { id: 'weighted', name: 'Z-Weighted Pro', description: 'Score slots: lower X and Z=1 preferred.' },
];

export default function VisualizerPage() {
  const [searchParams] = useSearchParams();
  
  // UI State
  const [activeAisle, setActiveAisle] = useState(1);
  const [activeSide, setActiveSide] = useState(1);
  const [algoId, setAlgoId] = useState(searchParams.get('algo')?.toLowerCase() || 'simple');
  const [startCapacity, setStartCapacity] = useState(parseInt(searchParams.get('cap')) || 50);
  const [arrivalRate, setArrivalRate] = useState(40);
  const [speed, setSpeed] = useState(10); 

  // Simulation State
  const [grid, setGrid] = useState({}); // Key: AISLE_SIDE_X_Y_Z
  const [shuttles, setShuttles] = useState([]); // 8 per aisle? No, architecture says 1 per Y level total? 
  // Actually, usually it's per aisle per Y level. But let's stick to 8 per ACTIVE aisle for the UI.
  const [stats, setStats] = useState({ inbound: 0, outbound: 0, relocs: 0, time: 0 });
  const [logs, setLogs] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeActions, setActiveActions] = useState({}); // highlights

  const simTimer = useRef(null);

  // Initialize
  const initWarehouse = useCallback(() => {
    const newGrid = {};
    const totalSlots = AISLES * SIDES * X_POS * Y_LEVELS * Z_DEPTH;
    const numFilled = Math.floor(totalSlots * (startCapacity / 100));
    let filled = 0;

    // Empty init
    for (let a = 1; a <= AISLES; a++) {
      for (let s = 1; s <= SIDES; s++) {
        for (let x = 1; x <= X_POS; x++) {
          for (let y = 1; y <= Y_LEVELS; y++) {
            for (let z = 1; z <= Z_DEPTH; z++) {
              newGrid[`${a}_${s}_${x}_${y}_${z}`] = null;
            }
          }
        }
      }
    }

    // Prefill
    while (filled < numFilled) {
      const a = Math.floor(Math.random() * AISLES) + 1;
      const s = Math.floor(Math.random() * SIDES) + 1;
      const x = Math.floor(Math.random() * X_POS) + 1;
      const y = Math.floor(Math.random() * Y_LEVELS) + 1;
      
      // Respect Z-rule (Z=1 must be filled for Z=2)
      if (!newGrid[`${a}_${s}_${x}_${y}_1`]) {
        newGrid[`${a}_${s}_${x}_${y}_1`] = { dest: Math.floor(Math.random() * 1000) };
        filled++;
      } else if (!newGrid[`${a}_${s}_${x}_${y}_2`]) {
        newGrid[`${a}_${s}_${x}_${y}_2`] = { dest: Math.floor(Math.random() * 1000) };
        filled++;
      }
    }

    // Initialize Shuttles (1 per Y-level for current aisle)
    const newShuttles = [];
    for (let y = 1; y <= Y_LEVELS; y++) {
      newShuttles.push({ y, x: 0, targetX: 0, state: 'idle', task: null });
    }

    setGrid(newGrid);
    setShuttles(newShuttles);
    setStats({ inbound: 0, outbound: 0, relocs: 0, time: 0 });
    setLogs([{ type: 'info', msg: `Silo initialized: 4 Aisles, 8 Levels, 60 Columns.` }]);
    setIsPlaying(false);
  }, [startCapacity]);

  useEffect(() => {
    initWarehouse();
  }, [initWarehouse]);

  const addLog = (msg, type = 'info') => {
    setLogs(prev => [{ type, msg, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 50));
  };

  // PLACEMENT STRATEGY (Simplified for visualizer)
  const findSlot = useCallback((currentGrid) => {
    // Basic search: Find empty Z=1 first, then Z=2
    for (let x = 1; x <= X_POS; x++) {
      for (let y = 1; y <= Y_LEVELS; y++) {
        for (let s = 1; s <= SIDES; s++) {
          const key1 = `${activeAisle}_${s}_${x}_${y}_1`;
          if (!currentGrid[key1]) return { s, x, y, z: 1 };
          
          const key2 = `${activeAisle}_${s}_${x}_${y}_2`;
          if (!currentGrid[key2]) return { s, x, y, z: 2 };
        }
      }
    }
    return null;
  }, [activeAisle]);

  // Simulation Tick
  const tick = useCallback(() => {
    let nextGrid = { ...grid };
    let nextShuttles = [...shuttles];
    let nextStats = { ...stats };
    let highlights = {};

    // 1. Move shuttles
    nextShuttles.forEach(s => {
      if (s.state === 'moving' || s.state === 'working') {
        if (s.x < s.targetX) s.x = Math.min(s.x + 1, s.targetX);
        else if (s.x > s.targetX) s.x = Math.max(s.x - 1, s.targetX);

        if (s.x === s.targetX) {
          // Completed movement
          if (s.state === 'working') {
            const task = s.task;
            if (task.type === 'inbound') {
              nextGrid[`${activeAisle}_${task.s}_${task.x}_${task.y}_${task.z}`] = { dest: task.dest };
              nextStats.inbound++;
              addLog(`Placed inbound at ${task.x}, Level ${task.y}`, 'success');
              highlights[`${task.x}_${task.y}`] = 'arrival';
            } else if (task.type === 'outbound') {
              nextGrid[`${activeAisle}_${task.s}_${task.x}_${task.y}_${task.z}`] = null;
              nextStats.outbound++;
              addLog(`Retrieved box from ${task.x}, Level ${task.y}`, 'info');
              highlights[`${task.x}_${task.y}`] = 'retrieve';
            }
            s.state = 'idle';
            s.task = null;
          } else {
            s.state = 'working'; // Start working at target
          }
        }
      }
    });

    // 2. Assign new tasks to idle shuttles
    nextShuttles.forEach(s => {
      if (s.state === 'idle') {
        const isArrival = Math.random() * 100 < arrivalRate;
        if (isArrival) {
          const slot = findSlot(nextGrid);
          if (slot) {
            s.state = 'moving';
            s.targetX = slot.x;
            s.task = { type: 'inbound', ...slot, dest: Math.floor(Math.random() * 1000) };
          }
        } else {
          // Find an occupied slot in this shuttle's Y level
          const occupied = [];
          for (let side = 1; side <= SIDES; side++) {
            for (let x = 1; x <= X_POS; x++) {
              if (nextGrid[`${activeAisle}_${side}_${x}_${s.y}_2`]) occupied.push({ s: side, x, y: s.y, z: 2 });
              else if (nextGrid[`${activeAisle}_${side}_${x}_${s.y}_1`]) occupied.push({ s: side, x, y: s.y, z: 1 });
            }
          }
          if (occupied.length > 0) {
            const target = occupied[Math.floor(Math.random() * occupied.length)];
            s.state = 'moving';
            s.targetX = target.x;
            s.task = { type: 'outbound', ...target };
          }
        }
      }
    });

    setGrid(nextGrid);
    setShuttles(nextShuttles);
    setStats(nextStats);
    setActiveActions(highlights);
    
    // Auto-clear highlights
    setTimeout(() => setActiveActions({}), (1000 / speed) * 0.5);

  }, [grid, shuttles, stats, arrivalRate, speed, activeAisle, findSlot]);

  useEffect(() => {
    if (isPlaying) {
      simTimer.current = setInterval(tick, 1000 / speed);
    } else {
      clearInterval(simTimer.current);
    }
    return () => clearInterval(simTimer.current);
  }, [isPlaying, speed, tick]);

  // View Helpers
  const getCellData = (x, y) => {
    const z1 = grid[`${activeAisle}_${activeSide}_${x}_${y}_1`];
    const z2 = grid[`${activeAisle}_${activeSide}_${x}_${y}_2`];
    return { z1, z2 };
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 font-sans flex flex-col h-screen overflow-hidden">
      
      {/* Header */}
      <header className="px-8 py-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-950/80 backdrop-blur-md">
        <div className="flex items-center gap-6">
          <Link to="/" className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="space-y-0.5">
            <h1 className="text-lg font-bold text-slate-50 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-400" />
              Silo Visualizer: <span className="text-indigo-400">Aisle {activeAisle}</span>
            </h1>
            <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              <span>Shuttle-per-Level Architecture</span>
              <span className="w-1 h-1 rounded-full bg-slate-700" />
              <span>Real-time X/Y/Z Logic</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-8 px-6 py-2 bg-slate-900/50 border border-slate-800 rounded-xl">
          {[
            { label: 'Inbound', val: stats.inbound, color: 'text-blue-400' },
            { label: 'Outbound', val: stats.outbound, color: 'text-slate-100' },
            { label: 'Relocs', val: stats.relocs, color: 'text-orange-400' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className="text-[10px] font-bold text-slate-500 uppercase">{s.label}</p>
              <p className={cn("text-xl font-mono font-bold leading-none mt-1", s.color)}>{s.val}</p>
            </div>
          ))}
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        
        {/* Sidebar Left: Navigation & Controls */}
        <aside className="w-80 border-r border-slate-800 flex flex-col p-6 space-y-8 bg-slate-950/50 shrink-0">
          
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <Navigation className="w-4 h-4" /> Navigation
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[1,2,3,4].map(a => (
                <button 
                  key={a}
                  onClick={() => setActiveAisle(a)}
                  className={cn(
                    "py-2 rounded-lg font-bold text-sm border transition-all",
                    activeAisle === a ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "bg-slate-900 border-slate-800 hover:border-slate-700"
                  )}
                >
                  A{a}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[1,2].map(s => (
                <button 
                  key={s}
                  onClick={() => setActiveSide(s)}
                  className={cn(
                    "py-2 rounded-lg font-bold text-xs border transition-all uppercase",
                    activeSide === s ? "bg-slate-700 border-slate-600 text-white" : "bg-slate-900 border-slate-800"
                  )}
                >
                  {s === 1 ? 'Left Side' : 'Right Side'}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-6">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <Settings2 className="w-4 h-4" /> Control Center
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={cn("py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95", isPlaying ? "bg-slate-800" : "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20")}
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  {isPlaying ? 'Pause' : 'Start'}
                </button>
                <button onClick={initWarehouse} className="py-3 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95">
                  <RotateCcw className="w-5 h-5" />
                </button>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2 flex justify-between">
                  Sim Speed <span>{speed}x</span>
                </label>
                <input type="range" min="1" max="100" value={speed} onChange={e => setSpeed(parseInt(e.target.value))} className="w-full accent-indigo-500" />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2 flex justify-between">
                  Arrival Rate <span>{arrivalRate}%</span>
                </label>
                <input type="range" min="0" max="100" value={arrivalRate} onChange={e => setArrivalRate(parseInt(e.target.value))} className="w-full accent-blue-500" />
              </div>
            </div>
          </section>

          <section className="flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
              <ListTodo className="w-4 h-4" /> Activity Feed
            </div>
            <div className="flex-1 bg-slate-950 border border-slate-900 rounded-xl p-4 overflow-y-auto space-y-3 scrollbar-hide font-mono text-[10px]">
              {logs.map((l, i) => (
                <div key={i} className={cn("flex gap-2 animate-in slide-in-from-right-2 duration-300", l.type === 'success' ? 'text-blue-400' : l.type === 'warning' ? 'text-orange-400' : 'text-slate-500')}>
                  <span className="opacity-30">{l.time}</span>
                  <span>{l.msg}</span>
                </div>
              ))}
            </div>
          </section>
        </aside>

        {/* Main Content: Side View Grid */}
        <main className="flex-1 p-8 overflow-hidden flex flex-col bg-slate-950">
          <div className="flex-1 relative border border-slate-800 rounded-3xl overflow-auto bg-slate-900/20 backdrop-blur-sm p-8 scrollbar-hide">
            
            {/* Coordinate Axis Labels */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-700 uppercase tracking-[0.5em]">Length (X-Position 1-60)</div>
            <div className="absolute left-2 top-1/2 -rotate-90 origin-left -translate-y-1/2 text-[10px] font-bold text-slate-700 uppercase tracking-[0.5em]">Height (Y-Level 1-8)</div>

            <div className="inline-grid gap-y-2 select-none" style={{ gridTemplateColumns: '60px repeat(60, 40px)' }}>
              
              {/* Grid Rows (Y-Levels) */}
              {Array.from({ length: Y_LEVELS }).map((_, yIdx) => {
                const y = Y_LEVELS - yIdx; // Show Y=8 at top
                const shuttle = shuttles.find(s => s.y === y);
                
                return (
                  <React.Fragment key={y}>
                    {/* Y-Label */}
                    <div className="flex items-center justify-center font-bold text-xs text-slate-600 border-r border-slate-800 mr-4">L{y}</div>
                    
                    {/* Columns (X-Positions) */}
                    {Array.from({ length: X_POS }).map((_, xIdx) => {
                      const x = xIdx + 1;
                      const { z1, z2 } = getCellData(x, y);
                      const action = activeActions[`${x}_${y}`];
                      const isShuttleHere = shuttle && Math.floor(shuttle.x) === x;

                      return (
                        <div 
                          key={`${x}_${y}`}
                          className={cn(
                            "w-8 h-10 border border-slate-800/50 rounded-sm relative transition-all duration-300",
                            !z1 && "bg-slate-900/10",
                            z1 && !z2 && "bg-indigo-900/20",
                            z1 && z2 && "bg-indigo-500/30 shadow-[inset_0_0_10px_rgba(99,102,241,0.2)]",
                            action === 'arrival' && "bg-blue-500/60 border-blue-400 scale-110 z-10",
                            action === 'retrieve' && "bg-yellow-500/60 border-yellow-400 scale-110 z-10",
                            isShuttleHere && "ring-2 ring-indigo-400/50 ring-offset-2 ring-offset-slate-950"
                          )}
                        >
                          {/* Z-Depth Indicator */}
                          {z1 && <div className={cn("absolute bottom-1 left-1 right-1 h-2 rounded-full", z2 ? "bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.5)]" : "bg-indigo-500/30")} />}
                          
                          {/* Shuttle Overlay */}
                          {isShuttleHere && (
                            <div className="absolute -top-1 -left-1 -right-1 -bottom-1 border-2 border-indigo-400 rounded-md bg-indigo-400/20 flex items-center justify-center animate-pulse z-20">
                              <Box className="w-3 h-3 text-white" />
                            </div>
                          )}

                          {/* X-Coordinate Tooltip (Hover) */}
                          <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 hover:opacity-100 bg-slate-800 text-[8px] font-bold px-1 rounded transition-opacity pointer-events-none">X{x}</div>
                        </div>
                      );
                    })}
                  </React.Fragment>
                );
              })}

              {/* X-Axis Footer Labels */}
              <div /> {/* Spacer for Y-labels column */}
              {Array.from({ length: X_POS }).map((_, i) => (
                <div key={i} className="text-[8px] font-bold text-slate-700 text-center mt-2">{i+1}</div>
              ))}
            </div>
          </div>

          {/* Visual Legend */}
          <footer className="mt-6 flex items-center justify-center gap-12 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-900/30 py-4 rounded-2xl border border-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-sm bg-indigo-900/40 border border-indigo-500/30" />
              <span>Front Occupied (Z=1)</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-sm bg-indigo-500/60 shadow-[0_0_8px_rgba(99,102,241,0.4)]" />
              <span>Double Stack (Z=2)</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-4 border-2 border-indigo-400 rounded-sm bg-indigo-400/20" />
              <span>Active Shuttle</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-sm bg-blue-500/60" />
              <span>Inbound Action</span>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
