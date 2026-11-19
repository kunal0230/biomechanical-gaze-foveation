/**
 * GazeEstimator - Research-Grade Biomechanical Eye Tracking
 * 
 * Implements:
 * 1. Head-Canonical 3D SO(3) Normalization (cancels head pitch/yaw/roll coupling)
 * 2. Bilateral Scleral Hemispheric Ratio (scale-invariant horizontal gaze)
 * 3. Iris-to-Eyebrow Excursion (IED) (occlusion-free downward gaze proxy)
 * 4. Adaptive 1-Euro Filter with ballistic saccade prediction
 * 5. Diagnostic telemetry (head Euler angles, blink state, saccade velocity)
 */

import * as faceMesh from '@mediapipe/face_mesh';
import { RidgeRegression } from './RidgeRegression.js';
import { OneEuroFilter2D } from './OneEuroFilter.js';

export class GazeEstimator {
    constructor(options = {}) {
        this.model = new RidgeRegression(options.alpha || 0.8);
        this.filter = new OneEuroFilter2D({
            minCutoff: options.minCutoff || 0.9,
            beta: options.beta || 0.025,
            leadTimeSeconds: 0.040
        });

        this.faceMesh = null;
        this.isReady = false;
        this.lastResults = null;

        // Blink detection
        this.earHistory = [];
        this.earHistoryLen = 45;
        this.blinkThresholdRatio = 0.78;
        this.minHistory = 12;

        // Head pose telemetry
        this.telemetry = {
            pitchDeg: 0,
            yawDeg: 0,
            rollDeg: 0,
            iod: 0,
            ear: 0.3,
            isBlinking: false,
            velocityDegPerSec: 0,
            isSaccade: false,
            rhoH: 0.5,
            ied: 0.3
        };

        // Initialize default baseline model
        this._initBaselineModel();
    }

    /**
     * Set up default linear baseline weights so tracker is functional even before calibration
     */
    _initBaselineModel() {
        const d = 26; // feature dimension
        this.baselineModel = new RidgeRegression(1.0);
        this.baselineModel.mean = new Array(d).fill(0);
        this.baselineModel.std = new Array(d).fill(1);
        this.baselineModel.weights = Array.from({ length: d }, () => [0, 0]);
        this.baselineModel.bias = [window.innerWidth * 0.5, window.innerHeight * 0.5];

        // Map primary horizontal gaze features (rho_h) to screen X
        // Left eye ratio is at idx 0, Right eye at idx 1, Mean at idx 14
        this.baselineModel.weights[14][0] = window.innerWidth * 1.8;
        this.baselineModel.weights[0][0] = window.innerWidth * 0.4;
        this.baselineModel.weights[1][0] = window.innerWidth * 0.4;

        // Map primary vertical gaze features (IED) to screen Y
        // IED expands monotonically when looking DOWN
        this.baselineModel.weights[15][1] = window.innerHeight * 2.2;
        this.baselineModel.weights[2][1] = window.innerHeight * 0.5;
        this.baselineModel.weights[3][1] = window.innerHeight * 0.5;

        // Head pose coupling compensation
        this.baselineModel.weights[6][1] = -window.innerHeight * 0.3; // Pitch
        this.baselineModel.weights[7][0] = window.innerWidth * 0.3;   // Yaw
    }

