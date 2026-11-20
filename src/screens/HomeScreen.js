/**
 * HomeScreen - Research Workstation Dashboard
 * Utilitarian interface for input mode selection, environment configuration, and sensor verification.
 */

import { SceneCard } from '../components/SceneCard.js';
import { CosmicOrbs } from '../scenes/CosmicOrbs.js';
import { CrystalGrid } from '../scenes/CrystalGrid.js';
import { ForestValley } from '../scenes/ForestValley.js';

export class HomeScreen {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.onStart = null;
        this.onQuickStart = null;
        this.onTutorial = null;
        this.onModeChange = null;

        this.faceReady = false;
        this.gazeMode = 'camera'; // 'camera' | 'simulator'

        this.scenes = [
            new ForestValley(),
            new CosmicOrbs(),
            new CrystalGrid()
        ];
        this.selectedScene = this.scenes[0];
        this.sceneCards = [];

        this._createLayout();
    }

    _createLayout() {
        this.container.innerHTML = `
            <div class="home-screen">
                <div class="home-workbench">
                    <header class="home-header">
                        <div class="header-title-block">
                            <h1>Gaze-Adaptive Foveated Renderer</h1>
                            <span class="header-sub">WebGL2 Raymarching & Biomechanical Oculomotor Benchmark</span>
                        </div>
                        <div class="header-meta">
                            <span class="sys-badge" id="renderer-badge">WebGL2</span>
                            <button class="sys-btn" id="tutorial-btn">Technical Notes</button>
                        </div>
                    </header>
                    
                    <div class="home-grid">
                        <section class="controls-column">
                            <!-- Mode Selector -->
                            <div class="panel-box">
                                <label class="box-label">Input Mode</label>
                                <div class="mode-toggle">
                                    <button class="mode-btn active" id="mode-camera-btn">Webcam Eye Tracker</button>
                                    <button class="mode-btn" id="mode-sim-btn">Demo Simulation</button>
                                </div>
                            </div>

                            <!-- Environment Selector -->
                            <div class="panel-box">
                                <label class="box-label">Test Environment</label>
                                <div class="scene-list" id="scene-grid"></div>
                            </div>

                            <!-- Technical Parameter Summary -->
                            <div class="panel-box tech-specs">
                                <label class="box-label">Pipeline Parameters</label>
                                <div class="specs-grid">
                                    <div class="spec-row">
                                        <span class="spec-k">Foveal Step Budget:</span>
                                        <span class="spec-v">64 steps / ray</span>
                                    </div>
                                    <div class="spec-row">
                                        <span class="spec-k">Peripheral Step Budget:</span>
                                        <span class="spec-v">20 steps / ray</span>
                                    </div>
                                    <div class="spec-row">
                                        <span class="spec-k">Head Pose Decoupling:</span>
                                        <span class="spec-v">3D SO(3) Canonical</span>
                                    </div>
                                    <div class="spec-row">
                                        <span class="spec-k">Temporal Filter:</span>
                                        <span class="spec-v">1-Euro Adaptive (fc=0.9 Hz)</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Launch Actions -->
                            <div class="action-footer">
                                <div class="sensor-status-line" id="camera-status">
                                    <span class="status-indicator" id="status-ind"></span>
                                    <span class="status-msg" id="status-msg">Initializing camera...</span>
                                </div>
                                <div class="action-row">
                                    <button class="btn primary" id="start-btn" disabled>Start Calibration</button>
                                    <button class="btn secondary" id="preset-btn">Skip to Demo</button>
                                </div>
                            </div>
                        </section>

                        <section class="viewport-column">
                            <div class="camera-panel" id="camera-preview">
                                <video id="home-video" autoplay playsinline muted></video>
                                
                                <div class="camera-loader">
                                    <div class="loader-line"></div>
                                    <span>Awaiting video stream...</span>
                                </div>

                                <div class="camera-telemetry">
                                    <span class="tel-item" id="stat-resolution">1280x720</span>
                                    <span class="tel-item" id="stat-confidence">Sensor Ready</span>
                                    <span class="tel-item" id="stat-fps">-- FPS</span>
                                </div>
                            </div>

                            <div class="sim-panel" id="sim-panel" style="display:none;">
                                <div class="sim-panel-content">
                                    <h3>Demo Simulation Active</h3>
                                    <p>Pointer and touch movement directly drive the gaze fixation point with simulated saccadic dynamics and 1-Euro adaptive smoothing.</p>
                                    <div class="sim-note">Direct hardware evaluation without requiring camera permissions or calibration.</div>
                                    <button class="btn primary" id="sim-launch-btn">Run Demo Simulation</button>
                                </div>
                            </div>

                            <div class="posture-guide">
                                <div class="guide-item">
                                    <span class="guide-marker">•</span>
                                    <span>Subject distance: 50–65 cm</span>
                                </div>
                                <div class="guide-item">
                                    <span class="guide-marker">•</span>
                                    <span>Direct frontal orientation</span>
                                </div>
                                <div class="guide-item">
                                    <span class="guide-marker">•</span>
                                    <span>Stable ambient illumination</span>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        `;

        const sceneGrid = document.getElementById('scene-grid');
        this.scenes.forEach((scene, index) => {
            const card = new SceneCard(scene, (selectedScene) => {
                this._selectScene(selectedScene);
            });
            this.sceneCards.push(card);
            sceneGrid.appendChild(card.getElement());

            if (index === 0) {
                card.setSelected(true);
            }
        });

        this.video = document.getElementById('home-video');
        this.startBtn = document.getElementById('start-btn');
        this.presetBtn = document.getElementById('preset-btn');
        this.cameraPreview = document.getElementById('camera-preview');
        this.cameraStatus = document.getElementById('camera-status');
        this.statusInd = document.getElementById('status-ind');
        this.statusMsg = document.getElementById('status-msg');
        this.tutorialBtn = document.getElementById('tutorial-btn');
        this.rendererBadge = document.getElementById('renderer-badge');

        this.statResolution = document.getElementById('stat-resolution');
        this.statFps = document.getElementById('stat-fps');
        this.statConfidence = document.getElementById('stat-confidence');

        this.modeCameraBtn = document.getElementById('mode-camera-btn');
        this.modeSimBtn = document.getElementById('mode-sim-btn');
        this.simPanel = document.getElementById('sim-panel');
        this.simLaunchBtn = document.getElementById('sim-launch-btn');

        // Mode Switching
        this.modeCameraBtn.addEventListener('click', () => this.setMode('camera'));
        this.modeSimBtn.addEventListener('click', () => this.setMode('simulator'));

        this.simLaunchBtn.addEventListener('click', () => {
            if (this.onQuickStart) this.onQuickStart(this.selectedScene, 'simulator');
        });

        this.startBtn.addEventListener('click', () => {
            if (this.onStart && (this.faceReady || this.gazeMode === 'simulator')) {
                this.onStart(this.selectedScene, this.gazeMode);
            }
        });

        this.presetBtn.addEventListener('click', () => {
            if (this.onQuickStart) {
                this.onQuickStart(this.selectedScene, this.gazeMode);
            }
        });

        this.tutorialBtn.addEventListener('click', () => {
            if (this.onTutorial) this.onTutorial();
        });

        this._checkRendererSupport();
    }

    setMode(mode) {
        this.gazeMode = mode;
        if (mode === 'simulator') {
            this.modeSimBtn.classList.add('active');
            this.modeCameraBtn.classList.remove('active');
            this.simPanel.style.display = 'flex';
            this.cameraPreview.style.display = 'none';
            this.startBtn.textContent = 'Run Demo Simulation';
            this.startBtn.disabled = false;
            this.statusInd.className = 'status-indicator ok';
            this.statusMsg.textContent = 'Demo Simulation ready (pointer-driven)';
        } else {
            this.modeCameraBtn.classList.add('active');
            this.modeSimBtn.classList.remove('active');
            this.simPanel.style.display = 'none';
            this.cameraPreview.style.display = 'flex';
            this.startBtn.textContent = 'Start Calibration';
            this.startBtn.disabled = !this.faceReady;
            this.updateFaceStatus(this.faceReady, this.faceReady);
        }

        if (this.onModeChange) {
            this.onModeChange(mode);
        }
    }

    async _checkRendererSupport() {
        if (window.WebGL2RenderingContext) {
            this.rendererBadge.textContent = 'WebGL2 (GLSL ES 3.0)';
            this.rendererBadge.className = 'sys-badge ok';
        } else {
            this.rendererBadge.textContent = 'WebGL Unsupported';
            this.rendererBadge.className = 'sys-badge warn';
        }
    }

    _selectScene(scene) {
        this.selectedScene = scene;
        this.sceneCards.forEach(card => {
            card.setSelected(card.scene === scene);
        });
    }

    getVideoElement() {
        return this.video;
    }

    getCameraContainer() {
        return this.cameraPreview;
    }

    getSelectedScene() {
        return this.selectedScene;
    }

    updateFaceStatus(detected, ready) {
        if (this.gazeMode === 'simulator') return;

        this.faceReady = ready;
        this.startBtn.disabled = !ready;

        if (this.statConfidence) {
            this.statConfidence.textContent = detected ? (ready ? 'Aligned' : 'Acquiring') : 'Searching';
        }

        if (ready) {
            this.statusInd.className = 'status-indicator ok';
            this.statusMsg.textContent = 'Subject aligned. Ready for calibration.';
        } else if (detected) {
            this.statusInd.className = 'status-indicator warn';
            this.statusMsg.textContent = 'Center face in camera view.';
        } else {
            this.statusInd.className = 'status-indicator';
            this.statusMsg.textContent = 'Searching for facial landmarks...';
        }
    }

    showCameraActive() {
        const loader = this.container.querySelector('.camera-loader');
        if (loader) loader.style.display = 'none';
    }

    setOnStart(callback) {
        this.onStart = callback;
    }

    setOnQuickStart(callback) {
        this.onQuickStart = callback;
    }

    setOnTutorial(callback) {
        this.onTutorial = callback;
    }

    setOnModeChange(callback) {
        this.onModeChange = callback;
    }

    updateStats(cameraFps, width, height) {
        if (this.statFps) {
            const val = typeof cameraFps === 'number' ? cameraFps.toFixed(1) : cameraFps;
            this.statFps.textContent = `${val} FPS (Cam)`;
        }
        if (this.statResolution && width && height) {
            this.statResolution.textContent = `${width}x${height}`;
        }
    }

    show() {
        this.container.style.display = 'block';
    }

    hide() {
        this.container.style.display = 'none';
    }
}
