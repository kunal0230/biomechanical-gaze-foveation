/**
 * Crystal Grid Scene - Geometric Refraction and Variable Instance Density
 */

import { BaseScene } from './BaseScene.js';

export class CrystalGrid extends BaseScene {
    getName() {
        return 'Crystal Grid';
    }

    getDescription() {
        return 'Geometric crystal lattice with reflections and LOD-governed instance count';
    }

    getThumbnail() {
        return 'linear-gradient(135deg, #090d16 0%, #1e1b4b 50%, #2e1065 100%)';
    }

    getMaxSteps() {
        return 48;
    }

    getResolutionScale() {
        return 0.85;
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

            float sdBox(vec3 p, vec3 b) {
                vec3 q = abs(p) - b;
                return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
            }

            mat3 rotateY(float a) {
                float c = cos(a), s = sin(a);
                return mat3(c, 0, s, 0, 1, 0, -s, 0, c);
            }

            float sdCrystal(vec3 p, float height, float width) {
                vec3 q = abs(p);
                return (q.x + q.y * 2.0 + q.z) * 0.33 - height;
            }

            float sdPlane(vec3 p) {
                return p.y + 1.0;
            }

            vec2 mapScene(vec3 p, float lod) {
                float ground = sdPlane(p);
                vec2 res = vec2(ground, 0.0);
                
                int gridSize = lod < 0.3 ? 3 : (lod < 0.6 ? 2 : 1);
                
                for (int x = -3; x <= 3; x++) {
                    if (abs(x) > gridSize) continue;
                    for (int z = -3; z <= 3; z++) {
                        if (abs(z) > gridSize) continue;
                        
                        float fx = float(x);
                        float fz = float(z);
                        vec3 crystalPos = vec3(fx * 1.5, 0.0, fz * 1.5 - 3.0);
                        
                        float h = 0.8 + sin(fx * 1.5 + fz * 0.7 + u_time * 0.3) * 0.3;
                        float rot = u_time * 0.2 + fx * 0.5 + fz * 0.3;
                        vec3 localP = (p - crystalPos) * rotateY(rot);
                        localP.y -= h * 0.5;
                        
                        float crystal = sdCrystal(localP, h * 0.3, 0.15);
                        if (crystal < res.x) {
                            res = vec2(crystal, 1.0 + mod(fx + fz * 3.0, 5.0));
                        }
                    }
                }
                
                vec3 centerP = p * rotateY(u_time * 0.1);
                centerP.y -= 1.0;
                float centerCrystal = sdCrystal(centerP, 0.6, 0.25);
                if (centerCrystal < res.x) {
                    res = vec2(centerCrystal, 10.0);
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

            vec3 getCrystalColor(float id) {
                if (id >= 10.0) return vec3(0.9, 0.8, 1.0);
                if (id < 0.5) return vec3(0.08, 0.08, 0.12);
                
                vec3 colors[5] = vec3[5](
                    vec3(0.3, 0.5, 0.9),
                    vec3(0.5, 0.3, 0.9),
                    vec3(0.3, 0.9, 0.7),
                    vec3(0.9, 0.4, 0.6),
                    vec3(0.4, 0.8, 0.9)
                );
                return colors[int(mod(id - 1.0, 5.0))];
            }

            void main() {
                vec2 uv = gl_FragCoord.xy / u_resolution.xy;
                vec2 p = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / min(u_resolution.x, u_resolution.y);
                
                vec2 aspectGaze = u_gaze;
                float distToGaze = length((uv - aspectGaze) * vec2(u_resolution.x / u_resolution.y, 1.0));
                
                float foveaRadius = u_foveaRadius * 1.25;
                float lod = smoothstep(foveaRadius * 0.25, foveaRadius * 1.25, distToGaze);
                
                int maxSteps = lod < 0.3 ? 56 : (lod < 0.6 ? 38 : 20);
                float epsilon = mix(0.002, 0.012, lod);
                
                vec3 ro = vec3(0.0, 3.0, 4.0);
                vec3 lookAt = vec3(0.0, 0.0, -1.0);
                vec3 fwd = normalize(lookAt - ro);
                vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), fwd));
                vec3 up = cross(fwd, right);
                vec3 rd = normalize(fwd * 1.5 + right * p.x + up * p.y);
                
                float t = 0.0;
                vec2 hit = vec2(100.0, -1.0);
                
                for (int i = 0; i < 56; i++) {
                    if (i >= maxSteps) break;
                    vec3 pos = ro + rd * t;
                    vec2 res = mapScene(pos, lod);
                    if (res.x < epsilon) {
                        hit = vec2(t, res.y);
                        break;
                    }
                    t += res.x;
                    if (t > 30.0) break;
                }
                
                vec3 col = mix(vec3(0.02, 0.03, 0.07), vec3(0.06, 0.04, 0.12), uv.y);
                
                if (hit.y >= 0.0) {
                    vec3 pos = ro + rd * hit.x;
                    vec3 nor = getNormal(pos, lod);
                    vec3 mate = getCrystalColor(hit.y);
                    
                    vec3 lightDir = normalize(vec3(0.5, 1.0, 0.5));
                    float diff = max(dot(nor, lightDir), 0.0);
                    
                    vec3 ref = reflect(rd, nor);
                    float spec = pow(max(dot(ref, lightDir), 0.0), 32.0);
                    float fresnel = pow(1.0 - max(dot(nor, -rd), 0.0), 2.5);
                    
                    col = mate * (diff * 0.7 + 0.3) + vec3(1.0) * spec * 0.6 + mate * fresnel * 0.5;
                    
                    if (hit.y < 0.5) {
                        float grid = step(0.95, fract(pos.x)) + step(0.95, fract(pos.z));
                        col += vec3(0.1, 0.2, 0.4) * grid * (1.0 - lod * 0.6);
                    }
                }
                
                if (u_showHeatmap) {
                    vec3 highCompute = vec3(1.0, 0.15, 0.05);
                    vec3 lowCompute = vec3(0.02, 0.45, 0.85);
                    vec3 heatCol = mix(highCompute, lowCompute, lod);
                    col = mix(col, heatCol, 0.55);
                }

                if (u_showRings) {
                    float rInner = foveaRadius * 0.35;
                    float rOuter = foveaRadius * 1.05;
                    float ring1 = smoothstep(0.004, 0.0, abs(distToGaze - rInner));
                    float ring2 = smoothstep(0.003, 0.0, abs(distToGaze - rOuter));
                    col = mix(col, vec3(0.0, 1.0, 0.8), ring1 * 0.7);
                    col = mix(col, vec3(1.0, 0.8, 0.2), ring2 * 0.5);
                }
                
                col = pow(col, vec3(0.45));
                outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
            }
        `;
    }
}
