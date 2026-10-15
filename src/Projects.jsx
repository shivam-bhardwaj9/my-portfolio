import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "./Projects.css";
import misIcon from "./assets/Chatgpt.svg";
import livetrackIcon from "./assets/LiveTrack.svg"
gsap.registerPlugin(ScrollTrigger);

/* ------------------------------------------------------------------
   EDIT THIS LIST with your real projects.
   img: put your screenshot in /public/projects/ and use "/projects/x.jpg"
        (leave "" to show the gradient placeholder)
------------------------------------------------------------------- */

const PROJECTS = [
  {
    title: "MIS Operations Assistant",
    desc: "A data-processing dashboard that validates transactions, detects duplicates, reconciles records, and generates reports from Excel and CSV files.",
    tags: ["React", "FastAPI", "Python", "Pandas"],
    svg: misIcon,
    live: "https://mis-operations-assistant.vercel.app",
    github: "https://github.com/shivam-bhardwaj9/MIS-Operations-Assistant",
    hue: 0,
  },
  {
    title: "LiveTrack",
    desc: "A consent-based location-sharing application with device discovery, background location updates, and a live map dashboard.",
    tags: ["React Native", "Expo", "Firebase", "Leaflet"],
    svg: livetrackIcon,
    live: "https://live-track1-livetrack-web.vercel.app",
    github: "https://github.com/shivam-bhardwaj9/LiveTrack1",
    hue: 18,
  },
  {
    title: "Art Marketplace",
    desc: "A modern art marketplace concept featuring artwork discovery, product details, authentication, shopping cart, and an ecommerce experience.",
    tags: ["React", "Node.js", "Express", "MongoDB"],
    img: "/projects/art-marketplace.jpg",
    live: "#",
    github: "#",
    hue: 340,
  },
  {
    title: "Restaurant Website",
    desc: "A responsive restaurant website concept with an elegant menu, food gallery, reservation requests, and contact information.",
    tags: ["React", "Tailwind CSS", "JavaScript", "SEO"],
    img: "/projects/restaurant.jpg",
    live: "#",
    github: "#",
    hue: 8,
  },
  {
    title: "API Monitoring Dashboard",
    desc: "A developer dashboard concept for monitoring API uptime, response times, failed requests, and service health through visual analytics.",
    tags: ["React", "TypeScript", "Node.js", "MongoDB"],
    img: "/projects/api-monitor.jpg",
    live: "#",
    github: "#",
    hue: 25,
  },
  {
    title: "AI Document Assistant",
    desc: "An AI-powered document assistant concept that lets users upload documents, ask questions, and explore relevant information.",
    tags: ["React", "FastAPI", "Python", "LLM API"],
    img: "/projects/ai-assistant.jpg",
    live: "#",
    github: "#",
    hue: 350,
  },
];


