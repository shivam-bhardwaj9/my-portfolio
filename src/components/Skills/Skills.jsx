import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import SectionHeading from "../SectionHeading/SectionHeading.jsx";
import "./Skills.css";

gsap.registerPlugin(ScrollTrigger);

// Animation mode
//   LOOP = true  : cards and chips animate in, stay visible for LOOP_DELAY
//                  seconds, animate out, and repeat forever (pauses when the
//                  section is off screen)
//   LOOP = false : plays every time you scroll into the section
const LOOP = true;
const LOOP_DELAY = 3; // seconds the skills stay visible before the next loop

// Skills: edit these to match what you really use. Only list things you can
// talk about in an interview. A short honest list beats a long one.
const SKILLS = [
  {
    title: "Backend",
    items: ["Node.js", "Express", "REST APIs", "MongoDB"],
  },
  {
    title: "Frontend",
    items: ["React", "JavaScript", "HTML", "CSS"],
  },
  {
    title: "Tools & more",
    items: ["Python", "Git & GitHub", "Vercel", "Web design"],
  },
];

const ALL_SKILLS = SKILLS.flatMap((group) => group.items);

export default function Skills() {
  const sectionRef = useRef(null);

  // Red spotlight that follows the mouse inside a card
  const onCardMove = (e) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    card.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    card.style.setProperty("--my", `${e.clientY - rect.top}px`);
  };

  useEffect(() => {
    // gsap.context limits the selectors to this section and cleans up on unmount
    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray(".pf-skill-card");
      const chips = gsap.utils.toArray(".pf-chip");

      if (LOOP) {
        /* ---------- Endless loop: in -> wait -> out -> in -> ... ---------- */
        const tl = gsap.timeline({
          repeat: -1,
          scrollTrigger: {
            trigger: ".pf-skills__grid",
            start: "top 80%",
            // play when visible, pause when scrolled away, resume on return
            toggleActions: "play pause resume pause",
          },
        });

        tl.fromTo(
          cards,
          { y: 60, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.8, stagger: 0.12, ease: "power3.out" }
        )
          .fromTo(
            chips,
            { y: 16, opacity: 0, scale: 0.8 },
            { y: 0, opacity: 1, scale: 1, duration: 0.5, stagger: 0.07, ease: "back.out(1.7)" },
            0.35
          )
          // wait LOOP_DELAY seconds, then everything leaves
          .to(
            chips,
            { y: -10, opacity: 0, scale: 0.9, duration: 0.3, stagger: 0.03, ease: "power2.in" },
            `+=${LOOP_DELAY}`
          )
          .to(
            cards,
            { y: -30, opacity: 0, duration: 0.4, stagger: 0.08, ease: "power2.in" },
            "-=0.2"
          );
      } else {
        /* ---------- Replay every time the section is scrolled into view ---------- */
        const trigger = {
          trigger: ".pf-skills__grid",
          start: "top 80%",
          // enter: restart | leave: stay | enter back: restart | leave back: hide
          toggleActions: "restart none restart reset",
        };

        cards.forEach((card, i) => {
          gsap.from(card, {
            y: 60,
            opacity: 0,
            duration: 0.8,
            delay: i * 0.12,
            ease: "power3.out",
            scrollTrigger: trigger,
          });

          gsap.from(card.querySelectorAll(".pf-chip"), {
            y: 16,
            opacity: 0,
            scale: 0.8,
            duration: 0.5,
            stagger: 0.07,
            delay: 0.35 + i * 0.12,
            ease: "back.out(1.7)",
            scrollTrigger: trigger,
          });
        });
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section id="skills" className="pf-section pf-skills" ref={sectionRef}>
      <SectionHeading
        label="The Toolbox"
        title={
          <>
            Skills &amp; <em>Stack</em>
          </>
        }
        text="What I reach for when an idea has to become a working product."
      />

      <div className="pf-skills__grid">
        {SKILLS.map((group) => (
          <article
            key={group.title}
            className="pf-skill-card"
            onPointerMove={onCardMove}
          >
            <h3>{group.title}</h3>
            <ul>
              {group.items.map((item) => (
                <li key={item} className="pf-chip">
                  {item}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      {/* Endless scrolling strip of every skill (decorative) */}
      <div className="pf-marquee" aria-hidden="true">
        <div className="pf-marquee__track">
          {[...ALL_SKILLS, ...ALL_SKILLS].map((item, i) => (
            <span key={i}>{item}</span>
          ))}
        </div>
      </div>
    </section>
  );
}