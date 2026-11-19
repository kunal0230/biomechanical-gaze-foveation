/**
 * CalibrationUI - Research Calibration Protocol with Real-Time Verification
 * 
 * Features:
 * - Multi-protocol grids: 9-Point Standard, 5-Point Express, 13-Point Precision
 * - Saccade settling grace period (350ms) to ensure steady fixation
 * - Dynamic countdown reticle with concentric convergence
 * - Post-calibration verification screen with live crosshair and MAE metrics
 * - Emoji-free, high-contrast scientific interface
 */

export class CalibrationUI {
    constructor(gazeEstimator, options = {}) {
        this.gazeEstimator = gazeEstimator;
        this.overlay = document.getElementById('calibration-overlay');
        this.point = document.getElementById('calibration-point');
        this.status = document.getElementById('calibration-status');

        this.pulseDuration = options.pulseDuration || 350;    // Saccade settling
        this.captureDuration = options.captureDuration || 750; // Stable fixation capture
        this.marginRatio = options.marginRatio || 0.12;

        this.features = [];
        this.targets = [];
        this.currentMode = '9point'; // '5point' | '9point' | '13point'
        this.isRunning = false;

        this.onComplete = null;
        this.onProgress = null;
    }

    setMode(mode) {
        if (['5point', '9point', '13point'].includes(mode)) {
            this.currentMode = mode;
        }
    }

    getCalibrationPoints() {
        const sw = window.innerWidth;
        const sh = window.innerHeight;
        const mx = Math.floor(sw * this.marginRatio);
        const my = Math.floor(sh * this.marginRatio);
        const gw = sw - 2 * mx;
        const gh = sh - 2 * my;

        if (this.currentMode === '5point') {
            return [
                { x: Math.floor(sw * 0.5), y: Math.floor(sh * 0.5), label: 'Center' },
                { x: mx, y: my, label: 'Top-Left' },
                { x: mx + gw, y: my, label: 'Top-Right' },
                { x: mx, y: my + gh, label: 'Bottom-Left' },
                { x: mx + gw, y: my + gh, label: 'Bottom-Right' },
            ];
        }

        if (this.currentMode === '13point') {
            const stepX = gw / 2;
            const stepY = gh / 2;
            const innerX = gw / 4;
            const innerY = gh / 4;

            return [
                { x: Math.floor(sw * 0.5), y: Math.floor(sh * 0.5) }, // Center
                { x: mx, y: my },                                      // TL
                { x: mx + gw, y: my },                                 // TR
                { x: mx, y: my + gh },                                 // BL
                { x: mx + gw, y: my + gh },                            // BR
                { x: mx + stepX, y: my },                              // TC
                { x: mx, y: my + stepY },                              // LC
                { x: mx + gw, y: my + stepY },                         // RC
                { x: mx + stepX, y: my + gh },                         // BC
                { x: mx + innerX, y: my + innerY },                    // Inner TL
                { x: mx + gw - innerX, y: my + innerY },               // Inner TR
                { x: mx + innerX, y: my + gh - innerY },               // Inner BL
                { x: mx + gw - innerX, y: my + gh - innerY },          // Inner BR
            ];
        }

        // Default: 9-point grid
        const order = [
            [1, 1], // Center
            [0, 0], // Top-Left
            [2, 0], // Top-Right
            [0, 2], // Bottom-Left
            [2, 2], // Bottom-Right
            [1, 0], // Top-Center
            [0, 1], // Left-Center
            [2, 1], // Right-Center
            [1, 2], // Bottom-Center
        ];

        const stepX = gw / 2;
        const stepY = gh / 2;

        return order.map(([r, c]) => ({
            x: mx + Math.floor(c * stepX),
            y: my + Math.floor(r * stepY),
        }));
    }

    async start(processFrame) {
        this.features = [];
        this.targets = [];

        this.overlay.style.display = 'block';
        this.overlay.classList.remove('hidden');
        this.point.style.display = 'none';
        this.status.style.display = 'none';

        this._showInstructions();
        const action = await this._waitForInstructionsAction();
        this._hideInstructions();

        if (action === 'skip') {
            this.overlay.style.display = 'none';
            if (this.onComplete) this.onComplete(true);
            return true;
        }

        if (action === 'cancel') {
            this.overlay.style.display = 'none';
            if (this.onComplete) this.onComplete(false);
            return false;
        }

        return await this._runCalibration(processFrame);
    }

