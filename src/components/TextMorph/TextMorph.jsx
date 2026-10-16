import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import "./TextMorph.css";

/**
 * TextMorph - words that morph letter by letter.
 * Letters that two words share (like the "e" and "o" in "Developer") glide
 * to their new place. The other letters fade out and the new ones grow in.
 *
 * Own implementation with GSAP, not the paid React Bits Pro code.
 *
 * Usage:
 *   <TextMorph words={["Full Stack Developer", "Frontend Developer"]} />
 */

// How letters look while they are not visible
const HIDDEN = {
  liquid: { opacity: 0, scaleX: 1.35, scaleY: 0.05, filter: "blur(5px)" },
  blur: { opacity: 0, scaleX: 1.08, scaleY: 1.08, filter: "blur(12px)" },
};
const SHOWN = { opacity: 1, scaleX: 1, scaleY: 1, filter: "blur(0px)" };
const DEFAULT_WORDS = [
  "Full Stack Developer",
  "Frontend Developer",
  "Backend Developer",
  "UI/UX Designer",
  "Software Engineer",
];

// 0..1 order in which a letter starts (decides where the ripple begins)
function rankOf(index, count, from) {
  if (count <= 1) return 0;
  const t = index / (count - 1);
  if (from === "end") return 1 - t;
  if (from === "center") return Math.abs(t - 0.5) * 2;
  if (from === "edges") return 1 - Math.abs(t - 0.5) * 2;
  if (from === "random") return Math.random();
  return t; // "start"
}

