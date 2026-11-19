/**
 * ResultsScreen - Research Session Analytics Dashboard
 * Quantitative workload reduction evaluation, step distribution histogram, and telemetry export
 */

export class ResultsScreen {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.onRestart = null;
        this.currentSummary = null;

        this._createLayout();
    }

    _createLayout() {
        this.container.innerHTML = `
            <div class="results-screen">
                <header class="results-header">
                    <div class="results-header-tag">QUANTITATIVE BENCHMARK REPORT</div>
                    <h1>Rendering Workload & Efficiency Analytics</h1>
                    <p class="subtitle">Empirical performance comparison of uniform full render vs gaze-adaptive foveated render</p>
                </header>
                
                <div class="results-content">
                    <!-- Top Workload Comparison Cards -->
                    <div class="comparison-section">
                        <div class="cost-card full-render">
                            <div class="card-metric-badge">UNIFORM BASELINE</div>
                            <div class="cost-header-row">
                                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                                    <line x1="8" y1="21" x2="16" y2="21"></line>
                                    <line x1="12" y1="17" x2="12" y2="21"></line>
                                </svg>
                                <h3>Full Quality Baseline</h3>
                            </div>
                            <p class="cost-description">Static uniform raymarching (64 steps / ray everywhere)</p>
                            <div class="cost-value" id="full-render-cost">--</div>
                            <div class="cost-unit">compute units (ray-steps)</div>
                            <div class="cost-details">
                                <span id="full-render-steps">64</span> steps &times; <span id="full-render-frames">2,700</span> frames
                            </div>
                        </div>
                        
                        <div class="vs-indicator">
                            <span>VS</span>
                        </div>
                        
                        <div class="cost-card selective-render">
                            <div class="card-metric-badge highlight">GAZE-ADAPTIVE</div>
                            <div class="cost-header-row">
                                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <circle cx="12" cy="12" r="3"></circle>
                                </svg>
                                <h3>Foveated Selective Render</h3>
                            </div>
                            <p class="cost-description">Dynamic LOD driven by real-time eye tracking</p>
                            <div class="cost-value" id="selective-render-cost">--</div>
                            <div class="cost-unit">compute units (ray-steps)</div>
                            <div class="cost-details">
                                Avg <span id="selective-avg-steps">--</span> steps &times; <span id="selective-frames">--</span> frames
                            </div>
                        </div>
                    </div>
                    
                    <!-- Compute Savings Summary Banner -->
                    <div class="savings-section">
                        <div class="savings-header-row">
                            <div class="savings-title-group">
                                <h3>GPU Workload Reduction</h3>
                                <span class="savings-subtitle">Theoretical shader ALU & memory bandwidth reduction</span>
                            </div>
                            <div class="savings-percentage" id="savings-percentage">0%</div>
                        </div>
                        <div class="savings-bar-container">
                            <div class="savings-bar" id="savings-bar"></div>
                        </div>
                        <p class="savings-description" id="savings-description">
                            By concentrating raymarching step density on the fovea centralis and throttling peripheral octaves, 
                            the system achieved an empirical <strong id="savings-value">0%</strong> compute workload reduction.
                        </p>
                    </div>

                    <!-- Step Trajectory Chart Section -->
                    <div class="chart-section" id="chart-section">
                        <div class="chart-header">
                            <h4>Raymarching Step Budget Over Time</h4>
                            <span class="chart-legend">Baseline (64) vs Dynamic Adaptive Steps</span>
                        </div>
                        <div class="chart-container" id="svg-chart-container">
                            <!-- SVG Chart injected dynamically -->
                        </div>
                    </div>
                    
                    <!-- Session Metrics Table -->
                    <div class="session-details">
                        <h4>Session Diagnostics & Parameters</h4>
                        <div class="details-grid">
                            <div class="detail-item">
                                <span class="detail-label">Session Duration</span>
                                <span class="detail-value" id="session-duration">45s</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Frames Evaluated</span>
                                <span class="detail-value" id="frames-captured">--</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Average Framerate</span>
                                <span class="detail-value" id="avg-fps">--</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Average Step Density</span>
                                <span class="detail-value" id="avg-step-density">--</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="action-buttons">
                        <button class="cal-btn secondary" id="export-json-btn">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="7 10 12 15 17 10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                            Export Telemetry (JSON)
                        </button>
                        <button class="cal-btn primary" id="try-again-btn">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="1 4 1 10 7 10"></polyline>
                                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                            </svg>
                            Run New Benchmark Session
                        </button>
                    </div>
                </div>
                
                <footer class="results-footer">
                    <p>Quantitative benchmark methodology adheres to human visual acuity falloff models for VR/AR and WebGL rasterization</p>
                </footer>
            </div>
        `;

        this.fullRenderCost = document.getElementById('full-render-cost');
        this.fullRenderSteps = document.getElementById('full-render-steps');
        this.fullRenderFrames = document.getElementById('full-render-frames');
        this.selectiveRenderCost = document.getElementById('selective-render-cost');
        this.selectiveAvgSteps = document.getElementById('selective-avg-steps');
        this.selectiveFrames = document.getElementById('selective-frames');
        this.savingsBar = document.getElementById('savings-bar');
        this.savingsPercentage = document.getElementById('savings-percentage');
        this.savingsValue = document.getElementById('savings-value');
        this.sessionDuration = document.getElementById('session-duration');
        this.framesCaptured = document.getElementById('frames-captured');
        this.avgFps = document.getElementById('avg-fps');
        this.avgStepDensity = document.getElementById('avg-step-density');
        this.tryAgainBtn = document.getElementById('try-again-btn');
        this.exportJsonBtn = document.getElementById('export-json-btn');
        this.chartContainer = document.getElementById('svg-chart-container');

        this.tryAgainBtn.addEventListener('click', () => {
            if (this.onRestart) this.onRestart();
        });

        this.exportJsonBtn.addEventListener('click', () => {
            this._downloadTelemetry();
        });
    }

    updateAnalytics(summary) {
        this.currentSummary = summary;

        const fullCost = summary.fullRenderCost || (summary.fullRender ? summary.fullRender.computeUnits : 0);
        const fullSteps = summary.fullRenderSteps || 64;
        const totalFrames = summary.totalFrames || (summary.fullRender ? summary.fullRender.totalFrames : 0);

        const selCost = summary.selectiveRenderCost || (summary.selectiveRender ? summary.selectiveRender.computeUnits : 0);
        const selAvgSteps = summary.selectiveAvgSteps || (summary.selectiveRender ? summary.selectiveRender.avgStepsPerFrame : 0);

        const savings = summary.savingsPct !== undefined ? summary.savingsPct : (summary.savingsPercent || 0);
        const durationSec = summary.durationSec || summary.sessionDurationSec || 45;
        const avgFpsVal = summary.avgFps || (durationSec > 0 ? Math.round(totalFrames / durationSec) : 60);

        this.fullRenderCost.textContent = fullCost.toLocaleString();
        this.fullRenderSteps.textContent = fullSteps;
        this.fullRenderFrames.textContent = totalFrames.toLocaleString();

        this.selectiveRenderCost.textContent = selCost.toLocaleString();
        this.selectiveAvgSteps.textContent = selAvgSteps;
        this.selectiveFrames.textContent = totalFrames.toLocaleString();

        const savingsClamp = Math.max(0, Math.min(100, Math.round(savings * 10) / 10));
        this.savingsBar.style.width = `${savingsClamp}%`;
        this.savingsPercentage.textContent = `${savingsClamp}%`;
        this.savingsValue.textContent = `${savingsClamp}%`;

        this.sessionDuration.textContent = `${durationSec}s`;
        this.framesCaptured.textContent = totalFrames.toLocaleString();
        this.avgFps.textContent = `${avgFpsVal} FPS`;
        this.avgStepDensity.textContent = `${selAvgSteps} / ${fullSteps} steps`;

        // Render Step Trajectory SVG Chart
        this._renderStepChart(summary.timeSeries || []);
    }

    _renderStepChart(timeSeries) {
        if (!this.chartContainer) return;

        if (!timeSeries || timeSeries.length < 2) {
            this.chartContainer.innerHTML = `<p class="chart-empty-msg">Insufficient time-series data captured for graphing</p>`;
            return;
        }

        const width = 680;
        const height = 140;
        const padX = 40;
        const padY = 20;
        const graphW = width - 2 * padX;
        const graphH = height - 2 * padY;

        const maxT = timeSeries[timeSeries.length - 1].t || 45;
        const minT = timeSeries[0].t || 0;
        const spanT = Math.max(1, maxT - minT);

        const baselineY = padY + graphH * (1.0 - 64 / 70);

        // Build path points
        const points = timeSeries.map(pt => {
            const x = padX + ((pt.t - minT) / spanT) * graphW;
            const y = padY + graphH * (1.0 - Math.min(70, pt.steps) / 70);
            return `${x.toFixed(1)},${y.toFixed(1)}`;
        });

        const polylineStr = points.join(' ');
        const firstPoint = points[0].split(',');
        const lastPoint = points[points.length - 1].split(',');
        const areaStr = `${points.join(' ')} ${lastPoint[0]},${padY + graphH} ${firstPoint[0]},${padY + graphH}`;

        this.chartContainer.innerHTML = `
            <svg viewBox="0 0 ${width} ${height}" class="step-chart-svg">
                <!-- Grid Lines -->
                <line x1="${padX}" y1="${padY}" x2="${padX + graphW}" y2="${padY}" stroke="rgba(255,255,255,0.08)" stroke-dasharray="3,3"/>
                <line x1="${padX}" y1="${padY + graphH * 0.5}" x2="${padX + graphW}" y2="${padY + graphH * 0.5}" stroke="rgba(255,255,255,0.08)" stroke-dasharray="3,3"/>
                <line x1="${padX}" y1="${padY + graphH}" x2="${padX + graphW}" y2="${padY + graphH}" stroke="rgba(255,255,255,0.15)"/>

                <!-- Y Axis Labels -->
                <text x="${padX - 8}" y="${padY + 4}" fill="#64748b" font-size="10" text-anchor="end" font-family="monospace">64 (Fovea)</text>
                <text x="${padX - 8}" y="${padY + graphH * 0.5 + 4}" fill="#64748b" font-size="10" text-anchor="end" font-family="monospace">35</text>
                <text x="${padX - 8}" y="${padY + graphH + 4}" fill="#64748b" font-size="10" text-anchor="end" font-family="monospace">0</text>

                <!-- Baseline Reference Line (64 steps) -->
                <line x1="${padX}" y1="${baselineY}" x2="${padX + graphW}" y2="${baselineY}" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="4,4"/>

                <!-- Area Fill -->
                <polygon points="${areaStr}" fill="rgba(6, 182, 212, 0.12)"/>

                <!-- Step Curve -->
                <polyline points="${polylineStr}" fill="none" stroke="#06b6d4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;
    }

    _downloadTelemetry() {
        if (!this.currentSummary) return;

        const payload = {
            project: 'Gaze-Adaptive Level-of-Detail Renderer',
            venueTarget: 'Academic Research & Computer Vision Benchmark',
            exportedAt: new Date().toISOString(),
            summary: this.currentSummary
        };

        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `foveated_render_session_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    setOnRestart(callback) {
        this.onRestart = callback;
    }

    show() {
        this.container.style.display = 'block';
    }

    hide() {
        this.container.style.display = 'none';
    }

    reset() {
        this.savingsBar.style.width = '0%';
    }
}
