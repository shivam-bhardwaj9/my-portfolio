import { useEffect, useRef, useState } from "react";
import "./ServiceCarousel.css";

/**
 * ServiceCarousel - a draggable 3D card carousel whose background glow takes
 * the colour of the card in the middle.
 * Own implementation (inspired by the Gradient Carousel idea), written for
 * text cards instead of images.
 *
 * items: [{ n, title, text, tags, color, icon }]
 * Drag, arrow keys, side-card click, buttons and dots all move it.
 */

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

const hexToRgb = (hex) => {
  let h = String(hex || "#ff5a4f").replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

export default function ServiceCarousel({
  items = [],
  cardGap = 28,
  maxRotation = 26, // degrees the side cards turn
  maxDepth = 140, // how far side cards sit behind, in px
  minScale = 0.9,
  stiffness = 0.14, // spring pull towards the target card
  friction = 0.74, // 0 to 1, lower stops sooner
  gradientIntensity = 0.7,
  autoplay = true,
  autoplayMs = 4500,
  initialIndex = 0,
  onCardChange,
  label = "Services",
  className = "",
}) {
  const n = items.length;
  const stageRef = useRef(null);
  const glowRef = useRef(null);
  const cardRefs = useRef([]);
  const api = useRef({});
  const onChangeRef = useRef(onCardChange);

  useEffect(() => {
    onChangeRef.current = onCardChange;
  }, [onCardChange]);

  const [active, setActive] = useState(clamp(initialIndex, 0, Math.max(0, n - 1)));

  useEffect(() => {
    if (n === 0) return undefined;
    const stage = stageRef.current;
    const glow = glowRef.current;
    const rgb = items.map((it) => hexToRgb(it.color));
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const s = {
      pos: clamp(initialIndex, 0, n - 1),
      target: clamp(initialIndex, 0, n - 1),
      vel: 0,
      step: 368,
      raf: 0,
      dragging: false,
      moved: 0,
      startX: 0,
      startPos: 0,
      samples: [],
      active: clamp(initialIndex, 0, n - 1),
      interacted: false,
      hover: false,
      inView: false,
    };

    const measure = () => {
      const el = cardRefs.current[0];
      if (el) s.step = el.offsetWidth + cardGap;
    };

    const setActiveIdx = (i) => {
      if (i === s.active) return;
      s.active = i;
      setActive(i);
      onChangeRef.current?.(i);
    };

    const render = () => {
      const pos = s.pos;

      for (let i = 0; i < n; i++) {
        const el = cardRefs.current[i];
        if (!el) continue;
        const off = i - pos;
        const a = Math.abs(off);
        const side = clamp(off, -1, 1);
        const x = off * s.step;
        const z = -Math.min(a, 2) * maxDepth;
        const rot = -side * maxRotation;
        const sc = 1 - (1 - minScale) * Math.min(a, 1);
        const op = a <= 1 ? 1 : clamp(1 - (a - 1) * 0.55, 0, 1);

        el.style.transform = `translate(-50%, -50%) translate3d(${x}px, 0, ${z}px) rotateY(${rot}deg) scale(${sc})`;
        el.style.opacity = op;
        el.style.zIndex = Math.round(100 - a * 10);
        el.style.pointerEvents = op < 0.05 ? "none" : "auto";
      }

      // Background glow: blend the colours of the two cards we are between
      const i0 = clamp(Math.floor(pos), 0, n - 1);
      const i1 = Math.min(i0 + 1, n - 1);
      const f = clamp(pos - i0, 0, 1);
      const c = [0, 1, 2].map((k) => Math.round(rgb[i0][k] + (rgb[i1][k] - rgb[i0][k]) * f));
      glow.style.setProperty("--sc-c", `rgb(${c[0]}, ${c[1]}, ${c[2]})`);

      setActiveIdx(clamp(Math.round(pos), 0, n - 1));
    };

    const loop = () => {
      s.raf = 0;
      if (!s.dragging) {
        const diff = s.target - s.pos;
        s.vel = (s.vel + diff * stiffness) * friction;
        s.pos += s.vel;
        if (Math.abs(diff) < 0.0008 && Math.abs(s.vel) < 0.0008) {
          s.pos = s.target;
          s.vel = 0;
        }
      }
      render();
      if (s.dragging || s.pos !== s.target) s.raf = requestAnimationFrame(loop);
    };

    const kick = () => {
      if (!s.raf) s.raf = requestAnimationFrame(loop);
    };

    const goTo = (i, byUser = true) => {
      if (byUser) s.interacted = true;
      s.target = clamp(Math.round(i), 0, n - 1);
      if (reduce) {
        s.pos = s.target;
        render();
      } else {
        kick();
      }
    };

    /* ---------- pointer drag ---------- */
    const down = (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      s.dragging = true;
      s.interacted = true;
      s.moved = 0;
      s.startX = e.clientX;
      s.startPos = s.pos;
      s.samples = [{ x: e.clientX, t: performance.now() }];
      stage.classList.add("is-dragging");
      kick();
    };

    const move = (e) => {
      if (!s.dragging) return;
      const dx = e.clientX - s.startX;
      s.moved = Math.max(s.moved, Math.abs(dx));
      // capture only once it is clearly a horizontal drag
      if (s.moved > 6 && !stage.hasPointerCapture?.(e.pointerId)) {
        stage.setPointerCapture?.(e.pointerId);
      }
      s.pos = clamp(s.startPos - dx / s.step, -0.35, n - 0.65);
      s.vel = 0;
      s.samples.push({ x: e.clientX, t: performance.now() });
      if (s.samples.length > 6) s.samples.shift();
    };

    const up = () => {
      if (!s.dragging) return;
      s.dragging = false;
      stage.classList.remove("is-dragging");
      const a = s.samples[0];
      const b = s.samples[s.samples.length - 1];
      let v = 0; // cards per millisecond
      if (a && b && b.t > a.t) v = -(b.x - a.x) / (b.t - a.t) / s.step;
      s.target = clamp(Math.round(s.pos + v * 220), 0, n - 1);
      kick();
    };

    const click = (i) => {
      if (s.moved > 6) return; // it was a drag, not a click
      goTo(i);
    };

    const key = (e) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goTo(s.target + 1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goTo(s.target - 1);
      }
    };

    const enter = (e) => {
      if (e.pointerType === "mouse") s.hover = true;
    };
    const leave = () => {
      s.hover = false;
    };

    api.current = { goTo, down, move, up, click, key, enter, leave, state: s };

    /* ---------- setup ---------- */
    measure();
    render();

    // Autoplay: only while on screen, and never after the visitor touches it
    let timer = 0;
    let io;
    if (autoplay && !reduce) {
      io = new IntersectionObserver(
        (entries) => {
          s.inView = entries.some((en) => en.isIntersecting);
        },
        { threshold: 0.4 }
      );
      io.observe(stage);
      timer = window.setInterval(() => {
        if (s.interacted || s.hover || s.dragging || !s.inView || document.hidden) return;
        goTo((s.target + 1) % n, false);
      }, autoplayMs);
    }

    const onResize = () => {
      measure();
      render();
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(s.raf);
      window.clearInterval(timer);
      io?.disconnect();
      window.removeEventListener("resize", onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, cardGap, maxRotation, maxDepth, minScale, stiffness, friction, autoplay, autoplayMs]);

  if (n === 0) return null;

  // light follows the pointer on the card in the middle
  const spot = (e, i) => {
    if (i !== active) return;
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
    e.currentTarget.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
  };

  const pad = (v) => String(v + 1).padStart(2, "0");

  return (
    <div
      className={`sc ${className}`}
      style={{ "--sc-int": gradientIntensity, "--sc-c": items[active]?.color }}
    >
      <div className="sc__glow" ref={glowRef} aria-hidden="true" />

      <div
        className="sc__stage"
        ref={stageRef}
        tabIndex={0}
        role="group"
        aria-roledescription="carousel"
        aria-label={label}
        onPointerDown={(e) => api.current.down?.(e)}
        onPointerMove={(e) => api.current.move?.(e)}
        onPointerUp={() => api.current.up?.()}
        onPointerCancel={() => api.current.up?.()}
        onPointerEnter={(e) => api.current.enter?.(e)}
        onPointerLeave={() => api.current.leave?.()}
        onKeyDown={(e) => api.current.key?.(e)}
      >
        {items.map((it, i) => (
          <article
            key={it.n || it.title}
            ref={(el) => (cardRefs.current[i] = el)}
            className="sc-card"
            data-active={i === active}
            style={{ "--c": it.color }}
            aria-label={`${i + 1} of ${n}: ${it.title}`}
            onClick={() => api.current.click?.(i)}
            onPointerMove={(e) => spot(e, i)}
          >
            <span className="sc-card__shine" aria-hidden="true" />
            <div className="sc-card__body">
              <div className="sc-card__top">
                <span className="sc-card__icon">{it.icon}</span>
                <span className="sc-card__n">{it.n}</span>
              </div>

              <h3>{it.title}</h3>
              <p>{it.text}</p>

              <ul className="sc-card__tags">
                {(it.tags || []).map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
            <span className="sc-card__bar" aria-hidden="true" />
          </article>
        ))}
      </div>

      <div className="sc__controls">
        <button
          type="button"
          className="sc__btn"
          aria-label="Previous"
          onClick={() => api.current.goTo?.(api.current.state.target - 1)}
          disabled={active === 0}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>

        <div className="sc__dots" role="tablist" aria-label="Choose a service">
          {items.map((it, i) => (
            <button
              key={it.n || it.title}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={it.title}
              className={`sc__dot ${i === active ? "is-active" : ""}`}
              onClick={() => api.current.goTo?.(i)}
            />
          ))}
        </div>

        <button
          type="button"
          className="sc__btn"
          aria-label="Next"
          onClick={() => api.current.goTo?.(api.current.state.target + 1)}
          disabled={active === n - 1}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <span className="sc__count">
          {pad(active)} <i>/</i> {pad(n - 1)}
        </span>
      </div>
    </div>
  );
}
