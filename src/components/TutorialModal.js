/**
 * TutorialModal - Concise Technical Reference Notes
 */

export class TutorialModal {
    constructor() {
        this.overlay = null;
        this.currentStep = 0;
        this.onClose = null;

        this.steps = [
            {
                tag: 'FOVEATED LOD',
                title: 'Raymarching Step Throttling',
                content: 'Ray steps scale continuously from 64 in the fovea centralis (< 2° visual angle) to 20 in the periphery. Surface distance epsilon relaxes from 0.005 to 0.040, and terrain FBM octaves reduce from 4 to 2, yielding ~50% shader compute savings.'
            },
            {
                tag: 'BIOMECHANICS',
                title: 'SO(3) Decoupling & IED Vertical Proxy',
                content: 'Facial landmarks are projected into a 3D skull-canonical frame centered at the nose tip (landmark 4), neutralizing head pitch. The Iris-to-Eyebrow Distance (IED) provides an occlusion-free vertical gaze proxy, bypassing downward eyelid ptosis.'
            },
            {
                tag: 'TEMPORAL FILTER',
                title: 'Dual-State 1-Euro & Saccade Lead',
                content: 'Low-frequency micro-jitter is filtered during steady fixation (fc = 0.9 Hz). During saccades (> 150°/s), filter cutoff scales dynamically and forward-projects coordinates by 40 ms to compensate for webcam capture latency.'
            },
            {
                tag: 'BENCHMARK',
                title: 'Compute Unit Evaluation',
                content: 'Session analytics compare uniform 64-step baseline raymarching against selective foveated raymarching, measuring total compute units and frame step variance.'
            }
        ];

        this._create();
    }

    _create() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'tutorial-overlay hidden';
        this.overlay.innerHTML = `
            <div class="tech-modal-box">
                <div class="tech-modal-header">
                    <span class="modal-label" id="doc-tag">TECHNICAL REFERENCE</span>
                    <button class="close-x" aria-label="Close">&times;</button>
                </div>
                <h3 class="doc-title" id="doc-title"></h3>
                <p class="doc-body" id="doc-body"></p>
                <div class="modal-footer">
                    <div class="tab-indicators" id="tab-indicators"></div>
                    <div class="modal-btn-row">
                        <button class="sys-btn" id="doc-prev">Previous</button>
                        <button class="btn primary small" id="doc-next">Next</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(this.overlay);

        this.overlay.querySelector('.close-x').addEventListener('click', () => this.hide());
        this.overlay.querySelector('#doc-prev').addEventListener('click', () => this._prevStep());
        this.overlay.querySelector('#doc-next').addEventListener('click', () => this._nextStep());
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) this.hide();
        });

        this._renderTabs();
    }

    _renderTabs() {
        const container = this.overlay.querySelector('#tab-indicators');
        container.innerHTML = this.steps.map((_, i) =>
            `<span class="tab-dot ${i === this.currentStep ? 'active' : ''}" data-step="${i}"></span>`
        ).join('');

        container.querySelectorAll('.tab-dot').forEach(dot => {
            dot.addEventListener('click', () => {
                this.currentStep = parseInt(dot.dataset.step, 10);
                this._updateContent();
            });
        });
    }

    _updateContent() {
        const step = this.steps[this.currentStep];

        this.overlay.querySelector('#doc-tag').textContent = `NOTE ${this.currentStep + 1}/4: ${step.tag}`;
        this.overlay.querySelector('#doc-title').textContent = step.title;
        this.overlay.querySelector('#doc-body').textContent = step.content;

        this.overlay.querySelectorAll('.tab-dot').forEach((dot, i) => {
            dot.classList.toggle('active', i === this.currentStep);
        });

        const prevBtn = this.overlay.querySelector('#doc-prev');
        const nextBtn = this.overlay.querySelector('#doc-next');

        prevBtn.style.visibility = this.currentStep === 0 ? 'hidden' : 'visible';
        nextBtn.textContent = this.currentStep === this.steps.length - 1 ? 'Close' : 'Next';
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
