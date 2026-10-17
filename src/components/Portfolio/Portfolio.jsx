import { lazy, Suspense, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import "./Portfolio.css";
import Signature from "../SignatureLoader/SignatureLoader.jsx";
import TextMorph from "../TextMorph/TextMorph.jsx";
import Navbar from "../Navbar/Navbar.jsx";
import mePhoto from "../../assets/me.png";

// Everything below the hero is a separate chunk, loaded after the page has loaded
const BelowFold = lazy(() => import("./BelowFold.jsx"));

gsap.registerPlugin(ScrollTrigger);

const navLinks = [
  { label: "Home", href: "#home" },
  { label: "About", href: "#about" },
  { label: "Projects", href: "#projects" },
  { label: "Skills", href: "#skills" },
  { label: "Contact", href: "#contact" },
];

const NAME = "Shivam";
const ROLE = "Full Stack Developer";
const ROLE_WORDS = [
  "Full Stack Developer",
  "Frontend Developer",
  "Backend Developer",
  "Node.js Developer",
  "React Developer",
  "Web Designer",
];
const INTRO =
  "I build full stack web apps with Node.js and React, from the database to the interface.";

const BACKGROUND_ANIMATIONS = [
  { selector: ".pf-bg__blob--a", x: "30vw", y: "40vh" },
  { selector: ".pf-bg__blob--b", x: "-30vw", y: "-35vh" },
  { selector: ".pf-bg__blob--c", x: "25vw", y: "20vh" },
];

export default function Portfolio() {
  const rootRef = useRef(null);
  const [showRest, setShowRest] = useState(false);

  /* Load the rest of the page only after the hero (and its photo) has loaded */
  useEffect(() => {
    if (document.readyState === "complete") {
      const t = setTimeout(() => setShowRest(true), 200);
      return () => clearTimeout(t);
    }
    const go = () => setShowRest(true);
    window.addEventListener("load", go, { once: true });
    return () => window.removeEventListener("load", go);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    /* Lenis = smooth scrolling, driven by GSAP's ticker */
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });
    lenis.on("scroll", ScrollTrigger.update);

    const tick = (time) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    const onClick = (e) => {
      const link = e.target.closest('a[href^="#"]');
      if (!link) return;
      const hash = link.getAttribute("href");
      if (hash.length < 2) return;
      const target =
        (hash === "#skills" && document.querySelector(".rv")) ||
        document.querySelector(hash);
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: hash === "#home" ? 0 : -64 });
    };
    root.addEventListener("click", onClick);

    const ctx = gsap.context(() => {
      const heroScroll = {
        trigger: "#home",
        start: "top top",
        end: "bottom top",
        scrub: true,
      };

      const pageScroll = {
        trigger: root,
        start: "top top",
        end: "bottom bottom",
        scrub: true,
      };

      /* A) Intro when the page loads */
      const intro = gsap.timeline({
        defaults: { ease: "power3.out" },
        onComplete: () => {
          ctx.add(() => {
            gsap.to(".pf-hero__left", {
              x: -120,
              y: -60,
              opacity: 0,
              ease: "none",
              scrollTrigger: heroScroll,
            });
            gsap.to(".pf-hero__right", {
              x: 120,
              y: -60,
              opacity: 0,
              ease: "none",
              scrollTrigger: heroScroll,
            });
          });
        },
      });

      intro
        .from(".pf-hero__photo", { y: 90, opacity: 0, duration: 1.1 }, 0)
        .from(
          ".pf-hero__left, .pf-hero__right",
          { y: 24, opacity: 0, duration: 0.8, stagger: 0.1 },
          0.35
        );

      /* B) Parallax on the photo (scroll) */
      gsap.to(".pf-hero__photo", {
        yPercent: 16,
        scale: 1.12,
        transformOrigin: "50% 100%",
        ease: "none",
        scrollTrigger: heroScroll,
      });

      gsap.to(".pf-hero__glow", {
        y: -140,
        ease: "none",
        scrollTrigger: heroScroll,
      });

      /* C) Background lights: desktop only, and not for reduced-motion users.
            Blurred blobs moving on a phone are the most expensive part of the page. */
      const mm = gsap.matchMedia();
      mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
        BACKGROUND_ANIMATIONS.forEach(({ selector, x, y }) => {
          gsap.to(selector, { x, y, ease: "none", scrollTrigger: pageScroll });
        });
      });
    }, root);

    /* Parallax on the photo (mouse), only on devices with a mouse */
    let onMove;
    if (window.matchMedia("(pointer: fine)").matches) {
      const photo = root.querySelector(".pf-hero__photo");
      const glow = root.querySelector(".pf-hero__glow");
      const photoX = gsap.quickTo(photo, "x", { duration: 0.9, ease: "power3.out" });
      const glowX = gsap.quickTo(glow, "x", { duration: 1.2, ease: "power3.out" });

      onMove = (e) => {
        const nx = e.clientX / window.innerWidth - 0.5;
        photoX(nx * -28);
        glowX(nx * 50);
      };
      window.addEventListener("pointermove", onMove, { passive: true });
    }

    return () => {
      if (onMove) window.removeEventListener("pointermove", onMove);
      root.removeEventListener("click", onClick);
      ctx.revert();
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, []);

  return (
    <>
      <Signature />
      <div className="pf" ref={rootRef}>
        <div className="pf-bg" aria-hidden="true">
          <span className="pf-bg__blob pf-bg__blob--a" />
          <span className="pf-bg__blob pf-bg__blob--b" />
          <span className="pf-bg__blob pf-bg__blob--c" />
          <span className="pf-bg__grain" />
        </div>

        <Navbar
          name="Shivam."
          links={navLinks}
          cta={{
            label: "Github",
            href: "https://github.com/shivam-bhardwaj9",
          }}
        />

        <section id="home" className="pf-hero">
          <div className="pf-hero__glow" aria-hidden="true" />

          <div className="pf-hero__left">
            <h1>Hi, I&apos;m {NAME}</h1>
            <p className="pf-hero__role">
              <TextMorph
                words={ROLE_WORDS}
                morph="liquid"
                morphColor={["#ffffff", "#ffd6a0", "#ffb3a8", "#ff8a7a"]}
              />
            </p>
          </div>

          {/* This photo is the LCP element: load it first, don't lazy-load it */}
          <img
            className="pf-hero__photo"
            src={mePhoto}
            alt={`${NAME}, ${ROLE}`}
            fetchPriority="high"
            decoding="async"
          />

          <div className="pf-hero__right">
            <p>{INTRO}</p>
            <div className="pf-hero__actions">
              <a className="pf-btn pf-btn--solid" href="#projects">
                View projects
              </a>
              <a className="pf-btn" href="#contact">
                Contact me
              </a>
            </div>
          </div>
        </section>

        {showRest && (
          <Suspense fallback={<div style={{ minHeight: "100vh" }} />}>
            <BelowFold />
          </Suspense>
        )}
      </div>
    </>
  );
}