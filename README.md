# Real-Time Gaze-Adaptive Level-of-Detail Renderer

> A web-based foveated rendering benchmark combining physiological oculomotor modeling, 3D head-canonical $SO(3)$ normalization, adaptive 1-Euro filtering, and dynamic WebGL2 raymarching.

---

## 1. Executive Summary

Foveated rendering exploits the anatomical structure of the human visual system: high-acuity photopic vision is concentrated strictly within the central fovea ($\approx 1.5^\circ\text{--}2.0^\circ$ visual angle), surrounded by rapidly attenuating peripheral visual acuity.

This benchmark provides a real-time, browser-native demonstration of **gaze-contingent Level-of-Detail (LOD) raymarching**. By concentrating shader ALU operations and ray steps on the fovea while throttling peripheral geometry, procedural octaves, and step counts, the system delivers an empirical **45% to 60% compute workload reduction** while preserving perceived visual fidelity.

---

## 2. Core Scientific & Algorithmic Foundations

Standard commodity RGB webcam gaze estimation degrades under eyelid ptosis during downward gaze and false gaze shifts caused by head tilt. This system implements three biomechanical and mathematical innovations:

### 2.1 Head-Canonical $SO(3)$ Normalization
Facial landmarks from MediaPipe FaceMesh are projected into a skull-aligned local coordinate frame prior to feature computation:
1. Rigid facial anchors are established from the pronasale (nose tip, index 4), transverse canthal baseline (landmarks 33 & 263), and supraorbital forehead (landmark 10).
2. Gram-Schmidt orthogonalization constructs an orthonormal rotation matrix $\mathbf{R} \in SO(3)$.
3. Normalized landmark coordinates are scaled by the inter-ocular distance ($d_{\text{IOD}}$):
   $$\tilde{\mathbf{p}}_i = \frac{\mathbf{R} (\mathbf{p}_i - \mathbf{p}_{\text{nose}})}{d_{\text{IOD}}}$$
In this frame, head pitch and yaw rotate synchronously with the skull, decoupling oculomotor eye gaze from head posture.

### 2.2 Iris-to-Eyebrow Excursion (IED) for Downward Gaze
During downward gaze, the upper eyelid depresses (*eyelid excursion*), occluding 40%–60% of the superior cornea and causing conventional landmark regressors to fail. The eyebrow, however, remains rigidly anchored to the frontal bone. The **Iris-to-Eyebrow Distance (IED)** serves as an occlusion-free vertical gaze proxy:
$$\text{IED} = \tilde{y}_{\text{brow}} - \tilde{y}_{\text{iris}}$$
IED expands monotonically as the user looks toward the bottom of the screen, linearizing vertical prediction.

### 2.3 Bilateral Scleral Hemispheric Ratio ($\rho_h$)
Horizontal gaze is derived from the scale-invariant ratio along the palpebral fissure:
$$\rho_{h} = \frac{\tilde{x}_{\text{iris}} - \tilde{x}_{\text{inner\_canthus}}}{\tilde{x}_{\text{outer\_canthus}} - \tilde{x}_{\text{inner\_canthus}}}$$

### 2.4 Dual-State 1-Euro Filter with Ballistic Lead Compensation
A 1-Euro adaptive low-pass filter eliminates high-frequency micro-jitter during steady fixation ($f_{c,\text{min}} = 0.9\text{ Hz}$) while scaling responsiveness linearly with instantaneous velocity during rapid eye movements:
$$f_c = f_{c,\text{min}} + \beta |\dot{x}_k|$$
To eliminate foveal circle lag caused by webcam capture latency ($\tau \approx 40\text{ ms}$), ballistic extrapolation projects the fixation target forward during saccades:
$$\mathbf{p}_{\text{rendered}} = \mathbf{p} + \mathbf{v} \cdot \tau_{\text{lead}}$$

---

## 3. Shader Level-of-Detail Architecture

| Parameter | Foveal Zone ($r < 0.25 r_{\text{fovea}}$) | Transition Zone ($0.25 < r < 1.25$) | Peripheral Zone ($r > 1.25 r_{\text{fovea}}$) |
|---|---|---|---|
| **Max Raymarching Steps** | 64–80 steps / ray | Smooth interpolation (64 $\to$ 20) | 18–20 steps / ray |
| **Surface Epsilon ($\epsilon$)** | $\epsilon = 0.005$ (fine precision) | $\epsilon \in [0.005, 0.040]$ | $\epsilon = 0.040$ (coarse early exit) |
| **Terrain FBM Octaves** | 4 octaves + grass displacement | 3 octaves | 2 octaves (smooth macro hills) |
| **Instance Density** | 8 trees + 4 rocks | 6 trees | 4 trees, 0 rocks |
| **Workload Profile** | Concentrated ALU compute | Transitional falloff | Minimal power consumption |

