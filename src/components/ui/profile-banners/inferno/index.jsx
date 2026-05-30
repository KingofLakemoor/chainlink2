"use client"
import { Renderer, Triangle, Program, Color, Mesh, Texture } from 'ogl';
import React, { useRef, useEffect, useState } from 'react';
import './styles.css';

var styles = {"gradient-canvas":"inferno-banner__gradient-canvas", "banner-container": "inferno-banner__container", "banner-overlay": "inferno-banner__overlay"};

var vert = `
attribute vec2 uv;
attribute vec2 position;

varying vec2 vUv;

void main() {
    vUv = uv;
    gl_Position = vec4(position, 0, 1);
}
`;

var frag = `
precision highp float;

uniform float uTime;
uniform vec3 uColor;
uniform vec3 uResolution;

uniform sampler2D uSlipTex;
uniform sampler2D uBurnMask;
uniform float uBurnProgress;

varying vec2 vUv;

float colormap_red(float x) {
    if (x < 0.2) {
        return mix(0.0, 0.85, x/0.2);
    } else if (x < 0.6) {
        return mix(0.85, 1.0, (x - 0.2)/0.4);
    } else {
        return 1.0;
    }
}

float colormap_green(float x) {
    if (x < 0.2) {
        return x * 0.3;
    } else if (x < 0.6) {
        return mix(0.06, 0.55, (x - 0.2)/0.4);
    } else {
        return mix(0.55, 0.85, (x - 0.6)/0.4);
    }
}

float colormap_blue(float x) {
    if (x < 0.2) {
        return x * 0.02;
    } else if (x < 0.6) {
        return x * 0.05;
    } else {
        return mix(0.03, 0.2, (x - 0.6)/0.4);
    }
}

vec4 colormap(float x) {
    return vec4(colormap_red(x), colormap_green(x), colormap_blue(x), 1.0);
}

float rand(vec2 n) {
    return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
}

float noise(vec2 p){
    vec2 ip = floor(p);
    vec2 u = fract(p);
    u = u*u*(3.0-2.0*u);

    float res = mix(
    mix(rand(ip),rand(ip+vec2(1.0,0.0)),u.x),
    mix(rand(ip+vec2(0.0,1.0)),rand(ip+vec2(1.0,1.0)),u.x),u.y);
    return res*res;
}

const mat2 mtx = mat2( 0.80,  0.60, -0.60,  0.80 );

float fbm(vec2 p) {
    float f = 0.0;
    float time = uTime * 0.8;

    f += 0.500000*noise(p + vec2(time * 0.2, time * 1.8)); p = mtx*p*2.02;
    f += 0.350000*noise(p + vec2(-time * 0.15, time * 1.2)); p = mtx*p*2.01;
    f += 0.175000*noise(p + vec2(time * 0.08, time * 0.6)); p = mtx*p*2.03;
    f += 0.087500*noise(p + vec2(-time * 0.05, time * 0.3)); p = mtx*p*2.01;
    f += 0.043750*noise(p + vec2(sin(time * 0.3) * 0.3, time * 0.15)); p = mtx*p*2.04;
    f += 0.021875*noise(p + vec2(sin(time * 0.2) * 0.15, time * 0.08));

    return f/1.178125;
}

float pattern(vec2 p) {
    vec2 q = vec2(p.x, p.y * 2.0);
    float f = fbm(q + fbm(q + fbm(q) * 3.0) * 2.5);

    float smoke = fbm(q * 0.4 + vec2(uTime * 0.15, uTime * 0.25));
    smoke *= (1.2 - p.y * 0.4);

    float highlights = fbm(q * 2.2 + vec2(uTime * 0.25, uTime * 0.35));
    highlights *= smoothstep(0.15, 0.7, p.y);

    return (f * (1.0 - p.y * 0.6) - smoke * 0.7 + highlights * 0.25) * 1.1;
}

float emberSeed(vec2 p) {
  float t = uTime * 0.8;
  vec2 q = p * vec2(10.0, 2.0) + vec2(t*0.5, t*1.2);
  float n = fbm(q);
  float dots = smoothstep(0.98, 1.0, fract(n*100.0 + sin(t*3.0 + p.x*10.0)));
  return dots;
}

void main() {
    vec2 uv = vUv.xy*uResolution.xy/uResolution.x;
    // OGL vUv is 0,0 bottom left. The previous canvas implementation expected y flipped.
    uv.y = 1.0 - uv.y;
    uv *= vec2(0.8, 1.0);
    uv.y -= 0.2;

    float shade = pattern(uv * 1.8);
    shade += (1.0 - smoothstep(0.0, 0.4, uv.y)) * 0.2;
    shade = pow(shade, 1.4);
    shade = clamp(shade * 0.9, 0.0, 1.0);

    vec3 emberColor = vec3(1.0, 0.45, 0.05);
    float emb = emberSeed(uv*vec2(1.0, 0.6));
    vec3 finalColor = mix(colormap(shade).rgb, emberColor, emb*0.9);

    // Betting slip coords
    vec2 rawUv = vUv;
    // We map slip to the right half: 0.5 to 1.0 horizontally, 0.0 to 1.0 vertically.
    vec2 slipPos = vec2(0.45, 0.0);
    vec2 slipSize = vec2(0.55, 1.0);
    vec2 slipUV = (rawUv - slipPos) / slipSize;

    if (slipUV.x >= 0.0 && slipUV.x <= 1.0 && slipUV.y >= 0.0 && slipUV.y <= 1.0) {
        // vUv for textures expects bottom-left origin in WebGL
        float mask = texture2D(uBurnMask, slipUV).r;
        float progress = clamp(uBurnProgress + sin(uTime*2.0)*0.02, 0.0, 1.0);
        float burned = step(mask, progress);

        float curl = smoothstep(0.0, 0.2, mask - progress) * 0.03;
        slipUV.x += curl * (1.0 - slipUV.y);

        vec4 slipCol = texture2D(uSlipTex, slipUV);
        vec3 charColor = mix(slipCol.rgb, vec3(0.06,0.03,0.02), 0.95);

        vec3 outSlip = mix(slipCol.rgb, charColor, burned);

        // Let's add a glowing ember edge where it's burning
        float edge = smoothstep(0.0, 0.05, progress - mask) * smoothstep(0.1, 0.05, progress - mask);
        outSlip = mix(outSlip, emberColor * 1.5, edge * step(0.1, slipCol.a));

        // Burn away completely
        float alpha = slipCol.a;
        if (progress > mask + 0.15) {
            alpha *= smoothstep(0.25, 0.15, progress - mask);
        }

        finalColor = mix(finalColor, outSlip, alpha);
    }

    gl_FragColor = vec4(finalColor, 1.0);
}
`;

