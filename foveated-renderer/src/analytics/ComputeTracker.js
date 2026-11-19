/**
 * ComputeTracker - Academic Analytics & GPU Compute Profiling
 * 
 * Computes:
 * - Uniform Full-Quality Baseline Workload vs Foveated Adaptive Workload
 * - Percentage GPU Compute Workload Reduction
 * - Time-series step trajectory for SVG graph rendering
 * - LOD Zone Distribution Histogram (Fovea, Parafovea, Periphery)
 * - Research telemetry export (JSON)
 */

export class ComputeTracker {
    constructor() {
        this.FULL_RENDER_STEPS = 64; // Uniform high quality baseline steps
        this.PERIPHERAL_STEPS = 20;  // Minimum peripheral steps
        this.TARGET_FPS = 60;

        this.frameStepCounts = [];
        this.timeSeries = []; // Downsampled for graphing: { t, avgSteps, fps }
        this.sessionStartTime = null;
        this.sessionEndTime = null;
        this.isTracking = false;

        this.pixelCount = 1280 * 720;
        this.lastSampleTime = 0;
    }

    startSession(width = 1280, height = 720) {
        this.frameStepCounts = [];
        this.timeSeries = [];
        this.pixelCount = width * height;
        this.sessionStartTime = performance.now();
        this.sessionEndTime = null;
        this.isTracking = true;
        this.lastSampleTime = this.sessionStartTime;
    }

    recordFrame(avgSteps, currentFps = 60) {
        if (!this.isTracking) return;

        this.frameStepCounts.push(avgSteps);

        const now = performance.now();
        // Downsample timeseries points every 200ms
        if (now - this.lastSampleTime >= 200) {
            const elapsedSec = (now - this.sessionStartTime) / 1000;
            this.timeSeries.push({
                t: Math.round(elapsedSec * 10) / 10,
                steps: Math.round(avgSteps * 10) / 10,
                fps: Math.round(currentFps)
            });
            this.lastSampleTime = now;
        }
    }

    endSession() {
        this.sessionEndTime = performance.now();
        this.isTracking = false;
    }

    getFullRenderCost() {
        const totalFrames = this.frameStepCounts.length;
        const totalSteps = totalFrames * this.FULL_RENDER_STEPS;
        return {
            totalFrames,
            avgStepsPerFrame: this.FULL_RENDER_STEPS,
            totalSteps,
            computeUnits: totalSteps
        };
    }

    getSelectiveRenderCost() {
        if (this.frameStepCounts.length === 0) {
            return {
                totalFrames: 0,
                avgStepsPerFrame: 0,
                totalSteps: 0,
                computeUnits: 0
            };
        }

        const totalFrames = this.frameStepCounts.length;
        const totalSteps = this.frameStepCounts.reduce((sum, s) => sum + s, 0);
        const avgStepsPerFrame = totalSteps / totalFrames;

        return {
            totalFrames,
            avgStepsPerFrame: Math.round(avgStepsPerFrame * 10) / 10,
            totalSteps: Math.round(totalSteps),
            computeUnits: Math.round(totalSteps)
        };
    }

    getSavings() {
        const full = this.getFullRenderCost();
        const selective = this.getSelectiveRenderCost();
        if (full.totalSteps === 0) return 0;
        const savings = ((full.totalSteps - selective.totalSteps) / full.totalSteps) * 100;
        return Math.max(0, Math.min(100, Math.round(savings * 10) / 10));
    }

    getSummary() {
        const full = this.getFullRenderCost();
        const selective = this.getSelectiveRenderCost();
        const savings = this.getSavings();

        const durationSec = this.sessionStartTime && this.sessionEndTime
            ? Math.round((this.sessionEndTime - this.sessionStartTime) / 1000)
            : 0;

        const avgFps = durationSec > 0 && full.totalFrames > 0
            ? Math.round((full.totalFrames / durationSec) * 10) / 10
            : 60;

        // Zone Distribution
        let foveaCount = 0;
        let parafoveaCount = 0;
        let peripheryCount = 0;

        for (const s of this.frameStepCounts) {
            if (s >= 48) foveaCount++;
            else if (s >= 32) parafoveaCount++;
            else peripheryCount++;
        }

        const tot = this.frameStepCounts.length || 1;
        const zoneDistribution = {
            foveaPct: Math.round((foveaCount / tot) * 100),
            parafoveaPct: Math.round((parafoveaCount / tot) * 100),
            peripheryPct: Math.round((peripheryCount / tot) * 100)
        };

        return {
            durationSec,
            totalFrames: full.totalFrames,
            avgFps,
            fullRenderCost: full.computeUnits,
            selectiveRenderCost: selective.computeUnits,
            fullRenderSteps: this.FULL_RENDER_STEPS,
            selectiveAvgSteps: selective.avgStepsPerFrame,
            savingsPct: savings,
            zoneDistribution,
            timeSeries: this.timeSeries
        };
    }

    exportJSON() {
        const summary = this.getSummary();
        const data = {
            benchmark: 'Real-Time Gaze-Adaptive LOD Renderer',
            version: '2.0.0',
            timestamp: new Date().toISOString(),
            metrics: summary,
            rawStepsSampled: this.frameStepCounts.filter((_, i) => i % 5 === 0)
        };
        return JSON.stringify(data, null, 2);
    }
}
