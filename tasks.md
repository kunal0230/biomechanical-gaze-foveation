# Research Execution Tasks: Data Gathering, Mathematical Proofs & Paper Delivery

**Project:** Beyond the Iris — Periocular Biomechanical Proxies & Saccade-Aware Predictive Extrapolation  
**Target Venue:** MULTINOVA 2.0 / ICISEA 2026 (Springer Nature `svproc`, 8 pages)  
**Standard:** Best Paper Quality / True Empirical Computer Vision Research  
**Hardware Platform:** Apple MacBook Air M-Series, 1080p FaceTime HD Webcam (30 Hz)  

---

## Overview of Phases

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ Phase 1: Empirical Data Gathering & Instrumentation                              │
│ (Automated target logger, vertical sweep, head pitch test, saccade jump)         │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│ Phase 2: Feature Extraction & Decoupling Algorithms                              │
│ (3D SO(3) normalization, Bilateral Sclera ρ_h, IED vertical proxy, Extrapolator) │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│ Phase 3: Quantitative Ablation & Mathematical Proofs                             │
│ (Vertical linearization curve, pitch independence plot, Pareto trade-off)        │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│ Phase 4: Publication Figures & Manuscript Compilation                            │
│ (Multi-panel vector figures, paper.tex updates, 8-page PDF compilation)          │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Empirical Data Gathering & Instrumentation

- [ ] **Task 1.1: Build Automated Gaze Data Logger (`scripts/collect_gaze_data.py`)**
  * Create a standalone Python script utilizing OpenCV, Tkinter/Pygame (fullscreen), and MediaPipe Face Mesh.
  * Display synchronized, timestamped target dots on the MacBook screen while capturing 1080p frames at 30 Hz.
  * Log frame timestamp, ground-truth screen $(X^*, Y^*)$, raw landmark coordinates (irises 468/473, canthi 33/133/263/362, eyebrows 70/105, nose 4, forehead 10).
  * Save structured session data to JSON/CSV for reproducible evaluation.

- [ ] **Task 1.2: Record Vertical Down-Gaze Excursion Dataset**
  * Collect a vertical sweep sequence: user fixates on dots moving strictly along the vertical midline ($Y \in [10\%, 90\%]$ of display height).
  * *Objective:* Capture the exact moment of upper eyelid droop (ptosis) occluding the superior limbus to empirically prove the breakdown of raw iris tracking.

- [ ] **Task 1.3: Record Head-Pitch Invariance Dataset**
  * Collect a head-movement sequence: user fixates strictly on a static crosshair at the screen center while intentionally tilting the head up and down ($\pm 15^\circ$ pitch).
  * *Objective:* Gather empirical evidence showing how head pitch distorts raw 2D landmark distances and prove that 3D rigid un-rotation cancels this artifact.

- [ ] **Task 1.4: Record Rapid Saccadic Step-Jump Dataset**
  * Collect horizontal saccade sequences: user fixates on a left-side target ($X = 15\%$), which abruptly jumps to the right ($X = 85\%$).
  * *Objective:* Capture instantaneous angular velocity spikes ($\omega > 180^\circ/\text{s}$) and record the 45 ms pipeline delay.

---

## Phase 2: Feature Extraction & Decoupling Algorithms

- [ ] **Task 2.1: Implement 3D Head-Canonical Normalization (`src/head_pose.py`)**
  * Formulate Gram-Schmidt orthogonal basis from facial landmarks:
    * Inter-canthal vector $\mathbf{u}_x$, orthogonalized midline $\mathbf{u}_y$, normal vector $\mathbf{u}_z$.
    * Rotation matrix $\mathbf{R} = [\mathbf{u}_x, \mathbf{u}_y, \mathbf{u}_z]^T \in SO(3)$.
  * Implement coordinate un-rotation: $\tilde{\mathbf{p}}_i = \frac{\mathbf{R} (\mathbf{p}_i - \mathbf{p}_{\text{nose}})}{d_{\text{inter\_ocular}}}$.
  * *Proof Metric:* Verify that $\tilde{\mathbf{p}}$ coordinates remain invariant during $\pm 15^\circ$ head pitch.