// Generators for missing assets
function createSlipCanvas() {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = 'rgba(255,255,255,0)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw slip base
    ctx.fillStyle = '#f8f8f8';
    ctx.beginPath();
    ctx.roundRect(20, 20, 560, 260, 15);
    ctx.fill();

    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Header
    ctx.fillStyle = '#111';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('WINNING TICKET', 40, 60);

    ctx.fillStyle = '#666';
    ctx.font = '16px sans-serif';
    ctx.fillText('ID: #84729-FIRE', 40, 85);

    // Divider
    ctx.beginPath();
    ctx.setLineDash([5, 5]);
    ctx.moveTo(40, 110);
    ctx.lineTo(560, 110);
    ctx.stroke();
    ctx.setLineDash([]);

    // Content lines
    ctx.fillStyle = '#d00';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('+5,000 Pts', 40, 150);

    ctx.fillStyle = '#333';
    ctx.font = '18px sans-serif';
    ctx.fillText('Match: INFERNO vs ICE', 40, 180);
    ctx.fillText('Odds: +150', 40, 210);

    // Barcode area
    ctx.fillStyle = '#000';
    for(let i=0; i<30; i++) {
        const w = Math.random() * 6 + 2;
        ctx.fillRect(40 + i*15, 230, w, 30);
    }

    return canvas;
}

