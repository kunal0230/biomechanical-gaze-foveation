/**
 * Forest Valley Scene - Procedural Natural Landscape
 * Multi-octave FBM terrain, geometric mushroom trees, river reflection, and rock formations
 */

import { BaseScene } from './BaseScene.js';

export class ForestValley extends BaseScene {
    getName() {
        return 'Forest Valley';
    }

    getDescription() {
        return 'Procedural valley with FBM terrain, geometric trees, water, and rock formations';
    }

    getThumbnail() {
        return 'linear-gradient(135deg, #1e3a5f 0%, #2d5a3f 50%, #1a3323 100%)';
    }

    getMaxSteps() {
        return 64;
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

            float hash(vec2 p) {
                return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
            }

            float noise(vec2 p) {
                vec2 i = floor(p);
                vec2 f = fract(p);
                f = f * f * (3.0 - 2.0 * f);
                float a = hash(i);
                float b = hash(i + vec2(1.0, 0.0));
                float c = hash(i + vec2(0.0, 1.0));
                float d = hash(i + vec2(1.0, 1.0));
                return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
            }

            // FBM for terrain - continuous fractional octave blending for smooth LOD (zero popping)
            float fbmSmooth(vec2 p, float lod) {
                float value = 0.0;
                float amplitude = 0.5;
                vec2 cur = p;
                
                // Octaves 1 & 2: macro topography (always full weight)
                value += amplitude * noise(cur);
                cur *= 2.0; amplitude *= 0.5;
                value += amplitude * noise(cur);
                cur *= 2.0; amplitude *= 0.5;
                
                // Octave 3: smoothly fades between lod 0.35 and 0.85
                float w3 = clamp((0.85 - lod) / 0.50, 0.0, 1.0);
                value += amplitude * noise(cur) * w3;
                cur *= 2.0; amplitude *= 0.5;
                
                // Octave 4: micro-ridges smoothly fade between lod 0.0 and 0.50
                float w4 = clamp((0.50 - lod) / 0.50, 0.0, 1.0);
                value += amplitude * noise(cur) * w4;
                
                return value;
            }

            float getHeight(vec2 p, float lod) {
                float valley = smoothstep(0.0, 8.0, abs(p.x));
                float h = fbmSmooth(p * 0.15, lod) * 3.5 * valley;
                h -= (1.0 - valley) * 1.2;
                return h;
            }

            // Mushroom-style tree SDF
            float sdMushroomTree(vec3 p, vec3 treePos, float scale) {
                vec3 q = (p - treePos) / scale;
                float trunk = length(q.xz) - 0.08;
                trunk = max(trunk, -q.y - 0.1);
                trunk = max(trunk, q.y - 1.0);
                
                vec3 cap = q - vec3(0.0, 1.1, 0.0);
                float canopy = length(cap.xz) - 0.6;
                canopy = max(canopy, abs(cap.y) - 0.15);
                
                return min(trunk, canopy) * scale;
            }

            // Rock SDF
            float sdRock(vec3 p, vec3 pos, float size) {
                vec3 q = p - pos;
                return length(q / vec3(1.0, 0.6, 0.85)) - size;
            }

            const vec3 SUN_DIR = normalize(vec3(0.3, 0.6, -0.4));
            const float WATER_LEVEL = -0.9;

            vec2 mapScene(vec3 p, float lod) {
                float h = getHeight(p.xz, lod);
                
                // Micro-displacement grass bump (smoothly attenuated by LOD)
                float grassWeight = clamp((0.55 - lod) / 0.55, 0.0, 1.0);
                float grassBump = 0.0;
                if (grassWeight > 0.0 && abs(p.x) > 2.0) {
                    grassBump = noise(p.xz * 8.0) * grassWeight * 0.06;
                    grassBump += noise(p.xz * 16.0) * pow(grassWeight, 2.0) * 0.03;
                }
                
                float terrain = p.y - h - grassBump;
                float d = terrain;
                float mat = 0.0;
                
                // Tree instances
                vec3 trees[8];
                trees[0] = vec3(-5.0, 2.2, -8.0);
                trees[1] = vec3(6.0, 2.0, -6.0);
                trees[2] = vec3(-7.0, 2.5, -15.0);
                trees[3] = vec3(8.0, 2.3, -12.0);
                trees[4] = vec3(-4.0, 1.8, -20.0);
                trees[5] = vec3(5.0, 1.9, -18.0);
                trees[6] = vec3(-8.0, 2.1, -25.0);
                trees[7] = vec3(7.0, 2.0, -22.0);
                
                float scales[8];
                scales[0] = 1.3; scales[1] = 1.1; scales[2] = 1.5; scales[3] = 1.2;
                scales[4] = 1.0; scales[5] = 1.4; scales[6] = 1.1; scales[7] = 1.3;
                
                for (int i = 0; i < 8; i++) {
                    float treeD = sdMushroomTree(p, trees[i], scales[i]);
                    if (treeD < d) { d = treeD; mat = 1.0; }
                }
                
                vec3 rocks[4];
                rocks[0] = vec3(-3.0, 1.0, -5.0);
                rocks[1] = vec3(3.5, 0.8, -7.0);
                rocks[2] = vec3(-4.5, 1.2, -12.0);
                rocks[3] = vec3(4.0, 0.9, -10.0);
                
                for (int i = 0; i < 4; i++) {
                    float rockD = sdRock(p, rocks[i], 0.3 + float(i) * 0.05);
                    if (rockD < d) { d = rockD; mat = 2.0; }
                }
                
                return vec2(d, mat);
            }

            vec3 getNormal(vec3 p, float lod) {
                float eps = mix(0.01, 0.05, lod);
                vec2 e = vec2(eps, 0.0);
                return normalize(vec3(
                    mapScene(p + e.xyy, lod).x - mapScene(p - e.xyy, lod).x,
                    mapScene(p + e.yxy, lod).x - mapScene(p - e.yxy, lod).x,
                    mapScene(p + e.yyx, lod).x - mapScene(p - e.yyx, lod).x
                ));
            }

            vec3 getSky(vec3 rd) {
                float y = rd.y;
                vec3 zenith = vec3(0.25, 0.5, 0.9);
                vec3 horizon = vec3(0.55, 0.75, 0.95);
                vec3 sky = mix(horizon, zenith, max(y, 0.0));
                
                float sun = max(dot(rd, SUN_DIR), 0.0);
                sky += vec3(1.0, 0.95, 0.8) * pow(sun, 24.0) * 0.6;
                sky += vec3(1.0, 1.0, 0.95) * pow(sun, 256.0) * 1.2;
                return sky;
            }

            void main() {
                vec2 uv = gl_FragCoord.xy / u_resolution.xy;
                vec2 p = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / min(u_resolution.x, u_resolution.y);
                
                // Aspect-corrected gaze distance
                vec2 aspectGaze = u_gaze;
                float distToGaze = length((uv - aspectGaze) * vec2(u_resolution.x / u_resolution.y, 1.0));
                
                float foveaRadius = u_foveaRadius * 1.35;
                float lod = smoothstep(foveaRadius * 0.55, foveaRadius * 1.85, distToGaze);
                
                int maxSteps = int(mix(64.0, 24.0, lod));
                float epsilon = mix(0.004, 0.028, lod);
                
                float camT = u_time * 0.03;
                vec3 ro = vec3(sin(camT) * 2.0, 5.0 + sin(camT * 0.5) * 0.5, 8.0);
                vec3 lookAt = vec3(0.0, 1.5, -15.0);
                
                vec3 fwd = normalize(lookAt - ro);
                vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), fwd));
                vec3 up = cross(fwd, right);
                vec3 rd = normalize(fwd * 1.5 + right * p.x + up * p.y);
                
                float t = 0.0;
                float maxDist = 50.0;
                vec2 hit = vec2(maxDist, -1.0);
                int marchStepsTaken = 0;
                
                for (int i = 0; i < 64; i++) {
                    if (i >= maxSteps) break;
                    marchStepsTaken = i;
                    vec3 pos = ro + rd * t;
                    vec2 res = mapScene(pos, lod);
                    if (res.x < epsilon) { hit = vec2(t, res.y); break; }
                    t += res.x * 0.9;
                    if (t > maxDist) break;
                }
                
                vec3 col = getSky(rd);
                float tWater = (WATER_LEVEL - ro.y) / rd.y;
                
                if (tWater > 0.0 && tWater < maxDist && (hit.y < 0.0 || tWater < hit.x)) {
                    vec3 wPos = ro + rd * tWater;
                    float wave = sin(wPos.x * 0.5 + u_time * 0.8) * cos(wPos.z * 0.3 + u_time * 0.5) * 0.015;
                    vec3 wNor = normalize(vec3(wave, 1.0, wave * 0.7));
                    vec3 ref = reflect(rd, wNor);
                    float fresnel = pow(1.0 - max(dot(wNor, -rd), 0.0), 2.5);
                    vec3 waterCol = vec3(0.12, 0.45, 0.55);
                    col = mix(waterCol, getSky(ref), 0.25 + fresnel * 0.35);
                    float spec = pow(max(dot(ref, SUN_DIR), 0.0), 64.0);
                    col += vec3(1.0, 0.95, 0.85) * spec;
                }
                else if (hit.y >= 0.0) {
                    vec3 pos = ro + rd * hit.x;
                    vec3 nor = getNormal(pos, lod);
                    vec3 mate;
                    
                    if (hit.y < 0.5) {
                        float grassVar = noise(pos.xz * 3.0);
                        vec3 darkGrass = vec3(0.22, 0.52, 0.16);
                        vec3 lightGrass = vec3(0.42, 0.72, 0.26);
                        mate = mix(darkGrass, lightGrass, grassVar * (1.0 - lod * 0.4) + 0.35);
                        float slope = 1.0 - nor.y;
                        mate = mix(mate, vec3(0.55, 0.6, 0.3), smoothstep(0.3, 0.6, slope) * 0.25);
                    }
                    else if (hit.y < 1.5) {
                        vec3 trunkBrown = vec3(0.38, 0.26, 0.14);
                        vec3 canopyGreen = vec3(0.16, 0.48, 0.16);
                        mate = pos.y > 1.0 ? canopyGreen : trunkBrown;
                    }
                    else {
                        mate = vec3(0.42, 0.40, 0.37);
                    }
                    
                    float sun = max(dot(nor, SUN_DIR), 0.0);
                    float sky = 0.5 + 0.5 * nor.y;
                    vec3 sunCol = vec3(1.0, 0.95, 0.85);
                    vec3 skyCol = vec3(0.5, 0.6, 0.8);
                    vec3 lin = sunCol * sun * 1.1 + skyCol * sky * 0.45;
                    col = mate * lin;
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
                
                // Vignette & Tonemapping
                col *= 0.75 + 0.25 * pow(16.0 * uv.x * uv.y * (1.0 - uv.x) * (1.0 - uv.y), 0.1);
                col = pow(col, vec3(0.45));
                outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
            }
        `;
    }
}
