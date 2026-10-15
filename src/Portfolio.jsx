import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import "./Portfolio.css";
import IrisGallery from "./IrisGallery.jsx";
import Signature from "./SignatureLoader.jsx";
import Projects from "./Projects.jsx";
import Skills from "./Skills.jsx";
import TextMorph from "./TextMorph.jsx";
import SectionHeading from "./SectionHeading.jsx";
import Footer from "./Footer.jsx";
import Navbar from "./Navbar.jsx";
import About from "./About.jsx";
// Adjust this path to wherever you added the React Bits Pro component
import SignalType from "./SignalType.jsx";
// Images are imported (not written as "/src/assets/...") so they also work
// after "npm run build" and on Vercel.
import mePhoto from "./assets/me.png";
import navLogo from "./assets/Mandala_Royal_Resort_Logo_Minimalist__1_-removebg-preview.png";
gsap.registerPlugin(ScrollTrigger);
const navLinks = [
  { label: "Home", href: "#home" }, { label: "About", href: "#about" },
  { label: "Projects", href: "#projects" },
  { label: "Skills", href: "#skills" },

  { label: "Contact", href: "#contact" },
];
/* ------------------------------------------------------------------ */
/* Put your own data here                                              */
/* ------------------------------------------------------------------ */
const NAME = "Shivam";
const ROLE = "Full Stack Developer";

// Words the hero role text morphs between (the first one shows first)
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

const MY_PHOTO = mePhoto;

const LINKS = [
  { label: "Projects", href: "#projects" },
  { label: "Skills", href: "#skills" },
  { label: "Contact", href: "#contact" },
];

export default function Portfolio() {
  const rootRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    /* ---------------------------------------------------------------
       1) Lenis = smooth scrolling
          GSAP's ticker drives Lenis, so both always run in sync.
    ---------------------------------------------------------------- */
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });
    lenis.on("scroll", ScrollTrigger.update);

    const tick = (time) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    /* Navbar links glide to their section */
    const onClick = (e) => {
      const link = e.target.closest('a[href^="#"]');
      if (!link) return;
      const hash = link.getAttribute("href");
      if (hash.length < 2) return;
      const target = document.querySelector(hash);
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: hash === "#home" ? 0 : -64 });
    };
    root.addEventListener("click", onClick);

    /* ---------------------------------------------------------------
       2) GSAP = animation
    ---------------------------------------------------------------- */
    const ctx = gsap.context(() => {
      // Scroll range for the hero: from the top until it has left the screen
      const heroScroll = {
        trigger: "#home",
        start: "top top",
        end: "bottom top",
        scrub: true, // animation follows the scrollbar
      };

      // Scroll range for the whole page
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
          // Created after the intro, so the two never fight over "opacity"
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

      /* B) PARALLAX ON THE PHOTO (scroll)
            The photo moves slower than the page and grows a little,
            the glow behind it moves up faster. Different speeds = depth. */
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

      /* C) Background lights travel across the page while scrolling */
      gsap.to(".pf-bg__blob--a", { x: "30vw", y: "40vh", ease: "none", scrollTrigger: pageScroll });
      gsap.to(".pf-bg__blob--b", { x: "-30vw", y: "-35vh", ease: "none", scrollTrigger: pageScroll });
      gsap.to(".pf-bg__blob--c", { x: "25vw", y: "20vh", ease: "none", scrollTrigger: pageScroll });

      /* D) Sections fade up when they come into view */
      gsap.utils.toArray(".pf-section:not(.pf-projects-wrapper)").forEach((section) => {
        gsap.from(section, {
          y: 48,
          opacity: 0,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: {
            trigger: section,
            start: "top 85%",
            once: true,
          },
        });
      });
    }, root);

    /* ---------------------------------------------------------------
       3) PARALLAX ON THE PHOTO (mouse) - only on devices with a mouse
    ---------------------------------------------------------------- */
    let onMove;
    if (window.matchMedia("(pointer: fine)").matches) {
      const photo = root.querySelector(".pf-hero__photo");
      const glow = root.querySelector(".pf-hero__glow");
      const photoX = gsap.quickTo(photo, "x", { duration: 0.9, ease: "power3.out" });
      const glowX = gsap.quickTo(glow, "x", { duration: 1.2, ease: "power3.out" });

      onMove = (e) => {
        const nx = e.clientX / window.innerWidth - 0.5; // -0.5 .. 0.5
        photoX(nx * -28); // photo moves a little against the mouse
        glowX(nx * 50); // glow moves more, so it feels further away
      };
      window.addEventListener("pointermove", onMove);
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
        {/* Animated background: drifting red lights, vignette and grain */}
        <div className="pf-bg" aria-hidden="true">
          <span className="pf-bg__blob pf-bg__blob--a" />
          <span className="pf-bg__blob pf-bg__blob--b" />
          <span className="pf-bg__blob pf-bg__blob--c" />
          <span className="pf-bg__grain" />
        </div>

        {/* Navbar: logo left, links right */}

        <Navbar
          name="Shivam."
          links={navLinks}
          cta={{
            label: "Github",
            href: "https://github.com/shivam-bhardwaj9",
          }}
        />


        {/* Hero: text left, photo in the middle, text right */}
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

          <img
            className="pf-hero__photo"
            src={MY_PHOTO}
            alt={`${NAME}, ${ROLE}`}
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

        {/* About renders its own <section id="about"> */}
        <About />

        <section className="pf-projects-wrapper">
          <Projects />
        </section>

        {/* Animated skills section (see Skills.jsx and Skills.css) */}
        <Skills />

        <section id="contact" className="pf-section">
          <SectionHeading
            label="Get in touch"
            title={
            <>
              <SignalType
        text="Let's build "
        as="span"
        color="#fff3f1"
        glowColor="#ff5a4f"
        unlit="outline"
        flickers={3}
        stagger={0.05}
        trigger="view"
        instability={0}
        loop={false}
        interference={1}
      />
      <SignalType
        text="something."
        as="span"
        className="contact-signal-italic"
        color="#fff3f1"
        glowColor="#ff5a4f"
        unlit="outline"
        flickers={3}
        stagger={0.05}
        trigger="view"
        instability={0}
        loop={false}
        interference={1}
      />
      </>
            }
            text="Open to full stack roles, internships and freelance projects. Say hello ↓"
          />

          {/* Add an email button here: <a className="pf-btn" href="mailto:you@example.com">Email</a> */}
          <div className="pf-hero__actions">
            <a
              className="pf-btn pf-btn--solid"
              href="https://github.com/shivam-bhardwaj9"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
            <a
              className="pf-btn"
              href="https://linkedin.com/in/shivam-bhardwaj-a90539253"
              target="_blank"
              rel="noreferrer"
            >
              LinkedIn
            </a>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}