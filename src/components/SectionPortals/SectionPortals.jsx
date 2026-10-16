import React from "react";
import ScrollPortal from "../ScrollPortal/ScrollPortal.jsx";

/* ------------------------------------------------------------------ */
/* Edit the text and colours of the portal here               */
/* ------------------------------------------------------------------ */

const ACCENT = "rgba(255, 90, 79, 0.45)";

const BG = {
  deep: "linear-gradient(160deg, #1d0a10 0%, #0b0507 100%)",
  ember: "radial-gradient(circle at 50% 110%, #5c0d1a 0%, #14060a 65%)",
  glow: "radial-gradient(circle at 50% 120%, #b3162b 0%, #3a0912 45%, #0b0507 80%)",
};

// Text for the ring around the next frame (top and bottom), or the centre
// of the last frame.
function Scene({ eyebrow, title, text, last }) {
  if (last) {
    return (
      <div className="sp-scene sp-scene--last">
        <p className="sp-scene__eyebrow">{eyebrow}</p>
        <h2 className="sp-scene__title">{title}</h2>
        {text && <p className="sp-scene__text">{text}</p>}
      </div>
    );
  }
  return (
    <>
      <div className="sp-scene sp-scene--top">
        <p className="sp-scene__eyebrow">{eyebrow}</p>
        <h2 className="sp-scene__title">{title}</h2>
      </div>
      <div className="sp-scene sp-scene--bottom">
        <p className="sp-scene__text">{text}</p>
      </div>
    </>
  );
}

/* The one portal section, placed after Skills */
export function SkillsPortal() {
  return (
    <ScrollPortal
      accent={ACCENT}
      scrollLength={0.8}
      scenes={[
        {
          background: BG.deep,
          content: (
            <Scene
              eyebrow="The toolkit"
              title="Sharp tools."
              text="React · Node.js · Express · MongoDB · GSAP"
            />
          ),
        },
        {
          background: BG.ember,
          content: (
            <Scene
              eyebrow="The process"
              title="Idea to production."
              text="Plan, build, ship, repeat."
            />
          ),
        },
        {
          background: BG.glow,
          content: (
            <Scene
              last
              eyebrow="Your turn"
              title={<>Let's <em>talk.</em></>}
            />
          ),
        },
      ]}
    />
  );
}