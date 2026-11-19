/**
 * SceneRenderer - Dynamic WebGL2 Procedural Raymarching Engine
 * Supports foveated LOD, biological visual reticle rings, compute heatmaps, and adaptive DPR scaling
 */

export class SceneRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.gl = canvas.getContext('webgl2', {
            powerPreference: 'high-performance',
            alpha: false,
            antialias: false,
            depth: false,
            stencil: false
        });

        if (!this.gl) {
            console.error('SceneRenderer: WebGL2 is not supported by this browser/GPU');
            return;
        }

        this.program = null;
        this.scene = null;
        this.gazeX = 0.5;
        this.gazeY = 0.5;
        this.time = 0;

        // Foveation settings
        this.foveaRadius = 0.16;
        this.showHeatmap = false;
        this.showRings = false;
        this.extraDetails = false;
        this.resolutionPreset = 'balanced'; // 'perf' | 'balanced' | 'ultra'

        // Uniform locations
        this.uResolution = null;
        this.uGaze = null;
        this.uTime = null;
        this.uFoveaRadius = null;
        this.uShowHeatmap = null;
        this.uShowRings = null;
        this.uExtraDetails = null;

        // Fullscreen quad buffer
        this._initQuad();
    }

    _initQuad() {
        const gl = this.gl;
        this.quadVao = gl.createVertexArray();
        gl.bindVertexArray(this.quadVao);

        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        const positions = new Float32Array([
            -1.0, -1.0,
             1.0, -1.0,
            -1.0,  1.0,
             1.0,  1.0,
        ]);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        gl.bindVertexArray(null);
    }

    loadScene(scene) {
        this.scene = scene;
        this._compileShader(scene.getFragmentShader());
        this.resize();
    }

    setResolutionPreset(preset) {
        this.resolutionPreset = preset;
        this.resize();
    }

    resize() {
        if (!this.gl) return;

        // Determine DPR scaling based on preset
        let scale = 0.75;
        if (this.resolutionPreset === 'perf') scale = 0.55;
        else if (this.resolutionPreset === 'ultra') scale = 1.0;

        if (this.scene && typeof this.scene.getResolutionScale === 'function') {
            scale *= this.scene.getResolutionScale();
        }

        // Cap maximum internal raymarching resolution to prevent GPU stalls
        const maxDim = 1920;
        let w = Math.floor(window.innerWidth * scale);
        let h = Math.floor(window.innerHeight * scale);

        if (w > maxDim) {
            h = Math.floor(h * (maxDim / w));
            w = maxDim;
        }

        this.canvas.width = Math.max(320, w);
        this.canvas.height = Math.max(240, h);
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }

    setHeatmap(show) {
        this.showHeatmap = !!show;
    }

    setRings(show) {
        this.showRings = !!show;
    }

    setExtraDetails(show) {
        this.extraDetails = !!show;
    }

    setFoveaRadius(radius) {
        this.foveaRadius = Math.max(0.06, Math.min(0.35, radius));
    }

    setGazePoint(x, y) {
        this.gazeX = Math.max(0.0, Math.min(1.0, x));
        // WebGL origin is at bottom-left, invert Y
        this.gazeY = Math.max(0.0, Math.min(1.0, 1.0 - y));
    }

    render() {
        if (!this.gl || !this.program) return;

        this.time += 0.016;
        const gl = this.gl;

        gl.useProgram(this.program);

        if (this.uResolution) gl.uniform2f(this.uResolution, this.canvas.width, this.canvas.height);
        if (this.uGaze) gl.uniform2f(this.uGaze, this.gazeX, this.gazeY);
        if (this.uTime) gl.uniform1f(this.uTime, this.time);
        if (this.uFoveaRadius) gl.uniform1f(this.uFoveaRadius, this.foveaRadius);
        if (this.uShowHeatmap) gl.uniform1i(this.uShowHeatmap, this.showHeatmap ? 1 : 0);
        if (this.uShowRings) gl.uniform1i(this.uShowRings, this.showRings ? 1 : 0);
        if (this.uExtraDetails) gl.uniform1i(this.uExtraDetails, this.extraDetails ? 1 : 0);

        gl.bindVertexArray(this.quadVao);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        gl.bindVertexArray(null);
    }

    _compileShader(fragmentSource) {
        const gl = this.gl;
        const vsSource = `#version 300 es
            layout(location = 0) in vec2 position;
            void main() {
                gl_Position = vec4(position, 0.0, 1.0);
            }
        `;

        const vertexShader = this._createShader(gl.VERTEX_SHADER, vsSource);
        const fragmentShader = this._createShader(gl.FRAGMENT_SHADER, fragmentSource);

        if (!vertexShader || !fragmentShader) return;

        if (this.program) {
            gl.deleteProgram(this.program);
        }

        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('SceneRenderer Program Link Error:', gl.getProgramInfoLog(program));
            gl.deleteProgram(program);
            return;
        }

        this.program = program;

        // Query uniform locations
        this.uResolution = gl.getUniformLocation(program, 'u_resolution');
        this.uGaze = gl.getUniformLocation(program, 'u_gaze');
        this.uTime = gl.getUniformLocation(program, 'u_time');
        this.uFoveaRadius = gl.getUniformLocation(program, 'u_foveaRadius');
        this.uShowHeatmap = gl.getUniformLocation(program, 'u_showHeatmap');
        this.uShowRings = gl.getUniformLocation(program, 'u_showRings');
        this.uExtraDetails = gl.getUniformLocation(program, 'u_extraDetails');
    }

    _createShader(type, source) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Shader Compile Error:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }

        return shader;
    }
}