export default function Projects() {
  const sectionRef = useRef(null);
  const trackRef = useRef(null);
  const barRef = useRef(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    const mm = gsap.matchMedia();

    /* ---------- masked word reveal (both desktop + mobile) ---------- */
    const words = section.querySelectorAll(".pj__word > span");

    /* ---------- DESKTOP: pinned horizontal scroll ---------- */

    mm.add("(min-width: 900px)", () => {
      const distance = () =>
        Math.max(0, track.scrollWidth - section.clientWidth);

      const move = gsap.to(track, {
        x: () => -distance(),
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${Math.max(distance(), 1)}`,
          pin: section,
          pinSpacing: true,
          scrub: 1,
          invalidateOnRefresh: true,
          anticipatePin: 1,
          onUpdate: (self) => {
            if (barRef.current) {
              gsap.set(barRef.current, {
                scaleX: self.progress,
              });
            }
          },
        },
      });

      // Keep your existing heading reveal and card animations below.



      // heading words rise up on enter
      gsap.fromTo(
        words,
        { yPercent: 115, rotate: 6 },
        {
          yPercent: 0,
          rotate: 0,
          duration: 1.1,
          ease: "power4.out",
          stagger: 0.12,
          scrollTrigger: { trigger: section, start: "top 70%" },
        }
      );

      // parallax inside each card while it travels across the screen
      gsap.utils.toArray(".pj__card").forEach((card) => {
        const media = card.querySelector(".pj__media-inner");
        gsap.fromTo(
          media,
          { xPercent: -14, scale: 1.25 },
          {
            xPercent: 14,
            ease: "none",
            scrollTrigger: {
              trigger: card,
              containerAnimation: move,
              start: "left right",
              end: "right left",
              scrub: true,
            },
          }
        );

        // card tilts slightly in, straightens in the middle, tilts out
        gsap.fromTo(
          card,
          { rotate: 4, y: 40 },
          {
            rotate: -4,
            y: -40,
            ease: "none",
            scrollTrigger: {
              trigger: card,
              containerAnimation: move,
              start: "left right",
              end: "right left",
              scrub: true,
            },
          }
        );
      });
    });

    /* ---------- MOBILE: simple fade-up cards ---------- */
    mm.add("(max-width: 899px)", () => {
      gsap.fromTo(
        words,
        { yPercent: 115 },
        {
          yPercent: 0,
          duration: 1,
          ease: "power4.out",
          stagger: 0.1,
          scrollTrigger: { trigger: section, start: "top 80%" },
        }
      );
      gsap.utils.toArray(".pj__card").forEach((card) => {
        gsap.from(card, {
          y: 60,
          opacity: 0,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: { trigger: card, start: "top 88%" },
        });
      });
    });

    return () => mm.revert();
  }, []);

  /* spotlight that follows the mouse (like React Bits SpotlightCard) */
  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
  };

  return (
    <section className="pj" id="projects" ref={sectionRef}>
      <div className="pj__track" ref={trackRef}>
        {/* intro panel */}
        <div className="pj__intro">
          <p className="pj__eyebrow">( Portfolio 2026 )</p>
          <h2 className="pj__title">
            <span className="pj__word"><span>Selected</span></span>{" "}
            <span className="pj__word"><span className="pj__italic">Work</span></span>
          </h2>
          <p className="pj__sub">
            A few things I've designed and built. Keep scrolling
            <span className="pj__arrow"> →</span>
          </p>
        </div>

        {PROJECTS.map((p, i) => (
          <article
            className="pj__card"
            key={p.title}
            onMouseMove={onMove}
            style={{ "--hue": p.hue }}
          >
            <div className="pj__spot" />


            <div className="pj__media">
              <div
                className={`pj__media-inner ${p.svg ? "pj__media-inner--svg" : ""}`}
                style={
                  p.img
                    ? { backgroundImage: `url("${p.img}")` }
                    : undefined
                }
              >
                {p.svg ? (
                  <img
                    className="pj__illustration"
                    src={p.svg}
                    alt={`${p.title} illustration`}
                    loading="lazy"
                  />
                ) : !p.img ? (
                  <span className="pj__ghost">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                ) : null}
              </div>
            </div>


            <div className="pj__body">
              <div className="pj__row">
                <span className="pj__num">{String(i + 1).padStart(2, "0")}</span>
                <div className="pj__tags">
                  {p.tags.map((t) => (
                    <span key={t}>{t}</span>
                  ))}
                </div>
              </div>

              <h3 className="pj__name">{p.title}</h3>
              <p className="pj__desc">{p.desc}</p>

              <div className="pj__links">
                <a href={p.live} target="_blank" rel="noreferrer">
                  Live demo <i>↗</i>
                </a>
                <a href={p.github} target="_blank" rel="noreferrer">
                  GitHub <i>↗</i>
                </a>
              </div>
            </div>
          </article>
        ))}

        <div className="pj__end" aria-hidden="true" />
      </div>

      <div className="pj__progress" aria-hidden="true">
        <span ref={barRef} />
      </div>
    </section>
  );
}
