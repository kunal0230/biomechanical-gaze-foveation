/**
 * DebugPanel - Technical Telemetry & Landmark Inspector
 * Utilitarian research telemetry panel with real-time frame timings, MediaPipe inference latency,
 * and biomechanical ocular metrics.
 */

export class DebugPanel {
    constructor() {
        this.visible = false;
        this.container = null;
        this.videoCanvas = null;
        this.videoCtx = null;
        this.statsContainer = null;

        this.stats = {
            fps: 60.0,
            frameTimeMs: 16.6,
            inferenceMs: 0.0,
            gazeX: 0.5,
            gazeY: 0.5,
            avgSteps: 28.5,
            savingsPct: 55.4,
            pitchDeg: 0,
            yawDeg: 0,
            rollDeg: 0,
            ear: 0.3,
            rhoH: 0.5,
            ied: 0.3,
            velocityDegPerSec: 0,
            isSaccade: false,
            faceDetected: false
        };

        this._createPanel();
    }

    _createPanel() {
        this.container = document.createElement('div');
        this.container.className = 'debug-inspector';
        this.container.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 330px;
            background: #ffffff;
            border: 1px solid #1f2328;
            border-radius: 4px;
            overflow: hidden;
            font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
            font-size: 11px;
            color: #1f2328;
            z-index: 1000;
            display: none;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        `;

        const header = document.createElement('div');
        header.style.cssText = `
            padding: 6px 10px;
            background: #f6f8fa;
            border-bottom: 1px solid #d0d7de;
            font-weight: 700;
            font-size: 10px;
            letter-spacing: 0.05em;
            color: #1f2328;
            display: flex;
            justify-content: space-between;
        `;
        header.innerHTML = `
            <span>DIAGNOSTIC TELEMETRY</span>
            <span style="color: #1a7f37;">STREAMING</span>
        `;
        this.container.appendChild(header);

        this.videoCanvas = document.createElement('canvas');
        this.videoCanvas.width = 330;
        this.videoCanvas.height = 185;
        this.videoCanvas.style.cssText = `
            width: 100%;
            display: block;
            background: #f6f8fa;
            border-bottom: 1px solid #d0d7de;
        `;
        this.container.appendChild(this.videoCanvas);
        this.videoCtx = this.videoCanvas.getContext('2d');

        this.statsContainer = document.createElement('div');
        this.statsContainer.style.cssText = `
            padding: 8px 10px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 4px 10px;
            line-height: 1.45;
            background: #ffffff;
        `;
        this.container.appendChild(this.statsContainer);

        document.body.appendChild(this.container);
    }

    updateStats(stats) {
        Object.assign(this.stats, stats);
        this._renderStats();
    }

    _renderStats() {
        if (!this.visible) return;

        const stateColor = this.stats.isSaccade ? '#9a6700' : '#1a7f37';
        const stateLabel = this.stats.isSaccade ? 'SACCADE' : 'FIXATION';

        const fpsVal = typeof this.stats.fps === 'number' ? this.stats.fps.toFixed(1) : this.stats.fps;
        const ftVal = typeof this.stats.frameTimeMs === 'number' ? this.stats.frameTimeMs.toFixed(1) : this.stats.frameTimeMs;
        const infVal = typeof this.stats.inferenceMs === 'number' ? this.stats.inferenceMs.toFixed(1) : this.stats.inferenceMs;

        this.statsContainer.innerHTML = `
            <div>FPS: <b>${fpsVal}</b></div>
            <div>Frame: <b>${ftVal} ms</b></div>
            <div>Inference: <b>${infVal} ms</b></div>
            <div>State: <span style="font-weight:700;color:${stateColor};">${stateLabel}</span></div>
            <div>Gaze X,Y: <span style="color:#0969da;font-weight:600;">${this.stats.gazeX.toFixed(3)}, ${this.stats.gazeY.toFixed(3)}</span></div>
            <div>Ray Steps: <b>${this.stats.avgSteps.toFixed(1)} / 64</b></div>
            <div>GPU Saved: <b style="color:#1a7f37;">${this.stats.savingsPct}%</b></div>
            <div>Pitch/Yaw: <b>${this.stats.pitchDeg}° / ${this.stats.yawDeg}°</b></div>
            <div>Ratio ρh: <b>${this.stats.rhoH.toFixed(3)}</b></div>
            <div>IED: <b>${this.stats.ied.toFixed(3)}</b></div>
        `;
    }

    drawVideoWithLandmarks(video, landmarks) {
        if (!this.visible || !this.videoCtx) return;

        const ctx = this.videoCtx;
        const w = this.videoCanvas.width;
        const h = this.videoCanvas.height;

        ctx.clearRect(0, 0, w, h);

        if (video && video.videoWidth > 0) {
            ctx.save();
            ctx.translate(w, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(video, 0, 0, w, h);
            ctx.restore();
        }

        if (landmarks && landmarks.length > 0) {
            ctx.save();
            ctx.translate(w, 0);
            ctx.scale(-1, 1);

            ctx.strokeStyle = '#0969da';
            ctx.lineWidth = 1;

            const drawContour = (indices) => {
                ctx.beginPath();
                indices.forEach((idx, i) => {
                    const lm = landmarks[idx];
                    if (!lm) return;
                    const x = lm.x * w;
                    const y = lm.y * h;
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                });
                ctx.closePath();
                ctx.stroke();
            };

            // Eye contours
            drawContour([33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246]);
            drawContour([263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466]);

            // Eyebrows (IED reference)
            ctx.strokeStyle = '#9a6700';
            drawContour([70, 63, 105, 66, 107]);
            drawContour([300, 293, 334, 296, 336]);

            // Iris centers
            const drawIris = (centerIdx) => {
                const iris = landmarks[centerIdx];
                if (!iris) return;
                ctx.fillStyle = '#0969da';
                ctx.beginPath();
                ctx.arc(iris.x * w, iris.y * h, 3, 0, Math.PI * 2);
                ctx.fill();
            };

            drawIris(468);
            drawIris(473);

            // Nose tip canonical anchor
            const nose = landmarks[4];
            if (nose) {
                ctx.fillStyle = '#cf222e';
                ctx.beginPath();
                ctx.arc(nose.x * w, nose.y * h, 2.5, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        }
    }

    show() {
        this.visible = true;
        this.container.style.display = 'block';
    }

    hide() {
        this.visible = false;
        this.container.style.display = 'none';
    }

    isVisible() {
        return this.visible;
    }
}
