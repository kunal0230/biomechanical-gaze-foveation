/**
 * HomeScreen - Research Workstation Dashboard
 * Camera acquisition, face posture alignment, environment selection, and calibration protocol setup
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
        this.calMode = '9point';

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
            <div class="home-screen compact">
                <header class="home-header">
                    <div class="header-content">
                        <div class="header-top-row">
                            <h1>Gaze-Adaptive Level-of-Detail Renderer</h1>
                            <span class="research-tag">RESEARCH BENCHMARK v2.0</span>
                        </div>
                        <p class="subtitle">Real-Time Biomechanical Eye Tracking & Foveated WebGL2 Raymarching</p>
                    </div>
                    <div class="header-actions">
                        <span class="renderer-badge" id="renderer-badge">WebGL2</span>
                        <button class="tutorial-btn" id="tutorial-btn">
                            <svg class="btn-svg" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <path d="M12 16v-4M12 8h.01"></path>
                            </svg>
                            Methodology Guide
                        </button>
                    </div>
                </header>
                
                <div class="home-content compact">
                    <section class="left-panel">
                        <div class="mode-selection-panel">
                            <span class="panel-section-label">TRACKING INPUT MODE</span>
                            <div class="mode-button-group">
                                <button class="mode-toggle-btn active" id="mode-camera-btn">
                                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                                        <circle cx="12" cy="13" r="4"></circle>
                                    </svg>
                                    Webcam Eye Tracker
                                </button>
                                <button class="mode-toggle-btn" id="mode-sim-btn">
                                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <line x1="22" y1="12" x2="18" y2="12"></line>
                                        <line x1="6" y1="12" x2="2" y2="12"></line>
                                        <line x1="12" y1="6" x2="12" y2="2"></line>
                                        <line x1="12" y1="22" x2="12" y2="18"></line>
                                    </svg>
                                    Presentation Simulator (Cursor)
                                </button>
                            </div>
                        </div>

                        <div class="scene-section compact">
                            <div class="section-title-row">
                                <span class="panel-section-label">SELECT 3D RAYMARCHING ENVIRONMENT</span>
                            </div>
                            <div class="scene-grid compact" id="scene-grid"></div>
                        </div>
                        
                        <div class="info-section">
                            <div class="info-card calibration-info">
                                <div class="card-title-row">
                                    <span class="card-dot"></span>
                                    <h3>Calibration Protocol</h3>
                                </div>
                                <p>Fixate on targeted crosshairs. Biomechanical feature extraction computes <strong>Iris-to-Eyebrow Distance (IED)</strong> and <strong>Bilateral Scleral Ratios</strong> in a 3D SO(3) head-canonical space, canceling vertical ptosis and head pitch.</p>
                            </div>
                            
                            <div class="info-card performance-note">
                                <div class="card-title-row">
                                    <span class="card-dot blue"></span>
                                    <h3>Raymarching LOD Architecture</h3>
                                </div>
                                <p>Fovea evaluates <strong>64 steps/ray</strong> with multi-octave FBM terrain. Periphery dynamically throttles to <strong>20 steps/ray</strong> with smooth epsilon relaxation, yielding <strong>45%–60% compute savings</strong>.</p>
                            </div>
                        </div>
                        
                        <div class="action-section">
                            <div class="camera-status" id="camera-status">
                                <span class="status-dot"></span>
                                <span class="status-text">Position face within sensor reticle</span>
                            </div>
                            <div class="action-buttons-group">
                                <button class="start-button" id="start-btn" disabled>
                                    Start Calibration
                                </button>
                                <button class="preset-button" id="preset-btn">
                                    Quick Start (Default Baseline)
                                </button>
                            </div>
                        </div>
                    </section>
                    
                    <section class="camera-section compact" id="camera-section">
                        <div class="camera-preview" id="camera-preview">
                            <video id="home-video" autoplay playsinline muted></video>
                            <div class="camera-placeholder">
                                <div class="spinner"></div>
                                <p>Initializing optical sensor & FaceMesh pipeline...</p>
                            </div>
                            
                            <div class="stats-overlay">
                                <div class="stat-pill">
                                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                                        <line x1="8" y1="21" x2="16" y2="21"></line>
                                        <line x1="12" y1="17" x2="12" y2="21"></line>
                                    </svg>
                                    <span id="stat-resolution">720p HD</span>
                                </div>
                                <div class="stat-pill">
                                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                                    </svg>
                                    <span id="stat-fps">--</span> Hz
                                </div>
                                <div class="stat-pill">
                                    <span class="status-indicator-dot" id="face-indicator-dot"></span>
                                    <span id="stat-confidence">Searching</span>
                                </div>
                            </div>
                        </div>

                        <div class="requirements-list">
                            <div class="req-item">
                                <svg class="req-svg check" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                                <span>Uniform diffuse illumination</span>
                            </div>
                            <div class="req-item">
                                <svg class="req-svg check" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                                <span>Direct frontal orientation</span>
                            </div>
                            <div class="req-item">
                                <svg class="req-svg check" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                                <span>Stabilized distance: 50-65 cm</span>
                            </div>
                        </div>

                        <div class="simulator-guide-card" id="simulator-guide-card" style="display:none;">
                            <h3>Presentation Simulator Mode Active</h3>
                            <p>Cursor or touch coordinates directly drive the simulated fovea with natural saccadic velocity dynamics. Ideal for stage presentations, screen sharing, or devices without a front-facing webcam.</p>
                            <button class="cal-btn primary" id="sim-launch-btn">Launch Simulation Immediately</button>
                        </div>
                    </section>
                </div>
                
                <footer class="home-footer compact">
                    <p>Engine: WebGL2 GLSL ES 3.00 | Tracking: MediaPipe 468 FaceMesh + 3D SO(3) Canonical Normalization + 1-Euro Adaptive Filter | Standard 45s Session</p>
                </footer>
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
        this.tutorialBtn = document.getElementById('tutorial-btn');
        this.rendererBadge = document.getElementById('renderer-badge');

        this.statResolution = document.getElementById('stat-resolution');
        this.statFps = document.getElementById('stat-fps');
        this.statConfidence = document.getElementById('stat-confidence');
        this.faceIndicatorDot = document.getElementById('face-indicator-dot');

        this.modeCameraBtn = document.getElementById('mode-camera-btn');
        this.modeSimBtn = document.getElementById('mode-sim-btn');
        this.simulatorGuideCard = document.getElementById('simulator-guide-card');
        this.simLaunchBtn = document.getElementById('sim-launch-btn');

        // Mode Toggles
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
            this.simulatorGuideCard.style.display = 'block';
            this.cameraPreview.style.display = 'none';
            this.startBtn.textContent = 'Start Simulation (Cursor)';
            this.startBtn.disabled = false;
            this.startBtn.classList.add('ready');
            const statusText = this.cameraStatus.querySelector('.status-text');
            if (statusText) statusText.textContent = 'Cursor simulation ready';
        } else {
            this.modeCameraBtn.classList.add('active');
            this.modeSimBtn.classList.remove('active');
            this.simulatorGuideCard.style.display = 'none';
            this.cameraPreview.style.display = 'block';
            this.startBtn.textContent = 'Start Calibration';
            this.startBtn.disabled = !this.faceReady;
            if (this.faceReady) this.startBtn.classList.add('ready');
            else this.startBtn.classList.remove('ready');
        }

        if (this.onModeChange) {
            this.onModeChange(mode);
        }
    }

    async _checkRendererSupport() {
        if (window.WebGL2RenderingContext) {
            this.rendererBadge.textContent = 'WebGL2 Active';
            this.rendererBadge.className = 'renderer-badge webgl';
        } else {
            this.rendererBadge.textContent = 'WebGL Unsupported';
            this.rendererBadge.className = 'renderer-badge bad';
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

        const statusDot = this.cameraStatus.querySelector('.status-dot');
        const statusText = this.cameraStatus.querySelector('.status-text');

        if (this.statConfidence) {
            this.statConfidence.textContent = detected ? (ready ? 'Aligned' : 'Acquiring') : 'Searching';
        }
        if (this.faceIndicatorDot) {
            this.faceIndicatorDot.className = `status-indicator-dot ${detected ? (ready ? 'ready' : 'detected') : ''}`;
        }

        if (ready) {
            this.startBtn.classList.add('ready');
            statusDot.className = 'status-dot ready';
            statusText.textContent = 'Subject aligned. Ready for calibration';
        } else if (detected) {
            this.startBtn.classList.remove('ready');
            statusDot.className = 'status-dot detected';
            statusText.textContent = 'Adjust distance or center face';
        } else {
            this.startBtn.classList.remove('ready');
            statusDot.className = 'status-dot';
            statusText.textContent = 'Position face within sensor reticle';
        }
    }

    showCameraActive() {
        const placeholder = this.container.querySelector('.camera-placeholder');
        if (placeholder) {
            placeholder.style.display = 'none';
        }
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

    updateStats(fps, width, height) {
        if (this.statFps) {
            this.statFps.textContent = Math.round(fps);
            if (fps >= 45) this.statFps.className = 'stat-value good';
            else if (fps >= 25) this.statFps.className = 'stat-value ok';
            else this.statFps.className = 'stat-value bad';
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