- [ ] **Task 2.2: Implement Bilateral (2-Zone) Scleral Ratio ($\rho_h$)**
  * Compute horizontal ratio in head-canonical space:
    $$\rho_h = \frac{\tilde{x}_{\text{iris}} - \tilde{x}_{\text{inner\_canthus}}}{\tilde{x}_{\text{outer\_canthus}} - \tilde{x}_{\text{inner\_canthus}}}$$
  * Verify scale-invariance when leaning towards ($40\text{ cm}$) and away ($70\text{ cm}$) from the MacBook screen.

- [ ] **Task 2.3: Implement Normalized Iris-to-Eyebrow Distance (IED)**
  * Compute Euclidean distance between iris center (468) and supraorbital eyebrow arch (70/105) in head-canonical frame:
    $$\text{IED} = \frac{\|\tilde{\mathbf{p}}_{\text{iris}} - \tilde{\mathbf{p}}_{\text{brow}}\|}{d_{\text{inter\_ocular}}}$$
  * Verify that $\text{IED}$ expands monotonically as the user looks from top to bottom of the screen.

- [ ] **Task 2.4: Implement Saccade-Aware Ballistic Velocity Extrapolator**
  * Compute instantaneous velocity $\omega_k = \frac{\|\mathbf{z}_k - \mathbf{z}_{k-1}\|}{\Delta t}$.
  * State 1 (Fixation, $\omega_k < 180^\circ/\text{s}$): Apply $1\text{--Euro}$ adaptive low-pass filter ($f_{c,\text{min}}=0.8\text{ Hz}, \beta=0.015$).
  * State 2 (Saccade, $\omega_k \ge 180^\circ/\text{s}$): Apply constant-acceleration forward projection:
    $$\hat{\mathbf{z}}_{\text{pred}} = \hat{\mathbf{z}}_k + \mathbf{v}_k \tau_{\text{lead}} + \frac{1}{2} \mathbf{a}_k \tau_{\text{lead}}^2 \quad (\tau_{\text{lead}} = 45\text{ ms})$$

---

## Phase 3: Quantitative Ablation & Mathematical Proofs

- [ ] **Task 3.1: Generate Vertical Linearization Proof (Proof of Observation 1)**
  * Plot Ground-Truth Target $Y^*$ vs. Predicted $Y$ across $[-25^\circ, +20^\circ]$ vertical gaze.
  * Contrast:
    1. Raw Iris Center Regressor (shows severe plateau/non-linearity at $Y < -10^\circ$ due to eyelid droop).
    2. Our Proposed IED Metric (shows continuous linear correlation $R^2 > 0.96$).
  * Calculate reduction in Mean Absolute Error (MAE) on vertical gaze.

- [ ] **Task 3.2: Generate Head-Pitch Independence Proof (Proof of Observation 3)**
  * Plot predicted screen gaze coordinates while the user holds central fixation and tilts head $\pm 15^\circ$ pitch.
  * Contrast:
    1. Unnormalized 2D Pipeline (shows $>150\text{ px}$ false gaze drift).
    2. Proposed 3D $SO(3)$ Canonical Decoupled Pipeline (bounds drift to $<18\text{ px}$).

- [ ] **Task 3.3: Generate Saccade Latency & Jitter Benchmark (Proof of Temporal Engine)**
  * Plot time-series step response across $1000\text{ ms}$ horizontal saccade.
  * Compare: Raw, Moving Average (EMA), Linear Kalman, 1-Euro Filter, and Our Proposed Saccade Extrapolator.
  * Plot Pareto frontier: Jitter (RMS px) vs. Settling Delay ($t_{95\%}$, ms).

