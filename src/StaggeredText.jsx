import React, { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);
import "./StaggeredText.css";
/**
 * StaggeredText - text that staggers in by character, word or line.
 * Built with GSAP (no extra install). Props mirror the React Bits version.
 *
 * Usage (plays once):
 *   <StaggeredText as="h1" text="Build faster|than ever" separator="|"
 *                  segmentBy="chars" className="pf-hero-title" />
 *
 * Usage (loops forever, waits 2 seconds between each loop):
 *   <StaggeredText as="h1" text="Hi, I'm Shivam" segmentBy="chars"
 *                  repeat={-1} repeatDelay={2} />
 *
 * One loop = text staggers in -> stays visible for `repeatDelay` seconds
 *            -> staggers out -> staggers in again.
 */
export default function StaggeredText({
  text = "",
  className = "",
  as: Tag = "p",
  segmentBy = "words", // "chars" | "words" | "lines"
  separator, // splits text into rows first, e.g. "|"
  delay = 80, // ms between each segment
  duration = 0.6, // seconds per segment
  ease = "power3.out", // any GSAP ease, e.g. "back.out(1.7)"
  startOnScroll = true, // false = play immediately on mount (best for hero)
  start = "top 90%", // ScrollTrigger start
  direction = "top", // "top" | "bottom" | "left" | "right"
  blur = true,
  staggerDirection = "forward", // "forward" | "reverse" | "center"
  repeat = 0, // 0 = play once, -1 = loop forever, 3 = repeat 3 more times
  repeatDelay = 2, // seconds the text stays visible before the next loop
  respectReducedMotion = true,
  onAnimationComplete,
}) {
  const root = useRef(null);

  const rows = separator ? text.split(separator) : [text];
  const label = rows.join(" ").replace(/\s+/g, " ").trim();

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const segs = el.querySelectorAll(".st-seg");

    const reduce =
      respectReducedMotion &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduce) {
      gsap.set(segs, { opacity: 1, clearProps: "transform,filter" });
      return;
    }

    const dist = "0.6em";
    const from = { opacity: 0 };
    if (direction === "top") from.y = `-${dist}`;
    if (direction === "bottom") from.y = dist;
    if (direction === "left") from.x = `-${dist}`;
    if (direction === "right") from.x = dist;
    if (blur) from.filter = "blur(10px)";

    const staggerFrom =
      staggerDirection === "reverse"
        ? "end"
        : staggerDirection === "center"
        ? "center"
        : "start";

    // End state of the "in" animation
    const to = {
      opacity: 1,
      x: 0,
      y: 0,
      duration,
      ease,
      stagger: { each: delay / 1000, from: staggerFrom },
    };
    if (blur) to.filter = "blur(0px)";

    const ctx = gsap.context(() => {
      if (repeat === 0) {
        /* ---------- Play once (same as before) ---------- */
        gsap.fromTo(segs, from, {
          ...to,
          scrollTrigger: startOnScroll
            ? { trigger: el, start, once: true }
            : undefined,
          onComplete: () => {
            gsap.set(segs, { clearProps: "filter,transform" });
            onAnimationComplete && onAnimationComplete();
          },
        });
      } else {
        /* ---------- Loop: in -> wait -> out -> in -> ... ---------- */
        const tl = gsap.timeline({
          repeat, // -1 = forever
          onRepeat: onAnimationComplete,
          scrollTrigger: startOnScroll
            ? {
                trigger: el,
                start,
                // play when visible, pause when scrolled away, resume on return
                toggleActions: "play pause resume pause",
              }
            : undefined,
        });

        tl.fromTo(segs, from, to).to(
          segs,
          {
            ...from, // go back to the hidden state
            duration: duration * 0.7,
            ease: "power2.in",
            stagger: { each: delay / 2000, from: staggerFrom },
          },
          `+=${repeatDelay}` // how long the text stays visible
        );
      }
    }, el);

    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, segmentBy, separator, delay, duration, ease, direction, blur, staggerDirection, startOnScroll, start, repeat, repeatDelay]);

  const renderRow = (row) => {
    if (segmentBy === "lines") {
      return <span className="st-seg st-block">{row}</span>;
    }
    return row
      .trim()
      .split(/\s+/)
      .map((word, wi, arr) => (
        <React.Fragment key={wi}>
          {segmentBy === "chars" ? (
            <span className="st-word">
              {[...word].map((ch, ci) => (
                <span className="st-seg" key={ci}>
                  {ch}
                </span>
              ))}
            </span>
          ) : (
            <span className="st-seg">{word}</span>
          )}
          {wi < arr.length - 1 ? " " : null}
        </React.Fragment>
      ));
  };

  return (
    <Tag ref={root} className={`st-root ${className}`} aria-label={label}>
      {rows.map((row, i) => (
        <span className="st-row" key={i} aria-hidden="true">
          {renderRow(row)}
        </span>
      ))}
    </Tag>
  );
}