import React, { useEffect, useRef } from "react";

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeIn = (t) => t * t;
const hash = (a, b) => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

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

function buildParticles(word, o) {
  const cw = o.W + o.pad * 2;
  const ch = o.H + o.pad * 2;
  const d = o.dpr;
  const oc = document.createElement("canvas");
  oc.width = Math.ceil(cw * d);
  oc.height = Math.ceil(ch * d);
  const c = oc.getContext("2d", { willReadFrequently: true });
  c.setTransform(d, 0, 0, d, 0, 0);
  c.font = o.font;
  if ("letterSpacing" in c) c.letterSpacing = o.letterSpacing;
  c.textBaseline = "middle";
  c.fillStyle = "#fff";
  c.textAlign = o.align === "start" ? "left" : o.align === "end" ? "right" : "center";
  const ax = o.align === "start" ? o.pad : o.align === "end" ? o.pad + o.W : o.pad + o.W / 2;
  const ay = o.pad + o.H / 2;
  c.fillText(word, ax, ay);
  const img = c.getImageData(0, 0, oc.width, oc.height).data;
  let count = 0;
  for (let i = 3; i < img.length; i += 4) if (img[i] > 110) count++;
  const area = count / (d * d);
  const step = Math.max(1 / d, 1 / Math.sqrt(Math.max(0.05, o.density)), Math.sqrt(area / o.maxN));
  const xs = [];
  const ys = [];
  for (let y = step / 2; y < ch; y += step) {
    for (let x = step / 2; x < cw; x += step) {
      const ix = Math.floor(x * d);
      const iy = Math.floor(y * d);
      if (img[(iy * oc.width + ix) * 4 + 3] > 110) {
        xs.push(x);
        ys.push(y);
      }
    }
  }
  const n = xs.length;
  const P = {
    n,
    label: word,
    font: o.font,
    ls: o.letterSpacing,
    align: o.align,
    ax,
    ay,
    ps: Math.max(o.particleSize, step * 1.15),
    hx: Float32Array.from(xs),
    hy: Float32Array.from(ys),
    r1: new Float32Array(n),
    r2: new Float32Array(n),
    r3: new Float32Array(n),
    u: new Float32Array(n),
  };
  for (let i = 0; i < n; i++) {
    P.r1[i] = Math.random();
    P.r2[i] = Math.random();
    P.r3[i] = Math.random();
    const nx = clamp((xs[i] - o.pad) / o.W);
    const ny = clamp((ys[i] - o.pad) / o.H);
    let u;
    if (o.sweep === "right") u = 1 - nx;
    else if (o.sweep === "center") u = clamp(Math.abs(nx - 0.5) * 2);
    else if (o.sweep === "top") u = ny;
    else if (o.sweep === "scatter") u = hash(Math.floor(xs[i] / 10), Math.floor(ys[i] / 10));
    else u = nx;
    P.u[i] = u;
  }
  return P;
}

