/**
 * 1-Euro Filter for Real-Time Gaze Smoothing and Saccade Prediction
 * Reference: Casiez, Roussel, Vogel (CHI 2012)
 *
 * Provides dynamic low-pass filtering:
 * - At low velocity (fixation): low cutoff frequency removes high-frequency jitter.
 * - At high velocity (saccades): cutoff frequency scales with speed to eliminate lag.
 * - Includes ballistic saccade prediction to compensate for webcam capture latency (~40ms).
 */

export class OneEuroFilter1D {
    constructor(minCutoff = 1.0, beta = 0.02, dCutoff = 1.0) {
        this.minCutoff = minCutoff; // Minimum cutoff frequency in Hz (fixation smoothness)
        this.beta = beta;           // Velocity coefficient (responsiveness during saccades)
        this.dCutoff = dCutoff;     // Derivative cutoff frequency in Hz

        this.xPrev = null;
        this.dxPrev = 0;
        this.tPrev = null;
    }

    _alpha(cutoff, dt) {
        const tau = 1.0 / (2.0 * Math.PI * cutoff);
        return 1.0 / (1.0 + tau / Math.max(dt, 1e-4));
    }

    filter(x, t = performance.now() / 1000) {
        if (this.tPrev === null) {
            this.xPrev = x;
            this.dxPrev = 0;
            this.tPrev = t;
            return x;
        }

        const dt = Math.max(t - this.tPrev, 1e-4);

        // Estimate derivative (velocity)
        const dx = (x - this.xPrev) / dt;
        const aD = this._alpha(this.dCutoff, dt);
        const dxHat = aD * dx + (1.0 - aD) * this.dxPrev;

        // Dynamic cutoff frequency based on velocity
        const cutoff = this.minCutoff + this.beta * Math.abs(dxHat);
        const a = this._alpha(cutoff, dt);
        const xHat = a * x + (1.0 - a) * this.xPrev;

        this.xPrev = xHat;
        this.dxPrev = dxHat;
        this.tPrev = t;

        return xHat;
    }

    reset() {
        this.xPrev = null;
        this.dxPrev = 0;
        this.tPrev = null;
    }
}

export class OneEuroFilter2D {
    constructor(options = {}) {
        const minCutoff = options.minCutoff !== undefined ? options.minCutoff : 1.0;
        const beta = options.beta !== undefined ? options.beta : 0.025;
        const dCutoff = options.dCutoff !== undefined ? options.dCutoff : 1.0;

        this.filterX = new OneEuroFilter1D(minCutoff, beta, dCutoff);
        this.filterY = new OneEuroFilter1D(minCutoff, beta, dCutoff);

        // Saccade lead compensation (typical webcam pipeline latency: ~40ms)
        this.leadTimeSeconds = options.leadTimeSeconds !== undefined ? options.leadTimeSeconds : 0.038;
        this.saccadeThresholdPxPerSec = options.saccadeThresholdPxPerSec || 800; // ~150 deg/s

        this.lastRawX = 0;
        this.lastRawY = 0;
        this.lastVelocity = 0;
        this.isSaccade = false;
    }

    setParameters(minCutoff, beta) {
        this.filterX.minCutoff = minCutoff;
        this.filterY.minCutoff = minCutoff;
        if (beta !== undefined) {
            this.filterX.beta = beta;
            this.filterY.beta = beta;
        }
    }

    update(x, y, t = performance.now() / 1000) {
        const smoothX = this.filterX.filter(x, t);
        const smoothY = this.filterY.filter(y, t);

        // Compute instantaneous velocity
        const vx = this.filterX.dxPrev;
        const vy = this.filterY.dxPrev;
        const speed = Math.hypot(vx, vy);
        this.lastVelocity = speed;

        // Detect saccade state
        this.isSaccade = speed > this.saccadeThresholdPxPerSec;

        // Apply ballistic lead extrapolation during saccades
        if (this.isSaccade) {
            const predX = smoothX + vx * this.leadTimeSeconds;
            const predY = smoothY + vy * this.leadTimeSeconds;
            return [predX, predY];
        }

        return [smoothX, smoothY];
    }

    getVelocity() {
        return this.lastVelocity;
    }

    isSaccadic() {
        return this.isSaccade;
    }

    reset() {
        this.filterX.reset();
        this.filterY.reset();
        this.lastVelocity = 0;
        this.isSaccade = false;
    }
}
