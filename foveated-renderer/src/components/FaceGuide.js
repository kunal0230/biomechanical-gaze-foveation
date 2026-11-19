/**
 * FaceGuide - Minimalist Technical Alignment Reticle
 */

export class FaceGuide {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.canvas = null;
        this.ctx = null;
        this.faceDetected = false;
        this.facePosition = { x: 0.5, y: 0.5, size: 0 };
        this.status = 'searching';
        this.statusText = 'Searching for face...';

        this._createCanvas();
    }

    _createCanvas() {
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'face-guide-canvas';
        this.canvas.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 10;
        `;
        this.container.style.position = 'relative';
        this.container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');
    }

    updateFace(landmarks) {
        if (!landmarks || landmarks.length === 0) {
            this.faceDetected = false;
            this.status = 'searching';
            this.statusText = 'Searching...';
            return;
        }

        this.faceDetected = true;

        const xs = landmarks.map(l => l.x);
        const ys = landmarks.map(l => l.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);

        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const faceWidth = maxX - minX;
        const faceHeight = maxY - minY;
        const faceSize = Math.max(faceWidth, faceHeight);

        this.facePosition = { x: centerX, y: centerY, size: faceSize };

        const idealSize = 0.35;
        const sizeTolerance = 0.12;
        const centerTolerance = 0.16;

        const offCenterX = Math.abs(centerX - 0.5);
        const offCenterY = Math.abs(centerY - 0.45);

        if (faceSize < idealSize - sizeTolerance) {
            this.status = 'too_far';
            this.statusText = 'Move closer (50–65 cm)';
        } else if (faceSize > idealSize + sizeTolerance + 0.1) {
            this.status = 'too_close';
            this.statusText = 'Move slightly back';
        } else if (offCenterX > centerTolerance || offCenterY > centerTolerance) {
            this.status = 'off_center';
            this.statusText = 'Center face in frame';
        } else {
            this.status = 'good';
            this.statusText = 'Face aligned';
        }
    }

    render() {
        if (!this.canvas) return;
        const rect = this.container.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;

        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        ctx.clearRect(0, 0, w, h);

        const ovalCenterX = w * 0.5;
        const ovalCenterY = h * 0.44;
        const ovalRadiusX = w * 0.22;
        const ovalRadiusY = h * 0.32;

        let guideColor = '#cf222e'; // red
        if (this.status === 'good') guideColor = '#1a7f37'; // green
        else if (this.status === 'off_center') guideColor = '#9a6700'; // yellow
        else if (this.status === 'searching') guideColor = '#6e7781'; // gray

        // Subdued light vignette outside oval
        ctx.fillStyle = 'rgba(246, 248, 250, 0.4)';
        ctx.fillRect(0, 0, w, h);

        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.ellipse(ovalCenterX, ovalCenterY, ovalRadiusX, ovalRadiusY, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 1px oval line
        ctx.strokeStyle = guideColor;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(ovalCenterX, ovalCenterY, ovalRadiusX, ovalRadiusY, 0, 0, Math.PI * 2);
        ctx.stroke();

        // 1px horizontal eye axis line
        const eyeLineY = ovalCenterY - ovalRadiusY * 0.15;
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(ovalCenterX - ovalRadiusX * 0.6, eyeLineY);
        ctx.lineTo(ovalCenterX + ovalRadiusX * 0.6, eyeLineY);
        ctx.stroke();

        // Corner crosshairs
        const cLen = 12;
        const pad = 16;
        ctx.strokeStyle = guideColor;
        ctx.lineWidth = 1.5;

        // TL
        ctx.beginPath();
        ctx.moveTo(pad, pad + cLen);
        ctx.lineTo(pad, pad);
        ctx.lineTo(pad + cLen, pad);
        ctx.stroke();

        // TR
        ctx.beginPath();
        ctx.moveTo(w - pad - cLen, pad);
        ctx.lineTo(w - pad, pad);
        ctx.lineTo(w - pad, pad + cLen);
        ctx.stroke();

        // BL
        ctx.beginPath();
        ctx.moveTo(pad, h - pad - cLen);
        ctx.lineTo(pad, h - pad);
        ctx.lineTo(pad + cLen, h - pad);
        ctx.stroke();

        // BR
        ctx.beginPath();
        ctx.moveTo(w - pad - cLen, h - pad);
        ctx.lineTo(w - pad, h - pad);
        ctx.lineTo(w - pad, h - pad - cLen);
        ctx.stroke();

        // Status text
        ctx.font = '500 12px ui-monospace, Menlo, monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = guideColor;
        ctx.fillText(this.statusText, w / 2, h - 16);
    }

    isReady() {
        return this.status === 'good';
    }

    destroy() {
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
    }
}
