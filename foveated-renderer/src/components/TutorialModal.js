/**
 * TutorialModal - Research Methodology & System Architecture Guide
 * Explains physiological foveation, biomechanical tracking, and WebGL2 LOD architecture
 */

export class TutorialModal {
    constructor() {
        this.overlay = null;
        this.currentStep = 0;
        this.onClose = null;

        this.steps = [
            {
                stepNum: '01',
                title: 'Physiological Principle: Foveated Vision',
                content: 'The human retina exhibits non-uniform receptor distribution. The central fovea (1.5°–2.0° visual angle) contains dense cone photoreceptors for high-acuity vision, while the peripheral retina contains sparse rods with low spatial resolution. Foveated rendering concentrates GPU raymarching workloads exclusively on the point of gaze, dynamically throttling peripheral geometric complexity.'
            },
            {
                stepNum: '02',
                title: 'Biomechanical Gaze Tracking & SO(3) Decoupling',
                content: 'Commodity RGB webcam tracking suffers from upper eyelid occlusion (ptosis) during downward gaze and false gaze shifts caused by head tilt. This system projects facial landmarks into a head-canonical 3D SO(3) frame centered at the pronasale (nose tip) and computes the Iris-to-Eyebrow Distance (IED) as an occlusion-free vertical gaze proxy, paired with the Bilateral Scleral Ratio for scale-invariant horizontal tracking.'
            },
            {
                stepNum: '03',
                title: 'Adaptive 1-Euro Filter & Saccade Lead',
                content: 'Human eye movements alternate between static fixations and rapid ballistic saccades (>300°/s). A dual-state 1-Euro filter eliminates micro-jitter during steady fixation (cutoff ~0.9 Hz) while scaling responsiveness during saccades. To compensate for the ~40ms webcam pipeline latency, constant-velocity ballistic extrapolation projects the foveal circle forward to prevent visual lag.'
            },
            {
                stepNum: '04',
                title: 'WebGL2 Raymarching Level-of-Detail',
                content: 'Within the shader, distance from the normalized gaze point determines raymarching step bounds (64 steps in the fovea down to 20 in the periphery), procedural fractal Brownian motion (FBM) octaves (4 down to 2), and surface intersection epsilon tolerances. This delivers an empirical 45%–60% reduction in total compute workload while preserving perceived visual fidelity.'
            }
        ];

        this._create();
    }

    _create() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'tutorial-overlay hidden';
        this.overlay.innerHTML = `
            <div class="tutorial-modal">
                <div class="tutorial-header">
                    <div class="tutorial-step-tag">PROTOCOL DOCUMENTATION</div>
                    <button class="tutorial-close" aria-label="Close">&times;</button>
                </div>
                <div class="tutorial-step-num"></div>
                <h2 class="tutorial-title"></h2>
                <p class="tutorial-content"></p>
                <div class="tutorial-progress">
                    <div class="tutorial-dots"></div>
                </div>
                <div class="tutorial-actions">
                    <button class="tutorial-prev cal-btn secondary">Previous</button>
                    <button class="tutorial-next cal-btn primary">Next</button>
                </div>
            </div>
        `;

        document.body.appendChild(this.overlay);

        this.overlay.querySelector('.tutorial-close').addEventListener('click', () => this.hide());
        this.overlay.querySelector('.tutorial-prev').addEventListener('click', () => this._prevStep());
        this.overlay.querySelector('.tutorial-next').addEventListener('click', () => this._nextStep());
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) this.hide();
        });

        this._renderDots();
    }

    _renderDots() {
        const dotsContainer = this.overlay.querySelector('.tutorial-dots');
        dotsContainer.innerHTML = this.steps.map((_, i) =>
            `<span class="tutorial-dot ${i === this.currentStep ? 'active' : ''}" data-step="${i}"></span>`
        ).join('');

        dotsContainer.querySelectorAll('.tutorial-dot').forEach(dot => {
            dot.addEventListener('click', () => {
                this.currentStep = parseInt(dot.dataset.step, 10);
                this._updateContent();
            });
        });
    }

    _updateContent() {
        const step = this.steps[this.currentStep];

        this.overlay.querySelector('.tutorial-step-num').textContent = `Section ${step.stepNum} of 04`;
        this.overlay.querySelector('.tutorial-title').textContent = step.title;
        this.overlay.querySelector('.tutorial-content').textContent = step.content;

        this.overlay.querySelectorAll('.tutorial-dot').forEach((dot, i) => {
            dot.classList.toggle('active', i === this.currentStep);
        });

        const prevBtn = this.overlay.querySelector('.tutorial-prev');
        const nextBtn = this.overlay.querySelector('.tutorial-next');

        prevBtn.style.visibility = this.currentStep === 0 ? 'hidden' : 'visible';
        nextBtn.textContent = this.currentStep === this.steps.length - 1 ? 'Close Guide' : 'Next Section';
    }

    _prevStep() {
        if (this.currentStep > 0) {
            this.currentStep--;
            this._updateContent();
        }
    }

    _nextStep() {
        if (this.currentStep < this.steps.length - 1) {
            this.currentStep++;
            this._updateContent();
        } else {
            this.hide();
        }
    }

    show() {
        this.currentStep = 0;
        this._updateContent();
        this.overlay.classList.remove('hidden');
        this.overlay.style.display = 'flex';
    }

    hide() {
        this.overlay.classList.add('hidden');
        this.overlay.style.display = 'none';
        if (this.onClose) this.onClose();
    }
}