function createBurnMaskCanvas() {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');

    // Gradient from left to right: left burns first (low value), right burns last (high value)
    const grd = ctx.createLinearGradient(0, 0, 600, 0);
    grd.addColorStop(0, '#000000');
    grd.addColorStop(1, '#ffffff');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 600, 300);

    // Add noise to make it organic
    const imgData = ctx.getImageData(0,0,600,300);
    for(let i=0; i<imgData.data.length; i+=4) {
        const noise = (Math.random() - 0.5) * 50;
        const val = imgData.data[i] + noise;
        imgData.data[i] = val;     // R
        imgData.data[i+1] = val;   // G
        imgData.data[i+2] = val;   // B
    }
    ctx.putImageData(imgData, 0, 0);

    return canvas;
}

function InfernoBanner({ isStatic = false, ...props }) {
    const ctnDom = useRef(null);
    const [isHovered, setIsHovered] = useState(false);
    // Use ref to smoothly interpolate uBurnProgress
    const targetBurn = useRef(0.2);
    const currentBurn = useRef(0.2);

    useEffect(() => {
        if (isHovered) {
            targetBurn.current = 1.0;
        } else {
            targetBurn.current = 0.2; // Idle smolder state
        }
    }, [isHovered]);

    useEffect(() => {
        let mounted = true;
        if (!ctnDom.current) {
            return;
        }
        const ctn = ctnDom.current;
        const renderer = new Renderer({ alpha: true });
        const gl = renderer.gl;
        gl.clearColor(1, 1, 1, 1);

        const geometry = new Triangle(gl);

        const slipTexture = new Texture(gl, {
            image: createSlipCanvas(),
            generateMipmaps: false
        });

        const burnMaskTexture = new Texture(gl, {
            image: createBurnMaskCanvas(),
            generateMipmaps: false
        });

        const program = new Program(gl, {
            vertex: vert,
            fragment: frag,
            uniforms: {
                uTime: { value: 0 },
                uColor: { value: new Color(0.1, 0.05, 0.02) },
                uResolution: {
                    value: new Color(gl.canvas.width, gl.canvas.height, gl.canvas.width / gl.canvas.height),
                },
                uSlipTex: { value: slipTexture },
                uBurnMask: { value: burnMaskTexture },
                uBurnProgress: { value: currentBurn.current }
            },
        });
        const mesh = new Mesh(gl, { geometry, program });

        function resize() {
            const scale = window.devicePixelRatio || 1;
            renderer.setSize(ctn.offsetWidth * scale, ctn.offsetHeight * scale);
            if (program.uniforms.uResolution) {
                program.uniforms.uResolution.value = new Color(gl.canvas.width, gl.canvas.height, gl.canvas.width / gl.canvas.height);
            }
        }
        window.addEventListener("resize", resize, false);
        resize();
        let animateId;

        if (isStatic) {
            program.uniforms.uTime.value = 2.0; // A nice looking frame
            program.uniforms.uBurnProgress.value = 0.5; // Show halfway burned in static
            if (mounted) renderer.render({ scene: mesh });
        } else {
            animateId = requestAnimationFrame(update);
        }

        function update(t) {
            animateId = requestAnimationFrame(update);
            program.uniforms.uTime.value = t * 0.001;

            // Smoothly interpolate burn progress
            currentBurn.current += (targetBurn.current - currentBurn.current) * 0.05;
            program.uniforms.uBurnProgress.value = currentBurn.current;

            if (mounted) renderer.render({ scene: mesh });
        }

        ctn.appendChild(gl.canvas);
        return () => {
            mounted = false;
            if (animateId) cancelAnimationFrame(animateId);
            window.removeEventListener("resize", resize);
            ctn.removeChild(gl.canvas);
            gl.getExtension("WEBGL_lose_context")?.loseContext();
        };
    }, [isStatic]);

    return (
        <div
            className={styles['banner-container']}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            {...props}
        >
            <div ref={ctnDom} className={styles['gradient-canvas']} />
            <div className={styles['banner-overlay']}>
                <svg width="200" height="40" viewBox="0 0 200 40">
                    <text x="10" y="30" fontFamily="sans-serif" fontSize="24" fontWeight="bold" fill="#fff" stroke="#000" strokeWidth="2">
                        INFERNO BOARD
                    </text>
                    <text x="10" y="30" fontFamily="sans-serif" fontSize="24" fontWeight="bold" fill="#ff6a00">
                        INFERNO BOARD
                    </text>
                </svg>
            </div>
        </div>
    );
}

export { InfernoBanner };
