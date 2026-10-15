import React, {
  forwardRef,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";

/**
 * SignalType - a headline that flickers on like a neon sign.
 * Own implementation of the documented props (not the React Bits Pro source).
 *
 * Imperative ref: { ignite(), cycle(x?, y?), powerDown() }
 */

// Small seeded random generator so a given `seed` gives the same pattern
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SignalType = forwardRef(function SignalType(
  {
    text = "Open to possibility",
    as: Tag = "span",
    color = "currentColor",
    glowColor = "#8B5CF6",
    unlit = "outline",
    outlineWidth = 1,
    outlineOpacity = 0.28,
    glow = 0.6,
    glowSize = 1,
    flash = 1,
    flickers = 3,
    speed = 1,
    stagger = 0.045,
    delay = 0.15,
    order = "random",
    trigger = "view",
    interference = 1,
    interferenceRadius = 90,
    clickCycle = true,
    instability = 0,
    loop = false,
    loopDelay = 6,
    seed = 0,
    paused = false,
    onComplete,
    className,
    style,
  },
  ref
) {
  const rootRef = useRef(null);
  const lettersRef = useRef([]);
  const api = useRef({});

  // Always-fresh copy of the props, read by the animation engine
  const cfg = useRef({});
  cfg.current = {
    color,
    glowColor,
    unlit,
    outlineWidth,
    outlineOpacity,
    glow,
    glowSize,
    flash,
    flickers,
    speed,
    stagger,
    delay,
    interference,
    interferenceRadius,
    clickCycle,
    instability,
    loop,
    loopDelay,
    onComplete,
  };

  // Split into words (kept whole when wrapping) and whitespace
  const { tokens, count } = useMemo(() => {
    const parts = String(text).split(/(\s+)/).filter((s) => s !== "");
    let idx = 0;
    const tokens = parts.map((p) =>
      /^\s+$/.test(p)
        ? { space: true, text: p }
        : { letters: Array.from(p).map((ch) => ({ ch, idx: idx++ })) }
    );
    return { tokens, count: idx };
  }, [text]);

  useImperativeHandle(
    ref,
    () => ({
      ignite: () => api.current.ignite?.(),
      cycle: (x, y) => api.current.cycle?.(x, y),
      powerDown: () => api.current.powerDown?.(),
    }),
    []
  );

  useLayoutEffect(() => {
    const letters = lettersRef.current;
    const n = count;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const timers = new Set();
    const dipping = [];
    let run = 0;
    let settled = false;
    let observer = null;
    let interval = null;
    let lastMove = 0;

    const later = (fn, ms) => {
      const id = setTimeout(() => {
        timers.delete(id);
        fn();
      }, Math.max(0, ms));
      timers.add(id);
      return id;
    };
    const clearAll = () => {
      timers.forEach(clearTimeout);
      timers.clear();
      dipping.length = 0;
    };

    /* Draw one letter lit or unlit. `boost` adds to / removes from the glow. */
    const paint = (i, on, boost = 0) => {
      const el = letters[i];
      if (!el) return;
      const c = cfg.current;
      const set = (prop, v) => el.style.setProperty(prop, v);
      const mix = (colour, p) =>
        `color-mix(in srgb, ${colour} ${Math.min(100, Math.max(0, Math.round(p * 100)))}%, transparent)`;

      if (on) {
        set("-webkit-text-fill-color", "currentColor");
        set("-webkit-text-stroke", "0px transparent");
        const g = Math.max(0, c.glow + boost);
        const s = c.glowSize;
        set(
          "text-shadow",
          g > 0
            ? `0 0 ${0.08 * s}em ${mix(c.glowColor, g)}, 0 0 ${0.25 * s}em ${mix(
                c.glowColor,
                g * 0.9
              )}, 0 0 ${0.6 * s}em ${mix(c.glowColor, g * 0.6)}`
            : "none"
        );
      } else {
        set("text-shadow", "none");
        if (c.unlit === "outline") {
          set("-webkit-text-fill-color", "transparent");
          set(
            "-webkit-text-stroke",
            `${c.outlineWidth}px ${mix("currentColor", c.outlineOpacity)}`
          );
        } else if (c.unlit === "dim") {
          set("-webkit-text-fill-color", mix("currentColor", c.outlineOpacity));
          set("-webkit-text-stroke", "0px transparent");
        } else {
          set("-webkit-text-fill-color", "transparent");
          set("-webkit-text-stroke", "0px transparent");
        }
      }
    };

    const paintAll = (on) => {
      for (let i = 0; i < n; i++) paint(i, on, 0);
    };

    /* Schedule false starts and the final strike for one letter */
    const strike = (i, startMs, rnd) => {
      const c = cfg.current;
      const sp = Math.max(0.1, c.speed);
      const falseStarts =
        c.flickers <= 0 ? 0 : Math.round(c.flickers * (0.4 + 1.2 * rnd()));
      let t = startMs;
      for (let k = 0; k < falseStarts; k++) {
        const on = (30 + rnd() * 70) / sp;
        const off = (40 + rnd() * 110) / sp;
        later(() => paint(i, true, -cfg.current.glow * 0.5), t);
        later(() => paint(i, false), t + on);
        t += on + off;
      }
      later(() => paint(i, true, cfg.current.flash * 0.9), t);
      later(() => paint(i, true, 0), t + 180 / sp);
      return t + 180 / sp;
    };

    const startOrder = (rnd) => {
      const idxs = Array.from({ length: n }, (_, i) => i);
      if (order === "end") return idxs.reverse();
      if (order === "center") {
        const mid = (n - 1) / 2;
        return idxs.sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid));
      }
      if (order === "random") {
        for (let i = n - 1; i > 0; i--) {
          const j = Math.floor(rnd() * (i + 1));
          [idxs[i], idxs[j]] = [idxs[j], idxs[i]];
        }
        return idxs;
      }
      return idxs; // "start"
    };

    const ignite = () => {
      clearAll();
      settled = false;
      run += 1;
      const rnd = mulberry32(seed * 7919 + run);
      const c = cfg.current;
      paintAll(false);

      const seq = startOrder(rnd);
      let last = 0;
      seq.forEach((letterIdx, rank) => {
        const end = strike(
          letterIdx,
          c.delay * 1000 + rank * c.stagger * 1000,
          rnd
        );
        if (end > last) last = end;
      });

      later(() => {
        settled = true;
        cfg.current.onComplete?.();
        if (cfg.current.loop) {
          later(() => ignite(), cfg.current.loopDelay * 1000);
        }
      }, last + 40);
    };

    const powerDown = () => {
      clearAll();
      settled = false;
      paintAll(false);
    };

    /* Letters go dark in a wave from (x, y), then strike back on */
    const cycle = (x, y) => {
      const root = rootRef.current;
      if (!root) return;
      clearAll();
      settled = false;
      run += 1;
      const rnd = mulberry32(seed * 7919 + run);

      const rect = root.getBoundingClientRect();
      const ox = x ?? rect.left + rect.width / 2;
      const oy = y ?? rect.top + rect.height / 2;

      const dists = [];
      let maxD = 0;
      for (let i = 0; i < n; i++) {
        const r = letters[i].getBoundingClientRect();
        const d = Math.hypot(r.left + r.width / 2 - ox, r.top + r.height / 2 - oy);
        dists.push(d);
        if (d > maxD) maxD = d;
      }

      const rate = 0.9; // ms per pixel
      const base = maxD * rate + 250;
      let last = 0;
      for (let i = 0; i < n; i++) {
        later(() => paint(i, false), dists[i] * rate);
        const end = strike(i, base + dists[i] * rate, rnd);
        if (end > last) last = end;
      }
      later(() => {
        settled = true;
      }, last + 40);
    };

    /* A lit letter briefly loses power, then comes back */
    const dip = (i, ms) => {
      if (dipping[i]) return;
      dipping[i] = true;
      paint(i, false);
      later(() => {
        dipping[i] = false;
        paint(i, true, cfg.current.flash * 0.4);
        later(() => paint(i, true, 0), 120);
      }, ms);
    };

    const pointerMove = (e) => {
      const c = cfg.current;
      if (!settled || c.interference <= 0) return;
      const now = performance.now();
      if (now - lastMove < 40) return;
      lastMove = now;

      const speedPx = Math.hypot(e.movementX || 0, e.movementY || 0);
      const strength = Math.min(1, speedPx / 40);
      if (strength <= 0) return;

      for (let i = 0; i < n; i++) {
        if (dipping[i]) continue;
        const r = letters[i].getBoundingClientRect();
        const d = Math.hypot(
          r.left + r.width / 2 - e.clientX,
          r.top + r.height / 2 - e.clientY
        );
        if (d > c.interferenceRadius) continue;
        const p =
          c.interference * strength * (1 - d / c.interferenceRadius) * 0.8;
        if (Math.random() < p) dip(i, (40 + Math.random() * 70) / Math.max(0.1, c.speed));
      }
    };

    const click = (e) => {
      if (!cfg.current.clickCycle) return;
      cycle(e.clientX, e.clientY);
    };

    /* ---------- start up ---------- */

    // Static, fully lit (paused or reduced motion)
    if (paused || reduce) {
      paintAll(true);
      api.current = {
        ignite() {},
        cycle() {},
        powerDown() {},
        pointerMove() {},
        click() {},
      };
      return () => {};
    }

    api.current = { ignite, cycle, powerDown, pointerMove, click };
    paintAll(false);

    // Occasional "loose connection" blips while idle
    interval = setInterval(() => {
      const c = cfg.current;
      if (!settled || c.instability <= 0) return;
      for (let i = 0; i < n; i++) {
        if (!dipping[i] && Math.random() < c.instability * 0.02) {
          dip(i, 50 + Math.random() * 90);
        }
      }
    }, 350);

    if (trigger === "mount") {
      ignite();
    } else if (trigger === "view") {
      const el = rootRef.current;
      if (el && typeof IntersectionObserver !== "undefined") {
        observer = new IntersectionObserver(
          (entries) => {
            if (entries.some((en) => en.isIntersecting)) {
              observer.disconnect();
              ignite();
            }
          },
          { threshold: 0.25 }
        );
        observer.observe(el);
      } else {
        ignite();
      }
    }
    // "hover" and "manual" are started from the handlers / ref

    return () => {
      clearAll();
      if (interval) clearInterval(interval);
      if (observer) observer.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, count, trigger, paused, seed, order]);

  return (
    <Tag
      ref={rootRef}
      className={className}
      aria-label={text}
      onPointerMove={(e) => api.current.pointerMove?.(e)}
      onClick={(e) => api.current.click?.(e)}
      onMouseEnter={() => trigger === "hover" && api.current.ignite?.()}
      onMouseLeave={() => trigger === "hover" && api.current.powerDown?.()}
      style={{
        whiteSpace: "pre-wrap",
        color: color !== "currentColor" ? color : undefined,
        ...style,
      }}
    >
      {tokens.map((tok, ti) =>
        tok.space ? (
          <React.Fragment key={ti}>{tok.text}</React.Fragment>
        ) : (
          <span
            key={ti}
            aria-hidden="true"
            style={{ display: "inline-block", whiteSpace: "nowrap" }}
          >
            {tok.letters.map((l) => (
              <span
                key={l.idx}
                ref={(el) => {
                  lettersRef.current[l.idx] = el;
                }}
                style={{ display: "inline-block", whiteSpace: "pre" }}
              >
                {l.ch}
              </span>
            ))}
          </span>
        )
      )}
    </Tag>
  );
});

export default SignalType;