---

## 4. Key System Features

- **Multi-Protocol Calibration**:
  - **9-Point Standard Grid**: Balanced 14-second calibration with 3x3 spatial distribution.
  - **5-Point Express Setup**: Fast 8-second calibration for quick demonstrations.
  - **13-Point Precision Protocol**: High-density 3x3 grid with inner focal nodes for scientific evaluations.
  - **Pre-Trained Default Baseline**: Jump straight into the simulation without calibration.
- **Interactive Calibration Verification**:
  - Displays Mean Absolute Error (MAE in pixels and visual degrees) and $R^2$ fit scores.
  - Live interactive reticle test to confirm tracking accuracy prior to simulation.
- **Demo Simulation Mode**:
  - Direct cursor or touch foveation with natural saccadic velocity dynamics.
  - Enables visual evaluation on devices without webcam hardware or in low-light auditoriums.
- **Visual Reticle Rings Overlay**:
  - Visualizes biological $2^\circ$ fovea centralis and $5^\circ$ parafoveal boundaries.
- **Compute Heatmap Mode**:
  - Profiles fragment workload in real time (warm amber/red for heavy foveal compute, deep blue/cyan for peripheral low compute).
- **Session Telemetry Export**:
  - Download full benchmark logs (time-series step trajectory, frame counts, FPS, zone distribution) in structured JSON format.

---

## 5. Local Setup & Execution

### Prerequisites
- Node.js 18+
- Modern WebGL2-compatible browser (Chrome, Safari, Edge, Firefox)
- Front-facing webcam (optional; Demo Simulation mode available)

### Installation
```bash
# Clone the repository
git clone https://github.com/kunal0230/Real-Time-Gaze-Adaptive-LOD-Renderer.git
cd Real-Time-Gaze-Adaptive-LOD-Renderer

# Install dependencies
npm install --prefix foveated-renderer

# Start development server
npm run dev
```

Visit `http://localhost:5173` in your browser.

---

## 6. Hosting on Vercel

This repository is pre-configured for automated 1-click deployment on [Vercel](https://vercel.com):

1. Push your repository to GitHub.
2. Import the repository in the Vercel dashboard.
3. Keep default settings (the included `vercel.json` and root `package.json` automatically manage the build command and output directory).
4. Click **Deploy**.

---

## 7. Project Structure

```
.
├── foveated-renderer/
│   ├── index.html                   # Application entry markup
│   ├── package.json                 # Core dependencies
│   ├── src/
│   │   ├── main.js                  # Application orchestrator
│   │   ├── styles.css               # Scientific workstation styling
│   │   ├── analytics/
│   │   │   └── ComputeTracker.js    # Workload benchmarking & telemetry export
│   │   ├── calibration/
│   │   │   └── CalibrationUI.js     # Multi-protocol calibration & live verification
│   │   ├── components/
│   │   │   ├── DebugPanel.js        # Real-time telemetry & landmark inspector
│   │   │   ├── FaceGuide.js         # Optical alignment guide overlay
│   │   │   ├── SceneCard.js         # Environment selector card
│   │   │   └── TutorialModal.js     # Research methodology guide
│   │   ├── eye-tracking/
│   │   │   ├── GazeEstimator.js     # 3D SO(3) normalization & IED extraction
│   │   │   ├── OneEuroFilter.js     # Adaptive filter & saccade lead extrapolator
│   │   │   ├── RidgeRegression.js   # Regularized least-squares solver & diagnostics
│   │   │   └── constants.js         # MediaPipe landmark indices
│   │   ├── renderer/
│   │   │   └── SceneRenderer.js     # WebGL2 procedural raymarching engine
│   │   └── scenes/
│   │       ├── BaseScene.js         # Scene abstraction interface
│   │       ├── ForestValley.js      # Procedural terrain with FBM & vegetation LOD
│   │       ├── CosmicOrbs.js        # High-speed emissive sphere baseline (60 FPS)
│   │       └── CrystalGrid.js       # Geometric crystal lattice with reflections
├── package.json                     # Root monorepo scripts for Vercel
├── vercel.json                      # Vercel deployment configuration
├── brainstorm.md                    # Research trajectory & mathematical formulations
└── tasks.md                         # Benchmark milestones & empirical observations
```

---

## 8. License

MIT License. Developed for research and educational demonstrations in computer graphics, human-computer interaction, and foveated rendering.
