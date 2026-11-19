/**
 * SceneCard - Compact Environment Selector Item
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
            <div class="scene-swatch" style="background: ${this.scene.getThumbnail()}"></div>
            <div class="scene-meta">
                <span class="scene-name">${this.scene.getName()}</span>
                <span class="scene-budget">${maxSteps} steps/ray</span>
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