- [ ] **Task 3.4: Construct Formal Ablation Table**
  * Compute exact numerical metrics across configurations:
    * `Baseline (Raw MediaPipe Iris)`
    * `+ Bilateral Sclera Ratio (ρ_h)`
    * `+ Iris-to-Eyebrow Excursion (IED)`
    * `+ 3D SO(3) Head Normalization`
    * `+ Saccade-Aware Predictive Extrapolator`
  * Metrics: Horizontal RMSE ($^\circ$), Vertical RMSE ($^\circ$), Fixation Jitter (RMS px), Saccadic Settling Latency (ms), Head-Tilt Drift (px).

---

## Phase 4: Publication Figures & Manuscript Compilation

- [ ] **Task 4.1: Render High-Resolution Vector Figures (`assets/figure_biomechanical_pipeline.png`)**
  * Create a publication-grade 3-panel figure:
    * Panel (a): Anatomical landmark schematic illustrating Bilateral Sclera zones and the IED vector.
    * Panel (b): Vertical down-gaze linearization response curve.
    * Panel (c): Saccadic step-response showing forward-lead extrapolation canceling the 45 ms pipeline delay.

- [ ] **Task 4.2: Update LaTeX Manuscript (`LaTex_Package/paper.tex`)**
  * Expand Title & Abstract: Emphasize periocular biomechanics, vertical occlusion resolution, and predictive streaming extrapolation.
  * Section 3: Add formal mathematical definitions for $SO(3)$ head un-rotation, Bilateral Sclera ($\rho_h$), and $\text{IED}$.
  * Section 4: Add the Saccade Velocity Extrapolator equations.
  * Section 5: Insert updated empirical ablation tables and analysis.
  * Check for zero AI-cliché phrases; ensure scholarly, rigorous tone.

- [ ] **Task 4.3: Compile Final PDF via Tectonic**
  * Compile `paper.tex` with zero errors and zero warnings.
  * Verify strict adherence to double-blind anonymity (`Anonymous Authors`, `Institution Withheld`).
  * Verify exact page length: precisely 8 pages (full Springer `svproc` allowance).

- [ ] **Task 4.4: Prepare Conference Portal Package**
  * Ready compiled `paper.pdf`.
  * Create a clean source archive `paper_source.zip` (containing `paper.tex`, `svproc.cls`, figures, and `.bib`).
  * Write metadata text (title, keywords, abstract) ready for portal submission.

---

## Phase 5: Comprehensive Data Collection Protocols & Schema

To guarantee our empirical proofs are comprehensive, bulletproof, and publication-grade, we gather data across eight controlled protocols.

### Table 1: Experimental Data Collection Protocols

