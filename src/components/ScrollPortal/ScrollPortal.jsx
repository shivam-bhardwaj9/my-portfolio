import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "./ScrollPortal.css";

gsap.registerPlugin(ScrollTrigger);

/**
 * StackReveal - the `under` section stays pinned while the `over` section
 * slides up on top of it.
 *
 *  - under: scales back and dims as it gets covered
 *  - over:  starts tilted back (3D) and flattens as it rises, then settles
 *  - word:  a huge outlined word fills with colour while the section arrives
 *
 * Only transform, opacity and one CSS variable are animated, so it stays cheap.
 */

/* ------------------------------------------------------------------ */
/* Edit the big word here                                              */
/* ------------------------------------------------------------------ */
const WORD = "FREELANCE";

export default function StackReveal({ under, over, word = WORD }) {
  const wrapRef = useRef(null);
  const underRef = useRef(null);
  const innerRef = useRef(null);
  const dimRef = useRef(null);
  const overRef = useRef(null);
  const wordRef = useRef(null);

  /* Pin the bottom of `under` to the bottom of the screen (or its top, when
     it is shorter than the screen), so the whole section can be seen before
     the next one covers it. */
  useEffect(() => {
    const el = underRef.current;
    if (!el) return undefined;
    const setTop = () => {
      el.style.top = `${Math.min(0, window.innerHeight - el.offsetHeight)}px`;
    };
    setTop();
    const ro = new ResizeObserver(() => {
      setTop();
      ScrollTrigger.refresh();
    });
    ro.observe(el);
    window.addEventListener("resize", setTop);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", setTop);
    };
  }, []);

  useEffect(() => {
    const over = overRef.current;
    if (!over) return undefined;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const ctx = gsap.context(() => {
      // Once fully covered, stop painting the section underneath
      ScrollTrigger.create({
        trigger: over,
        start: "top top",
        onEnter: () => (underRef.current.style.visibility = "hidden"),
        onLeaveBack: () => (underRef.current.style.visibility = "visible"),
      });

      if (reduce) return;

      const cover = {
        trigger: over,
        start: "top bottom",
        end: "top top",
        scrub: true,
      };

      // The section underneath steps back
      gsap.fromTo(
        innerRef.current,
        { scale: 1, transformOrigin: "50% 100%" },
        { scale: 0.92, ease: "none", scrollTrigger: cover }
      );
      gsap.fromTo(
        dimRef.current,
        { opacity: 0 },
        { opacity: 0.7, ease: "none", scrollTrigger: cover }
      );

      // The new section tips up from a tilt and flattens as it arrives
      gsap.fromTo(
        over,
        {
          transformPerspective: 1200,
          transformOrigin: "50% 0%",
          rotationX: 10,
          scale: 0.93,
        },
        {
          rotationX: 0,
          scale: 1,
          ease: "none",
          scrollTrigger: {
            trigger: over,
            start: "top bottom",
            end: "top 15%",
            scrub: true,
          },
        }
      );

      // The big word fills left to right
      gsap.fromTo(
        wordRef.current,
        { "--fill": "0%" },
        {
          "--fill": "100%",
          ease: "none",
          scrollTrigger: {
            trigger: over,
            start: "top 90%",
            end: "top 10%",
            scrub: true,
          },
        }
      );
    }, wrapRef);

    return () => ctx.revert();
  }, []);

  return (
    <div className="rv" ref={wrapRef}>
      <div className="rv__under" ref={underRef}>
        <div className="rv__under-inner" ref={innerRef}>
          {under}
        </div>
        <div className="rv__dim" ref={dimRef} aria-hidden="true" />
      </div>

      <div className="rv__over" ref={overRef}>
        <div className="rv__word" ref={wordRef} aria-hidden="true">
          {word}
        </div>

        {over}
      </div>
    </div>
  );
}