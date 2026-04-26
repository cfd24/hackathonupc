import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Play, Pause, RotateCcw, ChevronLeft, 
  Settings2, Activity, ListTodo, Info,
  AlertTriangle, CheckCircle2, Warehouse,
  ArrowDownLeft, ArrowUpRight, Cpu, 
  Layers, Navigation, Box, Maximize2, Minimize2,
  Timer, BarChart3, Crosshair, X, ArrowUp, ArrowDown,
  Eye, EyeOff, Loader2, Package, LayoutDashboard, Database
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
const TICKS_PER_SEC = 10; 

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
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  const [isDebugMode, setIsDebugMode] = useState(false);
  const [isPalletizerOpen, setIsPalletizerOpen] = useState(true);
  const [palletSlots, setPalletSlots] = useState(
    Array.from({ length: 8 }).map((_, i) => ({ 
      id: i, destination: null, count: 0, status: 'idle', lastShipped: 0 
    }))
  );

  // Simulation State
  const [grid, setGrid] = useState({}); 
  const [shuttles, setShuttles] = useState([]); 
  const [stats, setStats] = useState({ inbound: 0, outbound: 0, relocs: 0 });
  const [logs, setLogs] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeActions, setActiveActions] = useState({}); 
  const [algoState, setAlgoState] = useState({}); // For Column Grouping etc.

  const simTimer = useRef(null);
  const lastLogRef = useRef(null);
  const scrollContainerRef = useRef(null);

  // Initialize
  const initWarehouse = useCallback(() => {
    const curX = isDebugMode ? 5 : X_POS;
    const curY = isDebugMode ? 3 : Y_LEVELS;
    const curA = isDebugMode ? 1 : AISLES;
    const curS = isDebugMode ? 1 : SIDES;

    const newGrid = {};
    for (let a = 1; a <= curA; a++) {
      for (let s = 1; s <= curS; s++) {
        for (let x = 1; x <= curX; x++) {
          for (let y = 1; y <= curY; y++) {
            for (let z = 1; z <= Z_DEPTH; z++) {
              newGrid[`${a}_${s}_${x}_${y}_${z}`] = null;
            }
          }
        }
      }
    }

    const totalSlots = curA * curS * curX * curY * Z_DEPTH;
    const numFilled = Math.floor(totalSlots * (startCapacity / 100));
    const dests = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
    
    let filled = 0;
    while (filled < numFilled) {
      const a = Math.floor(Math.random() * curA) + 1;
      const s = Math.floor(Math.random() * curS) + 1;
      const x = Math.floor(Math.random() * curX) + 1;
      const y = Math.floor(Math.random() * curY) + 1;
      const dest = dests[Math.floor(Math.random() * dests.length)];
      
      if (!newGrid[`${a}_${s}_${x}_${y}_1`]) {
        newGrid[`${a}_${s}_${x}_${y}_1`] = { 
          id: Math.floor(1000 + Math.random() * 9000).toString(),
          destination: `DEST_${dest}`
        };
        filled++;
      } else if (!newGrid[`${a}_${s}_${x}_${y}_2`]) {
        newGrid[`${a}_${s}_${x}_${y}_2`] = { 
          id: Math.floor(1000 + Math.random() * 9000).toString(),
          destination: `DEST_${dest}`
        };
        filled++;
      }
    }

    const newShuttles = [];
    for (let y = 1; y <= curY; y++) {
      newShuttles.push({ 
        y, x: 0, targetX: 0, state: 'idle', subState: 'ready', task: null,
        heldBox: null,
        handlingTicks: 0,
        stats: { inbound: 0, outbound: 0, relocs: 0 },
        queue: []
      });
    }

    setGrid(newGrid);
    setShuttles(newShuttles);
    setStats({ inbound: 0, outbound: 0, relocs: 0 });
    setLogs([{ type: 'info', msg: `Simulation environment initialized. ${isDebugMode ? 'DEBUG MODE ACTIVE: 5x3 Warehouse.' : 'Precise shuttle contextual telemetry enabled.'}` }]);
    setFocusedShuttleY(null);
    setIsPlaying(false);
  }, [startCapacity, isDebugMode]);

  useEffect(() => { initWarehouse(); }, [initWarehouse]);

  // Pallet Auto-Reset
  useEffect(() => {
    const timer = setInterval(() => {
      setPalletSlots(prev => prev.map(slot => {
        if (slot.status === 'shipped' && Date.now() - slot.lastShipped > 2000) {
          return { ...slot, destination: null, count: 0, status: 'idle', lastShipped: 0 };
        }
        return slot;
      }));
    }, 500);
    return () => clearInterval(timer);
  }, []);

  const addLog = useCallback((msg, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const logKey = `${timestamp}-${msg}`;
    if (lastLogRef.current === logKey) return;
    lastLogRef.current = logKey;
    setLogs(prev => [{ type, msg, time: timestamp }, ...prev].slice(0, 50));
  }, []);

  const findSlotSimple = useCallback((currentGrid, aisle) => {
    const curX = isDebugMode ? 5 : X_POS;
    const curY = isDebugMode ? 3 : Y_LEVELS;
    const curS = isDebugMode ? 1 : SIDES;

    for (let x = 1; x <= curX; x++) {
      for (let y = 1; y <= curY; y++) {
        for (let side = 1; side <= curS; side++) {
          for (let z = 1; z <= Z_DEPTH; z++) {
            if (!currentGrid[`${aisle}_${side}_${x}_${y}_${z}`]) {
              if (z === 2 && !currentGrid[`${aisle}_${side}_${x}_${y}_1`]) continue;
              return { 
                slot: { x, y, s: side, z }, 
                rationale: `first available slot in X->Y->Side order, respecting Z=1 priority (Simple Baseline)`
              };
            }
          }
        }
      }
    }
    return null;
  }, [isDebugMode]);

  const findSlotColumnGrouping = useCallback((currentGrid, aisle, dest, state) => {
    const curX = isDebugMode ? 5 : X_POS;
    const curY = isDebugMode ? 3 : Y_LEVELS;
    const curS = isDebugMode ? 1 : SIDES;

    const destCols = state.dest_columns?.[dest] || [];
    
    // 1. Try existing columns
    for (const colKey of destCols) {
      const [a, side, x] = colKey.split('_').map(Number);
      if (a !== aisle) continue;
      for (let y = 1; y <= curY; y++) {
        if (!currentGrid[`${a}_${side}_${x}_${y}_1`]) return { 
          slot: { x, y, s: side, z: 1 },
          rationale: `found assigned column ${colKey} for destination ${dest} with free space at Y:${y} (Column Grouping)`
        };
        if (!currentGrid[`${a}_${side}_${x}_${y}_2`]) return { 
          slot: { x, y, s: side, z: 2 },
          rationale: `found assigned column ${colKey} for destination ${dest} with free Z:2 space at Y:${y} (Column Grouping)`
        };
      }
    }

    // 2. Find new empty column
    for (let x = 1; x <= curX; x++) {
      for (let side = 1; side <= curS; side++) {
        let isColEmpty = true;
        for (let y = 1; y <= curY; y++) {
          if (currentGrid[`${aisle}_${side}_${x}_${y}_1`] || currentGrid[`${aisle}_${side}_${x}_${y}_2`]) {
            isColEmpty = false; break;
          }
        }
        if (!isColEmpty) continue;

        // Check if column is assigned to someone else
        let isAssigned = false;
        Object.values(state.dest_columns || {}).forEach(cols => {
          if (cols.includes(`${aisle}_${side}_${x}`)) isAssigned = true;
        });

        if (!isAssigned) {
          const colKey = `${aisle}_${side}_${x}`;
          setAlgoState(prev => ({
            ...prev,
            dest_columns: {
              ...prev.dest_columns,
              [dest]: [...(prev.dest_columns?.[dest] || []), colKey]
            }
          }));
          return { 
            slot: { x, y: 1, s: side, z: 1 },
            rationale: `assigned new empty column ${colKey} to destination ${dest} (Column Grouping)`
          };
        }
      }
    }

    // 3. Fallback
    const fallback = findSlotSimple(currentGrid, aisle);
    if (fallback) fallback.rationale = `no empty/assigned columns available, falling back to simple scan: ${fallback.rationale}`;
    return fallback;
  }, [findSlotSimple, isDebugMode]);

  const findSlotZSafeSimple = useCallback((currentGrid, aisle, dest) => {
    const curX = isDebugMode ? 5 : X_POS;
    const curY = isDebugMode ? 3 : Y_LEVELS;
    const curS = isDebugMode ? 1 : SIDES;

    for (let x = 1; x <= curX; x++) {
      for (let y = 1; y <= curY; y++) {
        for (let side = 1; side <= curS; side++) {
          // Z=1 first
          if (!currentGrid[`${aisle}_${side}_${x}_${y}_1`]) return { 
            slot: { x, y, s: side, z: 1 },
            rationale: `found free Z=1 slot at X:${x} Y:${y} (Z-Safe Simple)`
          };
          
          // Z=2 ONLY if Z=1 matches dest
          if (!currentGrid[`${aisle}_${side}_${x}_${y}_2`]) {
            const z1Box = currentGrid[`${aisle}_${side}_${x}_${y}_1`];
            if (z1Box && z1Box.destination === dest) return { 
              slot: { x, y, s: side, z: 2 },
              rationale: `found free Z=2 slot at X:${x} Y:${y} where Z=1 is same destination ${dest} (Z-Safe Simple)`
            };
          }
        }
      }
    }
    return null;
  }, [isDebugMode]);

  const tick = useCallback(() => {
    let nextGrid = { ...grid };
    let nextShuttles = [...shuttles];
    let nextStats = { ...stats };
    let highlights = {};

    nextShuttles.forEach(s => {
      const simSecondsPerTick = isDebugMode ? 1 : (speed / TICKS_PER_SEC);

      // --- STATE MACHINE ---
      if (s.state === 'moving') {
        const dist = s.targetX - s.x;
        const step = Math.sign(dist) * Math.min(Math.abs(dist), simSecondsPerTick);
        s.x += step;

        if (Math.abs(s.x - s.targetX) < 0.01) {
          s.x = s.targetX;
          s.state = 'handling';
          s.handlingTicks = 10 / simSecondsPerTick;
          
          // Determine next substate after movement
          if (s.subState === 'heading_to_head') s.subState = 'collecting';
          else if (s.subState === 'heading_to_pick') s.subState = 'grabbing';
          else if (s.subState === 'traveling_to_storage') s.subState = 'storing';
          else if (s.subState === 'returning_to_head') s.subState = 'dropping_off';
          else if (s.subState === 'heading_to_reloc') s.subState = 'grabbing_blocker';
          else if (s.subState === 'relocating_blocker') s.subState = 'placing_blocker';
        }
      } 
      else if (s.state === 'handling') {
        s.handlingTicks -= 1;
        if (s.handlingTicks <= 0) {
          const task = s.task;
          
          // HANDLING COMPLETE ACTIONS
          if (s.subState === 'collecting') {
            s.heldBox = { id: task.boxId };
            s.state = 'moving';
            s.targetX = task.x;
            s.subState = 'traveling_to_storage';
          } 
          else if (s.subState === 'storing') {
            nextGrid[`${activeAisle}_${task.s}_${task.x}_${task.y}_${task.z}`] = s.heldBox;
            nextStats.inbound++;
            s.stats.inbound++;
            highlights[`${task.s}_${task.x}_${task.y}`] = 'arrival';
            s.heldBox = null;
            s.state = 'idle';
            s.subState = 'ready';
            s.task = null;
            if (s.queue.length > 0) s.queue.shift();
          }
          else if (s.subState === 'grabbing') {
            s.heldBox = nextGrid[`${activeAisle}_${task.s}_${task.x}_${task.y}_${task.z}`];
            nextGrid[`${activeAisle}_${task.s}_${task.x}_${task.y}_${task.z}`] = null;
            s.state = 'moving';
            s.targetX = 0;
            s.subState = 'returning_to_head';
          }
          else if (s.subState === 'dropping_off') {
            // PALLETIZER INTEGRATION
            const dest = task.destination;
            setPalletSlots(prev => prev.map(slot => {
              if (slot.destination === dest) {
                const newCount = slot.count + 1;
                if (newCount >= 12) {
                  return { ...slot, count: 12, status: 'shipped', lastShipped: Date.now() };
                }
                return { ...slot, count: newCount, status: 'packing' };
              }
              return slot;
            }));

            nextStats.outbound++;
            s.stats.outbound++;
            highlights[`${task.s}_${task.x}_${task.y}`] = 'retrieve';
            s.heldBox = null;
            s.state = 'idle';
            s.subState = 'ready';
            s.task = null;
            if (s.queue.length > 0) s.queue.shift();
          }
          else if (s.subState === 'grabbing_blocker') {
            s.heldBox = nextGrid[`${activeAisle}_${task.s}_${task.x}_${task.y}_1`];
            nextGrid[`${activeAisle}_${task.s}_${task.x}_${task.y}_1`] = null;
            // Find relocation spot
            const relocResult = findSlotSimple(nextGrid, activeAisle);
            const relocSpot = relocResult.slot;
            s.state = 'moving';
            s.targetX = relocSpot.x;
            s.subState = 'relocating_blocker';
            s.task.relocSpot = relocSpot;
          }
          else if (s.subState === 'placing_blocker') {
            const spot = s.task.relocSpot;
            nextGrid[`${activeAisle}_${spot.s}_${spot.x}_${spot.y}_${spot.z}`] = s.heldBox;
            nextStats.relocs++;
            s.stats.relocs++;
            s.heldBox = null;
            // Now proceed to original pick
            s.state = 'moving';
            s.targetX = task.x;
            s.subState = 'heading_to_pick';
          }
        }
      }

      // --- TASK ASSIGNMENT ---
      if (s.state === 'idle') {
        // Arrivals
        const isArrival = Math.random() * 100 < arrivalRate;
        if (isArrival) {
          const dests = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
          const dest = `DEST_${dests[Math.floor(Math.random() * dests.length)]}`;
          
          const boxId = Math.floor(1000 + Math.random() * 9000).toString();
          let result = null;
          if (algoId === 'simple') result = findSlotSimple(nextGrid, activeAisle);
          else if (algoId === 'column') result = findSlotColumnGrouping(nextGrid, activeAisle, dest, algoState);
          else if (algoId === 'z-safe') result = findSlotZSafeSimple(nextGrid, activeAisle, dest);
          else result = findSlotSimple(nextGrid, activeAisle); // Fallback

          if (result && result.slot && result.slot.y === s.y) {
            const slot = result.slot;
            s.state = 'moving';
            s.targetX = 0;
            s.subState = 'heading_to_head';
            s.task = { 
              type: 'inbound', ...slot, 
              boxId,
              destination: dest
            };
            if (isDebugMode) addLog(`[ALGO] Inbound box #${boxId} → chose X:${slot.x} Y:${slot.y} Z:${slot.z} because: ${result.rationale}`, 'success');
          }
        } 
        // Retrievals (If not doing arrival)
        if (s.state === 'idle') {
          // Find any dest with 12+ boxes
          const destGroups = {};
          Object.entries(nextGrid).forEach(([key, box]) => {
            if (box && key.startsWith(`${activeAisle}_`)) {
              if (!destGroups[box.destination]) destGroups[box.destination] = [];
              const [a, side, x, y, z] = key.split('_').map(Number);
              destGroups[box.destination].push({ s: side, x, y, z });
            }
          });

          let retrievalTarget = null;
          Object.entries(destGroups).forEach(([dest, boxes]) => {
            if (boxes.length >= 12 && !retrievalTarget) {
              const myLevelBoxes = boxes.filter(b => b.y === s.y);
              if (myLevelBoxes.length > 0) {
                // Check if this destination already has a pallet slot assigned
                // If not, try to assign one
                setPalletSlots(prev => {
                  const existing = prev.find(p => p.destination === dest);
                  if (existing) return prev;
                  
                  const freeIdx = prev.findIndex(p => p.destination === null);
                  if (freeIdx !== -1) {
                    const next = [...prev];
                    next[freeIdx] = { ...next[freeIdx], destination: dest, count: 0, status: 'packing' };
                    return next;
                  }
                  return prev;
                });

                // For all verified algos, prioritize Z=1 then X
                myLevelBoxes.sort((a, b) => {
                  if (a.z !== b.z) return a.z - b.z;
                  return a.x - b.x;
                });
                retrievalTarget = myLevelBoxes[0];
              }
            }
          });

          if (retrievalTarget) {
            const isBlocked = retrievalTarget.z === 2 && nextGrid[`${activeAisle}_${retrievalTarget.s}_${retrievalTarget.x}_${retrievalTarget.y}_1`];
            if (isBlocked) {
              const blocker = nextGrid[`${activeAisle}_${retrievalTarget.s}_${retrievalTarget.x}_${retrievalTarget.y}_1`];
              const relocResult = findSlotSimple(nextGrid, activeAisle);
              if (isDebugMode) addLog(`[ALGO] Retrieval needed at X:${retrievalTarget.x} Y:${retrievalTarget.y} Z:2 → Z-Block! Z:1 occupied by #${blocker.id} → relocating to X:${relocResult.slot.x} Y:${relocResult.slot.y} Z:${relocResult.slot.z} because: ${relocResult.rationale}`, 'warning');
            }
            s.state = 'moving';
            s.targetX = retrievalTarget.x;
            s.subState = isBlocked ? 'heading_to_reloc' : 'heading_to_pick';
            s.task = { type: 'outbound', ...retrievalTarget };
          }
        }
      }

        while (s.queue.length < 3) {
          s.queue.push({ 
            type: Math.random() > 0.5 ? 'STORE' : 'RETRIEVE',
            id: Math.floor(1000 + Math.random() * 9000).toString(),
            x: Math.floor(Math.random() * 60) + 1,
            s: Math.random() > 0.5 ? 'L' : 'R'
          });
        }
    });

    setGrid(nextGrid);
    setShuttles(nextShuttles);
    setStats(nextStats);
    setActiveActions(highlights);
    setTimeout(() => setActiveActions({}), 400);

  }, [grid, shuttles, stats, arrivalRate, speed, activeAisle, findSlotSimple, findSlotColumnGrouping, findSlotZSafeSimple, algoId, algoState, isDebugMode]);

  useEffect(() => {
    if (isPlaying) { simTimer.current = setInterval(tick, 1000 / TICKS_PER_SEC); }
    else { clearInterval(simTimer.current); }
    return () => clearInterval(simTimer.current);
  }, [isPlaying, tick]);

  const focusedShuttle = useMemo(() => shuttles.find(s => s.y === focusedShuttleY), [shuttles, focusedShuttleY]);

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

  const getStatusText = (s) => {
    if (s.state === 'idle') return "IDLE — Monitoring for next request";
    const task = s.task;
    const boxId = s.heldBox?.id || task?.boxId || "????";
    const side = task?.s === 1 ? 'L' : 'R';

    switch (s.subState) {
      case 'heading_to_head': return `🔵 HEADING TO HEAD — Picking up inbound box (collecting at X:0)`;
      case 'collecting': return `🔵 COLLECTING — Inbound box #${boxId} in arms (Handling at X:0)`;
      case 'traveling_to_storage': return `🔵 TRAVELING TO X:${task.x} ${side} — Carrying inbound box #${boxId}`;
      case 'storing': return `🔵 STORING @ X:${task.x} ${side} Z${task.z} — Placing box #${boxId}`;
      
      case 'heading_to_pick': return `🟡 HEADING TO X:${task.x} ${side} — Retrieving box #${boxId} for Outbound`;
      case 'grabbing': return `🟡 GRABBING @ X:${task.x} ${side} Z${task.z} — Box #${boxId} in arms`;
      case 'returning_to_head': return `🟡 RETURNING TO HEAD — Delivering box #${boxId}`;
      case 'dropping_off': return `🟡 DROPPING OFF @ HEAD — Releasing box #${boxId} to palletizer`;

      case 'heading_to_reloc': return `🟠 HEADING TO X:${task.x} ${side} — Z-BLOCK relocation needed`;
      case 'grabbing_blocker': return `🟠 GRABBING BLOCKER @ X:${task.x} ${side} Z1 — Box #${boxId} in arms`;
      case 'relocating_blocker': return `🟠 RELOCATING TO X:${task.relocSpot?.x} ${task.relocSpot?.s === 1 ? 'L' : 'R'} — Carrying blocker #${boxId}`;
      case 'placing_blocker': return `🟠 PLACING BLOCKER @ X:${task.relocSpot?.x} — Box #${boxId} stored`;
      
      default: return "Initializing...";
    }
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
              <span>{focusedShuttleY ? `Focused Level ${focusedShuttleY}` : 'Contextual Telemetry'}</span>
              <span className="w-1 h-1 rounded-full bg-slate-700" />
              <span>{shuttles.length} Shuttles Online</span>
            </div>
          </div>
        </div>

        <nav className="flex items-center gap-2 bg-slate-900/50 p-1 rounded-xl border border-slate-800">
          <Link to="/" className="px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-800 transition-all flex items-center gap-2">
            <LayoutDashboard className="w-4 h-4" /> Benchmark
          </Link>
          <div className="px-4 py-2 rounded-lg text-xs font-bold bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 flex items-center gap-2">
            <Layers className="w-4 h-4" /> System Control
          </div>
          <Link to="/raw-data" className="px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-800 transition-all flex items-center gap-2">
            <Database className="w-4 h-4 text-amber-400" /> Raw Data
          </Link>
        </nav>

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

          <section className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider"><Settings2 className="w-4 h-4" /> Control Panel</div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Strategy Algorithm</label>
              <select 
                value={algoId} 
                onChange={(e) => setAlgoId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-xs font-bold text-slate-200 outline-none focus:border-indigo-500 transition-all"
              >
                <option value="simple">Simple Baseline ✓</option>
                <option value="column">Column Grouping ✓</option>
                <option value="z-safe">Z-Safe Simple ✓</option>
                <option value="z-weighted">Z-Weighted Pro (demo)</option>
                <option value="greedy">Distance Greedy (demo)</option>
              </select>
            </div>

            <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-lg py-2 px-3">
              <div className="flex items-center gap-2">
                <Cpu className={cn("w-4 h-4", isDebugMode ? "text-amber-500" : "text-slate-500")} />
                <span className="text-[10px] font-bold text-slate-300 uppercase">Debug Mode</span>
              </div>
              <button 
                onClick={() => setIsDebugMode(!isDebugMode)}
                className={cn("w-10 h-5 rounded-full relative transition-all duration-300", isDebugMode ? "bg-amber-600" : "bg-slate-700")}
              >
                <div className={cn("absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-300", isDebugMode ? "left-6" : "left-1")} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setIsPlaying(!isPlaying)} className={cn("py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95", isPlaying ? "bg-slate-800" : "bg-indigo-600 text-white")}>
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />} {isPlaying ? 'Pause' : 'Start'}
                </button>
                <button onClick={initWarehouse} className="py-3 bg-slate-900 border border-slate-800 rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95"><RotateCcw className="w-5 h-5" /></button>
              </div>
              <div><label className="text-[10px] font-bold text-slate-500 uppercase block mb-2 flex justify-between">Travel Speed <span>{speed}x</span></label><input type="range" min="1" max="100" value={speed} onChange={e => setSpeed(parseInt(e.target.value))} className="w-full accent-indigo-500" /></div>
          </section>

          <section className="flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-4"><ListTodo className="w-4 h-4" /> Activity Feed</div>
            <div className="flex-1 bg-slate-950 border border-slate-900 rounded-xl p-4 overflow-y-auto space-y-3 font-mono text-[10px] scrollbar-hide">
              {logs.map((l, i) => (
                <div key={i} className={cn("flex gap-2 animate-in slide-in-from-right-2", l.type === 'success' ? 'text-indigo-400' : l.type === 'warning' ? 'text-orange-400' : 'text-slate-500')}>
                  <span className="opacity-30 shrink-0">{l.time}</span><span>{l.msg}</span>
                </div>
              ))}
            </div>
          </section>
        </aside>

        <main className="flex-1 p-8 bg-slate-950 relative overflow-hidden flex flex-col">
          
          {showDisclaimer && (
            <div className="mb-6 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between animate-in slide-in-from-top-4 duration-500">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <p className="text-xs font-medium text-amber-200/80">
                  <span className="font-bold text-amber-500 uppercase mr-2">Disclaimer:</span>
                  Algorithms marked <span className="text-amber-400 font-bold">✓</span> are exact ports of the Python simulation. Others are demos for visualization only. Official numbers are on the Benchmark Dashboard.
                </p>
              </div>
              <button onClick={() => setShowDisclaimer(false)} className="p-2 hover:bg-amber-500/10 rounded-full transition-colors">
                <X className="w-4 h-4 text-amber-500" />
              </button>
            </div>
          )}
          {/* FOCUS MODE OVERLAY */}
          {focusedShuttleY !== null && focusedShuttle && (
            <div className="absolute inset-0 bg-[#020617]/98 z-40 p-8 flex flex-col animate-in fade-in duration-300 overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20"><Maximize2 className="w-6 h-6 text-indigo-400" /></div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-50">Shuttle Focus: Level {focusedShuttleY}</h2>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Unified Side Comparison & Telemetry</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <button onClick={() => setFollowShuttle(!followShuttle)} className={cn("flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs border transition-all", followShuttle ? "bg-indigo-600 border-indigo-500 text-white" : "bg-slate-900 border-slate-800 text-slate-400")}>{followShuttle ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />} {followShuttle ? 'Auto-Follow' : 'Free Scroll'}</button>
                  <button onClick={() => setFocusedShuttleY(null)} className="p-3 hover:bg-slate-800 rounded-full text-slate-400 transition-colors"><X className="w-6 h-6" /></button>
                </div>
              </div>

              {/* DUAL SIDE VIEW ROW */}
              <div ref={scrollContainerRef} className="flex-1 overflow-x-auto scrollbar-hide py-12 px-12 scroll-smooth">
                <div className="inline-grid gap-y-0 min-w-max" style={{ gridTemplateColumns: 'repeat(60, 150px)' }}>
                  {/* LEFT SIDE */}
                  <div className="col-span-full text-[10px] font-bold text-indigo-400 mb-2 uppercase tracking-widest pl-4">Left Side (01)</div>
                  {Array.from({ length: X_POS }).map((_, xIdx) => {
                    const x = xIdx + 1; const { z1, z2 } = getCellData(x, focusedShuttleY, 1);
                    return (
                      <div key={`L${x}`} className="h-40 border border-slate-800/50 flex transition-all duration-300">
                        <div className={cn("flex-1 border-r border-slate-800/20 p-2 flex flex-col items-center justify-center gap-1", z1 ? "bg-indigo-900/10" : "opacity-10")}>
                          <span className="text-[8px] font-bold text-slate-700">Z1</span>
                          {z1 ? <><Box className="w-5 h-5 text-indigo-400" /><span className="text-[9px] font-mono font-bold text-indigo-300">#{z1.id.slice(-4)}</span><span className="text-[8px] font-bold text-indigo-500/60">{z1.destination.split('_')[1]}</span></> : <div className="w-4 h-4 border border-dashed border-slate-800 rounded-sm" />}
                        </div>
                        <div className={cn("flex-1 p-2 flex flex-col items-center justify-center gap-1", z2 ? "bg-indigo-500/10" : "opacity-10")}>
                          <span className="text-[8px] font-bold text-slate-700">Z2</span>
                          {z2 ? <><Box className="w-5 h-5 text-indigo-300" /><span className="text-[9px] font-mono font-bold text-indigo-200">#{z2.id.slice(-4)}</span><span className="text-[8px] font-bold text-indigo-400/60">{z2.destination.split('_')[1]}</span></> : <div className="w-4 h-4 border border-dashed border-slate-800 rounded-sm" />}
                        </div>
                      </div>
                    );
                  })}
                  {/* SHUTTLE CORRIDOR */}
                  <div className="col-span-full h-24 bg-slate-900/30 border-y border-slate-800 my-2 relative overflow-visible">
                    <div 
                      className="absolute top-1/2 -translate-y-1/2 transition-all duration-100 flex items-center justify-center"
                      style={{ left: `${(focusedShuttle.x - 1) * 150 + 75}px`, transform: 'translate(-50%, -50%)' }}
                    >
                      <div className={cn(
                        "w-16 h-16 bg-indigo-600 rounded-xl shadow-2xl flex items-center justify-center relative transition-transform duration-300",
                        focusedShuttle.state === 'handling' && focusedShuttle.task?.s === 1 && "-translate-y-6",
                        focusedShuttle.state === 'handling' && focusedShuttle.task?.s === 2 && "translate-y-6"
                      )}>
                        {focusedShuttle.state === 'handling' ? <Loader2 className="w-8 h-8 text-white animate-spin" /> : (focusedShuttle.heldBox ? <Package className="w-8 h-8 text-white" /> : <Cpu className="w-8 h-8 text-white" />)}
                        {focusedShuttle.state === 'handling' && focusedShuttle.task?.s === 1 && <ArrowUp className="absolute -top-4 w-4 h-4 text-indigo-400 animate-bounce" />}
                        {focusedShuttle.state === 'handling' && focusedShuttle.task?.s === 2 && <ArrowDown className="absolute -bottom-4 w-4 h-4 text-indigo-400 animate-bounce" />}
                        <div className="absolute -bottom-8 bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">X:{focusedShuttle.x.toFixed(1)}</div>
                      </div>
                    </div>
                  </div>
                  {/* RIGHT SIDE */}
                  <div className="col-span-full text-[10px] font-bold text-indigo-400 mb-2 mt-4 uppercase tracking-widest pl-4">Right Side (02)</div>
                  {Array.from({ length: X_POS }).map((_, xIdx) => {
                    const x = xIdx + 1; const { z1, z2 } = getCellData(x, focusedShuttleY, 2);
                    return (
                      <div key={`R${x}`} className="h-40 border border-slate-800/50 flex transition-all duration-300">
                        <div className={cn("flex-1 border-r border-slate-800/20 p-2 flex flex-col items-center justify-center gap-1", z1 ? "bg-indigo-900/10" : "opacity-10")}>
                          <span className="text-[8px] font-bold text-slate-700">Z1</span>
                          {z1 ? <><Box className="w-5 h-5 text-indigo-400" /><span className="text-[9px] font-mono font-bold text-indigo-300">#{z1.id.slice(-4)}</span><span className="text-[8px] font-bold text-indigo-500/60">{z1.destination.split('_')[1]}</span></> : <div className="w-4 h-4 border border-dashed border-slate-800 rounded-sm" />}
                        </div>
                        <div className={cn("flex-1 p-2 flex flex-col items-center justify-center gap-1", z2 ? "bg-indigo-500/10" : "opacity-10")}>
                          <span className="text-[8px] font-bold text-slate-700">Z2</span>
                          {z2 ? <><Box className="w-5 h-5 text-indigo-300" /><span className="text-[9px] font-mono font-bold text-indigo-200">#{z2.id.slice(-4)}</span><span className="text-[8px] font-bold text-indigo-400/60">{z2.destination.split('_')[1]}</span></> : <div className="w-4 h-4 border border-dashed border-slate-800 rounded-sm" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Status Panel */}
              <div className="grid grid-cols-4 gap-8 bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shrink-0">
                <div className="col-span-2 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase"><Crosshair className="w-4 h-4" /> Contextual Status Telemetry</div>
                  <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase mb-2">Current Activity</p>
                      <p className={cn(
                        "text-lg font-bold tracking-tight",
                        focusedShuttle.subState.includes('inbound') || focusedShuttle.subState.includes('head') ? 'text-blue-400' : 
                        focusedShuttle.subState.includes('pick') || focusedShuttle.subState.includes('grabbing') ? 'text-yellow-400' : 'text-orange-400',
                        focusedShuttle.state === 'idle' && 'text-slate-500'
                      )}>
                        {getStatusText(focusedShuttle)}
                      </p>
                    </div>
                    <div className="flex items-center gap-6 pl-8 border-l border-slate-800">
                      <div className="text-center"><p className="text-[8px] text-slate-500 font-bold uppercase">X-Pos</p><p className="text-xl font-mono font-bold text-slate-100">{focusedShuttle.x.toFixed(1)}</p></div>
                      <div className="text-center">
                        <p className="text-[8px] text-slate-500 font-bold uppercase">Load</p>
                        {focusedShuttle.heldBox ? <Package className="w-6 h-6 text-indigo-400 mx-auto mt-1" /> : <div className="w-6 h-6 border-2 border-dashed border-slate-800 rounded-md mx-auto mt-1" />}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase"><ListTodo className="w-4 h-4" /> Next Operations</div>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col gap-2">
                    {focusedShuttle.queue.map((q, i) => (
                      <div key={i} className="text-[10px] font-bold text-indigo-400/70 truncate uppercase flex justify-between">
                        <span>{q.type} #{q.id}</span>
                        <span className="text-slate-600">@ X:{q.x}{q.s}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase"><BarChart3 className="w-4 h-4" /> Controller Stats</div>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 grid grid-cols-3 gap-2 text-center h-20 items-center">
                    <div><p className="text-[8px] text-slate-500 font-bold uppercase">In</p><p className="text-lg font-bold text-blue-400">{focusedShuttle.stats.inbound}</p></div>
                    <div><p className="text-[8px] text-slate-500 font-bold uppercase">Out</p><p className="text-lg font-bold text-yellow-400">{focusedShuttle.stats.outbound}</p></div>
                    <div><p className="text-[8px] text-slate-500 font-bold uppercase">Rel</p><p className="text-lg font-bold text-orange-400">{focusedShuttle.stats.relocs}</p></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MAIN GRID VIEW */}
          <div className="flex-1 relative border border-slate-800 rounded-3xl overflow-auto bg-slate-900/20 backdrop-blur-sm p-8 scrollbar-hide">
            <div className="inline-grid gap-y-2 select-none min-w-max" style={{ gridTemplateColumns: '80px repeat(60, 42px)' }}>
              {Array.from({ length: Y_LEVELS }).map((_, yIdx) => {
                const y = Y_LEVELS - yIdx; const shuttle = shuttles.find(s => s.y === y);
                return (
                  <React.Fragment key={y}>
                    <div onClick={() => setFocusedShuttleY(y)} className="flex items-center justify-between font-bold text-xs text-slate-500 border-r border-slate-800 mr-4 px-2 hover:bg-indigo-500/10 cursor-pointer group rounded-l-lg transition-all"><span>L{y}</span><Maximize2 className="w-3 h-3 opacity-0 group-hover:opacity-100 text-indigo-400" /></div>
                    {Array.from({ length: X_POS }).map((_, xIdx) => {
                      const x = xIdx + 1; const { z1, z2 } = getCellData(x, y, activeSide);
                      const isShuttleHere = shuttle && Math.floor(shuttle.x) === x;
                      return (
                        <div key={`${x}_${y}`} className={cn("w-8 h-10 border border-slate-800/50 rounded-sm relative transition-all duration-300", !z1 && "bg-slate-900/10", z1 && !z2 && "bg-indigo-900/20", z1 && z2 && "bg-indigo-500/30", isShuttleHere && "ring-2 ring-indigo-400/50 ring-offset-2 ring-offset-slate-950")}>
                          {z1 && <div className={cn("absolute bottom-1 left-1 right-1 h-2 rounded-full", z2 ? "bg-indigo-400" : "bg-indigo-500/30")} />}
                          {isShuttleHere && (<div onClick={() => setFocusedShuttleY(y)} className="absolute -top-1 -left-1 -right-1 -bottom-1 border-2 border-indigo-400 rounded-md bg-indigo-400/20 flex items-center justify-center animate-pulse z-20 cursor-pointer"><Package className="w-3 h-3 text-white" /></div>)}
                        </div>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </main>

        {/* PALLETIZER SIDEBAR */}
        <div className={cn(
          "border-l border-slate-800 bg-[#020617] transition-all duration-500 flex flex-col relative shrink-0",
          isPalletizerOpen ? "w-96" : "w-0 overflow-hidden"
        )}>
          {/* Toggle Button */}
          <button 
            onClick={() => setIsPalletizerOpen(!isPalletizerOpen)}
            className="absolute -left-4 top-1/2 -translate-y-1/2 w-8 h-12 bg-slate-800 border border-slate-700 rounded-lg flex items-center justify-center hover:bg-slate-700 transition-colors z-50 shadow-xl"
          >
            {isPalletizerOpen ? <ChevronLeft className="w-4 h-4" /> : <Play className="w-4 h-4 rotate-180" />}
          </button>

          <div className="p-8 flex flex-col h-full space-y-8 overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-50 flex items-center gap-2">
                  <Package className="w-5 h-5 text-emerald-400" /> Palletizer
                </h2>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Robot Pack Station System</p>
              </div>
            </div>

            <div className="flex-1 grid grid-cols-2 gap-4 auto-rows-fr">
              {palletSlots.map((slot, idx) => (
                <div key={idx} className={cn(
                  "relative border rounded-2xl p-4 flex flex-col justify-between transition-all duration-500 overflow-hidden",
                  slot.status === 'shipped' ? "bg-emerald-500/20 border-emerald-500/50 scale-95 shadow-[0_0_30px_rgba(16,185,129,0.2)]" : 
                  slot.destination ? "bg-slate-900/50 border-slate-800" : "bg-slate-950 border-slate-900 border-dashed opacity-50"
                )}>
                  {slot.status === 'shipped' && (
                    <div className="absolute inset-0 bg-emerald-500/20 animate-pulse flex items-center justify-center">
                      <p className="text-xl font-black text-emerald-400 uppercase tracking-tighter">SHIPPED</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Slot {idx + 1}</p>
                    {slot.destination && <div className="px-2 py-0.5 rounded bg-indigo-500/20 border border-indigo-500/30 text-[9px] font-bold text-indigo-400">{slot.destination.split('_')[1]}</div>}
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-end justify-between">
                      <p className="text-2xl font-black font-mono text-slate-50">{slot.count}<span className="text-xs text-slate-600 font-normal ml-1">/ 12</span></p>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={cn("h-full transition-all duration-700", slot.count >= 12 ? "bg-emerald-500" : "bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]")} 
                        style={{ width: `${(slot.count / 12) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-800/50 flex items-center justify-between">
                    <p className="text-[8px] font-bold text-slate-600 uppercase">
                      {idx < 4 ? 'Robot 1' : 'Robot 2'}
                    </p>
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      slot.status === 'shipped' ? "bg-emerald-400 animate-ping" : 
                      slot.destination ? "bg-indigo-400 animate-pulse" : "bg-slate-800"
                    )} />
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-slate-900/30 border border-slate-800 p-4 rounded-xl space-y-2">
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase">
                <span>System Efficiency</span>
                <span className="text-emerald-400">88%</span>
              </div>
              <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full w-[88%] bg-emerald-500" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
