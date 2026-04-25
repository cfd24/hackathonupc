import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Play, Pause, RotateCcw, ChevronLeft, 
  Settings2, Activity, ListTodo, Info,
  AlertTriangle, CheckCircle2, Warehouse,
  ArrowDownLeft, ArrowUpRight, Cpu, 
  Layers, Navigation, Box, Maximize2, Minimize2,
  Timer, BarChart3, Crosshair, X, ArrowUp, ArrowDown,
  Eye, EyeOff
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// --- CONSTANTS ---
const AISLES = 4;
const SIDES = 2; 
const X_POS = 60;
const Y_LEVELS = 8;
const Z_DEPTH = 2;

export default function VisualizerPage() {
  const [searchParams] = useSearchParams();
  
  // UI State
  const [activeAisle, setActiveAisle] = useState(1);
  const [activeSide, setActiveSide] = useState(1);
  const [algoId, setAlgoId] = useState(searchParams.get('algo')?.toLowerCase() || 'simple');
  const [startCapacity, setStartCapacity] = useState(parseInt(searchParams.get('cap')) || 50);
  const [arrivalRate, setArrivalRate] = useState(40);
  const [speed, setSpeed] = useState(10); 
  const [focusedShuttleY, setFocusedShuttleY] = useState(null);
  const [followShuttle, setFollowShuttle] = useState(true);

  // Simulation State
  const [grid, setGrid] = useState({}); 
  const [shuttles, setShuttles] = useState([]); 
  const [stats, setStats] = useState({ inbound: 0, outbound: 0, relocs: 0 });
  const [logs, setLogs] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeActions, setActiveActions] = useState({}); 

  const simTimer = useRef(null);
  const lastLogRef = useRef(null);
  const scrollContainerRef = useRef(null);

  // Initialize
  const initWarehouse = useCallback(() => {
    const newGrid = {};
    const totalSlots = AISLES * SIDES * X_POS * Y_LEVELS * Z_DEPTH;
    const numFilled = Math.floor(totalSlots * (startCapacity / 100));
    let filled = 0;

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

    while (filled < numFilled) {
      const a = Math.floor(Math.random() * AISLES) + 1;
      const s = Math.floor(Math.random() * SIDES) + 1;
      const x = Math.floor(Math.random() * X_POS) + 1;
      const y = Math.floor(Math.random() * Y_LEVELS) + 1;
      if (!newGrid[`${a}_${s}_${x}_${y}_1`]) {
        newGrid[`${a}_${s}_${x}_${y}_1`] = { dest: Math.floor(1000 + Math.random() * 9000).toString() };
        filled++;
      } else if (!newGrid[`${a}_${s}_${x}_${y}_2`]) {
        newGrid[`${a}_${s}_${x}_${y}_2`] = { dest: Math.floor(1000 + Math.random() * 9000).toString() };
        filled++;
      }
    }

    const newShuttles = [];
    for (let y = 1; y <= Y_LEVELS; y++) {
      newShuttles.push({ 
        y, x: 0, targetX: 0, state: 'idle', task: null,
        stats: { inbound: 0, outbound: 0, relocs: 0 },
        queue: []
      });
    }

    setGrid(newGrid);
    setShuttles(newShuttles);
    setStats({ inbound: 0, outbound: 0, relocs: 0 });
    setLogs([{ type: 'info', msg: `Silo architecture synchronized: 8 shuttle controllers online.` }]);
    setFocusedShuttleY(null);
    setIsPlaying(false);
  }, [startCapacity]);

  useEffect(() => {
    initWarehouse();
  }, [initWarehouse]);

  const addLog = useCallback((msg, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const logKey = `${timestamp}-${msg}`;
    if (lastLogRef.current === logKey) return;
    lastLogRef.current = logKey;
    setLogs(prev => [{ type, msg, time: timestamp }, ...prev].slice(0, 50));
  }, []);

  const findSlot = useCallback((currentGrid) => {
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

  const tick = useCallback(() => {
    let nextGrid = { ...grid };
    let nextShuttles = [...shuttles];
    let nextStats = { ...stats };
    let highlights = {};

    nextShuttles.forEach(s => {
      if (s.state === 'moving' || s.state === 'working') {
        const step = speed / 10;
        if (s.x < s.targetX) s.x = Math.min(s.x + step, s.targetX);
        else if (s.x > s.targetX) s.x = Math.max(s.x - step, s.targetX);

        if (Math.abs(s.x - s.targetX) < 0.1) {
          s.x = s.targetX;
          if (s.state === 'working') {
            const task = s.task;
            if (task.type === 'inbound') {
              nextGrid[`${activeAisle}_${task.s}_${task.x}_${task.y}_${task.z}`] = { dest: task.dest };
              nextStats.inbound++;
              s.stats.inbound++;
              addLog(`Placed inbound box ${task.dest} at X:${task.x} L:${task.y} S:${task.s}`, 'success');
              highlights[`${task.s}_${task.x}_${task.y}`] = 'arrival';
            } else if (task.type === 'outbound') {
              nextGrid[`${activeAisle}_${task.s}_${task.x}_${task.y}_${task.z}`] = null;
              nextStats.outbound++;
              s.stats.outbound++;
              addLog(`Retrieved box from X:${task.x} L:${task.y} S:${task.s}`, 'info');
              highlights[`${task.s}_${task.x}_${task.y}`] = 'retrieve';
            }
            s.state = 'idle';
            s.task = null;
            if (s.queue.length > 0) s.queue.shift();
          } else {
            s.state = 'working';
          }
        }
      }

      if (s.state === 'idle') {
        const isArrival = Math.random() * 100 < arrivalRate;
        if (isArrival) {
          const slot = findSlot(nextGrid);
          if (slot) {
            s.state = 'moving';
            s.targetX = slot.x;
            s.task = { type: 'inbound', ...slot, dest: Math.floor(1000 + Math.random() * 9000).toString() };
          }
        } else {
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

        while (s.queue.length < 3) {
          s.queue.push({ 
            type: Math.random() > 0.5 ? 'STORE' : 'RETRIEVE',
            x: Math.floor(Math.random() * 60) + 1,
            s: Math.random() > 0.5 ? 'L' : 'R'
          });
        }
      }
    });

    setGrid(nextGrid);
    setShuttles(nextShuttles);
    setStats(nextStats);
    setActiveActions(highlights);
    setTimeout(() => setActiveActions({}), 400);

  }, [grid, shuttles, stats, arrivalRate, speed, activeAisle, findSlot, addLog]);

  useEffect(() => {
    if (isPlaying) { simTimer.current = setInterval(tick, 100); }
    else { clearInterval(simTimer.current); }
    return () => clearInterval(simTimer.current);
  }, [isPlaying, tick]);

  const focusedShuttle = useMemo(() => shuttles.find(s => s.y === focusedShuttleY), [shuttles, focusedShuttleY]);

  // FOLLOW SHUTTLE LOGIC
  useEffect(() => {
    if (followShuttle && focusedShuttle && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const cellWidth = 150;
      const targetScroll = (focusedShuttle.x - 1) * cellWidth - (container.clientWidth / 2) + (cellWidth / 2);
      container.scrollTo({ left: targetScroll, behavior: 'smooth' });
    }
  }, [focusedShuttle?.x, followShuttle]);

  const getCellData = (x, y, side) => {
    const z1 = grid[`${activeAisle}_${side}_${x}_${y}_1`];
    const z2 = grid[`${activeAisle}_${side}_${x}_${y}_2`];
    return { z1, z2 };
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 font-sans flex flex-col h-screen overflow-hidden">
      
      {/* Header */}
      <header className="px-8 py-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-950/80 backdrop-blur-md z-30">
        <div className="flex items-center gap-6">
          <Link to="/" className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400"><ChevronLeft className="w-5 h-5" /></Link>
          <div className="space-y-0.5">
            <h1 className="text-lg font-bold text-slate-50 flex items-center gap-2"><Layers className="w-5 h-5 text-indigo-400" />Silo Visualizer: <span className="text-indigo-400">Aisle {activeAisle}</span></h1>
            <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              <span>{focusedShuttleY ? `Focused Level ${focusedShuttleY}` : 'Global Monitor'}</span>
              <span className="w-1 h-1 rounded-full bg-slate-700" />
              <span>{shuttles.length} Shuttles Active</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-8 px-6 py-2 bg-slate-900/50 border border-slate-800 rounded-xl">
          {[{ label: 'Inbound', val: stats.inbound, color: 'text-indigo-400' }, { label: 'Outbound', val: stats.outbound, color: 'text-slate-100' }, { label: 'Relocs', val: stats.relocs, color: 'text-orange-400' }].map(s => (
            <div key={s.label} className="text-center"><p className="text-[10px] font-bold text-slate-500 uppercase">{s.label}</p><p className={cn("text-xl font-mono font-bold leading-none mt-1", s.color)}>{s.val}</p></div>
          ))}
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Sidebar */}
        <aside className="w-80 border-r border-slate-800 flex flex-col p-6 space-y-8 bg-slate-950/50 shrink-0 z-20">
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider"><Navigation className="w-4 h-4" /> Navigation</div>
            <div className="grid grid-cols-4 gap-2">
              {[1,2,3,4].map(a => (
                <button key={a} onClick={() => setActiveAisle(a)} className={cn("py-2 rounded-lg font-bold text-sm border transition-all", activeAisle === a ? "bg-indigo-600 border-indigo-500 text-white" : "bg-slate-900 border-slate-800")}>A{a}</button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[1,2].map(s => (
                <button 
                  key={s} onClick={() => setActiveSide(s)} disabled={focusedShuttleY !== null}
                  className={cn("py-2 rounded-lg font-bold text-xs border transition-all uppercase", activeSide === s ? "bg-slate-700 border-slate-600 text-white" : "bg-slate-900 border-slate-800", focusedShuttleY !== null && "opacity-30 cursor-not-allowed")}
                >{s === 1 ? 'Left Side' : 'Right Side'}</button>
              ))}
            </div>
          </section>

          <section className="space-y-6">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider"><Settings2 className="w-4 h-4" /> Operations</div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setIsPlaying(!isPlaying)} className={cn("py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95", isPlaying ? "bg-slate-800" : "bg-indigo-600 text-white")}>
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />} {isPlaying ? 'Pause' : 'Start'}
                </button>
                <button onClick={initWarehouse} className="py-3 bg-slate-900 border border-slate-800 rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95"><RotateCcw className="w-5 h-5" /></button>
              </div>
              <div><label className="text-[10px] font-bold text-slate-500 uppercase block mb-2 flex justify-between">Speed <span>{speed}x</span></label><input type="range" min="1" max="100" value={speed} onChange={e => setSpeed(parseInt(e.target.value))} className="w-full accent-indigo-500" /></div>
            </div>
          </section>

          <section className="flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-4"><ListTodo className="w-4 h-4" /> Event Feed</div>
            <div className="flex-1 bg-slate-950 border border-slate-900 rounded-xl p-4 overflow-y-auto space-y-3 font-mono text-[10px] scrollbar-hide">
              {logs.map((l, i) => (
                <div key={i} className={cn("flex gap-2 animate-in slide-in-from-right-2", l.type === 'success' ? 'text-indigo-400' : l.type === 'warning' ? 'text-orange-400' : 'text-slate-500')}>
                  <span className="opacity-30 shrink-0">{l.time}</span><span>{l.msg}</span>
                </div>
              ))}
            </div>
          </section>
        </aside>

        {/* Main Viewport */}
        <main className="flex-1 p-8 bg-slate-950 relative overflow-hidden flex flex-col">
          
          {/* FOCUS MODE OVERLAY */}
          {focusedShuttleY !== null && focusedShuttle && (
            <div className="absolute inset-0 bg-[#020617]/98 z-40 p-8 flex flex-col animate-in fade-in duration-300 overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20"><Maximize2 className="w-6 h-6 text-indigo-400" /></div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-50">Shuttle Focus: Level {focusedShuttleY}</h2>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Dual-Side Unified Operations</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setFollowShuttle(!followShuttle)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-all border",
                      followShuttle ? "bg-indigo-600 border-indigo-500 text-white" : "bg-slate-900 border-slate-800 text-slate-400"
                    )}
                  >
                    {followShuttle ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    {followShuttle ? 'Following Shuttle' : 'Free Scroll'}
                  </button>
                  <button onClick={() => setFocusedShuttleY(null)} className="p-3 hover:bg-slate-800 rounded-full text-slate-400 transition-colors"><X className="w-6 h-6" /></button>
                </div>
              </div>

              {/* DUAL SIDE VIEW ROW (Scrollable) */}
              <div ref={scrollContainerRef} className="flex-1 overflow-x-auto scrollbar-hide py-12 px-12 scroll-smooth">
                {/* 
                   IMPORTANT FIX: 
                   The inline-grid must not have justify-center or similar. 
                   We use min-width to ensure the scroll area is respected.
                */}
                <div className="inline-grid gap-y-0 min-w-max" style={{ gridTemplateColumns: 'repeat(60, 150px)' }}>
                  
                  {/* LEFT SIDE (TOP) */}
                  <div className="col-span-full text-[10px] font-bold text-indigo-400 mb-2 uppercase tracking-widest">Left Side (01)</div>
                  {Array.from({ length: X_POS }).map((_, xIdx) => {
                    const x = xIdx + 1;
                    const { z1, z2 } = getCellData(x, focusedShuttleY, 1);
                    const action = activeActions[`1_${x}_${focusedShuttleY}`];
                    return (
                      <div key={`L${x}`} className={cn("h-40 border border-slate-800/50 flex transition-all duration-300", action === 'arrival' && "bg-blue-500/20", action === 'retrieve' && "bg-yellow-500/20")}>
                        <div className={cn("flex-1 border-r border-slate-800/20 p-2 flex flex-col items-center justify-center gap-1", z1 ? "bg-indigo-900/10" : "opacity-10")}>
                          <span className="text-[8px] font-bold text-slate-700">Z1</span>
                          {z1 ? <><Box className="w-5 h-5 text-indigo-400" /><span className="text-[9px] font-mono font-bold text-indigo-300">#{z1.dest.slice(-4)}</span></> : <div className="w-4 h-4 border border-dashed border-slate-800 rounded-sm" />}
                        </div>
                        <div className={cn("flex-1 p-2 flex flex-col items-center justify-center gap-1", z2 ? "bg-indigo-500/10" : "opacity-10")}>
                          <span className="text-[8px] font-bold text-slate-700">Z2</span>
                          {z2 ? <><Box className="w-5 h-5 text-indigo-300" /><span className="text-[9px] font-mono font-bold text-indigo-200">#{z2.dest.slice(-4)}</span></> : <div className="w-4 h-4 border border-dashed border-slate-800 rounded-sm" />}
                        </div>
                      </div>
                    );
                  })}

                  {/* SHUTTLE CORRIDOR (MIDDLE) */}
                  <div className="col-span-full h-24 bg-slate-900/30 border-y border-slate-800 my-2 relative overflow-visible">
                    <div className="absolute inset-0 opacity-10 pointer-events-none flex items-center justify-center text-[40px] font-bold uppercase tracking-[1em] text-slate-500">Shuttle Track</div>
                    <div 
                      className="absolute top-1/2 -translate-y-1/2 transition-all duration-100 flex items-center justify-center"
                      style={{ left: `${(focusedShuttle.x - 1) * 150 + 75}px`, transform: 'translate(-50%, -50%)' }}
                    >
                      <div className={cn(
                        "w-16 h-16 bg-indigo-600 rounded-xl shadow-2xl flex items-center justify-center relative transition-transform duration-300",
                        focusedShuttle.state === 'working' && focusedShuttle.task?.s === 1 && "-translate-y-6",
                        focusedShuttle.state === 'working' && focusedShuttle.task?.s === 2 && "translate-y-6"
                      )}>
                        <Cpu className="w-8 h-8 text-white" />
                        {focusedShuttle.state === 'working' && focusedShuttle.task?.s === 1 && <ArrowUp className="absolute -top-4 w-4 h-4 text-indigo-400 animate-bounce" />}
                        {focusedShuttle.state === 'working' && focusedShuttle.task?.s === 2 && <ArrowDown className="absolute -bottom-4 w-4 h-4 text-indigo-400 animate-bounce" />}
                        <div className="absolute -bottom-8 bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">X:{focusedShuttle.x.toFixed(1)}</div>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT SIDE (BOTTOM) */}
                  <div className="col-span-full text-[10px] font-bold text-indigo-400 mb-2 mt-4 uppercase tracking-widest">Right Side (02)</div>
                  {Array.from({ length: X_POS }).map((_, xIdx) => {
                    const x = xIdx + 1;
                    const { z1, z2 } = getCellData(x, focusedShuttleY, 2);
                    const action = activeActions[`2_${x}_${focusedShuttleY}`];
                    return (
                      <div key={`R${x}`} className={cn("h-40 border border-slate-800/50 flex transition-all duration-300", action === 'arrival' && "bg-blue-500/20", action === 'retrieve' && "bg-yellow-500/20")}>
                        <div className={cn("flex-1 border-r border-slate-800/20 p-2 flex flex-col items-center justify-center gap-1", z1 ? "bg-indigo-900/10" : "opacity-10")}>
                          <span className="text-[8px] font-bold text-slate-700">Z1</span>
                          {z1 ? <><Box className="w-5 h-5 text-indigo-400" /><span className="text-[9px] font-mono font-bold text-indigo-300">#{z1.dest.slice(-4)}</span></> : <div className="w-4 h-4 border border-dashed border-slate-800 rounded-sm" />}
                        </div>
                        <div className={cn("flex-1 p-2 flex flex-col items-center justify-center gap-1", z2 ? "bg-indigo-500/10" : "opacity-10")}>
                          <span className="text-[8px] font-bold text-slate-700">Z2</span>
                          {z2 ? <><Box className="w-5 h-5 text-indigo-300" /><span className="text-[9px] font-mono font-bold text-indigo-200">#{z2.dest.slice(-4)}</span></> : <div className="w-4 h-4 border border-dashed border-slate-800 rounded-sm" />}
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* X-LABELS FOOTER */}
                  <div className="col-span-full flex pt-4">
                    {Array.from({ length: X_POS }).map((_, i) => (
                      <div key={i} className="w-[150px] text-center text-[10px] font-bold text-slate-700">X{i+1}</div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Status Panel */}
              <div className="grid grid-cols-4 gap-8 bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shrink-0">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase"><Crosshair className="w-4 h-4" /> Telemetry</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800"><p className="text-[10px] text-slate-500 font-bold uppercase">X-Pos</p><p className="text-xl font-mono font-bold text-slate-100">{focusedShuttle.x.toFixed(1)}</p></div>
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800"><p className="text-[10px] text-slate-500 font-bold uppercase">Status</p><p className="text-[10px] font-bold uppercase mt-1 text-indigo-400">{focusedShuttle.state}</p></div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase"><Timer className="w-4 h-4" /> Current Task</div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 h-20 flex items-center justify-center text-center">
                    <p className="text-[11px] font-bold text-slate-300">{focusedShuttle.task ? `${focusedShuttle.task.type.toUpperCase()} @ X:${focusedShuttle.task.x} (S:${focusedShuttle.task.s === 1 ? 'L' : 'R'})` : 'Awaiting Task...'}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase"><ListTodo className="w-4 h-4" /> Next Operations</div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col gap-1">
                    {focusedShuttle.queue.map((q, i) => (<div key={i} className="text-[9px] font-bold text-indigo-400/70 uppercase">{q.type} @ X:{q.x} {q.s}</div>))}
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase"><BarChart3 className="w-4 h-4" /> Performance</div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 grid grid-cols-3 gap-1 text-center">
                    <div><p className="text-[8px] text-slate-500 font-bold uppercase">In</p><p className="text-md font-bold text-indigo-400">{focusedShuttle.stats.inbound}</p></div>
                    <div><p className="text-[8px] text-slate-500 font-bold uppercase">Out</p><p className="text-md font-bold text-slate-100">{focusedShuttle.stats.outbound}</p></div>
                    <div><p className="text-[8px] text-slate-500 font-bold uppercase">Rel</p><p className="text-md font-bold text-orange-400">{focusedShuttle.stats.relocs}</p></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MAIN GRID VIEW */}
          <div className="flex-1 relative border border-slate-800 rounded-3xl overflow-auto bg-slate-900/20 backdrop-blur-sm p-8 scrollbar-hide">
            <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-700 uppercase tracking-[0.5em]">Length (X-Position 1-60)</div>
            <div className="absolute left-2 top-1/2 -rotate-90 origin-left -translate-y-1/2 text-[10px] font-bold text-slate-700 uppercase tracking-[0.5em]">Height (Y-Level 1-8)</div>
            <div className="inline-grid gap-y-2 select-none min-w-max" style={{ gridTemplateColumns: '80px repeat(60, 42px)' }}>
              {Array.from({ length: Y_LEVELS }).map((_, yIdx) => {
                const y = Y_LEVELS - yIdx; const shuttle = shuttles.find(s => s.y === y);
                return (
                  <React.Fragment key={y}>
                    <div onClick={() => setFocusedShuttleY(y)} className="flex items-center justify-between font-bold text-xs text-slate-500 border-r border-slate-800 mr-4 px-2 hover:bg-indigo-500/10 cursor-pointer group rounded-l-lg transition-all"><span>L{y}</span><Maximize2 className="w-3 h-3 opacity-0 group-hover:opacity-100 text-indigo-400" /></div>
                    {Array.from({ length: X_POS }).map((_, xIdx) => {
                      const x = xIdx + 1; const { z1, z2 } = getCellData(x, y, activeSide);
                      const action = activeActions[`${activeSide}_${x}_${y}`]; const isShuttleHere = shuttle && Math.floor(shuttle.x) === x;
                      return (
                        <div key={`${x}_${y}`} className={cn("w-8 h-10 border border-slate-800/50 rounded-sm relative transition-all duration-300", !z1 && "bg-slate-900/10", z1 && !z2 && "bg-indigo-900/20", z1 && z2 && "bg-indigo-500/30", action === 'arrival' && "bg-blue-500/60 border-blue-400 scale-110 z-10", action === 'retrieve' && "bg-yellow-500/60 border-yellow-400 scale-110 z-10", isShuttleHere && "ring-2 ring-indigo-400/50 ring-offset-2 ring-offset-slate-950")}>
                          {z1 && <div className={cn("absolute bottom-1 left-1 right-1 h-2 rounded-full", z2 ? "bg-indigo-400" : "bg-indigo-500/30")} />}
                          {isShuttleHere && (<div onClick={() => setFocusedShuttleY(y)} className="absolute -top-1 -left-1 -right-1 -bottom-1 border-2 border-indigo-400 rounded-md bg-indigo-400/20 flex items-center justify-center animate-pulse z-20 cursor-pointer hover:bg-indigo-400/40"><Box className="w-3 h-3 text-white" /></div>)}
                        </div>
                      );
                    })}
                  </React.Fragment>
                );
              })}
              <div /> {Array.from({ length: X_POS }).map((_, i) => (<div key={i} className="text-[8px] font-bold text-slate-700 text-center mt-2">{i+1}</div>))}
            </div>
          </div>
          <footer className="mt-6 flex items-center justify-center gap-12 text-[10px] font-bold text-slate-500 uppercase bg-slate-900/30 py-4 rounded-2xl border border-slate-800/50 shrink-0"><div className="flex items-center gap-3"><div className="w-3 h-3 rounded-sm bg-indigo-900/40 border border-indigo-500/30" /> Z1 Occupied</div><div className="flex items-center gap-3"><div className="w-3 h-3 rounded-sm bg-indigo-500/60 shadow-[0_0_8px_rgba(99,102,241,0.4)]" /> Z2 Occupied</div><div className="flex items-center gap-3"><div className="w-3 h-4 border-2 border-indigo-400 rounded-sm bg-indigo-400/20" /> Shuttle (Click to Focus)</div></footer>
        </main>
      </div>
    </div>
  );
}
