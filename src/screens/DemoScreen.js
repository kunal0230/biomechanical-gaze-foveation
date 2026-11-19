/**
 * DemoScreen - Raymarching Simulation Screen with Real-Time HUD
 * Utilitarian, distraction-free interface for visual testing and parameter adjustment
 */

export class DemoScreen {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.onTimerEnd = null;
        this.onDebugToggle = null;
        this.onPauseToggle = null;
        this.onFoveaRadiusChange = null;
        this.onRingsToggle = null;

        this.timerInterval = null;
        this.remainingTime = 45;
        this.isRunning = false;
        this.isPaused = false;
        this.gazeMode = 'camera';

        this._createLayout();
    }

    _createLayout() {
        this.container.innerHTML = `
            <div class="demo-screen">
                <canvas id="render-canvas"></canvas>
                
                <div class="demo-overlay">
                    <!-- Top Telemetry Bar -->
                    <div class="demo-top-bar">
                        <div class="timer-cluster">
                            <div class="timer-box" id="timer-display">
                                <span class="t-val" id="timer-value">45</span>
                                <span class="t-unit">s</span>
                            </div>
                            <button class="icon-btn" id="pause-button" title="Pause / Resume Session">
                                <span id="pause-btn-text">Pause</span>
                            </button>
                        </div>

                        <div class="hud-cluster">
                            <div class="hud-stat">
                                <span class="k">FPS:</span>
                                <span class="v" id="hud-fps">60</span>
                            </div>
                            <div class="hud-divider">|</div>
                            <div class="hud-stat">
                                <span class="k">Steps:</span>
                                <span class="v" id="hud-steps">28.5 / 64</span>
                            </div>
                            <div class="hud-divider">|</div>
                            <div class="hud-stat highlight">
                                <span class="k">Workload Saved:</span>
                                <span class="v" id="hud-savings">52%</span>
                            </div>
                        </div>

                        <div class="top-action">
                            <button class="sys-btn" id="finish-early-btn">End Session</button>
                        </div>
                    </div>
                    
                    <!-- Bottom Parameter Controls Bar -->
                    <div class="demo-controls-bar">
                        <div class="ctrl-item">
                            <label for="fovea-slider">Fovea Radius</label>
                            <input type="range" id="fovea-slider" min="0.08" max="0.28" step="0.01" value="0.16">
                            <span id="fovea-value" class="mono-num">0.16</span>
                        </div>

                        <div class="ctrl-item">
                            <label for="smoothing-slider">Filter Smoothing</label>
                            <input type="range" id="smoothing-slider" min="0.5" max="3.0" step="0.1" value="1.0">
                            <span id="smoothing-value" class="mono-num">1.0</span>
                        </div>
                        
                        <label class="ctrl-checkbox">
                            <input type="checkbox" id="show-heatmap">
                            <span>Heatmap</span>
                        </label>

                        <label class="ctrl-checkbox">
                            <input type="checkbox" id="show-rings">
                            <span>Reticle Rings (2°/5°)</span>
                        </label>
                        
                        <label class="ctrl-checkbox">
                            <input type="checkbox" id="show-gaze" checked>
                            <span>Gaze Point</span>
                        </label>
                        
                        <label class="ctrl-checkbox">
                            <input type="checkbox" id="debug-mode">
                            <span>Telemetry</span>
                        </label>
                    </div>
                    
                    <!-- Gaze Reticle -->
                    <div class="gaze-reticle" id="gaze-indicator">
                        <div class="reticle-dot"></div>
                        <div class="reticle-cross-h"></div>
                        <div class="reticle-cross-v"></div>
                    </div>
                </div>
            </div>
        `;

        this.canvas = document.getElementById('render-canvas');
        this.timerDisplay = document.getElementById('timer-display');
        this.timerValue = document.getElementById('timer-value');
        this.pauseButton = document.getElementById('pause-button');
        this.pauseBtnText = document.getElementById('pause-btn-text');
        this.finishEarlyBtn = document.getElementById('finish-early-btn');

        this.hudFps = document.getElementById('hud-fps');
        this.hudSteps = document.getElementById('hud-steps');
        this.hudSavings = document.getElementById('hud-savings');

        this.foveaSlider = document.getElementById('fovea-slider');
        this.foveaValue = document.getElementById('fovea-value');
        this.smoothingSlider = document.getElementById('smoothing-slider');
        this.smoothingValue = document.getElementById('smoothing-value');
        this.showHeatmap = document.getElementById('show-heatmap');
        this.showRings = document.getElementById('show-rings');
        this.showGaze = document.getElementById('show-gaze');
        this.debugMode = document.getElementById('debug-mode');
        this.gazeIndicator = document.getElementById('gaze-indicator');

        // Event listeners
        this.foveaSlider.addEventListener('input', () => {
            const val = parseFloat(this.foveaSlider.value);
            this.foveaValue.textContent = val.toFixed(2);
            if (this.onFoveaRadiusChange) this.onFoveaRadiusChange(val);
        });

        this.smoothingSlider.addEventListener('input', () => {
            this.smoothingValue.textContent = parseFloat(this.smoothingSlider.value).toFixed(1);
        });

        this.pauseButton.addEventListener('click', () => {
            this.togglePause();
        });

        this.finishEarlyBtn.addEventListener('click', () => {
            this.stopTimer();
            if (this.onTimerEnd) this.onTimerEnd();
        });

        this.showGaze.addEventListener('change', () => {
            this.gazeIndicator.style.display = this.showGaze.checked ? 'block' : 'none';
        });

        this.showRings.addEventListener('change', () => {
            if (this.onRingsToggle) this.onRingsToggle(this.showRings.checked);
        });

        this.debugMode.addEventListener('change', () => {
            if (this.onDebugToggle) {
                this.onDebugToggle(this.debugMode.checked);
            }
        });
    }

    setGazeMode(mode) {
        this.gazeMode = mode;
    }

    getCanvas() {
        return this.canvas;
    }

    getSmoothing() {
        return parseFloat(this.smoothingSlider.value);
    }

    getFoveaRadius() {
        return parseFloat(this.foveaSlider.value);
    }

    shouldShowHeatmap() {
        return this.showHeatmap.checked;
    }

    shouldShowRings() {
        return this.showRings.checked;
    }

    isDebugMode() {
        return this.debugMode.checked;
    }

    updateHud(fps, avgSteps, savingsPct) {
        if (this.hudFps) this.hudFps.textContent = Math.round(fps);
        if (this.hudSteps) this.hudSteps.textContent = `${avgSteps.toFixed(1)} / 64`;
        if (this.hudSavings) this.hudSavings.textContent = `${Math.round(savingsPct)}%`;
    }

    updateGazePosition(x, y) {
        if (this.showGaze.checked && this.gazeIndicator) {
            this.gazeIndicator.style.left = `${x * 100}%`;
            this.gazeIndicator.style.top = `${y * 100}%`;
        }
    }

    startTimer() {
        this.remainingTime = 45;
        this.isRunning = true;
        this.isPaused = false;
        this._updateTimerDisplay();
        this._updatePauseButton();

        if (this.timerInterval) clearInterval(this.timerInterval);

        this.timerInterval = setInterval(() => {
            if (!this.isPaused) {
                this.remainingTime--;
                this._updateTimerDisplay();

                if (this.remainingTime <= 0) {
                    this.stopTimer();
                    if (this.onTimerEnd) {
                        this.onTimerEnd();
                    }
                }
            }
        }, 1000);
    }

    stopTimer() {
        this.isRunning = false;
        this.isPaused = false;
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        this._updatePauseButton();
    }

    togglePause() {
        if (!this.isRunning) return;
        this.isPaused = !this.isPaused;
        this._updatePauseButton();

        if (this.onPauseToggle) {
            this.onPauseToggle(this.isPaused);
        }
    }

    _updatePauseButton() {
        if (this.pauseBtnText) {
            this.pauseBtnText.textContent = this.isPaused ? 'Resume' : 'Pause';
        }
        if (this.pauseButton) {
            this.pauseButton.classList.toggle('active', this.isPaused);
        }
    }

    _updateTimerDisplay() {
        if (this.timerValue) this.timerValue.textContent = this.remainingTime;
        if (this.remainingTime <= 5) {
            this.timerDisplay.classList.add('warn');
        } else {
            this.timerDisplay.classList.remove('warn');
        }
    }

    setOnTimerEnd(callback) {
        this.onTimerEnd = callback;
    }

    setOnDebugToggle(callback) {
        this.onDebugToggle = callback;
    }

    setOnPauseToggle(callback) {
        this.onPauseToggle = callback;
    }

    setOnFoveaRadiusChange(callback) {
        this.onFoveaRadiusChange = callback;
    }

    setOnRingsToggle(callback) {
        this.onRingsToggle = callback;
    }

    show() {
        this.container.style.display = 'block';
    }

    hide() {
        this.container.style.display = 'none';
        this.stopTimer();
    }

    reset() {
        this.remainingTime = 45;
        this.isPaused = false;
        this._updateTimerDisplay();
        this._updatePauseButton();
        this.showHeatmap.checked = false;
        this.showRings.checked = false;
        this.showGaze.checked = true;
        this.debugMode.checked = false;
        this.gazeIndicator.style.display = 'block';
    }
}
