import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Projects from "../Projects/Projects.jsx";
import Skills from "../Skills/Skills.jsx";
import SectionHeading from "../SectionHeading/SectionHeading.jsx";
import Footer from "../Footer/Footer.jsx";
import About from "../About/About.jsx";
import ScrollPortal from "../ScrollPortal/ScrollPortal.jsx";
import Freelance from "../Freelance/Freelance.jsx";
import SignalType from "../SignalType/SignalType.jsx";

gsap.registerPlugin(ScrollTrigger);

const signalProps = {
  color: "#fff3f1",
  glowColor: "#ff5a4f",
  unlit: "outline",
  flickers: 3,
  stagger: 0.05,
  trigger: "view",
  instability: 0,
  loop: false,
  interference: 1,
};

export default function BelowFold() {
  useEffect(() => {
    const ctx = gsap.context(() => {
      /* Sections fade up when they come into view */
      gsap.utils
        .toArray(".pf-section:not(.pf-projects-wrapper)")
        .forEach((section) => {
          gsap.from(section, {
            y: 48,
            opacity: 0,
            duration: 0.9,
            ease: "power3.out",
            scrollTrigger: { trigger: section, start: "top 85%", once: true },
          });
        });
    });

    // The page just got much taller, so recalculate every scroll position
    ScrollTrigger.refresh();

    return () => ctx.revert();
  }, []);

  return (
    <>
      <About />

      <section className="pf-projects-wrapper">
        <Projects />
      </section>

      {/* Skills stays pinned while Freelance slides over it */}
      <ScrollPortal under={<Skills />} over={<Freelance />} />

      <section id="contact" className="pf-section">
        <SectionHeading
          label="Get in touch"
          title={
            <>
              <SignalType text="Let's build " as="span" {...signalProps} />
              <SignalType
                text="something."
                as="span"
                className="contact-signal-italic"
                {...signalProps}
              />
            </>
          }
          text="Open to full stack roles, internships and freelance."
        />

        <div className="pf-hero__actions">
          <a
            className="pf-btn pf-btn--solid"
            href="mailto:shivambhardwaj9910@gmail.com"
          >
            Email me
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
    </>
  );
}
