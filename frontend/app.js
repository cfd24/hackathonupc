const COLORS = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
    '#F7DC6F', '#BB8FCE', '#82E0AA', '#F1948A', '#85C1E9',
    '#F8C471', '#73C6B6', '#D98880', '#C39BD3', '#7FB3D5',
    '#76D7C4', '#F7D358', '#F5B041', '#EB984E', '#5DADE2'
];

class Dashboard {
    constructor() {
        this.aisles = [];
        this.destinations = new Map();
        this.boxes = [];
        this.shuttles = new Array(9).fill(0); // 1-8
        this.config = {
            numAisles: 4,
            numX: 60,
            numY: 8,
            numZ: 2,
            numSides: 2
        };
        
        this.init();
    }

    async init() {
        this.setupUI();
        this.render();
        this.startPolling();
    }

    startPolling() {
        setInterval(async () => {
            try {
                const response = await fetch('../simulation_state.json');
                if (!response.ok) return;
                const state = await response.json();
                this.updateFromState(state);
            } catch (err) {
                // Silently ignore poll errors
            }
        }, 500);
    }

    setupUI() {
        const siloView = document.getElementById('silo-view');
        for (let i = 1; i <= this.config.numAisles; i++) {
            const aisleCard = document.createElement('div');
            aisleCard.className = 'aisle-card glass';
            aisleCard.innerHTML = `
                <div class="aisle-header">
                    <span>AISLE ${String(i).padStart(2, '0')}</span>
                    <span id="shuttle-info-${i}">X: 0</span>
                </div>
                <canvas id="canvas-aisle-${i}" class="grid-canvas"></canvas>
            `;
            siloView.appendChild(aisleCard);
            
            const canvas = aisleCard.querySelector('canvas');
            this.aisles.push({
                id: i,
                canvas: canvas,
                ctx: canvas.getContext('2d')
            });
        }

        window.addEventListener('resize', () => this.resizeCanvases());
        this.resizeCanvases();
    }

    resizeCanvases() {
        this.aisles.forEach(aisle => {
            const rect = aisle.canvas.parentElement.getBoundingClientRect();
            aisle.canvas.width = rect.width;
            aisle.canvas.height = rect.height - 30;
        });
        this.render();
    }

    updateFromState(state) {
        if (state.last_event && state.last_event !== this.lastEvent) {
            this.addLog(state.last_event);
            this.lastEvent = state.last_event;
        }

        // Update metrics
        document.getElementById('metric-time').textContent = this.formatTime(state.total_time);
        document.getElementById('metric-throughput').textContent = Math.round(state.boxes_processed / (state.total_time / 3600 || 1));
        document.getElementById('metric-pallets').textContent = state.pallets_completed;
        document.getElementById('metric-occupancy').textContent = (state.occupancy * 100).toFixed(1) + '%';

        // Update shuttles
        for (let y = 1; y <= 8; y++) {
            this.shuttles[y] = state.shuttles_x[String(y)] || 0;
        }

        // Update boxes
        this.boxes = state.boxes.map(b => {
            if (!this.destinations.has(b.dest)) {
                const colorIdx = this.destinations.size % COLORS.length;
                this.destinations.set(b.dest, COLORS[colorIdx]);
                this.addLegend(b.dest, COLORS[colorIdx]);
            }
            return b;
        });

        this.render();
    }

    formatTime(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    addLegend(dest, color) {
        const legend = document.getElementById('destination-legend');
        const item = document.createElement('div');
        item.className = 'legend-item';
        item.innerHTML = `
            <div class="color-box" style="background: ${color}"></div>
            <span>${dest}</span>
        `;
        legend.appendChild(item);
    }

    addLog(msg) {
        const feed = document.getElementById('live-feed');
        const entry = document.createElement('div');
        entry.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
        feed.prepend(entry);
    }

    render() {
        this.aisles.forEach(aisle => {
            this.drawAisle(aisle);
        });
    }

    drawAisle(aisleObj) {
        const { ctx, canvas, id } = aisleObj;
        const w = canvas.width;
        const h = canvas.height;
        
        ctx.clearRect(0, 0, w, h);

        const padding = 10;
        const gridW = w - padding * 2;
        const gridH = h - padding * 2;
        
        const cellW = gridW / this.config.numX;
        const cellH = gridH / this.config.numY;

        // Draw Grid Background
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 0.5;
        for (let x = 0; x <= this.config.numX; x++) {
            ctx.beginPath();
            ctx.moveTo(padding + x * cellW, padding);
            ctx.lineTo(padding + x * cellW, padding + gridH);
            ctx.stroke();
        }
        for (let y = 0; y <= this.config.numY; y++) {
            ctx.beginPath();
            ctx.moveTo(padding, padding + y * cellH);
            ctx.lineTo(padding + gridW, padding + y * cellH);
            ctx.stroke();
        }

        // Draw Boxes
        this.boxes.filter(b => b.aisle === id).forEach(box => {
            const color = this.destinations.get(box.dest);
            ctx.fillStyle = color;
            
            // Offset slightly for Z depth
            const xOff = box.z === 2 ? 2 : 0;
            const yOff = box.z === 2 ? -2 : 0;
            
            // Split Y row by sides? No, let's just stack them for now or use alpha
            const alpha = box.side === 1 ? 1 : 0.6;
            ctx.globalAlpha = alpha;
            
            ctx.fillRect(
                padding + (box.x - 1) * cellW + 1 + xOff,
                padding + (this.config.numY - box.y) * cellH + 1 + yOff,
                cellW - 2,
                cellH - 2
            );
            
            if (box.z === 2) {
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 1;
                ctx.strokeRect(
                    padding + (box.x - 1) * cellW + 1 + xOff,
                    padding + (this.config.numY - box.y) * cellH + 1 + yOff,
                    cellW - 2,
                    cellH - 2
                );
            }
        });
        
        ctx.globalAlpha = 1;

        // Draw Shuttle
        for (let y = 1; y <= this.config.numY; y++) {
            const shuttleX = this.shuttles[y] || 0;
            ctx.fillStyle = '#fff';
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#fff';
            ctx.fillRect(
                padding + (shuttleX) * cellW - 2,
                padding + (this.config.numY - y) * cellH + 2,
                4,
                cellH - 4
            );
            ctx.shadowBlur = 0;
        }
    }

    startMockSimulation() {
        setInterval(() => {
            // Mock arrival
            if (Math.random() > 0.7) {
                const y = Math.floor(Math.random() * 8) + 1;
                const targetX = Math.floor(Math.random() * 60) + 1;
                
                // Animate shuttle
                this.shuttles[y] = targetX;
                this.addLog(`Shuttle Y${y} moving to X${targetX}`);
                this.render();
            }
        }, 1000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new Dashboard();
});
