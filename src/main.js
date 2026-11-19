/**
 * Foveated Renderer - Main Application Controller
 * Orchestrates eye tracking, 1-Euro filtering, WebGL2 raymarching, and quantitative analytics
 */

import { GazeEstimator } from './eye-tracking/GazeEstimator.js';
import { CalibrationUI } from './calibration/CalibrationUI.js';
import { SceneRenderer } from './renderer/SceneRenderer.js';
import { OneEuroFilter2D } from './eye-tracking/OneEuroFilter.js';

// Screens
import { HomeScreen } from './screens/HomeScreen.js';
import { DemoScreen } from './screens/DemoScreen.js';
import { ResultsScreen } from './screens/ResultsScreen.js';

// Components
import { FaceGuide } from './components/FaceGuide.js';
import { DebugPanel } from './components/DebugPanel.js';
import { TutorialModal } from './components/TutorialModal.js';
import { ComputeTracker } from './analytics/ComputeTracker.js';

const SCREENS = {
    HOME: 'home',
    CALIBRATION: 'calibration',
    DEMO: 'demo',
    RESULTS: 'results'
};

class App {
    constructor() {
        this.currentScreen = SCREENS.HOME;
        this.gazeMode = 'camera'; // 'camera' | 'simulator'

        // Screens
        this.homeScreen = new HomeScreen('home-screen');
        this.demoScreen = new DemoScreen('demo-screen');
        this.resultsScreen = new ResultsScreen('results-screen');

        // Components
        this.faceGuide = null;
        this.debugPanel = new DebugPanel();
        this.tutorialModal = new TutorialModal();
        this.computeTracker = new ComputeTracker();

        // Core systems
        this.gazeEstimator = new GazeEstimator();
        this.calibrationUI = null;
        this.renderer = null;
        this.filter = new OneEuroFilter2D({ minCutoff: 0.9, beta: 0.025, leadTimeSeconds: 0.040 });

        // Media
        this.video = null;
        this.stream = null;

        // State
        this.isRunning = false;
        this.isPaused = false;
        this.selectedScene = null;
        this.frameCount = 0;
        this.fps = 60;
        this.lastFpsTime = performance.now();
        this.lastLandmarks = null;

        // Gaze state (shared across render loop)
        this.gazeState = {
            x: 0.5,
            y: 0.5,
            rawX: 0.5,
            rawY: 0.5,
            avgSteps: 28.5,
            currentSavingsPct: 52
        };

        this._setupSimulatorEvents();
        this._init();
    }

    async _init() {
        // Screen Callbacks
        this.homeScreen.setOnStart((scene, mode) => {
            this.selectedScene = scene;
            this.gazeMode = mode;
            if (mode === 'simulator') {
                this._startDemo();
            } else {
                this._startCalibration();
            }
        });

        this.homeScreen.setOnQuickStart((scene, mode) => {
            this.selectedScene = scene;
            this.gazeMode = mode;
            this._startDemo();
        });

        this.homeScreen.setOnTutorial(() => this.tutorialModal.show());
        this.homeScreen.setOnModeChange((mode) => {
            this.gazeMode = mode;
        });

        this.demoScreen.setOnTimerEnd(() => this._endDemo());
        this.demoScreen.setOnDebugToggle((show) => {
            if (show) this.debugPanel.show();
            else this.debugPanel.hide();
        });
        this.demoScreen.setOnPauseToggle((paused) => {
            this.isPaused = paused;
        });
        this.demoScreen.setOnFoveaRadiusChange((radius) => {
            if (this.renderer) this.renderer.setFoveaRadius(radius);
        });
        this.demoScreen.setOnRingsToggle((show) => {
            if (this.renderer) this.renderer.setRings(show);
        });

        this.resultsScreen.setOnRestart(() => this._restartFromHome());

        window.addEventListener('resize', () => {
            if (this.renderer && this.currentScreen === SCREENS.DEMO) {
                this.renderer.resize();
            }
        });

        this._showScreen(SCREENS.HOME);
        await this._initCamera();
    }

    _setupSimulatorEvents() {
        const updateSimulatorGaze = (clientX, clientY) => {
            if (this.gazeMode !== 'simulator' || this.currentScreen !== SCREENS.DEMO) return;
            const normX = Math.max(0.0, Math.min(1.0, clientX / window.innerWidth));
            const normY = Math.max(0.0, Math.min(1.0, clientY / window.innerHeight));

            const [smoothX, smoothY] = this.filter.update(normX, normY);
            this.gazeState.x = Math.max(0.0, Math.min(1.0, smoothX));
            this.gazeState.y = Math.max(0.0, Math.min(1.0, smoothY));

            this._computeActiveWorkload(this.gazeState.x, this.gazeState.y);
        };

        window.addEventListener('mousemove', (e) => {
            updateSimulatorGaze(e.clientX, e.clientY);
        });

        window.addEventListener('touchmove', (e) => {
            if (e.touches && e.touches[0]) {
                updateSimulatorGaze(e.touches[0].clientX, e.touches[0].clientY);
            }
        }, { passive: true });
    }