| Protocol ID | Protocol Name | User Action / Stimulus | Duration / Samples | Purpose / Research Proof |
| :--- | :--- | :--- | :--- | :--- |
| **P1** | **Static 16-Point Grid** | Fixate on static dots displayed across a $4 \times 4$ uniform grid covering the entire display ($1.5\text{ s}$ per point). | $\approx 30\text{ s}$ / $900$ frames | Baseline 2D polynomial & Ridge Regression calibration; baseline spatial accuracy (RMSE). |
| **P2** | **Continuous Vertical Midline Sweep** | Track a target moving smoothly from top ($Y=5\%$) to bottom ($Y=95\%$) along the vertical center axis at constant speed ($150\text{ px/s}$). | $\approx 20\text{ s}$ / $600$ frames | **Proof of Observation 1 (IED vs. Eyelid Droop):** Captures the exact point where raw iris fails and proves linearity of Iris-to-Eyebrow Excursion. |
| **P3** | **Continuous Horizontal Sweep** | Track a target moving smoothly from left ($X=5\%$) to right ($X=95\%$) across top, middle, and bottom lines ($180\text{ px/s}$). | $\approx 30\text{ s}$ / $900$ frames | **Proof of Critique 1 (Bilateral Sclera Ratio):** Proves linearity and stability of $\rho_h$ across horizontal field of view. |
| **P4** | **Fixed-Gaze Head Pitch Sweep** | Fixate strictly on a static crosshair at the screen center while slowly pitching the head up ($+20^\circ$) and down ($-20^\circ$). | $\approx 20\text{ s}$ / $600$ frames | **Proof of Critique 2 (3D Pitch Decoupling):** Tests false gaze drift under head pitch with vs. without $SO(3)$ un-rotation. |
| **P5** | **Fixed-Gaze Head Yaw Sweep** | Fixate strictly on a static center crosshair while slowly turning the head left ($-25^\circ$) and right ($+25^\circ$). | $\approx 20\text{ s}$ / $600$ frames | Proves head rotation invariance during natural neck rotations without losing screen calibration. |
| **P6** | **Rapid Saccadic Step-Jumps** | Target abruptly jumps between distant screen coordinates ($800\text{ px}$ jumps: Left $\leftrightarrow$ Right, Top $\leftrightarrow$ Bottom). Fixate for $1.5\text{ s}$ after jump. | $\approx 40\text{ s}$ / $1200$ frames | **Proof of Saccade Extrapolator:** Captures velocity spikes ($>200^\circ/\text{s}$), saccade duration ($30\text{--}60\text{ ms}$), and pipeline delay ($45\text{ ms}$). |
| **P7** | **Distance / Scale Invariance Test** | Perform a 9-point fixation test at three distinct physical distances: $40\text{ cm}$ (near), $55\text{ cm}$ (normal), and $75\text{ cm}$ (far). | $\approx 45\text{ s}$ / $1350$ frames | Proves scale-invariance of Bilateral Sclera Ratio ($\rho_h$) and Normalized $\text{IED}$ without needing depth sensors. |
| **P8** | **Illumination Variation Benchmark** | Perform static fixation test under 3 conditions: Direct Desk Lamp (front-lit), Ambient Room Light, and Window Backlighting. | $\approx 45\text{ s}$ / $1350$ frames | Quantifies landmark detection confidence and noise floor across realistic home/office lighting conditions. |

---

### Table 2: Frame-by-Frame Data Logging Schema (`session_data.csv`)

Every video frame processed by `scripts/collect_gaze_data.py` logs the following 38-column telemetry vector:

