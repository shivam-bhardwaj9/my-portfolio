import React, { useEffect, useRef } from "react";

/* A small WebGL flame. Fills its parent (position it with CSS).
   Props:
     color   flame colour            (default accent red)
     hot     colour of the hot core  (default warm cream)
     edge    "bottom" | "top"        which edge the flame burns from
     boost   brightness, 0..1.5
     speed   animation speed
*/

const VERT = `
attribute vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }
`;

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes;
uniform float uTime;
uniform vec3 uColor;
uniform vec3 uHot;
uniform float uBoost;
uniform float uFlip;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.02 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  if (uFlip > 0.5) uv.y = 1.0 - uv.y;
  float asp = uRes.x / uRes.y;
  float x = (uv.x - 0.5) * asp;

  // two layers of noise drifting upwards, the second one faster
  float n1 = fbm(vec2(x * 2.4, uv.y * 2.0 - uTime * 0.5));
  float n2 = fbm(vec2(x * 5.0 + 3.0, uv.y * 3.2 - uTime * 0.95));
  float n = n1 * 0.7 + n2 * 0.3;

  // tall at the bottom edge, gone near the top; a bit stronger in the middle
  float height = max(0.0, 1.0 - uv.y * 1.25);
  float centre = 0.6 + 0.4 * (1.0 - abs(uv.x - 0.5) * 1.7);
  float f = n * height * centre * 1.9;
  f = smoothstep(0.12, 0.85, f) * uBoost;

  vec3 col = mix(uColor * 0.35, uColor, smoothstep(0.0, 0.5, f));
  col = mix(col, uHot, smoothstep(0.55, 1.0, f));

  float a = clamp(f, 0.0, 1.0);
  gl_FragColor = vec4(col * a, a); // premultiplied alpha
}
`;

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.warn("FlameShader:", gl.getShaderInfoLog(sh));
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

export default function FlameShader({
  color = "#ff5a4f",
  hot = "#ffd6a0",
  edge = "bottom",
  boost = 1,
  speed = 1,
  className = "fl-flame",
}) {
  const holderRef = useRef(null);

  useEffect(() => {
    const holder = holderRef.current;
    if (!holder) return;

    // A fresh canvas for every run of this effect. React StrictMode (dev) runs
    // effects twice, and a canvas whose WebGL context was released cannot be reused.
    const canvas = document.createElement("canvas");
    canvas.style.cssText = "display:block;width:100%;height:100%";
    holder.appendChild(canvas);

    const gl = canvas.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
    });
    if (!gl) {
      console.warn("FlameShader: WebGL is not available");
      canvas.remove();
      return;
    }

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    const prog = gl.createProgram();
    if (!vs || !fs || !prog) {
      canvas.remove();
      return;
    }
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn("FlameShader link error:", gl.getProgramInfoLog(prog));
      canvas.remove();
      return;
    }
    gl.useProgram(prog);

    // one big triangle covering the whole canvas
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW
    );
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const u = (name) => gl.getUniformLocation(prog, name);
    const uRes = u("uRes");
    const uTime = u("uTime");
    gl.uniform3fv(u("uColor"), hexToRgb(color));
    gl.uniform3fv(u("uHot"), hexToRgb(hot));
    gl.uniform1f(u("uBoost"), boost);
    gl.uniform1f(u("uFlip"), edge === "top" ? 1 : 0);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.25); // keep it light

    const resize = () => {
      const w = Math.max(1, Math.floor(holder.clientWidth * dpr));
      const h = Math.max(1, Math.floor(holder.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, w, h);
      gl.uniform2f(uRes, w, h);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(holder);
    resize();

    let raf = 0;
    const start = performance.now();
    const draw = (now) => {
      const t = reduce ? 2 : ((now - start) / 1000) * speed;
      gl.uniform1f(uTime, t);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!reduce) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      canvas.remove();
    };
  }, [color, hot, edge, boost, speed]);

  return <div ref={holderRef} className={className} aria-hidden="true" />;
}