export default function TextMorph({
  words = DEFAULT_WORDS,
  morph = "liquid", // "liquid" | "blur"
  interval = 2.6, // seconds the word stays before the next morph
  duration = 1.1, // seconds one morph takes
  stagger = 0.25, // 0 = all letters at once, up to 0.9 = long ripple
  staggerFrom = "start", // "start" | "end" | "center" | "edges" | "random"
  morphColor = "#ffffff", // colour letters flash while they glide
  loop = true, // go back to the first word after the last
  intro = true, // grow the first word in when it appears
  startOnView = true, // wait until it is on screen
  pauseOnHover = false,
  respectReducedMotion = false, // true = show the first word, no animation
  onChange, // (word, index) => void
  className = "",
  style,
}) {
  const rootRef = useRef(null);
  const stageRef = useRef(null);
  const [shown, setShown] = useState(words[0] || "");

  // Always holds the latest props, so the effect below does not restart
  const live = useRef({});
  useEffect(() => {
    live.current = {
      words, morph, interval, duration, stagger, staggerFrom,
      morphColor, loop, pauseOnHover, onChange,
    };
  }, [words, morph, interval, duration, stagger, staggerFrom, morphColor, loop, pauseOnHover, onChange]);

  const wordsKey = words.join("|");

  useEffect(() => {
    const root = rootRef.current;
    const stage = stageRef.current;
    if (!root || !stage || words.length === 0) return;

    const reduce =
      respectReducedMotion &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const st = {
      index: 0,
      letters: [], // { el, ch, x } of the word that is on screen
      layouts: [], // for every word: { width, chars: [{ ch, x }] }
      tl: null,
      timer: null,
      visible: !startOnView,
      hovered: false,
      started: false,
    };
    let cancelled = false;

    /* ---- 1) Measure where every letter of every word sits ---- */
    const measure = () => {
      const ghosts = root.querySelectorAll(".tm-ghost");
      st.layouts = [...ghosts].map((ghost) => {
        const g = ghost.getBoundingClientRect();
        const chars = [...ghost.querySelectorAll(".tm-ch")].map((c) => ({
          ch: c.textContent,
          x: c.getBoundingClientRect().left - g.left,
        }));
        return { width: g.width, chars };
      });
    };

    const makeLetter = (ch) => {
      const el = document.createElement("span");
      el.className = "tm-letter";
      el.textContent = ch;
      el.setAttribute("aria-hidden", "true");
      return el;
    };

    /* ---- 2) Put one word on the stage ---- */
    const build = (index, hidden) => {
      const layout = st.layouts[index];
      st.letters = [];
      layout.chars.forEach((c) => {
        if (!c.ch.trim()) return; // spaces only take room, no element
        const el = makeLetter(c.ch);
        stage.appendChild(el);
        gsap.set(el, { x: c.x, ...(hidden ? HIDDEN[live.current.morph] : SHOWN) });
        st.letters.push({ el, ch: c.ch, x: c.x });
      });
      gsap.set(stage, { width: layout.width });
    };

    /* ---- 3) Morph from the current word to another one ---- */
    const goTo = (next) => {
      const m = live.current;
      if (next === st.index || !st.layouts[next]) return;
      if (st.tl) st.tl.progress(1); // finish an unfinished morph first

      const layout = st.layouts[next];
      const chars = layout.chars.filter((c) => c.ch.trim());
      const old = st.letters;
      const used = new Set();
      const nextLetters = [];
      const moving = [];
      const entering = [];

      // For every new letter, look for the same letter in the old word
      chars.forEach((c, j) => {
        const rank = rankOf(j, chars.length, m.staggerFrom);
        let best = -1;
        let bestDist = Infinity;
        old.forEach((o, k) => {
          if (used.has(k) || o.ch !== c.ch) return;
          const d = Math.abs(o.x - c.x);
          if (d < bestDist) {
            bestDist = d;
            best = k;
          }
        });

        if (best > -1) {
          // shared letter: it glides to its new place
          used.add(best);
          const o = old[best];
          moving.push({ el: o.el, x: c.x, rank });
          nextLetters.push({ el: o.el, ch: c.ch, x: c.x });
        } else {
          // new letter: it grows in
          const el = makeLetter(c.ch);
          stage.appendChild(el);
          gsap.set(el, { x: c.x, ...HIDDEN[m.morph] });
          entering.push({ el, rank });
          nextLetters.push({ el, ch: c.ch, x: c.x });
        }
      });

      const leaving = old.filter((_, k) => !used.has(k));
      const D = m.duration;
      const S = m.stagger * D;

      const tl = gsap.timeline({
        onComplete: () => {
          leaving.forEach((o) => o.el.remove());
          gsap.set(nextLetters.map((l) => l.el), { clearProps: "filter" });
          st.letters = nextLetters;
          st.index = next;
          setShown(m.words[next]);
          if (m.onChange) m.onChange(m.words[next], next);
          schedule();
        },
      });

      leaving.forEach((o) => {
        const rank = rankOf(old.indexOf(o), old.length, m.staggerFrom);
        tl.to(o.el, { ...HIDDEN[m.morph], duration: D * 0.45, ease: "power2.in" }, rank * S * 0.6);
      });

      moving.forEach((mv) => {
        tl.to(mv.el, { x: mv.x, duration: D * 0.7, ease: "power3.inOut" }, mv.rank * S);
        tl.to(
          mv.el,
          { color: m.morphColor, duration: D * 0.2, ease: "sine.inOut", yoyo: true, repeat: 1, clearProps: "color" },
          mv.rank * S
        );
      });

      entering.forEach((en) => {
        tl.to(en.el, { ...SHOWN, duration: D * 0.6, ease: "power3.out" }, D * 0.3 + en.rank * S);
      });

      // the box changes width, so the text next to it moves smoothly too
      tl.to(stage, { width: layout.width, duration: D * 0.8, ease: "power3.inOut" }, 0);

      st.tl = tl;
    };

    /* ---- 4) Timer: next word after `interval` seconds ---- */
    const tick = () => {
      const m = live.current;
      if (!st.visible || st.hovered) {
        schedule(); // off screen or hovered: check again later
        return;
      }
      let next = st.index + 1;
      if (next >= m.words.length) {
        if (!m.loop) return;
        next = 0;
      }
      goTo(next);
    };

    const schedule = () => {
      if (st.timer) st.timer.kill();
      if (live.current.words.length < 2) return;
      st.timer = gsap.delayedCall(live.current.interval, tick);
    };

    /* ---- 5) Start ---- */
    const start = () => {
      if (st.started || cancelled) return;
      st.started = true;
      if (intro && !reduce) {
        const m = live.current;
        gsap.to(st.letters.map((l) => l.el), {
          ...SHOWN,
          duration: m.duration * 0.7,
          ease: "power3.out",
          stagger: { amount: m.stagger * m.duration, from: m.staggerFrom },
          clearProps: "filter",
        });
      } else {
        gsap.set(st.letters.map((l) => l.el), SHOWN);
      }
      if (!reduce) schedule();
    };

    let io;
    let ro;
    const onEnter = () => (st.hovered = true);
    const onLeave = () => (st.hovered = false);

    const init = () => {
      if (cancelled) return;
      measure();
      build(0, intro && !reduce);

      io = new IntersectionObserver(
        ([entry]) => {
          st.visible = entry.isIntersecting;
          if (entry.isIntersecting) start();
        },
        { threshold: 0.2 }
      );
      io.observe(root);
      if (!startOnView) start();

      // Re-measure when the font size or the web font changes
      const firstGhost = root.querySelector(".tm-ghost");
      if (firstGhost && "ResizeObserver" in window) {
        ro = new ResizeObserver(() => {
          if (st.tl && st.tl.isActive()) return;
          measure();
          const layout = st.layouts[st.index];
          if (!layout) return;
          const chars = layout.chars.filter((c) => c.ch.trim());
          st.letters.forEach((l, i) => {
            if (chars[i]) {
              l.x = chars[i].x;
              gsap.set(l.el, { x: chars[i].x });
            }
          });
          gsap.set(stage, { width: layout.width });
        });
        ro.observe(firstGhost);
      }

      if (live.current.pauseOnHover) {
        root.addEventListener("pointerenter", onEnter);
        root.addEventListener("pointerleave", onLeave);
      }
    };

    // Wait for the web font, otherwise the measurements would be wrong
    const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    fontsReady.then(init);

    return () => {
      cancelled = true;
      if (io) io.disconnect();
      if (ro) ro.disconnect();
      if (st.timer) st.timer.kill();
      if (st.tl) st.tl.kill();
      root.removeEventListener("pointerenter", onEnter);
      root.removeEventListener("pointerleave", onLeave);
      stage.innerHTML = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordsKey, intro, startOnView, respectReducedMotion]);

  return (
    <span ref={rootRef} className={`tm-root ${className}`} style={style}>
      {/* what screen readers read */}
      <span className="tm-sr">{shown}</span>

      {/* the letters are added here by GSAP */}
      <span ref={stageRef} className="tm-stage" aria-hidden="true" />

      {/* invisible copies of every word, only used to measure letter positions */}
      {words.map((word, wi) => (
        <span key={wi} className="tm-ghost" aria-hidden="true">
          {[...word].map((ch, ci) => (
            <span key={ci} className="tm-ch">
              {ch}
            </span>
          ))}
        </span>
      ))}
    </span>
  );
}
