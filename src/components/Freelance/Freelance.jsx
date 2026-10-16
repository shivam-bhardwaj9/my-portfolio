import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "./Freelance.css";
import SectionHeading from "../SectionHeading/SectionHeading.jsx";
import ServiceCarousel from "../ServiceCarousel/ServiceCarousel.jsx";
import FlameShader from "../FlameShader/FlameShader.jsx";

gsap.registerPlugin(ScrollTrigger);

/* ------------------------------------------------------------------ */
/* Edit your own text here                                             */
/* ------------------------------------------------------------------ */

// Put your real email here. The CTA button opens the visitor's mail app.
const EMAIL = "you@example.com";
const MAIL_SUBJECT = "Project enquiry";
const MAIL_BODY =
  "Hi Shivam,%0D%0A%0D%0AI'd like to talk about a project.%0D%0A%0D%0AWhat I need:%0D%0ADeadline:%0D%0ABudget (optional):";


const STATUS = "Available for new projects";

const icon = (children) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

// `color` tints the glow behind the carousel when that card is in the middle.
const SERVICES = [
  {
    n: "01",
    title: "Websites & landing pages",
    text: "Fast, responsive sites that look sharp.",
    tags: ["React", "GSAP", "CSS"],
    color: "#ff5a4f",
    icon: icon(
      <>
        <rect x="3" y="4" width="18" height="16" rx="2.5" />
        <path d="M3 9h18" />
        <path d="M7 6.5h.01M10 6.5h.01" />
        <path d="M8 14l-2 2 2 2M16 14l2 2-2 2M13 13l-2 6" />
      </>
    ),
  },
  {
    n: "02",
    title: "Full stack web apps",
    text: "Login, database and interface, built end to end.",
    tags: ["Node.js", "Express", "MongoDB"],
    color: "#ffa23d",
    icon: icon(
      <>
        <path d="M12 3L3 8l9 5 9-5-9-5z" />
        <path d="M3 12l9 5 9-5" />
        <path d="M3 16l9 5 9-5" />
      </>
    ),
  },
  {
    n: "03",
    title: "APIs & backend",
    text: "Clean REST APIs, auth and integrations.",
    tags: ["REST", "JWT", "Postman"],
    color: "#ff4f93",
    icon: icon(
      <>
        <rect x="3" y="4" width="18" height="6" rx="1.8" />
        <rect x="3" y="14" width="18" height="6" rx="1.8" />
        <path d="M7 7h.01M7 17h.01M12 10v4" />
      </>
    ),
  },
  {
    n: "04",
    title: "Fixes & improvements",
    text: "Bugs, slow pages or a tired design, cleaned up.",
    tags: ["Performance", "Refactor", "UI polish"],
    color: "#9b6bff",
    icon: icon(
      <>
        <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" />
        <path d="M19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2z" />
      </>
    ),
  },
];

// SAMPLE PRICES: replace with your own before publishing.
// `price` is the rupee amount shown by default, `usd` is shown on hover.
// "Custom" has no `usd`, so it stays as plain text.
// `featured` highlights a card.
const PRICING = [
  {
    name: "Landing page",
    price: "₹8,000",
    usd: "$96",
    note: "starting at",
    features: ["1 responsive page", "Scroll animations", "Contact form"],
    full: [
      "1 page, fully responsive",
      "Smooth scroll animations",
      "Contact form",
      "Delivery in 5 to 7 days",
    ],
  },
  {
    name: "Full website",
    price: "₹20,000",
    usd: "$240",
    note: "starting at",
    featured: true,
    features: ["Up to 5 pages", "SEO and fast loading", "Deployment included"],
    full: [
      "Up to 5 pages",
      "SEO basics and fast loading",
      "Deployment and domain setup",
      "2 rounds of revisions",
    ],
  },
  {
    name: "Web app",
    price: "Custom",
    note: "quoted per project",
    features: ["Login, database and API", "Admin dashboard", "30 days of support"],
    full: [
      "Login, database and API",
      "Admin or dashboard",
      "Deployment and handover",
      "30 days of support",
    ],
  },
];

