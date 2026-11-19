/**
 * CalibrationUI - Minimalist Academic Calibration Protocol
 * Clean, distraction-free target fixation and verification
 */

export class CalibrationUI {
    constructor(gazeEstimator, options = {}) {
        this.gazeEstimator = gazeEstimator;
        this.overlay = document.getElementById('calibration-overlay');
        this.point = document.getElementById('calibration-point');
        this.status = document.getElementById('calibration-status');

        this.pulseDuration = options.pulseDuration || 300;     // Saccade settling
        this.captureDuration = options.captureDuration || 700; // Fixation capture
        this.marginRatio = options.marginRatio || 0.12;

        this.features = [];
        this.targets = [];
        this.isRunning = false;

        this.onComplete = null;
        this.onProgress = null;
    }

    getCalibrationPoints() {
        const sw = window.innerWidth;
        const sh = window.innerHeight;
        const mx = Math.floor(sw * this.marginRatio);
        const my = Math.floor(sh * this.marginRatio);
        const gw = sw - 2 * mx;
        const gh = sh - 2 * my;

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
            <div class="cal-box">
                <div class="cal-title-row">
                    <h3>Gaze Calibration</h3>
                    <span class="mono-badge">9-POINT GRID</span>
                </div>

                <p class="cal-instructions-text">
                    Keep your head motionless. Look directly at each crosshair dot as it appears and hold steady until it advances.
                </p>

                <div class="cal-actions-row">
                    <button id="cancel-calibration-btn" class="sys-btn">Cancel</button>
                    <button id="skip-calibration-btn" class="sys-btn">Use Baseline Preset</button>
                    <button id="begin-calibration-btn" class="btn primary">Begin (12s)</button>
                </div>
            </div>
        `;
        this.overlay.appendChild(instructionDiv);
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

        this.point.innerHTML = `
            <div class="cal-dot-reticle">
                <div class="ring" id="cal-ring"></div>
                <div class="core"></div>
            </div>
        `;

        for (let cd = 3; cd >= 1; cd--) {
            if (!this.isRunning) return false;
            this.status.textContent = `Starting in ${cd}...`;
            await this._delay(600);
        }

        const ring = document.getElementById('cal-ring');

        for (let i = 0; i < points.length; i++) {
            if (!this.isRunning) break;
            const pt = points[i];

            this.point.style.left = `${pt.x}px`;
            this.point.style.top = `${pt.y}px`;

            if (ring) {
                ring.style.transition = 'none';
                ring.style.transform = 'scale(1.6)';
                ring.style.borderColor = 'rgba(9, 105, 218, 0.3)';
            }
            this.status.textContent = `Point ${i + 1} of ${points.length}`;
            await this._delay(this.pulseDuration);

            if (ring) {
                ring.style.transition = `transform ${this.captureDuration}ms linear, border-color ${this.captureDuration}ms ease`;
                ring.style.transform = 'scale(0.85)';
                ring.style.borderColor = '#0969da';
            }

            const captureStart = performance.now();
            let samplesThisPoint = 0;

            while (performance.now() - captureStart < this.captureDuration) {
                if (!this.isRunning) break;

                const results = await processFrame();
                if (results) {
                    const { features, blinkDetected } = this.gazeEstimator.extractFeatures(results);
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
            this.status.textContent = 'Fitting regression model...';
            await this._delay(150);

            const success = this.gazeEstimator.train(this.features, this.targets);
            if (success) {
                const proceed = await this._showVerificationScreen(processFrame);
                this.overlay.style.display = 'none';
                if (this.onComplete) this.onComplete(proceed);
                return proceed;
            }
        }

        this.status.textContent = 'Insufficient samples. Please retry.';
        await this._delay(1200);
        this.overlay.style.display = 'none';
        if (this.onComplete) this.onComplete(false);
        return false;
    }

    async _showVerificationScreen(processFrame) {
        return new Promise(resolve => {
            const diag = this.gazeEstimator.getModelDiagnostics();
            const maePx = Math.round(diag.maeTotal);
            const maeDeg = (maePx * 0.026).toFixed(1);
            const r2 = Math.max(0, (diag.r2X + diag.r2Y) * 0.5).toFixed(2);

            const verDiv = document.createElement('div');
            verDiv.id = 'calibration-verification';
            verDiv.className = 'calibration-verification-screen';
            verDiv.innerHTML = `
                <div class="cal-box verification">
                    <div class="cal-title-row">
                        <h3>Calibration Summary</h3>
                        <span class="mono-badge ok">FIT: R² = ${r2}</span>
                    </div>

                    <div class="ver-stats-row">
                        <div class="stat-pair">
                            <span class="k">Mean Error:</span>
                            <span class="v">${maePx} px (~${maeDeg}°)</span>
                        </div>
                        <div class="stat-pair">
                            <span class="k">Valid Samples:</span>
                            <span class="v">${diag.sampleCount}</span>
                        </div>
                    </div>

                    <div class="ver-target-box" id="ver-test-area">
                        <div class="ver-crosshair" id="ver-live-reticle"></div>
                        <span class="ver-hint-text">Look around to confirm gaze tracking alignment</span>
                    </div>

                    <div class="cal-actions-row">
                        <button id="recalibrate-btn" class="sys-btn">Recalibrate</button>
                        <button id="proceed-btn" class="btn primary">Proceed to Simulation</button>
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
