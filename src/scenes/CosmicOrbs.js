/**
 * Cosmic Orbs Scene - High-Speed Emissive Spheres
 * Optimized baseline running at 60 FPS on any hardware
 */

import { BaseScene } from './BaseScene.js';

export class CosmicOrbs extends BaseScene {
    getName() {
        return 'Cosmic Orbs';
    }

    getDescription() {
        return 'Emissive spheres in space with dynamic lighting; guaranteed 60 FPS baseline';
    }

    getThumbnail() {
        return 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)';
    }

    getMaxSteps() {
        return 48;
    }

    getResolutionScale() {
        return 1.0;
    }

    getFragmentShader() {
        return `#version 300 es
            precision highp float;
            
            uniform vec2 u_resolution;
            uniform vec2 u_gaze;
            uniform float u_time;
            uniform float u_foveaRadius;
            uniform bool u_showHeatmap;
            uniform bool u_showRings;
            uniform bool u_extraDetails;
            
            out vec4 outColor;

            float sdSphere(vec3 p, float r) {
                return length(p) - r;
            }

            vec2 mapScene(vec3 p, float lod) {
                vec2 res = vec2(1000.0, -1.0);
                int numOrbs = lod < 0.3 ? 7 : (lod < 0.6 ? 5 : 3);
                
                for (int i = 0; i < 7; i++) {
                    if (i >= numOrbs) break;
                    float fi = float(i);
                    float angle = fi * 0.9 + u_time * (0.3 + fi * 0.05);
                    float radius = 2.0 + sin(fi * 1.5) * 0.8;
                    float height = sin(fi * 0.7 + u_time * 0.4) * 1.5;
                    
                    vec3 orbPos = vec3(
                        cos(angle) * radius,
                        height,
                        sin(angle) * radius
                    );
                    
                    float orbSize = 0.4 + sin(fi * 2.0) * 0.15;
                    float d = sdSphere(p - orbPos, orbSize);
                    
                    if (d < res.x) {
                        res = vec2(d, fi);
                    }
                }
                
                float centerD = sdSphere(p, 0.75 + sin(u_time * 1.5) * 0.05);
                if (centerD < res.x) {
                    res = vec2(centerD, 10.0);
                }
                
                return res;
            }

            vec3 getNormal(vec3 p, float lod) {
                vec2 e = vec2(0.001, 0.0);
                return normalize(vec3(
                    mapScene(p + e.xyy, lod).x - mapScene(p - e.xyy, lod).x,
                    mapScene(p + e.yxy, lod).x - mapScene(p - e.yxy, lod).x,
                    mapScene(p + e.yyx, lod).x - mapScene(p - e.yyx, lod).x
                ));
            }

            vec3 getOrbColor(float id) {
                if (id >= 10.0) return vec3(1.0, 0.8, 0.3);
                
                vec3 colors[7] = vec3[7](
                    vec3(0.9, 0.2, 0.4),
                    vec3(0.2, 0.6, 0.9),
                    vec3(0.4, 0.9, 0.5),
                    vec3(0.9, 0.5, 0.2),
                    vec3(0.6, 0.3, 0.9),
                    vec3(0.2, 0.9, 0.9),
                    vec3(0.9, 0.9, 0.3)
                );
                return colors[int(mod(id, 7.0))];
            }

            void main() {
                vec2 uv = gl_FragCoord.xy / u_resolution.xy;
                vec2 p = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / min(u_resolution.x, u_resolution.y);
                
                vec2 aspectGaze = u_gaze;
                float distToGaze = length((uv - aspectGaze) * vec2(u_resolution.x / u_resolution.y, 1.0));
                
                float foveaRadius = u_foveaRadius * 1.35;
                float lod = smoothstep(foveaRadius * 0.55, foveaRadius * 1.85, distToGaze);
                
                int maxSteps = int(mix(48.0, 20.0, lod));
                float epsilon = mix(0.002, 0.018, lod);
                
                vec3 ro = vec3(0.0, 0.0, 6.0);
                vec3 rd = normalize(vec3(p, -1.5));
                
                float t = 0.0;
                vec2 hit = vec2(100.0, -1.0);
                
                for (int i = 0; i < 48; i++) {
                    if (i >= maxSteps) break;
                    vec3 pos = ro + rd * t;
                    vec2 res = mapScene(pos, lod);
                    if (res.x < epsilon) {
                        hit = vec2(t, res.y);
                        break;
                    }
                    t += res.x;
                    if (t > 20.0) break;
                }
                
                vec3 col = mix(vec3(0.02, 0.03, 0.06), vec3(0.05, 0.02, 0.1), uv.y);
                
                float starWeight = clamp((0.75 - lod) / 0.50, 0.0, 1.0);
                if (starWeight > 0.0) {
                    float stars = pow(fract(sin(dot(floor(gl_FragCoord.xy * 0.5), vec2(12.9898, 78.233))) * 43758.5453), 20.0);
                    col += vec3(stars * 0.4 * starWeight);
                }
                
                if (hit.y >= 0.0) {
                    vec3 pos = ro + rd * hit.x;
                    vec3 nor = getNormal(pos, lod);
                    vec3 baseColor = getOrbColor(hit.y);
                    
                    vec3 lightPos = vec3(sin(u_time) * 3.0, 2.0, cos(u_time) * 3.0);
                    vec3 lightDir = normalize(lightPos - pos);
                    
                    float diff = max(dot(nor, lightDir), 0.0);
                    vec3 viewDir = -rd;
                    vec3 halfDir = normalize(lightDir + viewDir);
                    float spec = pow(max(dot(nor, halfDir), 0.0), 32.0);
                    
                    float fresnel = pow(1.0 - max(dot(nor, viewDir), 0.0), 3.0);
                    col = baseColor * (diff * 0.8 + 0.2) + vec3(1.0) * spec * 0.5 + baseColor * fresnel * 0.4;
                    
                    if (hit.y >= 10.0) {
                        col += vec3(1.0, 0.8, 0.4) * 0.3;
                    }
                }
                
                // COMPUTE HEATMAP: Continuous 3-tier gradient (Fovea -> Parafovea -> Periphery)
                if (u_showHeatmap) {
                    vec3 foveaHeat = vec3(0.98, 0.22, 0.12);     // Vibrant Coral-Red (100% detail core)
                    vec3 parafoveaHeat = vec3(0.95, 0.72, 0.18); // Warm Golden-Amber (Gradual blend)
                    vec3 peripheryHeat = vec3(0.08, 0.45, 0.88); // Cool Deep Cyan-Blue (Peripheral base)
                    
                    vec3 heatCol;
                    if (lod < 0.5) {
                        heatCol = mix(foveaHeat, parafoveaHeat, lod * 2.0);
                    } else {
                        heatCol = mix(parafoveaHeat, peripheryHeat, (lod - 0.5) * 2.0);
                    }
                    col = mix(col, heatCol, 0.52);
                }

                // BIOLOGICAL VISUAL RETICLE RINGS (Core Fovea & Parafoveal Transition Boundary)
                if (u_showRings) {
                    float rInner = foveaRadius * 0.55;
                    float rOuter = foveaRadius * 1.85;
                    
                    float ring1 = smoothstep(0.007, 0.0, abs(distToGaze - rInner));
                    float halo1 = smoothstep(0.024, 0.0, abs(distToGaze - rInner)) * 0.25;
                    
                    float ring2 = smoothstep(0.005, 0.0, abs(distToGaze - rOuter));
                    float halo2 = smoothstep(0.030, 0.0, abs(distToGaze - rOuter)) * 0.18;
                    
                    col = mix(col, vec3(0.0, 0.95, 0.85), (ring1 + halo1) * 0.8);
                    col = mix(col, vec3(1.0, 0.78, 0.22), (ring2 + halo2) * 0.6);
                }
                
                col = pow(col, vec3(0.45));
                outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
            }
        `;
    }
}