    _showInstructions() {
        const existing = document.getElementById('calibration-instructions');
        if (existing) existing.remove();

        const instructionDiv = document.createElement('div');
        instructionDiv.id = 'calibration-instructions';
        instructionDiv.className = 'calibration-instructions-modal';
        instructionDiv.innerHTML = `
            <div class="cal-card">
                <div class="cal-header">
                    <h2>Calibration Protocol</h2>
                    <span class="protocol-badge">${this.currentMode.toUpperCase()}</span>
                </div>

                <p class="cal-desc">
                    To accurately map iris excursions to screen space, fixate on each target node. 
                    Keep your head motionless and track using eye movements exclusively.
                </p>

                <div class="cal-steps-grid">
                    <div class="cal-step-item">
                        <span class="step-index">01</span>
                        <div class="step-body">
                            <strong>Head Stabilization</strong>
                            <span>Position head 50-65 cm from screen, centered within camera bounds.</span>
                        </div>
                    </div>
                    <div class="cal-step-item">
                        <span class="step-index">02</span>
                        <div class="step-body">
                            <strong>Visual Fixation</strong>
                            <span>A reticle dot appears at grid coordinates. Focus sharply on the central crosshair.</span>
                        </div>
                    </div>
                    <div class="cal-step-item">
                        <span class="step-index">03</span>
                        <div class="step-body">
                            <strong>Convergence Hold</strong>
                            <span>Hold gaze steady while the outer ring converges to lock the coordinate sample.</span>
                        </div>
                    </div>
                </div>

                <div class="cal-mode-selector">
                    <span class="mode-label">Grid Density:</span>
                    <button class="mode-btn ${this.currentMode === '5point' ? 'active' : ''}" data-mode="5point">5-Point Express (8s)</button>
                    <button class="mode-btn ${this.currentMode === '9point' ? 'active' : ''}" data-mode="9point">9-Point Standard (14s)</button>
                    <button class="mode-btn ${this.currentMode === '13point' ? 'active' : ''}" data-mode="13point">13-Point Precision (20s)</button>
                </div>

                <div class="cal-actions">
                    <button id="cancel-calibration-btn" class="cal-btn secondary">Cancel</button>
                    <button id="skip-calibration-btn" class="cal-btn tertiary">Use Preset Baseline</button>
                    <button id="begin-calibration-btn" class="cal-btn primary">Begin Calibration</button>
                </div>
            </div>
        `;
        this.overlay.appendChild(instructionDiv);

        instructionDiv.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                instructionDiv.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.setMode(btn.dataset.mode);
                const badge = instructionDiv.querySelector('.protocol-badge');
                if (badge) badge.textContent = this.currentMode.toUpperCase();
            });
        });
    }

    _hideInstructions() {
        const instructionDiv = document.getElementById('calibration-instructions');
        if (instructionDiv) instructionDiv.remove();
        this.point.style.display = 'block';
        this.status.style.display = 'block';
    }

    _waitForInstructionsAction() {
        return new Promise(resolve => {
            const beginBtn = document.getElementById('begin-calibration-btn');
            const skipBtn = document.getElementById('skip-calibration-btn');
            const cancelBtn = document.getElementById('cancel-calibration-btn');

            if (beginBtn) beginBtn.addEventListener('click', () => resolve('begin'), { once: true });
            if (skipBtn) skipBtn.addEventListener('click', () => resolve('skip'), { once: true });
            if (cancelBtn) cancelBtn.addEventListener('click', () => resolve('cancel'), { once: true });
        });
    }

    async _runCalibration(processFrame) {
        this.isRunning = true;
        const points = this.getCalibrationPoints();

        // High-contrast precision reticle styling
        this.point.innerHTML = `
            <div class="cal-reticle">
                <div class="reticle-ring" id="reticle-ring"></div>
                <div class="reticle-center"></div>
            </div>
        `;

        // 3-second countdown
        for (let cd = 3; cd >= 1; cd--) {
            if (!this.isRunning) return false;
            this.status.textContent = `Initialization in ${cd}...`;
            await this._delay(650);
        }

        const ring = document.getElementById('reticle-ring');

        for (let i = 0; i < points.length; i++) {
            if (!this.isRunning) break;
            const pt = points[i];

            // Position reticle
            this.point.style.left = `${pt.x}px`;
            this.point.style.top = `${pt.y}px`;

            // Phase 1: Saccade settling
            if (ring) {
                ring.style.transition = 'none';
                ring.style.transform = 'scale(1.8)';
                ring.style.borderColor = 'rgba(6, 182, 212, 0.4)';
            }
            this.status.textContent = `Target ${i + 1}/${points.length} - Fixate on center`;
            await this._delay(this.pulseDuration);

            // Phase 2: Convergence and coordinate capture
            if (ring) {
                ring.style.transition = `transform ${this.captureDuration}ms linear, border-color ${this.captureDuration}ms ease`;
                ring.style.transform = 'scale(0.85)';
                ring.style.borderColor = '#06b6d4';
            }
            this.status.textContent = `Target ${i + 1}/${points.length} - Hold steady`;

            const captureStart = performance.now();
            let samplesThisPoint = 0;

            while (performance.now() - captureStart < this.captureDuration) {
                if (!this.isRunning) break;

                const results = await processFrame();
                if (results) {
                    const { features, blinkDetected } = this.gazeEstimator.extractFeatures(results);
                    // Filter out blinks and erratic frames
                    if (features && !blinkDetected) {
                        this.features.push(features);
                        this.targets.push([pt.x, pt.y]);
                        samplesThisPoint++;
                    }
                }
                await this._delay(30);
            }

            if (this.onProgress) {
                this.onProgress({
                    point: i + 1,
                    totalPoints: points.length,
                    samples: samplesThisPoint,
                    totalSamples: this.features.length,
                });
            }
        }

        this.point.style.display = 'none';

        if (this.features.length >= 15) {
            this.status.textContent = 'Fitting regularized ridge model...';
            await this._delay(150);

            const success = this.gazeEstimator.train(this.features, this.targets);
            if (success) {
                // Show Verification and Diagnostics Screen
                const proceed = await this._showVerificationScreen(processFrame);
                this.overlay.style.display = 'none';
                if (this.onComplete) this.onComplete(proceed);
                return proceed;
            }
        }

        this.status.textContent = 'Insufficient stable samples. Please retry.';
        await this._delay(1500);
        this.overlay.style.display = 'none';
        if (this.onComplete) this.onComplete(false);
        return false;
    }

    /**
     * Interactive Post-Calibration Verification Screen
     * Displays calculated MAE, R^2, and lets user verify tracking accuracy with a live crosshair
     */
    async _showVerificationScreen(processFrame) {
        return new Promise(resolve => {
            const diag = this.gazeEstimator.getModelDiagnostics();
            const maePx = Math.round(diag.maeTotal);
            // Convert pixels to approximate visual degrees on standard laptop screen (1px ~ 0.026 deg at 55cm)
            const maeDeg = (maePx * 0.026).toFixed(1);
            const r2Score = Math.max(0, (diag.r2X + diag.r2Y) * 0.5).toFixed(2);

            const verDiv = document.createElement('div');
            verDiv.id = 'calibration-verification';
            verDiv.className = 'calibration-verification-screen';
            verDiv.innerHTML = `
                <div class="ver-card">
                    <div class="ver-header">
                        <h2>Calibration Verified</h2>
                        <span class="ver-score">Score: ${diag.conditionScore}/100</span>
                    </div>

                    <div class="ver-metrics-grid">
                        <div class="ver-metric">
                            <span class="ver-val">${maePx} px</span>
                            <span class="ver-lbl">Mean Absolute Error</span>
                        </div>
                        <div class="ver-metric">
                            <span class="ver-val">~${maeDeg}°</span>
                            <span class="ver-lbl">Visual Angle Error</span>
                        </div>
                        <div class="ver-metric">
                            <span class="ver-val">${r2Score}</span>
                            <span class="ver-lbl">R² Correlation Fit</span>
                        </div>
                        <div class="ver-metric">
                            <span class="ver-val">${diag.sampleCount}</span>
                            <span class="ver-lbl">Valid Samples</span>
                        </div>
                    </div>

                    <div class="ver-test-area" id="ver-test-area">
                        <div class="ver-reticle" id="ver-live-reticle"></div>
                        <p class="ver-hint">Look around screen to test live gaze tracking</p>
                    </div>

                    <div class="ver-actions">
                        <button id="recalibrate-btn" class="cal-btn secondary">Recalibrate</button>
                        <button id="proceed-btn" class="cal-btn primary">Proceed to Simulation</button>
                    </div>
                </div>
            `;
            this.overlay.appendChild(verDiv);

            const liveReticle = document.getElementById('ver-live-reticle');
            let isVerifying = true;

            const updateVerificationLoop = async () => {
                if (!isVerifying) return;
                const results = await processFrame();
                if (results) {
                    const { features, blinkDetected } = this.gazeEstimator.extractFeatures(results);
                    if (features && !blinkDetected) {
                        const [px, py] = this.gazeEstimator.predict(features);
                        if (liveReticle) {
                            liveReticle.style.left = `${Math.max(10, Math.min(window.innerWidth - 10, px))}px`;
                            liveReticle.style.top = `${Math.max(10, Math.min(window.innerHeight - 10, py))}px`;
                        }
                    }
                }
                requestAnimationFrame(updateVerificationLoop);
            };
            requestAnimationFrame(updateVerificationLoop);

            document.getElementById('proceed-btn').addEventListener('click', () => {
                isVerifying = false;
                verDiv.remove();
                resolve(true);
            }, { once: true });

            document.getElementById('recalibrate-btn').addEventListener('click', () => {
                isVerifying = false;
                verDiv.remove();
                resolve(false);
            }, { once: true });
        });
    }

    cancel() {
        this.isRunning = false;
        this._hideInstructions();
        this.overlay.style.display = 'none';
    }

    _delay(ms) {
        return new Promise(r => setTimeout(r, ms));
    }
}