    async _initCamera() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user'
                }
            });

            this.video = this.homeScreen.getVideoElement();
            this.video.srcObject = this.stream;
            await this.video.play();
            this.homeScreen.showCameraActive();

            await this.gazeEstimator.initialize();
            this.faceGuide = new FaceGuide('camera-preview');
            this._startFaceDetectionLoop();
        } catch (error) {
            console.warn('Camera access unavailable or declined:', error);
            // Default to presentation simulator mode if camera is missing or denied
            this.homeScreen.setMode('simulator');
        }
    }

    _startFaceDetectionLoop() {
        let frameCount = 0;
        let lastFpsTime = performance.now();

        const detectFace = async () => {
            if (this.currentScreen !== SCREENS.HOME) {
                requestAnimationFrame(detectFace);
                return;
            }

            const now = performance.now();
            frameCount++;
            if (now - lastFpsTime >= 1000) {
                const fps = (frameCount * 1000) / (now - lastFpsTime);
                if (this.video && this.video.videoWidth) {
                    this.homeScreen.updateStats(fps, this.video.videoWidth, this.video.videoHeight);
                }
                frameCount = 0;
                lastFpsTime = now;
            }

            if (this.video && this.gazeEstimator && this.gazeEstimator.isReady) {
                const results = await this.gazeEstimator.processFrame(this.video);
                if (results?.multiFaceLandmarks?.[0]) {
                    this.lastLandmarks = results.multiFaceLandmarks[0];
                    if (this.faceGuide) this.faceGuide.updateFace(this.lastLandmarks);
                    this.homeScreen.updateFaceStatus(true, this.faceGuide ? this.faceGuide.isReady() : true);
                } else {
                    if (this.faceGuide) this.faceGuide.updateFace(null);
                    this.homeScreen.updateFaceStatus(false, false);
                }
                if (this.faceGuide) this.faceGuide.render();
            }

            requestAnimationFrame(detectFace);
        };

        detectFace();
    }

    async _startCalibration() {
        this._showScreen(SCREENS.CALIBRATION);
        this.calibrationUI = new CalibrationUI(this.gazeEstimator);

        const processFrame = async () => {
            return await this.gazeEstimator.processFrame(this.video);
        };

        this.calibrationUI.onComplete = (success) => {
            if (success) {
                this.gazeEstimator.saveModel();
                this._startDemo();
            } else {
                this._showScreen(SCREENS.HOME);
            }
        };

        await this.calibrationUI.start(processFrame);
    }

    _startDemo() {
        this._showScreen(SCREENS.DEMO);

        const canvas = this.demoScreen.getCanvas();
        this.renderer = new SceneRenderer(canvas);
        this.renderer.loadScene(this.selectedScene);
        this.renderer.resize();

        this.demoScreen.reset();
        this.demoScreen.setGazeMode(this.gazeMode);
        this.computeTracker.startSession(canvas.width, canvas.height);
        this.demoScreen.startTimer();

        this.filter.reset();
        this.isRunning = true;

        if (this.gazeMode === 'camera') {
            this._startGazeLoop();
        }
        this._startRenderLoop();
    }

    _startGazeLoop() {
        const processGaze = async () => {
            if (!this.isRunning || this.currentScreen !== SCREENS.DEMO) return;

            if (this.isPaused || this.gazeMode !== 'camera') {
                setTimeout(processGaze, 33);
                return;
            }

            try {
                const results = await this.gazeEstimator.processFrame(this.video);
                if (results) {
                    const { features, blinkDetected } = this.gazeEstimator.extractFeatures(results);
                    this.lastLandmarks = results.multiFaceLandmarks?.[0] || null;

                    if (features && !blinkDetected) {
                        const [predX, predY] = this.gazeEstimator.predict(features);

                        // Update 1-Euro adaptive filter
                        const normPredX = predX / window.innerWidth;
                        const normPredY = predY / window.innerHeight;

                        const responsiveness = this.demoScreen.getSmoothing();
                        this.filter.setParameters(responsiveness, 0.025 * responsiveness);

                        const [smoothX, smoothY] = this.filter.update(normPredX, normPredY);

                        this.gazeState.x = Math.max(0.0, Math.min(1.0, smoothX));
                        this.gazeState.y = Math.max(0.0, Math.min(1.0, smoothY));

                        this._computeActiveWorkload(this.gazeState.x, this.gazeState.y);
                    }
                }
            } catch (error) {
                console.warn('Gaze tracking cycle error:', error);
            }

            setTimeout(processGaze, 33); // ~30Hz camera rate
        };

        processGaze();
    }

    _computeActiveWorkload(gazeX, gazeY) {
        // Quantitative step density calculation based on foveal proximity
        const foveaRadius = this.renderer ? this.renderer.foveaRadius : 0.16;
        const foveaAreaRatio = Math.PI * Math.pow(foveaRadius * 1.25, 2);
        const parafoveaAreaRatio = Math.PI * Math.pow(foveaRadius * 2.2, 2) - foveaAreaRatio;
        const peripheryAreaRatio = Math.max(0.1, 1.0 - (foveaAreaRatio + parafoveaAreaRatio));

        const centerDistance = Math.hypot(gazeX - 0.5, gazeY - 0.5);
        const edgeFactor = Math.max(0, centerDistance - 0.3) * 0.4;

        // Weighted average steps across screen fragments
        const avgSteps = Math.max(20.0, Math.min(64.0, 
            (foveaAreaRatio * 64.0 + parafoveaAreaRatio * 40.0 + peripheryAreaRatio * 20.0) * (1.0 - edgeFactor * 0.15)
        ));

        const savingsPct = Math.max(0, Math.min(100, ((64.0 - avgSteps) / 64.0) * 100));

        this.gazeState.avgSteps = avgSteps;
        this.gazeState.currentSavingsPct = Math.round(savingsPct);
    }

    _startRenderLoop() {
        let renderFrameCount = 0;
        let lastRenderTime = performance.now();

        const render = () => {
            if (!this.isRunning || this.currentScreen !== SCREENS.DEMO) return;

            if (this.isPaused) {
                requestAnimationFrame(render);
                return;
            }

            const now = performance.now();
            renderFrameCount++;
            if (now - lastRenderTime >= 1000) {
                this.fps = (renderFrameCount * 1000) / (now - lastRenderTime);
                renderFrameCount = 0;
                lastRenderTime = now;
            }

            const { x: gazeX, y: gazeY, avgSteps, currentSavingsPct } = this.gazeState;

            this.renderer.setGazePoint(gazeX, gazeY);
            this.renderer.setHeatmap(this.demoScreen.shouldShowHeatmap());
            this.renderer.setRings(this.demoScreen.shouldShowRings());
            this.renderer.render();

            this.demoScreen.updateGazePosition(gazeX, gazeY);
            this.demoScreen.updateHud(this.fps, avgSteps, currentSavingsPct);
            this.computeTracker.recordFrame(avgSteps, this.fps);

            if (this.debugPanel.isVisible()) {
                const tel = this.gazeEstimator.telemetry;
                this.debugPanel.updateStats({
                    fps: Math.round(this.fps),
                    gazeX: gazeX,
                    gazeY: gazeY,
                    avgSteps: avgSteps,
                    savingsPct: currentSavingsPct,
                    pitchDeg: tel.pitchDeg,
                    yawDeg: tel.yawDeg,
                    rollDeg: tel.rollDeg,
                    ear: tel.ear,
                    rhoH: tel.rhoH,
                    ied: tel.ied,
                    velocityDegPerSec: Math.round(this.filter.getVelocity() * 0.1),
                    isSaccade: this.filter.isSaccadic(),
                    faceDetected: !!this.lastLandmarks
                });

                if (this.video && this.lastLandmarks) {
                    this.debugPanel.drawVideoWithLandmarks(this.video, this.lastLandmarks);
                }
            }

            requestAnimationFrame(render);
        };

        render();
    }

    _endDemo() {
        this.isRunning = false;
        this.debugPanel.hide();

        this.computeTracker.endSession();
        const summary = this.computeTracker.getSummary();

        this._showScreen(SCREENS.RESULTS);
        this.resultsScreen.updateAnalytics(summary);
    }

    _restartFromHome() {
        this.resultsScreen.reset();
        this._showScreen(SCREENS.HOME);
        this.filter.reset();
    }

    _showScreen(screen) {
        this.homeScreen.hide();
        this.demoScreen.hide();
        this.resultsScreen.hide();

        const calibrationOverlay = document.getElementById('calibration-overlay');
        if (calibrationOverlay) {
            calibrationOverlay.style.display = screen === SCREENS.CALIBRATION ? 'block' : 'none';
        }

        this.currentScreen = screen;

        switch (screen) {
            case SCREENS.HOME:
                this.homeScreen.show();
                break;
            case SCREENS.CALIBRATION:
                break;
            case SCREENS.DEMO:
                this.demoScreen.show();
                break;
            case SCREENS.RESULTS:
                this.resultsScreen.show();
                break;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