| Field Category | Column Name | Type | Description |
| :--- | :--- | :--- | :--- |
| **Temporal / Metadata** | `timestamp_ms` | `float` | High-resolution monotonic timestamp (ms). |
| | `frame_id` | `int` | Sequential video frame counter ($0, 1, 2, \dots$). |
| | `protocol_id` | `string` | Active protocol ID (`P1` through `P8`). |
| | `stimulus_state` | `string` | Stimulus state (`STATIONARY`, `SWEEP_MOVING`, `SACCADE_STEP`). |
| **Ground Truth** | `gt_x_px`, `gt_y_px` | `float` | Ground-truth screen coordinates in display pixels. |
| | `gt_x_norm`, `gt_y_norm` | `float` | Normalized ground truth coordinates in $[0.0, 1.0]$. |
| **Head Pose (3D)** | `nose_x`, `nose_y`, `nose_z` | `float` | Pronasale anchor (Landmark 4) 3D coordinate. |
| | `pitch_deg` | `float` | Head pitch angle $\theta_{\text{pitch}}$ in degrees from $SO(3)$ matrix. |
| | `yaw_deg` | `float` | Head yaw angle $\theta_{\text{yaw}}$ in degrees from $SO(3)$ matrix. |
| | `roll_deg` | `float` | Head roll angle $\theta_{\text{roll}}$ in degrees from $SO(3)$ matrix. |
| | `iod_px` | `float` | Inter-Ocular Distance (distance between outer canthi 33 & 263). |
| **Left Eye Raw & Head-Frame** | `left_iris_x`, `left_iris_y` | `float` | Left iris center (Landmark 468) in camera frame. |
| | `left_inner_canthus_x` | `float` | Left medial canthus (Landmark 133). |
| | `left_outer_canthus_x` | `float` | Left lateral canthus (Landmark 33). |
| | `left_upper_lid_y` | `float` | Left superior palpebral margin (Landmark 159). |
| | `left_lower_lid_y` | `float` | Left inferior palpebral margin (Landmark 145). |
| | `left_brow_y` | `float` | Left supraorbital arch anchor (Landmark 70). |
| **Right Eye Raw & Head-Frame**| `right_iris_x`, `right_iris_y`| `float` | Right iris center (Landmark 473) in camera frame. |
| | `right_inner_canthus_x` | `float` | Right medial canthus (Landmark 362). |
| | `right_outer_canthus_x` | `float` | Right lateral canthus (Landmark 263). |
| | `right_upper_lid_y` | `float` | Right superior palpebral margin (Landmark 386). |
| | `right_lower_lid_y` | `float` | Right inferior palpebral margin (Landmark 374). |
| | `right_brow_y` | `float` | Right supraorbital arch anchor (Landmark 105). |
| **Derived Biomechanical** | `sclera_ratio_left` | `float` | Bilateral Scleral Ratio $\rho_{h,\text{left}}$ in head-canonical frame. |
| | `sclera_ratio_right` | `float` | Bilateral Scleral Ratio $\rho_{h,\text{right}}$ in head-canonical frame. |
| | `ied_left_norm` | `float` | Normalized Iris-to-Eyebrow Distance ($\text{IED}_{\text{left}} / \text{IOD}$). |
| | `ied_right_norm` | `float` | Normalized Iris-to-Eyebrow Distance ($\text{IED}_{\text{right}} / \text{IOD}$). |
| | `ear` | `float` | Eye Aspect Ratio for blink detection and blink filtering. |
| **Oculomotor Kinematics** | `velocity_px_s` | `float` | Instantaneous 2D ocular velocity ($\text{px/s}$). |
| | `angular_velocity_deg_s` | `float` | Instantaneous angular velocity ($\omega_k$ in $^\circ/\text{s}$). |
| | `is_saccade` | `int` | Binary flag ($1$ if $\omega_k \ge 180^\circ/\text{s}$, $0$ otherwise). |
| **Filter Estimates** | `pred_raw_x`, `pred_raw_y` | `float` | Unfiltered baseline prediction from polynomial head. |
| | `pred_kalman_x`, `pred_kalman_y`| `float` | Static Linear Kalman Filter output. |
| | `pred_1euro_x`, `pred_1euro_y` | `float` | Adaptive One-Euro ($1\text{--Euro}$) filter output. |
| | `pred_extrapolated_x`, `pred_extrapolated_y`| `float` | **Our Saccade-Aware Predictive Extrapolator output (+45 ms).** |

---

### Table 3: Mapping Empirical Data to Scientific Paper Claims

| Paper Claim / Hypothesis | Direct Empirical Proof from Dataset | Required Protocols |
| :--- | :--- | :--- |
| **1. Upper Eyelid Occlusion Causes Vertical Nonlinearity** | Plot `gt_y_norm` vs. `left_iris_y` showing plateau at down-gaze, contrasted with `ied_left_norm` maintaining linear correlation ($R^2 > 0.95$). | **P2** (Vertical Sweep) |
| **2. Bilateral Sclera Ratio ($\rho_h$) is Scale-Invariant** | Compare distribution of $\rho_h$ across $40\text{ cm}$, $55\text{ cm}$, and $75\text{ cm}$ distances; prove $< 2.5\%$ variance across distance shifts. | **P7** (Distance Invariance) |
| **3. 3D $SO(3)$ Normalization Cancels Head Pitch Drift** | Measure standard deviation of $(X_{\text{pred}}, Y_{\text{pred}})$ while fixating on static center point during head pitch sweep ($\pm 20^\circ$). | **P4** (Head Pitch) |
| **4. Predictive Extrapolation Binds Latency to 1 Frame** | Calculate time elapsed from stimulus jump until filter output enters $5\%$ settling envelope ($t_{95\%}$). | **P6** (Saccade Jumps) |
| **5. Full Pipeline Achieves State-of-the-Art Webcam Accuracy** | Compute overall Mean Absolute Angular Error ($^\circ$) and Pearson correlation across the 16-point grid. | **P1** (16-Point Grid) |
