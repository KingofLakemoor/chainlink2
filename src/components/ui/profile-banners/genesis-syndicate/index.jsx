"use client"
import { Renderer, Triangle, Program, Color, Mesh } from 'ogl';
import React, { useRef, useEffect } from 'react';
import './styles.css';

var styles = {"container":"uvc__container"};

var vert = `attribute vec2 uv;
attribute vec2 position;

varying vec2 vUv;

void main() {
    vUv = uv;
    gl_Position = vec4(position, 0, 1);
}`;

var frag = `precision highp float;

uniform float uTime;
uniform vec3 uResolution;

varying vec2 vUv;

// --- helpers ---
float rand(vec2 n) {
  return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
}

float noise(vec2 p){
  vec2 ip = floor(p);
  vec2 u = fract(p);
  u = u*u*(3.0-2.0*u);
  float res = mix(
    mix(rand(ip), rand(ip+vec2(1.0,0.0)), u.x),
    mix(rand(ip+vec2(0.0,1.0)), rand(ip+vec2(1.0,1.0)), u.x),
    u.y
  );
  return res*res;
}

float fbm(vec2 p) {
  float f = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    f += a * noise(p);
    p *= 2.02;
    a *= 0.5;
  }
  return f;
}

void main() {
  vec2 uv = vUv;
  vec2 res = uResolution.xy;

  // base gradient (top dark, bottom emerald)
  vec3 topCol = vec3(0.01, 0.02, 0.03);
  vec3 botCol = vec3(0.0, 0.12, 0.08);
  float g = smoothstep(0.0, 1.0, uv.y);
  vec3 col = mix(topCol, botCol, g);

  // diagonal data grid
  vec2 gridUv = uv * vec2(40.0, 20.0);
  gridUv += vec2(uTime * 0.05, uTime * 0.03);
  vec2 cell = fract(gridUv);
  float lineX = smoothstep(0.0, 0.02, cell.x) + smoothstep(1.0, 0.98, cell.x);
  float lineY = smoothstep(0.0, 0.02, cell.y) + smoothstep(1.0, 0.98, cell.y);
  float grid = clamp(lineX + lineY, 0.0, 1.0);
  vec3 gridCol = vec3(0.0, 1.0, 0.55); // neon green
  col += gridCol * grid * 0.08;

  // fbm “console haze”
  float f = fbm(uv * 3.0 + vec2(uTime * 0.03, -uTime * 0.02));
  col += vec3(0.0, 0.25, 0.15) * f * 0.25;

  // radial pulse from center
  vec2 c = uv - 0.5;
  float r = length(c);
  float pulse = sin(uTime * 0.6) * 0.5 + 0.5;
  float ring = smoothstep(0.35, 0.0, abs(r - 0.35 - pulse * 0.03));
  col += vec3(0.0, 1.0, 0.6) * ring * 0.25;

  // subtle CRT noise
  float n = noise(uv * res.xy * 0.5 + uTime * 10.0);
  col *= 0.98 + n * 0.04;

  gl_FragColor = vec4(col, 1.0);
}`;

function GenesisSyndicate({ isStatic = false, ...props }) {
    const ctnDom = useRef(null);
    useEffect(() => {
        let mounted = true;
        if (!ctnDom.current)
            return;
        const ctn = ctnDom.current;
        const renderer = new Renderer({
            alpha: true,
            depth: false,
        });
        const gl = renderer.gl;
        const geometry = new Triangle(gl);
        const program = new Program(gl, {
            vertex: vert,
            fragment: frag,
            uniforms: {
                uTime: { value: 0 },
                uResolution: {
                    value: new Color(gl.canvas.width, gl.canvas.height, gl.canvas.width / gl.canvas.height),
                },
            },
            transparent: true,
        });
        const mesh = new Mesh(gl, { geometry, program });
        function resize() { if (!ctnDom.current) return;
            renderer.setSize(ctn.offsetWidth, ctn.offsetHeight);
            if (program.uniforms.uResolution) {
                program.uniforms.uResolution.value = new Color(gl.canvas.width, gl.canvas.height, gl.canvas.width / gl.canvas.height);
            }
        }
        window.addEventListener("resize", resize, false);
        resize();
        let animateId;

        if (isStatic) {
            program.uniforms.uTime.value = 5.0;
            if (mounted) renderer.render({ scene: mesh });
        } else {
            animateId = requestAnimationFrame(update);
        }

        function update(t) {
            animateId = requestAnimationFrame(update);
            program.uniforms.uTime.value = t * 0.001;
            if (mounted) renderer.render({ scene: mesh });
        }
        ctn.appendChild(gl.canvas);
        return () => {
            mounted = false;
            if (animateId) cancelAnimationFrame(animateId);
            window.removeEventListener("resize", resize);
            if (ctnDom.current && ctnDom.current.contains(gl.canvas)) { ctnDom.current.removeChild(gl.canvas); }
            gl.getExtension("WEBGL_lose_context")?.loseContext();
        };
    }, [isStatic]);
    return (
        <div ref={ctnDom} className={`${styles['container']} absolute inset-0 w-full h-full`} {...props}>
             <div className="absolute inset-0 flex items-center justify-end pr-10 pointer-events-none">
                <div className="relative overflow-hidden w-[100px] h-[120px]">
                    <div className="absolute inset-0 flex items-center justify-center">
                        <svg width="80" height="100" viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M50 0L93.3013 25V75L50 100L6.69873 75V25L50 0Z" fill="white" stroke="#00FF9C" strokeWidth="4"/>
                            <path d="M50 15L80 32.5V67.5L50 85L20 67.5V32.5L50 15Z" fill="#000000"/>
                        </svg>
                    </div>
                     <div className={`absolute inset-0 bg-white/20 ${isStatic ? 'hidden' : 'animate-scanline'}`} style={{
                            height: '2px',
                            width: '100%'
                        }} />
                </div>
            </div>
             <div className="absolute inset-0 flex items-center justify-start pl-10 pointer-events-none">
                <svg width="600" height="120" viewBox="0 0 600 120" xmlns="http://www.w3.org/2000/svg">
                    <text x="0" y="50%"
                            textAnchor="start"
                            dominantBaseline="middle"
                            fontFamily="Oswald, system-ui"
                            fontSize="36"
                            fill="#FFFFFF"
                            stroke="#00FF9C"
                            strokeWidth="1.5"
                            letterSpacing="4px"
                    >
                        GENESIS SYNDICATE
                    </text>
                </svg>
            </div>
        </div>
    );
}

export { GenesisSyndicate };
