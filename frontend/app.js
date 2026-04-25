const COLORS = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
    '#F7DC6F', '#BB8FCE', '#82E0AA', '#F1948A', '#85C1E9',
    '#F8C471', '#73C6B6', '#D98880', '#C39BD3', '#7FB3D5',
    '#76D7C4', '#F7D358', '#F5B041', '#EB984E', '#5DADE2'
];

class Dashboard {
    constructor() {
        this.sims = {
            simple: { aisles: [], boxes: [] },
            greedy: { aisles: [], boxes: [] }
        };
        this.destinationColors = new Map();
        this.config = { numAisles: 4, numX: 60, numY: 8 };
        
        this.init();
    }

    init() {
        // Initialize Simple aisles
        for (let i = 1; i <= this.config.numAisles; i++) {
            const canvas = document.getElementById(`simple-aisle-${i}`);
            this.sims.simple.aisles.push({ id: i, canvas: canvas, ctx: canvas.getContext('2d') });
        }
        // Initialize Greedy aisles
        for (let i = 1; i <= this.config.numAisles; i++) {
            const canvas = document.getElementById(`greedy-aisle-${i}`);
            this.sims.greedy.aisles.push({ id: i, canvas: canvas, ctx: canvas.getContext('2d') });
        }

        window.addEventListener('resize', () => this.resizeCanvases());
        this.resizeCanvases();
        this.setupEventListeners();
    }

    setupEventListeners() {
        const btnPlay = document.getElementById('btn-play');
        if (btnPlay) {
            btnPlay.addEventListener('click', async () => {
                this.addLog("Running dual-algorithm comparison...");
                try {
                    const response = await fetch('http://localhost:8080/compare', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({boxes: 1000, destinations: 20})
                    });
                    const data = await response.json();
                    console.log(data);

                    this.updateUI('simple', data.simple);
                    this.updateUI('greedy', data.greedy);
                    this.addLog("Comparison complete.");
                } catch (e) {
                    this.addLog("Error running comparison.");
                }
            });
        }
    }

    updateUI(key, result) {
        // Update Metrics
        document.getElementById(`${key}-time`).textContent = 
            new Date(result.total_time * 1000).toISOString().substr(11, 8);
        document.getElementById(`${key}-pallets-hour`).textContent = 
            result.pallets_per_hour.toFixed(1);
        document.getElementById(`${key}-pallets`).textContent = 
            result.pallets_completed;
        document.getElementById(`${key}-occupancy`).textContent = 
            (result.occupancy * 100).toFixed(1) + '%';

        // Update Boxes and Render
        this.sims[key].boxes = result.boxes;
        this.render();
    }

    resizeCanvases() {
        [this.sims.simple, this.sims.greedy].forEach(sim => {
            sim.aisles.forEach(aisle => {
                const rect = aisle.canvas.parentElement.getBoundingClientRect();
                aisle.canvas.width = rect.width;
                aisle.canvas.height = rect.height;
            });
        });
        this.render();
    }

    render() {
        ['simple', 'greedy'].forEach(key => {
            this.sims[key].aisles.forEach(aisle => {
                this.drawGrid(aisle);
                this.drawBoxes(aisle, this.sims[key].boxes);
            });
        });
    }

    drawGrid(aisleObj) {
        const { ctx, canvas } = aisleObj;
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);
        const padding = 5;
        const gridW = w - padding * 2;
        const gridH = h - padding * 2;
        const cellW = gridW / this.config.numX;
        const cellH = gridH / this.config.numY;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 0.5;
        for (let x = 0; x <= this.config.numX; x++) {
            ctx.beginPath(); ctx.moveTo(padding + x * cellW, padding);
            ctx.lineTo(padding + x * cellW, padding + gridH); ctx.stroke();
        }
        for (let y = 0; y <= this.config.numY; y++) {
            ctx.beginPath(); ctx.moveTo(padding, padding + y * cellH);
            ctx.lineTo(padding + gridW, padding + y * cellH); ctx.stroke();
        }
    }

    drawBoxes(aisleObj, boxes) {
        const { ctx, canvas, id } = aisleObj;
        const padding = 5;
        const cellW = (canvas.width - padding * 2) / this.config.numX;
        const cellH = (canvas.height - padding * 2) / this.config.numY;
        boxes.filter(b => b.aisle === id).forEach(box => {
            if (!this.destinationColors.has(box.dest)) {
                const color = COLORS[this.destinationColors.size % COLORS.length];
                this.destinationColors.set(box.dest, color);
            }
            ctx.fillStyle = this.destinationColors.get(box.dest);
            ctx.globalAlpha = box.side === 1 ? 1.0 : 0.6;
            ctx.fillRect(
                padding + (box.x - 1) * cellW + 1,
                padding + (this.config.numY - box.y) * cellH + 1,
                cellW - 2, cellH - 2
            );
        });
        ctx.globalAlpha = 1.0;
    }

    addLog(msg) {
        const feed = document.getElementById('live-feed');
        const entry = document.createElement('div');
        entry.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
        feed.prepend(entry);
    }
}

document.addEventListener('DOMContentLoaded', () => { window.dashboard = new Dashboard(); });
