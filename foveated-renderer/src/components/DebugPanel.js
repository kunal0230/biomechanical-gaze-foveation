/**
 * DebugPanel - Real-Time Telemetry & Biomechanical Landmark Inspector
 * Visualizes 468 facial mesh landmarks, iris vectors, head pose axes, and live metrics
 */

export class DebugPanel {
    constructor() {
        this.visible = false;
        this.container = null;
        this.videoCanvas = null;
        this.videoCtx = null;
        this.statsContainer = null;

        this.stats = {
            fps: 0,
            gazeX: 0,
            gazeY: 0,
            avgSteps: 0,
            savingsPct: 0,
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
        this.container.className = 'debug-panel';
        this.container.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 340px;
            background: rgba(10, 14, 23, 0.94);
            border: 1px solid rgba(6, 182, 212, 0.35);
            border-radius: 8px;
            overflow: hidden;
            font-family: 'JetBrains Mono', 'SF Mono', Consolas, monospace;
            font-size: 11px;
            color: #e2e8f0;
            z-index: 1000;
            display: none;
            box-shadow: 0 16px 36px rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(12px);
        `;

        const header = document.createElement('div');
        header.style.cssText = `
            padding: 8px 12px;
            background: rgba(6, 182, 212, 0.12);
            border-bottom: 1px solid rgba(6, 182, 212, 0.25);
            font-weight: 600;
            font-size: 11px;
            letter-spacing: 0.05em;
            color: #06b6d4;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;
        header.innerHTML = `
            <span>TELEMETRY & LANDMARK INSPECTOR</span>
            <span id="telemetry-status-badge" style="font-size: 10px; color: #10b981;">ACTIVE</span>
        `;
        this.container.appendChild(header);

        this.videoCanvas = document.createElement('canvas');
        this.videoCanvas.width = 340;
        this.videoCanvas.height = 200;
        this.videoCanvas.style.cssText = `
            width: 100%;
            display: block;
            background: #000;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        `;
        this.container.appendChild(this.videoCanvas);
        this.videoCtx = this.videoCanvas.getContext('2d');

        this.statsContainer = document.createElement('div');
        this.statsContainer.style.cssText = `
            padding: 10px 12px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 6px 12px;
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

        const stateColor = this.stats.isSaccade ? '#f59e0b' : '#10b981';
        const stateLabel = this.stats.isSaccade ? 'SACCADE' : 'FIXATION';

        this.statsContainer.innerHTML = `
            <div><span style="color:#64748b;">FPS:</span> <strong style="color:#fff;">${this.stats.fps}</strong></div>
            <div><span style="color:#64748b;">State:</span> <strong style="color:${stateColor};">${stateLabel}</strong></div>
            <div><span style="color:#64748b;">Gaze Norm:</span> <strong style="color:#38bdf8;">(${this.stats.gazeX.toFixed(2)}, ${this.stats.gazeY.toFixed(2)})</strong></div>
            <div><span style="color:#64748b;">Ray Steps:</span> <strong style="color:#fff;">${this.stats.avgSteps.toFixed(1)} / 64</strong></div>
            <div><span style="color:#64748b;">Head Pitch:</span> <strong style="color:#fff;">${this.stats.pitchDeg}°</strong></div>
            <div><span style="color:#64748b;">Head Yaw:</span> <strong style="color:#fff;">${this.stats.yawDeg}°</strong></div>
            <div><span style="color:#64748b;">Scleral Ratio ρ:</span> <strong style="color:#fff;">${this.stats.rhoH.toFixed(3)}</strong></div>
            <div><span style="color:#64748b;">Brow Dist IED:</span> <strong style="color:#fff;">${this.stats.ied.toFixed(3)}</strong></div>
            <div><span style="color:#64748b;">Eye EAR:</span> <strong style="color:#fff;">${this.stats.ear.toFixed(2)}</strong></div>
            <div><span style="color:#64748b;">Workload Saved:</span> <strong style="color:#10b981;">${this.stats.savingsPct}%</strong></div>
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
            // Mirror image horizontally to match user perspective
            ctx.translate(w, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(video, 0, 0, w, h);
            ctx.restore();
        }

        if (landmarks && landmarks.length > 0) {
            ctx.save();
            ctx.translate(w, 0);
            ctx.scale(-1, 1);

            // Draw eye contours
            ctx.strokeStyle = 'rgba(6, 182, 212, 0.6)';
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

            // Left eye & right eye contours
            drawContour([33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246]);
            drawContour([263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466]);

            // Draw eyebrows (IED vertical anchors)
            ctx.strokeStyle = 'rgba(245, 158, 11, 0.8)';
            drawContour([70, 63, 105, 66, 107]);
            drawContour([300, 293, 334, 296, 336]);

            // Highlight Irises
            const drawIris = (centerIdx) => {
                const iris = landmarks[centerIdx];
                if (!iris) return;
                const ix = iris.x * w;
                const iy = iris.y * h;
                ctx.fillStyle = '#06b6d4';
                ctx.beginPath();
                ctx.arc(ix, iy, 3.5, 0, Math.PI * 2);
                ctx.fill();

                ctx.strokeStyle = '#fff';
                ctx.beginPath();
                ctx.arc(ix, iy, 5.5, 0, Math.PI * 2);
                ctx.stroke();
            };

            drawIris(468); // Left iris
            drawIris(473); // Right iris

            // Draw rigid nose anchor
            const nose = landmarks[4];
            if (nose) {
                ctx.fillStyle = '#ef4444';
                ctx.beginPath();
                ctx.arc(nose.x * w, nose.y * h, 3, 0, Math.PI * 2);
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
