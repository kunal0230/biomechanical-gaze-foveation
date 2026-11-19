/**
 * DebugPanel - Technical Telemetry & Landmark Inspector
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
        this.container.className = 'debug-inspector';
        this.container.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 320px;
            background: #16181d;
            border: 1px solid #2d333b;
            border-radius: 4px;
            overflow: hidden;
            font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
            font-size: 11px;
            color: #adbac7;
            z-index: 1000;
            display: none;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
        `;

        const header = document.createElement('div');
        header.style.cssText = `
            padding: 6px 10px;
            background: #21262d;
            border-bottom: 1px solid #2d333b;
            font-weight: 600;
            font-size: 10px;
            letter-spacing: 0.05em;
            color: #cdd9e5;
            display: flex;
            justify-content: space-between;
        `;
        header.innerHTML = `
            <span>TELEMETRY INSPECTOR</span>
            <span style="color: #57ab5a;">ONLINE</span>
        `;
        this.container.appendChild(header);

        this.videoCanvas = document.createElement('canvas');
        this.videoCanvas.width = 320;
        this.videoCanvas.height = 180;
        this.videoCanvas.style.cssText = `
            width: 100%;
            display: block;
            background: #0d1117;
            border-bottom: 1px solid #2d333b;
        `;
        this.container.appendChild(this.videoCanvas);
        this.videoCtx = this.videoCanvas.getContext('2d');

        this.statsContainer = document.createElement('div');
        this.statsContainer.style.cssText = `
            padding: 8px 10px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 4px 10px;
            line-height: 1.4;
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

        const stateColor = this.stats.isSaccade ? '#d29922' : '#57ab5a';
        const stateLabel = this.stats.isSaccade ? 'SACCADE' : 'FIXATION';

        this.statsContainer.innerHTML = `
            <div>FPS: <span style="color:#fff;">${this.stats.fps}</span></div>
            <div>State: <span style="color:${stateColor};">${stateLabel}</span></div>
            <div>Gaze X,Y: <span style="color:#539bf5;">${this.stats.gazeX.toFixed(2)}, ${this.stats.gazeY.toFixed(2)}</span></div>
            <div>Steps: <span style="color:#fff;">${this.stats.avgSteps.toFixed(1)}</span></div>
            <div>Pitch: <span style="color:#fff;">${this.stats.pitchDeg}°</span></div>
            <div>Yaw: <span style="color:#fff;">${this.stats.yawDeg}°</span></div>
            <div>Ratio ρ: <span style="color:#fff;">${this.stats.rhoH.toFixed(3)}</span></div>
            <div>IED: <span style="color:#fff;">${this.stats.ied.toFixed(3)}</span></div>
            <div>EAR: <span style="color:#fff;">${this.stats.ear.toFixed(2)}</span></div>
            <div>Saved: <span style="color:#57ab5a;">${this.stats.savingsPct}%</span></div>
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

            ctx.strokeStyle = 'rgba(83, 155, 245, 0.7)';
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

            drawContour([33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246]);
            drawContour([263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466]);

            ctx.strokeStyle = 'rgba(210, 153, 34, 0.8)';
            drawContour([70, 63, 105, 66, 107]);
            drawContour([300, 293, 334, 296, 336]);

            const drawIris = (centerIdx) => {
                const iris = landmarks[centerIdx];
                if (!iris) return;
                ctx.fillStyle = '#539bf5';
                ctx.beginPath();
                ctx.arc(iris.x * w, iris.y * h, 3, 0, Math.PI * 2);
                ctx.fill();
            };

            drawIris(468);
            drawIris(473);

            const nose = landmarks[4];
            if (nose) {
                ctx.fillStyle = '#e5534b';
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
