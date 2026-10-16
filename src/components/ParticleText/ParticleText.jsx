import React, { useEffect, useRef } from "react";

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const BUCKETS = 6;

function resolveRGB(color) {
  const c = document.createElement("canvas");
  c.width = c.height = 1;
  const x = c.getContext("2d", { willReadFrequently: true });
  x.fillStyle = "#000";
  x.fillStyle = color;
  x.fillRect(0, 0, 1, 1);
  const d = x.getImageData(0, 0, 1, 1).data;
  return [d[0], d[1], d[2]];
}

export default function ParticleText({
  text = "Particle Text",
  as: Tag = "span",
  color = "currentColor",
  hoverColor = "#FF5A4F",
  gap = 0,
  dotSize = 0.72,
  radius = 0.7,
  force = 1,
  spring = 0.055,
  damping = 0.86,
  sweep = "left",
  stagger = 0.7,
  intro = 1.6,
  delay = 0,
  spread = 1,
  startOnView = true,
  replayOnView = false,
  interactive = true,
  area = "parent",
  dpr = 2,
  className,
  style,
}) {
  const rootRef = useRef(null);
  const canvasRef = useRef(null);
  const ghostRef = useRef(null);
  const key = [text, color, hoverColor, gap, dotSize, radius, force, spring, damping, sweep, stagger, intro, delay, spread, startOnView, replayOnView, interactive, area, dpr].join("~");

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const ghost = ghostRef.current;
    if (!root || !canvas || !ghost) return undefined;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      ghost.style.visibility = "visible";
      canvas.style.display = "none";
      return undefined;
    }
    canvas.style.display = "block";
    ghost.style.visibility = "hidden";

    let cancelled = false;
    let raf = 0;
    let visible = !startOnView;
    let last = 0;
    let time = -delay;
    let geo = null;
    let ctx = null;
    let P = null;
    let colorRGB = [255, 243, 241];
    let hoverRGB = [255, 90, 79];
    const ptr = { x: -9999, y: -9999, on: false };
    const sw = clamp(stagger, 0, 0.9);

    const setup = () => {
      const cs = getComputedStyle(root);
      const fs = parseFloat(cs.fontSize) || 16;
      const font = cs.fontStyle + " " + cs.fontWeight + " " + cs.fontSize + " " + cs.fontFamily;
      const label = cs.textTransform === "uppercase" ? text.toUpperCase() : text;
      ghost.textContent = label;
      const rect = ghost.getBoundingClientRect();
      const W = Math.ceil(rect.width) + 2;
      const H = Math.ceil(rect.height);
      const pad = Math.ceil(fs * Math.max(spread, 1) * 1.2) + 12;
      const d = Math.min(window.devicePixelRatio || 1, dpr);
      const cw = W + pad * 2;
      const ch = H + pad * 2;
      canvas.style.left = -pad + "px";
      canvas.style.top = -pad + "px";
      canvas.style.width = cw + "px";
      canvas.style.height = ch + "px";
      canvas.width = Math.ceil(cw * d);
      canvas.height = Math.ceil(ch * d);
      ctx = canvas.getContext("2d");
      ctx.setTransform(d, 0, 0, d, 0, 0);
      colorRGB = resolveRGB(color === "currentColor" ? cs.color : color);
      hoverRGB = resolveRGB(hoverColor === "currentColor" ? cs.color : hoverColor);

      const oc = document.createElement("canvas");
      oc.width = Math.ceil(cw * d);
      oc.height = Math.ceil(ch * d);
      const c = oc.getContext("2d", { willReadFrequently: true });
      c.setTransform(d, 0, 0, d, 0, 0);
      c.font = font;
      if ("letterSpacing" in c && cs.letterSpacing !== "normal") c.letterSpacing = cs.letterSpacing;
      c.fillStyle = "#fff";
      c.textAlign = "left";
      const m = c.measureText(label);
      let baseY;
      if (m.fontBoundingBoxAscent !== undefined) {
        c.textBaseline = "alphabetic";
        baseY = pad + (H - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2 + m.fontBoundingBoxAscent;
      } else {
        c.textBaseline = "middle";
        baseY = pad + H / 2;
      }
      c.fillText(label, pad, baseY);
      const img = c.getImageData(0, 0, oc.width, oc.height).data;

      const g = gap > 0 ? gap : Math.max(2, Math.round(fs / 32));
      const xs = [];
      const ys = [];
      for (let y = g / 2; y < ch; y += g) {
        for (let x = g / 2; x < cw; x += g) {
          const ix = Math.floor(x * d);
          const iy = Math.floor(y * d);
          if (img[(iy * oc.width + ix) * 4 + 3] > 120) {
            xs.push(x);
            ys.push(y);
          }
        }
      }
      const n = xs.length;
      P = {
        n,
        hx: Float32Array.from(xs),
        hy: Float32Array.from(ys),
        px: Float32Array.from(xs),
        py: Float32Array.from(ys),
        vx: new Float32Array(n),
        vy: new Float32Array(n),
        r1: new Float32Array(n),
        r2: new Float32Array(n),
        r3: new Float32Array(n),
        u: new Float32Array(n),
        bk: new Uint8Array(n),
        sc: new Float32Array(n),
      };
      for (let i = 0; i < n; i++) {
        P.r1[i] = Math.random();
        P.r2[i] = Math.random();
        P.r3[i] = Math.random();
        const nx = clamp((xs[i] - pad) / W);
        const ny = clamp((ys[i] - pad) / H);
        P.u[i] = sweep === "right" ? 1 - nx : sweep === "center" ? clamp(Math.abs(nx - 0.5) * 2) : sweep === "top" ? ny : sweep === "scatter" ? P.r2[i] : nx;
      }
      geo = { fs, W, H, pad, cw, ch, g, dot: g * dotSize };
      time = -delay;
    };

    const frame = (now) => {
      raf = 0;
      if (cancelled || !visible || !geo || !P) return;
      const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
      last = now;
      time += dt;
      const f = dt * 60;
      const { fs, cw, ch, dot } = geo;
      const R = fs * radius;
      const R2 = R * R;
      const damp = Math.pow(damping, f);
      let moving = time < intro + 0.05;
      const n = P.n;
      for (let i = 0; i < n; i++) {
        let vx = P.vx[i];
        let vy = P.vy[i];
        let px = P.px[i];
        let py = P.py[i];
        vx += (P.hx[i] - px) * spring * f;
        vy += (P.hy[i] - py) * spring * f;
        if (ptr.on) {
          const dx = px - ptr.x;
          const dy = py - ptr.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < R2) {
            const dist = Math.sqrt(d2) || 0.01;
            const t = 1 - dist / R;
            const push = t * t * force * fs * 0.1 * (0.6 + 0.8 * P.r1[i]) * f;
            vx += (dx / dist) * push;
            vy += (dy / dist) * push;
          }
        }
        vx *= damp;
        vy *= damp;
        px += vx * f;
        py += vy * f;
        P.vx[i] = vx;
        P.vy[i] = vy;
        P.px[i] = px;
        P.py[i] = py;
        const disp = Math.hypot(px - P.hx[i], py - P.hy[i]);
        if (disp > 0.2 || Math.abs(vx) + Math.abs(vy) > 0.05) moving = true;
        P.bk[i] = Math.min(BUCKETS - 1, Math.floor(clamp(disp / (fs * 0.22)) * BUCKETS));
        const q = clamp((time - P.u[i] * intro * sw) / (intro * (1 - sw)));
        P.sc[i] = easeOut(q);
      }

      ctx.clearRect(0, 0, cw, ch);
      for (let b = 0; b < BUCKETS; b++) {
        const m = b / (BUCKETS - 1);
        const r = Math.round(colorRGB[0] + (hoverRGB[0] - colorRGB[0]) * m);
        const gg = Math.round(colorRGB[1] + (hoverRGB[1] - colorRGB[1]) * m);
        const bl = Math.round(colorRGB[2] + (hoverRGB[2] - colorRGB[2]) * m);
        ctx.fillStyle = "rgb(" + r + "," + gg + "," + bl + ")";
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
          if (P.bk[i] !== b) continue;
          const s = P.sc[i];
          if (s <= 0.01) continue;
          let x = P.px[i];
          let y = P.py[i];
          if (s < 1) {
            const k = 1 - s;
            x += (P.r1[i] - 0.5) * fs * spread * 1.6 * k;
            y += -(0.3 + P.r3[i]) * fs * spread * 0.9 * k + Math.sin(P.r2[i] * 6.28 + time * 2) * fs * 0.05 * k;
          }
          const rad = (dot / 2) * (0.4 + 0.6 * s);
          ctx.moveTo(x + rad, y);
          ctx.arc(x, y, rad, 0, 6.2832);
        }
        ctx.fill();
      }
      if (moving || ptr.on) raf = requestAnimationFrame(frame);
    };

    const kick = () => {
      if (!raf && visible && !cancelled && geo) {
        last = 0;
        raf = requestAnimationFrame(frame);
      }
    };

    const target = area === "window" ? window : area === "self" ? root : root.parentElement || root;
    const onMove = (e) => {
      if (e.pointerType === "touch") return;
      const rect = canvas.getBoundingClientRect();
      ptr.x = e.clientX - rect.left;
      ptr.y = e.clientY - rect.top;
      ptr.on = true;
      kick();
    };
    const onLeave = () => {
      ptr.on = false;
      ptr.x = ptr.y = -9999;
      kick();
    };
    if (interactive) {
      target.addEventListener("pointermove", onMove);
      target.addEventListener("pointerleave", onLeave);
    }

    let io = null;
    if (startOnView && "IntersectionObserver" in window) {
      io = new IntersectionObserver((entries) => {
        const was = visible;
        visible = entries[0].isIntersecting;
        if (visible && !was) {
          if (replayOnView) time = -delay;
          kick();
        }
      });
      io.observe(root);
    } else {
      visible = true;
    }

    let ro = null;
    const init = () => {
      if (cancelled) return;
      setup();
      kick();
      if ("ResizeObserver" in window) {
        let first = true;
        ro = new ResizeObserver(() => {
          if (first) {
            first = false;
            return;
          }
          setup();
          time = intro + 1;
          kick();
        });
        ro.observe(root.parentElement || root);
      }
    };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(init);
    else init();

    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
      if (io) io.disconnect();
      if (ro) ro.disconnect();
      target.removeEventListener("pointermove", onMove);
      target.removeEventListener("pointerleave", onLeave);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return React.createElement(
    Tag,
    {
      ref: rootRef,
      role: "img",
      "aria-label": text,
      className,
      style: { position: "relative", display: "inline-block", whiteSpace: "nowrap", ...style },
    },
    React.createElement("span", { ref: ghostRef, "aria-hidden": "true", style: { visibility: "hidden" } }, text),
    React.createElement("canvas", {
      ref: canvasRef,
      "aria-hidden": "true",
      style: { position: "absolute", pointerEvents: "none" },
    })
  );
}
