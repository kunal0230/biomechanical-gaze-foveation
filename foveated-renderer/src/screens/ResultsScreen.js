/**
 * ResultsScreen - Research Session Analytics Dashboard
 * Structured scientific evaluation report comparing uniform baseline vs gaze-adaptive LOD compute costs.
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
                    <h2>Session Evaluation Report</h2>
                    <span class="sub-label">Uniform Raymarching Baseline vs Gaze-Adaptive LOD Evaluation</span>
                </header>
                
                <div class="results-layout">
                    <!-- Metrics Comparison Grid -->
                    <div class="metrics-grid">
                        <div class="metric-panel">
                            <span class="panel-tag">BASELINE (UNIFORM)</span>
                            <div class="metric-main" id="full-render-cost">--</div>
                            <span class="metric-unit">Compute Units</span>
                            <div class="metric-detail">
                                <span id="full-render-steps">64</span> steps/ray &times; <span id="full-render-frames">2,700</span> frames
                            </div>
                        </div>
                        
                        <div class="metric-panel foveated">
                            <span class="panel-tag highlight">GAZE-ADAPTIVE (LOD)</span>
                            <div class="metric-main highlight" id="selective-render-cost">--</div>
                            <span class="metric-unit">Compute Units</span>
                            <div class="metric-detail">
                                Avg <span id="selective-avg-steps">--</span> steps/ray &times; <span id="selective-frames">--</span> frames
                            </div>
                        </div>

                        <div class="metric-panel savings">
                            <span class="panel-tag">WORKLOAD REDUCTION</span>
                            <div class="metric-main green" id="savings-percentage">0%</div>
                            <span class="metric-unit">Shader ALU & Raymarch Savings</span>
                            <div class="savings-meter">
                                <div class="savings-fill" id="savings-bar"></div>
                            </div>
                        </div>
                    </div>

                    <!-- Step Trajectory Plot -->
                    <div class="chart-box">
                        <div class="chart-header">
                            <span class="chart-title">Raymarching Step Budget Over Time (s)</span>
                            <span class="chart-legend">Baseline: 64 steps (dashed) | Measured: Solid</span>
                        </div>
                        <div class="chart-svg-container" id="svg-chart-container"></div>
                    </div>
                    
                    <!-- Session Diagnostics Table -->
                    <div class="diagnostics-table">
                        <div class="diag-cell">
                            <span class="diag-k">Trial Duration:</span>
                            <span class="diag-v" id="session-duration">45s</span>
                        </div>
                        <div class="diag-cell">
                            <span class="diag-k">Total Frames:</span>
                            <span class="diag-v" id="frames-captured">--</span>
                        </div>
                        <div class="diag-cell">
                            <span class="diag-k">Mean Framerate:</span>
                            <span class="diag-v" id="avg-fps">--</span>
                        </div>
                        <div class="diag-cell">
                            <span class="diag-k">Mean Ray Steps:</span>
                            <span class="diag-v" id="avg-step-density">--</span>
                        </div>
                    </div>
                    
                    <!-- Actions -->
                    <div class="results-actions">
                        <button class="sys-btn" id="export-json-btn">Export Data (JSON)</button>
                        <button class="btn primary" id="try-again-btn">Run New Session</button>
                    </div>
                </div>
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
        const avgFpsVal = summary.avgFps || (durationSec > 0 ? (totalFrames / durationSec).toFixed(1) : 60);

        this.fullRenderCost.textContent = fullCost.toLocaleString();
        this.fullRenderSteps.textContent = fullSteps;
        this.fullRenderFrames.textContent = totalFrames.toLocaleString();

        this.selectiveRenderCost.textContent = selCost.toLocaleString();
        this.selectiveAvgSteps.textContent = typeof selAvgSteps === 'number' ? selAvgSteps.toFixed(1) : selAvgSteps;
        this.selectiveFrames.textContent = totalFrames.toLocaleString();

        const savingsClamp = Math.max(0, Math.min(100, Math.round(savings * 10) / 10));
        this.savingsBar.style.width = `${savingsClamp}%`;
        this.savingsPercentage.textContent = `${savingsClamp}%`;

        this.sessionDuration.textContent = `${durationSec}s`;
        this.framesCaptured.textContent = totalFrames.toLocaleString();
        this.avgFps.textContent = `${avgFpsVal} FPS`;
        this.avgStepDensity.textContent = `${typeof selAvgSteps === 'number' ? selAvgSteps.toFixed(1) : selAvgSteps} / ${fullSteps}`;

        this._renderStepChart(summary.timeSeries || []);
    }

    _renderStepChart(timeSeries) {
        if (!this.chartContainer) return;

        if (!timeSeries || timeSeries.length < 2) {
            this.chartContainer.innerHTML = `<span class="chart-empty">Insufficient samples captured</span>`;
            return;
        }

        const width = 640;
        const height = 120;
        const padX = 35;
        const padY = 15;
        const graphW = width - 2 * padX;
        const graphH = height - 2 * padY;

        const maxT = timeSeries[timeSeries.length - 1].t || 45;
        const minT = timeSeries[0].t || 0;
        const spanT = Math.max(1, maxT - minT);

        const baselineY = padY + graphH * (1.0 - 64 / 70);

        const points = timeSeries.map(pt => {
            const x = padX + ((pt.t - minT) / spanT) * graphW;
            const y = padY + graphH * (1.0 - Math.min(70, pt.steps) / 70);
            return `${x.toFixed(1)},${y.toFixed(1)}`;
        });

        const polylineStr = points.join(' ');

        this.chartContainer.innerHTML = `
            <svg viewBox="0 0 ${width} ${height}" class="chart-svg">
                <!-- Axes -->
                <line x1="${padX}" y1="${padY + graphH}" x2="${padX + graphW}" y2="${padY + graphH}" stroke="#d0d7de" stroke-width="1"/>
                <line x1="${padX}" y1="${padY}" x2="${padX}" y2="${padY + graphH}" stroke="#d0d7de" stroke-width="1"/>

                <!-- Y Labels -->
                <text x="${padX - 6}" y="${padY + 4}" fill="#6e7781" font-size="9" text-anchor="end" font-family="monospace">64</text>
                <text x="${padX - 6}" y="${padY + graphH * 0.5 + 3}" fill="#6e7781" font-size="9" text-anchor="end" font-family="monospace">35</text>
                <text x="${padX - 6}" y="${padY + graphH}" fill="#6e7781" font-size="9" text-anchor="end" font-family="monospace">0</text>

                <!-- Baseline Reference -->
                <line x1="${padX}" y1="${baselineY}" x2="${padX + graphW}" y2="${baselineY}" stroke="#cf222e" stroke-width="1" stroke-dasharray="3,3"/>

                <!-- Measured Step Curve -->
                <polyline points="${polylineStr}" fill="none" stroke="#0969da" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;
    }

    _downloadTelemetry() {
        if (!this.currentSummary) return;

        const payload = {
            system: 'Gaze-Adaptive Foveated Renderer',
            timestamp: new Date().toISOString(),
            metrics: this.currentSummary
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
