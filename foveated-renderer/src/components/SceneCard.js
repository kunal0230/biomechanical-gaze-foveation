/**
 * SceneCard - Environment Selector Component
 * Displays 3D raymarching environment profile and complexity budget
 */

export class SceneCard {
    constructor(scene, onSelect) {
        this.scene = scene;
        this.onSelect = onSelect;
        this.element = null;
        this.isSelected = false;

        this._create();
    }

    _create() {
        this.element = document.createElement('div');
        this.element.className = 'scene-card';

        const maxSteps = typeof this.scene.getMaxSteps === 'function' ? this.scene.getMaxSteps() : 64;

        this.element.innerHTML = `
            <div class="scene-thumbnail" style="background: ${this.scene.getThumbnail()}">
                <span class="scene-step-badge">${maxSteps} STEPS</span>
            </div>
            <div class="scene-info">
                <div class="scene-header-row">
                    <h3 class="scene-name">${this.scene.getName()}</h3>
                    <div class="scene-check-mark">SELECTED</div>
                </div>
                <p class="scene-desc">${this.scene.getDescription()}</p>
            </div>
        `;

        this.element.addEventListener('click', () => {
            if (this.onSelect) this.onSelect(this.scene);
        });
    }

    setSelected(selected) {
        this.isSelected = selected;
        this.element.classList.toggle('selected', selected);
    }

    getElement() {
        return this.element;
    }
}
