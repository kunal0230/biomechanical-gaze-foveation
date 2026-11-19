/**
 * DemoScreen - Interactive Real-Time Raymarching Simulation Screen
 * 45-second timed research session with telemetry HUD, shader parameter controls, and presentation simulator
 */

export class DemoScreen {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.onTimerEnd = null;
        this.onDebugToggle = null;
        this.onPauseToggle = null;
        this.onFoveaRadiusChange = null;
        this.onRingsToggle = null;
        this.onEarlyFinish = null;

        this.timerInterval = null;
        this.remainingTime = 45;
        this.isRunning = false;
        this.isPaused = false;
        this.gazeMode = 'camera'; // 'camera' | 'simulator'

        this._createLayout();
    }

    _createLayout() {
        this.container.innerHTML = `
            <div class="demo-screen">
                <canvas id="render-canvas"></canvas>
                
                <div class="demo-overlay">
                    <!-- Top Telemetry Header Bar -->
                    <div class="demo-top-bar">
                        <div class="timer-container">
                            <div class="timer-display" id="timer-display">
                                <svg class="hud-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <polyline points="12 6 12 12 16 14"></polyline>
                                </svg>
                                <span class="timer-value" id="timer-value">45</span>
                                <span class="timer-label">SEC</span>
                            </div>
                            <button class="pause-button" id="pause-button" title="Pause / Resume Session">
                                <svg id="pause-icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                    <rect x="6" y="4" width="4" height="16"></rect>
                                    <rect x="14" y="4" width="4" height="16"></rect>
                                </svg>
                            </button>
                        </div>

                        <!-- Live Real-Time Telemetry HUD -->
                        <div class="telemetry-hud-pills">
                            <div class="hud-pill">
                                <span class="hud-label">FPS:</span>
                                <span class="hud-val" id="hud-fps">60</span>
                            </div>
                            <div class="hud-pill">
                                <span class="hud-label">RAY STEPS:</span>
                                <span class="hud-val" id="hud-steps">28.4 / 64</span>
                            </div>
                            <div class="hud-pill highlight">
                                <span class="hud-label">GPU WORKLOAD SAVED:</span>
                                <span class="hud-val" id="hud-savings">52%</span>
                            </div>
                        </div>

                        <div class="demo-top-actions">
                            <button class="cal-btn tertiary small" id="finish-early-btn">
                                End Session & Analyze
                            </button>
                        </div>
                    </div>
                    
                    <!-- Bottom Parameter Controls Drawer -->
                    <div class="demo-controls-bar">
                        <div class="control-group">
                            <label for="fovea-slider">Fovea Radius</label>
                            <input type="range" id="fovea-slider" min="0.08" max="0.28" step="0.01" value="0.16">
                            <span id="fovea-value" class="slider-val">0.16</span>
                        </div>

                        <div class="control-group">
                            <label for="smoothing-slider">Filter Responsiveness</label>
                            <input type="range" id="smoothing-slider" min="0.5" max="3.0" step="0.1" value="1.0">
                            <span id="smoothing-value" class="slider-val">1.0</span>
                        </div>
                        
                        <div class="control-group checkbox-group">
                            <input type="checkbox" id="show-heatmap">
                            <label for="show-heatmap">Compute Heatmap</label>
                        </div>

                        <div class="control-group checkbox-group">
                            <input type="checkbox" id="show-rings">
                            <label for="show-rings">Visual Angle Rings (2°/5°)</label>
                        </div>
                        
                        <div class="control-group checkbox-group">
                            <input type="checkbox" id="show-gaze" checked>
                            <label for="show-gaze">Gaze Reticle</label>
                        </div>
                        
                        <div class="control-group checkbox-group">
                            <input type="checkbox" id="debug-mode">
                            <label for="debug-mode">Telemetry Inspector</label>
                        </div>
                    </div>
                    
                    <!-- Gaze Crosshair Reticle -->
                    <div class="gaze-indicator" id="gaze-indicator">
                        <div class="gaze-reticle-inner"></div>
                        <div class="gaze-reticle-ring"></div>
                    </div>
                </div>
            </div>
        `;

        this.canvas = document.getElementById('render-canvas');
        this.timerDisplay = document.getElementById('timer-display');
        this.timerValue = document.getElementById('timer-value');
        this.pauseButton = document.getElementById('pause-button');
        this.pauseIconSvg = document.getElementById('pause-icon-svg');
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
        if (this.pauseIconSvg) {
            if (this.isPaused) {
                // Play icon
                this.pauseIconSvg.innerHTML = `<polygon points="5 3 19 12 5 21 5 3"></polygon>`;
            } else {
                // Pause icon
                this.pauseIconSvg.innerHTML = `<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>`;
            }
        }
        if (this.pauseButton) {
            this.pauseButton.title = this.isPaused ? 'Resume Session' : 'Pause Session';
            this.pauseButton.classList.toggle('paused', this.isPaused);
        }
        if (this.timerDisplay) {
            this.timerDisplay.classList.toggle('paused', this.isPaused);
        }
    }

    _updateTimerDisplay() {
        if (this.timerValue) this.timerValue.textContent = this.remainingTime;
        if (this.remainingTime <= 10) {
            this.timerDisplay.classList.add('warning');
        }
        if (this.remainingTime <= 5) {
            this.timerDisplay.classList.add('critical');
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
        this.timerDisplay.classList.remove('warning', 'critical', 'paused');
        this._updateTimerDisplay();
        this._updatePauseButton();
        this.showHeatmap.checked = false;
        this.showRings.checked = false;
        this.showGaze.checked = true;
        this.debugMode.checked = false;
        this.gazeIndicator.style.display = 'block';
    }
}