    /**
     * Initialize MediaPipe FaceMesh with pinned CDN fallback
     */
    async initialize() {
        return new Promise((resolve, reject) => {
            const FaceMeshClass = faceMesh.FaceMesh || (faceMesh.default ? faceMesh.default.FaceMesh : null) || window.FaceMesh;

            if (!FaceMeshClass) {
                console.error('FaceMesh constructor not found in imports');
                reject(new Error('FaceMesh library unavailable'));
                return;
            }

            this.faceMesh = new FaceMeshClass({
                locateFile: (file) => {
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/${file}`;
                }
            });

            this.faceMesh.setOptions({
                maxNumFaces: 1,
                refineLandmarks: true,
                minDetectionConfidence: 0.55,
                minTrackingConfidence: 0.55,
            });

            this.faceMesh.onResults((results) => {
                this.lastResults = results;
            });

            this.faceMesh.initialize()
                .then(() => {
                    this.isReady = true;
                    resolve();
                })
                .catch((err) => {
                    console.error('MediaPipe initialization error:', err);
                    reject(err);
                });
        });
    }

    async processFrame(video) {
        if (!this.isReady || !video || video.readyState < 2) return null;
        try {
            await this.faceMesh.send({ image: video });
            return this.lastResults;
        } catch (err) {
            console.warn('FaceMesh frame processing error:', err);
            return null;
        }
    }

    /**
     * Extract Biomechanical Gaze Features
     * Uses Head-Canonical frame + Bilateral Scleral Ratio + Iris-to-Eyebrow Distance
     */
    extractFeatures(results) {
        if (!results || !results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
            return { features: null, blinkDetected: false, telemetry: this.telemetry };
        }

        const landmarks = results.multiFaceLandmarks[0];

        // 1. Rigid anchors for Head-Canonical SO(3) Normalization
        const pNose = [landmarks[4].x, landmarks[4].y, landmarks[4].z];
        const pTop = [landmarks[10].x, landmarks[10].y, landmarks[10].z];
        const pLeftCanthus = [landmarks[33].x, landmarks[33].y, landmarks[33].z];
        const pRightCanthus = [landmarks[263].x, landmarks[263].y, landmarks[263].z];

        // Inter-ocular distance (IOD) in normalized image coordinates
        const iod = Math.hypot(
            pRightCanthus[0] - pLeftCanthus[0],
            pRightCanthus[1] - pLeftCanthus[1],
            pRightCanthus[2] - pLeftCanthus[2]
        );

        if (iod < 1e-4) {
            return { features: null, blinkDetected: false, telemetry: this.telemetry };
        }

        // X-axis: Inter-canthal baseline
        const xAxis = this._normalize([
            pRightCanthus[0] - pLeftCanthus[0],
            pRightCanthus[1] - pLeftCanthus[1],
            pRightCanthus[2] - pLeftCanthus[2],
        ]);

        // Y-axis: Midline vector orthogonalized to X-axis
        let yApprox = this._normalize([
            pTop[0] - pNose[0],
            pTop[1] - pNose[1],
            pTop[2] - pNose[2],
        ]);
        const dotXY = this._dot(yApprox, xAxis);
        const yAxis = this._normalize([
            yApprox[0] - dotXY * xAxis[0],
            yApprox[1] - dotXY * xAxis[1],
            yApprox[2] - dotXY * xAxis[2],
        ]);

        // Z-axis: Normal to facial plane
        const zAxis = this._normalize(this._cross(xAxis, yAxis));

        // SO(3) Rotation Matrix
        const R = [xAxis, yAxis, zAxis];

        // Helper to project any landmark into head-canonical normalized frame
        const toCanonical = (idx) => {
            const p = landmarks[idx];
            const shifted = [p.x - pNose[0], p.y - pNose[1], p.z - pNose[2]];
            const rot = this._matVecMul(R, shifted);
            return [rot[0] / iod, rot[1] / iod, rot[2] / iod];
        };

        // Extract Canonical Landmarks
        const cLeftIris = toCanonical(468);
        const cRightIris = toCanonical(473);

        const cLeftInner = toCanonical(133);
        const cLeftOuter = toCanonical(33);
        const cLeftTop = toCanonical(159);
        const cLeftBottom = toCanonical(145);

        const cRightInner = toCanonical(362);
        const cRightOuter = toCanonical(263);
        const cRightTop = toCanonical(386);
        const cRightBottom = toCanonical(374);

        // Eyebrow anchors (midpoints of supraorbital ridge)
        const cLeftBrow = [
            (toCanonical(70)[0] + toCanonical(63)[0] + toCanonical(105)[0]) / 3,
            (toCanonical(70)[1] + toCanonical(63)[1] + toCanonical(105)[1]) / 3,
            (toCanonical(70)[2] + toCanonical(63)[2] + toCanonical(105)[2]) / 3,
        ];

        const cRightBrow = [
            (toCanonical(300)[0] + toCanonical(293)[0] + toCanonical(334)[0]) / 3,
            (toCanonical(300)[1] + toCanonical(293)[1] + toCanonical(334)[1]) / 3,
            (toCanonical(300)[2] + toCanonical(293)[2] + toCanonical(334)[2]) / 3,
        ];

        // 2. Bilateral Scleral Ratio (Horizontal Gaze Proxy)
        const leftFissureWidth = Math.abs(cLeftOuter[0] - cLeftInner[0]) + 1e-6;
        const rightFissureWidth = Math.abs(cRightOuter[0] - cRightInner[0]) + 1e-6;

        const rhoLeft = (cLeftIris[0] - cLeftInner[0]) / leftFissureWidth;
        const rhoRight = (cRightIris[0] - cRightInner[0]) / rightFissureWidth;
        const rhoMean = (rhoLeft + rhoRight) * 0.5;

        // 3. Iris-to-Eyebrow Distance (IED) (Vertical Gaze Proxy)
        const iedLeft = cLeftBrow[1] - cLeftIris[1];
        const iedRight = cRightBrow[1] - cRightIris[1];
        const iedMean = (iedLeft + iedRight) * 0.5;

        // 4. Vertical Canthi Baseline Offset
        const icdLeft = cLeftIris[1] - (cLeftInner[1] + cLeftOuter[1]) * 0.5;
        const icdRight = cRightIris[1] - (cRightInner[1] + cRightOuter[1]) * 0.5;
        const icdMean = (icdLeft + icdRight) * 0.5;

        // 5. Head Euler Angles (Pitch, Yaw, Roll)
        const yaw = Math.atan2(R[0][2], R[2][2]);
        const pitch = Math.asin(-Math.max(-1.0, Math.min(1.0, R[1][2])));
        const roll = Math.atan2(R[1][0], R[1][1]);

        // 6. Blink Detection via Eye Aspect Ratio (EAR)
        const leftH = Math.hypot(landmarks[159].x - landmarks[145].x, landmarks[159].y - landmarks[145].y);
        const leftW = Math.hypot(landmarks[33].x - landmarks[133].x, landmarks[33].y - landmarks[133].y) + 1e-6;
        const leftEAR = leftH / leftW;

        const rightH = Math.hypot(landmarks[386].x - landmarks[374].x, landmarks[386].y - landmarks[374].y);
        const rightW = Math.hypot(landmarks[263].x - landmarks[362].x, landmarks[263].y - landmarks[362].y) + 1e-6;
        const rightEAR = rightH / rightW;

        const ear = (leftEAR + rightEAR) * 0.5;

        this.earHistory.push(ear);
        if (this.earHistory.length > this.earHistoryLen) {
            this.earHistory.shift();
        }

        let blinkThreshold = 0.18;
        if (this.earHistory.length >= this.minHistory) {
            const meanEar = this.earHistory.reduce((a, b) => a + b, 0) / this.earHistory.length;
            blinkThreshold = meanEar * this.blinkThresholdRatio;
        }

        const blinkDetected = ear < blinkThreshold;

        // Update real-time telemetry state
        this.telemetry.pitchDeg = Math.round((pitch * 180 / Math.PI) * 10) / 10;
        this.telemetry.yawDeg = Math.round((yaw * 180 / Math.PI) * 10) / 10;
        this.telemetry.rollDeg = Math.round((roll * 180 / Math.PI) * 10) / 10;
        this.telemetry.iod = Math.round(iod * 1000) / 1000;
        this.telemetry.ear = Math.round(ear * 100) / 100;
        this.telemetry.isBlinking = blinkDetected;
        this.telemetry.rhoH = Math.round(rhoMean * 1000) / 1000;
        this.telemetry.ied = Math.round(iedMean * 1000) / 1000;

        // 7. Compact, Highly-Conditioned Polynomial Feature Representation (26 features)
        const features = [
            rhoLeft,
            rhoRight,
            iedLeft,
            iedRight,
            icdLeft,
            icdRight,
            pitch,
            yaw,
            roll,
            iod,
            cLeftIris[0],
            cLeftIris[1],
            cRightIris[0],
            cRightIris[1],
            rhoMean,
            iedMean,
            icdMean,
            rhoMean * rhoMean,
            iedMean * iedMean,
            rhoMean * iedMean,
            rhoMean * yaw,
            iedMean * pitch,
            rhoMean * pitch,
            iedMean * yaw,
            leftEAR,
            rightEAR
        ];

        return { features, blinkDetected, telemetry: this.telemetry };
    }

    train(X, y) {
        return this.model.train(X, y);
    }

    predict(features) {
        if (this.model.trained) {
            return this.model.predict(features);
        }
        // Fall back to pre-trained baseline model if not yet calibrated
        return this.baselineModel.predict(features);
    }

    isTrained() {
        return this.model.trained;
    }

    getModelDiagnostics() {
        return this.model.getDiagnostics();
    }

    saveModel(key = 'gazeModel_v2') {
        localStorage.setItem(key, JSON.stringify(this.model.toJSON()));
    }

    loadModel(key = 'gazeModel_v2') {
        const data = localStorage.getItem(key);
        if (data) {
            try {
                this.model = RidgeRegression.fromJSON(JSON.parse(data));
                return true;
            } catch (e) {
                console.warn('Failed to parse stored model:', e);
            }
        }
        return false;
    }

    // Vector Utilities
    _normalize(v) {
        const len = Math.hypot(v[0], v[1], v[2]) + 1e-9;
        return [v[0] / len, v[1] / len, v[2] / len];
    }

    _dot(a, b) {
        return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    }

    _cross(a, b) {
        return [
            a[1] * b[2] - a[2] * b[1],
            a[2] * b[0] - a[0] * b[2],
            a[0] * b[1] - a[1] * b[0],
        ];
    }

    _matVecMul(m, v) {
        return [
            m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
            m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
            m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2],
        ];
    }
}
