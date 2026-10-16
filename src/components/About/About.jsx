import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "./About.css";
import SectionHeading from "../SectionHeading/SectionHeading.jsx";
import Character from "../Character/Character.jsx";
import HoverPreview from "../HoverPreview/HoverPreview.jsx";
import mePhoto from "../../assets/me.png";
// Save your book photo as src/assets/hello_5.png (or change this path)
import readingPhoto from "../../assets/hero.png";
gsap.registerPlugin(ScrollTrigger);

/* ------------------------------------------------------------------ */
/* Edit your own text here                                             */
/* ------------------------------------------------------------------ */
// {0}, {1} ... are words that show a photo on hover (see `targets`).
const BIO = [
  {
    content:
      "I'm {0}, a full stack developer who enjoys taking an idea all the way from an empty database to a polished interface people actually like using.",
    targets: [{ text: "Shivam", imageUrl: mePhoto, altText: "Shivam" }],
  },
  {
    content:
      "I work mostly with Node.js and React, and I care about clean APIs, fast pages and small details like smooth scrolling and thoughtful animation.",
    targets: [],
  },
  {
    content:
      "When I'm not building, I'm learning something new, {0}, or tweaking this portfolio a little more.",
    targets: [
      {
        text: "reading other people's code",
        imageUrl: readingPhoto,
        altText: "Shivam reading a book",
      },
    ],
  },
];

// `value` counts up from 0. `suffix` is shown after the number.
const STATS = [
  { value: 10, suffix: "+", label: "Projects built" },
  { value: 2, suffix: "+", label: "Years learning" },
  { value: 15, suffix: "+", label: "Technologies" },
];

const DOES = [
  {
    title: "Frontend",
    text: "Responsive, animated interfaces with React, GSAP and modern CSS.",
  },
  {
    title: "Backend",
    text: "REST APIs, authentication and databases with Node.js and Express.",
  },
  {
    title: "Full stack",
    text: "Shipping complete features end to end, then deploying them.",
  },
];

const FACTS = [
  { k: "Based in", v: "India" },
  { k: "Focus", v: "Full stack web" },
  { k: "Status", v: "Open to work" },
];

export default function About() {
  const ref = useRef(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const ctx = gsap.context(() => {
      // Count-up numbers
      gsap.utils.toArray(".ab-stat__num").forEach((el) => {
        const end = Number(el.dataset.value);
        const counter = { n: 0 };
        gsap.to(counter, {
          n: end,
          duration: 1.6,
          ease: "power2.out",
          onUpdate: () => {
            el.textContent = Math.round(counter.n);
          },
          scrollTrigger: { trigger: el, start: "top 90%", once: true },
        });
      });

      // Cards stagger in
      gsap.from(".ab-card", {
        y: 36,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out",
        stagger: 0.12,
        scrollTrigger: { trigger: ".ab-cards", start: "top 85%", once: true },
      });

      // Soft parallax on the photo
      gsap.to(".ab-photo", {
        yPercent: -6,
        ease: "none",
        scrollTrigger: {
          trigger: ".ab-photo",
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      });
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section id="about" className="pf-section pf-about ab" ref={ref}>
      <SectionHeading
        label="About me"
        title={
          <>
            Code with <em>care.</em>
          </>
        }
        text="A bit about who I am and what I do."
      />

      <div className="ab-grid">
        {/* Left: photo + quick facts */}
        <div className="ab-side">
          <div className="ab-photo">
            <span className="ab-photo__glow" aria-hidden="true" />
            <Character />
          </div>

          <ul className="ab-facts">
            {FACTS.map((f) => (
              <li key={f.k}>
                <span>{f.k}</span>
                <strong>{f.v}</strong>
              </li>
            ))}
          </ul>
        </div>

        {/* Right: bio + stats + what I do */}
        <div className="ab-main">
          <div className="ab-bio">
            {BIO.map((p, i) => (
              <p key={i}>
                <HoverPreview
                  content={p.content}
                  targets={p.targets}
                  imagePosition="above"
                  imageWidth={190}
                  imageHeight={230}
                  maxRotation={10}
                  maxOffset={14}
                  targetClassName="ab-hover"
                />
              </p>
            ))}
          </div>

          <div className="ab-stats">
            {STATS.map((s) => (
              <div className="ab-stat" key={s.label}>
                <div className="ab-stat__value">
                  <span className="ab-stat__num" data-value={s.value}>
                    0
                  </span>
                  <span className="ab-stat__suffix">{s.suffix}</span>
                </div>
                <div className="ab-stat__label">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="ab-cards">
            {DOES.map((d) => (
              <article className="ab-card" key={d.title}>
                <h3>{d.title}</h3>
                <p>{d.text}</p>
              </article>
            ))}
          </div>

          <div className="pf-hero__actions ab-actions">
            <a className="pf-btn pf-btn--solid" href="#projects">
              See my work
            </a>
            <a className="pf-btn" href="#contact">
              Get in touch
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}