export default function VaporText({
  words = ["Built with care", "Tracked in real time", "Let's build something"],
  color = "currentColor",
  vaporColor = "#FF5A4F",
  align = "center",
  density = 1,
  particleSize = 1.3,
  spread = 1.2,
  rise = 1,
  turbulence = 0.8,
  diffusion = 0.35,
  sweep = "left",
  stagger = 0.8,
  condense = 1.8,
  hold = 2.4,
  dissolve = 2,
  overlap = 0.6,
  loop = true,
  startOnView = true,
  interactive = true,
  breath = 1,
  breathRadius = 0.8,
  recovery = 1.2,
  clickAdvance = false,
  pauseOnHover = false,
  area = "window",
  paused = false,
  delay = 0,
  dpr = 2,
  onWordChange,
  as: Tag = "span",
  className,
  style,
}) {
  const rootRef = useRef(null);
  const canvasRef = useRef(null);
  const ghostRef = useRef(null);
  const pausedRef = useRef(paused);
  const cbRef = useRef(onWordChange);
  useEffect(() => {
    pausedRef.current = paused;
    cbRef.current = onWordChange;
  });
  const key = [words.join("|"), color, vaporColor, align, density, particleSize, spread, rise, turbulence, diffusion, sweep, stagger, condense, hold, dissolve, overlap, loop, startOnView, interactive, breath, breathRadius, recovery, clickAdvance, pauseOnHover, area, dpr, delay].join("~");

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const ghost = ghostRef.current;
    if (!root || !canvas || !ghost || !words.length) return undefined;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      ghost.textContent = words[0];
      ghost.style.visibility = "visible";
      canvas.style.display = "none";
      return undefined;
    }
    canvas.style.display = "block";
    ghost.style.visibility = "hidden";

    let cancelled = false;
    let raf = 0;
    let visible = !startOnView;
    let hovered = false;
    let last = 0;
    let time = 0;
    let instances = [];
    let cache = [];
    let geo = null;
    let ctx = null;
    let colorRGB = [255, 243, 241];
    let vaporRGB = [255, 90, 79];
    const pointer = { x: 0, y: 0, has: false };

    const C = Math.max(0.1, condense);
    const H = Math.max(0, hold);
    const D = Math.max(0.1, dissolve);
    const sw = clamp(stagger, 0, 0.9);

    const setup = () => {
      const cs = getComputedStyle(root);
      const fs = parseFloat(cs.fontSize) || 16;
      const font = cs.fontStyle + " " + cs.fontWeight + " " + cs.fontSize + " " + cs.fontFamily;
      const upper = cs.textTransform === "uppercase";
      const list = words.map((w) => (upper ? w.toUpperCase() : w));
      const m = document.createElement("canvas").getContext("2d");
      m.font = font;
      if ("letterSpacing" in m) m.letterSpacing = cs.letterSpacing;
      let longest = list[0];
      let lw = 0;
      list.forEach((w) => {
        const mw = m.measureText(w).width;
        if (mw > lw) {
          lw = mw;
          longest = w;
        }
      });
      ghost.textContent = longest;
      const rect = ghost.getBoundingClientRect();
      const W = Math.ceil(rect.width) + 2;
      const Hh = Math.ceil(rect.height);
      const pad = Math.ceil(fs * spread * 1.4) + 8;
      const d = Math.min(window.devicePixelRatio || 1, dpr);
      canvas.style.left = -pad + "px";
      canvas.style.top = -pad + "px";
      canvas.style.width = W + pad * 2 + "px";
      canvas.style.height = Hh + pad * 2 + "px";
      canvas.width = Math.ceil((W + pad * 2) * d);
      canvas.height = Math.ceil((Hh + pad * 2) * d);
      ctx = canvas.getContext("2d");
      ctx.setTransform(d, 0, 0, d, 0, 0);
      colorRGB = resolveRGB(color === "currentColor" ? cs.color : color);
      vaporRGB = resolveRGB(vaporColor === "currentColor" ? cs.color : vaporColor);
      geo = { fs, W, H: Hh, pad, d };
      const o = { W, H: Hh, pad, dpr: d, font, letterSpacing: cs.letterSpacing, align, density, sweep, particleSize, maxN: 14000 };
      cache = list.map((w) => buildParticles(w, o));
      instances = [];
      time = -delay;
    };

    const spawn = (i) => {
      const P = cache[i];
      instances.push({ i, P, t0: time, next: false, blown: new Float32Array(P.n), vv: new Float32Array(P.n), dv: new Float32Array(P.n), ox: new Float32Array(P.n), oy: new Float32Array(P.n) });
      if (cbRef.current) cbRef.current(i);
    };

    const advance = () => {
      const cur = instances[instances.length - 1];
      if (!cur || cur.next) return;
      const local = time - cur.t0;
      if (local < C * 0.6) return;
      cur.t0 = time - (C + H);
      cur.next = true;
      spawn((cur.i + 1) % cache.length);
    };

    const frame = (now) => {
      raf = 0;
      if (cancelled || !visible || !geo) return;
      const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
      last = now;
      if (!pausedRef.current) {
        let hovering = false;
        if (pauseOnHover && hovered) {
          hovering = instances.some((s) => {
            const l = time - s.t0;
            return l >= C && l <= C + H;
          });
        }
        if (!hovering) time += dt;
      }
      if (!instances.length && time >= 0) spawn(0);
      const len = cache.length;
      for (let a = 0; a < instances.length; a++) {
        const s = instances[a];
        const l = time - s.t0;
        const isLast = s.i === len - 1 && !loop;
        if (!s.next && !isLast && l >= C + H + overlap * D && (len > 1 || loop)) {
          s.next = true;
          spawn((s.i + 1) % len);
        }
      }
      instances = instances.filter((s) => {
        const isLast = s.i === cache.length - 1 && !loop;
        return isLast || time - s.t0 <= C + H + D;
      });

      const { fs, W, H: gh, pad } = geo;
      ctx.clearRect(0, 0, W + pad * 2, gh + pad * 2);
      const w = time * 0.9;
      const crisp = "rgb(" + colorRGB.join(",") + ")";
      const R = fs * breathRadius;
      const R2 = R * R;
      const f60 = dt * 60;
      const decay = Math.exp((-dt * 3) / Math.max(0.1, recovery));
      let busy = loop || pointer.has;
      for (let a = 0; a < instances.length; a++) {
        const s = instances[a];
        const P = s.P;
        const ps = P.ps;
        const isLast = s.i === cache.length - 1 && !loop;
        let local = time - s.t0;
        if (isLast) local = Math.min(local, C + H);
        if (!isLast || local < C + 0.1) busy = true;
        ctx.fillStyle = crisp;
        ctx.beginPath();
        let formed = true;
        for (let k = 0; k < P.n; k++) {
          const u = P.u[k];
          let v;
          if (local < C) {
            const q = clamp((local - u * C * sw) / (C * (1 - sw)));
            v = 1 - easeOut(q);
          } else if (local <= C + H) {
            v = 0;
          } else {
            const lt = local - C - H;
            const q = clamp((lt - u * D * sw) / (D * (1 - sw)));
            v = easeIn(q);
          }
          let b = s.blown[k];
          let ox = s.ox[k];
          let oy = s.oy[k];
          if (pointer.has) {
            const dx = P.hx[k] + ox - pointer.x;
            const dy = P.hy[k] + oy - pointer.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < R2) {
              const dist = Math.sqrt(d2) || 0.01;
              const t = 1 - dist / R;
              const push = t * t * breath * fs * 0.09 * (0.5 + P.r1[k]) * f60;
              ox += (dx / dist) * push;
              oy += (dy / dist) * push - t * fs * 0.012 * rise * f60;
              const hb = Math.min(0.85, t * 1.1);
              if (hb > b) b = hb;
            }
          }
          if (b > 0) {
            b = Math.max(0, b - dt / Math.max(0.1, recovery));
            busy = true;
          }
          ox *= decay;
          oy *= decay;
          if (Math.abs(ox) + Math.abs(oy) > 0.05) busy = true;
          else {
            ox = 0;
            oy = 0;
          }
          s.blown[k] = b;
          s.ox[k] = ox;
          s.oy[k] = oy;
          let vv = v > b ? v : b;
          if (vv < 0.003 && (ox !== 0 || oy !== 0)) vv = 0.003;
          s.vv[k] = vv;
          const bh = b * 0.55;
          s.dv[k] = v > bh ? v : bh;
          if (vv <= 0.002) ctx.rect(P.hx[k], P.hy[k], ps, ps);
          else formed = false;
        }
        if (formed && local >= C && local <= C + H) {
          ctx.font = P.font;
          if ("letterSpacing" in ctx) ctx.letterSpacing = P.ls;
          ctx.textBaseline = "middle";
          ctx.textAlign = P.align === "start" ? "left" : P.align === "end" ? "right" : "center";
          ctx.fillText(P.label, P.ax, P.ay);
        } else {
          ctx.fill();
        }
        for (let k = 0; k < P.n; k++) {
          const vv = s.vv[k];
          if (vv <= 0.002 || vv >= 0.995) continue;
          const dv = s.dv[k];
          const r1 = P.r1[k];
          const r2 = P.r2[k];
          const r3 = P.r3[k];
          const sx = Math.sin(r2 * 6.2832 + dv * 4 + w) * turbulence * fs * 0.5 + (r1 - 0.5) * diffusion * fs * 0.8;
          const x = P.hx[k] + s.ox[k] + sx * dv * spread;
          const y = P.hy[k] + s.oy[k] - (rise * spread * fs) * (0.35 + 0.9 * r3) * dv + Math.cos(r1 * 6.2832 + dv * 3 + w * 0.7) * turbulence * fs * 0.15 * dv;
          const m = Math.min(1, vv * 1.6);
          const al = 1 - Math.pow(vv, 1.4);
          const cr = colorRGB[0] + (vaporRGB[0] - colorRGB[0]) * m;
          const cg = colorRGB[1] + (vaporRGB[1] - colorRGB[1]) * m;
          const cb = colorRGB[2] + (vaporRGB[2] - colorRGB[2]) * m;
          ctx.fillStyle = "rgba(" + (cr | 0) + "," + (cg | 0) + "," + (cb | 0) + "," + al.toFixed(2) + ")";
          ctx.fillRect(x, y, ps, ps);
        }
      }
      if (busy) raf = requestAnimationFrame(frame);
    };

    const kick = () => {
      if (!raf && visible && !cancelled && geo) {
        last = 0;
        raf = requestAnimationFrame(frame);
      }
    };

    const onMove = (e) => {
      if (e.pointerType === "touch") return;
      if (!geo) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const R = geo.fs * breathRadius;
      const inside = x > -R && y > -R && x < rect.width + R && y < rect.height + R;
      pointer.x = x;
      pointer.y = y;
      if (inside) {
        pointer.has = true;
        kick();
      } else if (pointer.has) {
        pointer.has = false;
        kick();
      }
    };
    const onEnter = () => {
      hovered = true;
    };
    const onLeave = () => {
      hovered = false;
      if (pointer.has) {
        pointer.has = false;
        kick();
      }
    };
    const onClick = (e) => {
      if (!clickAdvance) return;
      advance();
      kick();
    };

    const target = area === "window" ? window : area === "self" ? root : root.parentElement || root;
    if (interactive) {
      target.addEventListener("pointermove", onMove);
      document.addEventListener("mouseleave", onLeave);
    }
    root.addEventListener("pointerenter", onEnter);
    root.addEventListener("pointerleave", onLeave);
    root.addEventListener("click", onClick);

    let io = null;
    if (startOnView && "IntersectionObserver" in window) {
      io = new IntersectionObserver((entries) => {
        visible = entries[0].isIntersecting;
        if (visible) kick();
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
      document.removeEventListener("mouseleave", onLeave);
      root.removeEventListener("pointerenter", onEnter);
      root.removeEventListener("pointerleave", onLeave);
      root.removeEventListener("click", onClick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const longest = words.reduce((a, b) => (b.length > a.length ? b : a), "");
  return React.createElement(
    Tag,
    {
      ref: rootRef,
      role: "img",
      "aria-label": words.join(". "),
      className,
      style: { position: "relative", display: "inline-block", whiteSpace: "nowrap", ...style },
    },
    React.createElement("span", { ref: ghostRef, "aria-hidden": "true", style: { visibility: "hidden" } }, longest),
    React.createElement("canvas", {
      ref: canvasRef,
      "aria-hidden": "true",
      style: { position: "absolute", pointerEvents: "none" },
    })
  );
}