const STEPS = [
  { title: "Discuss" },
  { title: "Plan" },
  { title: "Build" },
  { title: "Launch" },
];

// Shows rupees by default, dollars while hovered (tap toggles on phones).
// Both prices stay in the DOM; CSS rolls one out and the other in.
function Price({ inr, usd }) {
  const [hovered, setHovered] = useState(false);

  // No dollar version (e.g. "Custom"): plain text
  if (!usd) return <strong>{inr}</strong>;

  return (
    <strong
      className={`fl-price__value ${hovered ? "is-usd" : ""}`}
      title="Hover for USD"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={(e) => {
        e.stopPropagation(); // do not open the popup, only switch currency
        setHovered((h) => !h);
      }}
    >
      <span className="fl-price__inr" aria-hidden={hovered}>
        {inr}
      </span>
      <span className="fl-price__usd" aria-hidden={!hovered}>
        {usd}
      </span>
    </strong>
  );
}

export default function Freelance() {
  const ref = useRef(null);
  const [openCard, setOpenCard] = useState(null); // index of the open rate card
  const [hoverCard, setHoverCard] = useState(null); // card under the mouse (gets the flame)

  // Popup: Esc closes it, and the page behind stops scrolling
  useEffect(() => {
    if (openCard === null) return;
    const onKey = (e) => e.key === "Escape" && setOpenCard(null);
    window.addEventListener("keydown", onKey);
    const prevHtml = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, [openCard]);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const ctx = gsap.context(() => {
      gsap.from(".sc", {
        y: 50,
        opacity: 0,
        duration: 0.9,
        ease: "power3.out",
        scrollTrigger: { trigger: ".sc", start: "top 88%", once: true },
      });

      gsap.from(".fl-step", {
        y: 28,
        opacity: 0,
        duration: 0.7,
        ease: "power3.out",
        stagger: 0.12,
        scrollTrigger: { trigger: ".fl-steps", start: "top 88%", once: true },
      });

      // Pricing cards rise out from behind the CTA card
      gsap.from(".fl-price", {
        y: 190,
        opacity: 0,
        duration: 1,
        ease: "power3.out",
        stagger: 0.12,
        scrollTrigger: { trigger: ".fl-stack", start: "top 80%", once: true },
      });

      gsap.from(".fl-cta", {
        y: 40,
        opacity: 0,
        scale: 0.97,
        duration: 0.9,
        ease: "power3.out",
        scrollTrigger: { trigger: ".fl-cta", start: "top 90%", once: true },
      });
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section id="freelance" className="pf-section fl" ref={ref}>
      <SectionHeading
        label="Freelance"
        title={
          <>
            Have a project? <em>Let&apos;s build it.</em>
          </>
        }
        text="For startups, small businesses and creators."
      />

      <p className="fl-status">
        <span className="fl-status__dot" aria-hidden="true" />
        {STATUS}
      </p>

      {/* What I can do: draggable 3D carousel */}
      <ServiceCarousel items={SERVICES} label="Freelance services" />

      {/* How it works */}
      <div className="fl-process">
        <h3 className="fl-process__title">How we&apos;ll work together</h3>
        <ol className="fl-steps">
          {STEPS.map((s, i) => (
            <li className="fl-step" key={s.title}>
              <span className="fl-step__i">{i + 1}</span>
              <h4>{s.title}</h4>
            </li>
          ))}
        </ol>
      </div>

      {/* Pricing cards sit behind the CTA card */}
      <div className="fl-stack">
        <div className="fl-prices">
          {PRICING.map((c, i) => (
            <article
              className={`fl-price ${c.featured ? "is-featured" : ""}`}
              style={{ "--i": i }}
              key={c.name}
              role="button"
              tabIndex={0}
              aria-label={`${c.name}: open full details`}
              onClick={() => setOpenCard(i)}
              onMouseEnter={() => setHoverCard(i)}
              onMouseLeave={() => setHoverCard(null)}
              onMouseMove={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
                e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setOpenCard(i);
                }
              }}
            >
              {hoverCard === i && (
                <FlameShader
                  className="fl-flame fl-flame--card"
                  edge="top"
                  boost={0.85}
                />
              )}
              {c.featured && <span className="fl-price__badge">Most popular</span>}
              <span className="fl-price__open" aria-hidden="true">↗</span>
              <h4 className="fl-price__name">{c.name}</h4>
              <p className="fl-price__amount">
                <span className="fl-price__note">{c.note}</span>
                <Price inr={c.price} usd={c.usd} />
              </p>
              <ul className="fl-price__list">
                {c.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>

      {/* CTA */}
      <div className="fl-cta">
        <span className="fl-cta__glow" aria-hidden="true" />
        <h3 className="fl-cta__title">
          Have a project in <em>mind?</em>
        </h3>
        <p className="fl-cta__text">
          Tell me what you&apos;re building and I&apos;ll reply with a clear quote.
        </p>

        <div className="pf-hero__actions fl-cta__actions">
          <a
            className="pf-btn pf-btn--solid"
            href={`mailto:${EMAIL}?subject=${encodeURIComponent(
              MAIL_SUBJECT
            )}&body=${MAIL_BODY}`}
          >
            Start a project
          </a>
          <a className="pf-btn" href="#projects">
            See my work
          </a>
        </div>
      </div>
      </div>

      {/* Full-screen rate card popup (rendered inside .pf so it gets the theme colours) */}
      {openCard !== null &&
        (() => {
          const card = PRICING[openCard];
          const isCustom = !card.usd;
          return createPortal(
            <div
              className="fl-modal"
              role="dialog"
              aria-modal="true"
              aria-label={card.name}
              onClick={() => setOpenCard(null)}
            >
              <div
                className="fl-modal__panel"
                onClick={(e) => e.stopPropagation()}
              >
                <FlameShader className="fl-flame fl-flame--modal" />
                <button
                  type="button"
                  className="fl-modal__close"
                  aria-label="Close"
                  autoFocus
                  onClick={() => setOpenCard(null)}
                >
                  ×
                </button>

                <div className="fl-modal__scroll" data-lenis-prevent>
                <div className="fl-modal__head">
                  {card.featured && (
                    <span className="fl-modal__badge">Most popular</span>
                  )}
                  <h3 className="fl-modal__name">{card.name}</h3>
                  <p className="fl-modal__note">{card.note}</p>
                  <p className="fl-modal__price">
                    {isCustom ? (
                      <strong>Let&apos;s talk</strong>
                    ) : (
                      <>
                        <strong>{card.price}</strong>
                        <span className="fl-modal__usd">{card.usd}</span>
                      </>
                    )}
                  </p>
                </div>

                <div className="fl-modal__body">
                  <h4 className="fl-modal__sub">What&apos;s included</h4>
                  <ul className="fl-modal__list">
                    {card.full.map((f, n) => (
                      <li key={f} style={{ "--n": n }}>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="fl-modal__actions">
                  <a
                    className="pf-btn pf-btn--solid"
                    href={`mailto:${EMAIL}?subject=${encodeURIComponent(
                      `${MAIL_SUBJECT}: ${card.name}`
                    )}&body=${MAIL_BODY}`}
                  >
                    {isCustom ? "Get a quote" : "Start a project"}
                  </a>
                  <button
                    type="button"
                    className="pf-btn"
                    onClick={() => setOpenCard(null)}
                  >
                    Close
                  </button>
                </div>
                </div>
              </div>
            </div>,
            ref.current?.closest(".pf") || document.body
          );
        })()}
    </section>
  );
}