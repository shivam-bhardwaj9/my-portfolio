import { useEffect, useState } from "react";
import "./SignatureLoader.css";

const LETTER_DELAY = 0.28; // seconds between each letter starting
const DRAW_TIME = 1.0;     // seconds each letter takes to be written

export default function SignatureLoader({
  name = "Shivam", // <-- put your name here, or pass <SignatureLoader name="..." />
  onDone,
}) {
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);

  const letters = Array.from(name);
  // time until the last letter and the underline are finished
  const writeTime = letters.length * LETTER_DELAY + DRAW_TIME + 0.9;

  useEffect(() => {
    document.body.style.overflow = "hidden";

    let pageLoaded = document.readyState === "complete";
    let timeUp = false;
    const check = () => {
      if (pageLoaded && timeUp) setLeaving(true);
    };
    const onLoad = () => {
      pageLoaded = true;
      check();
    };
    window.addEventListener("load", onLoad);

    // wait until the name is fully written, plus a short pause
    const t = setTimeout(() => {
      timeUp = true;
      check();
    }, (writeTime + 0.5) * 1000);

    return () => {
      clearTimeout(t);
      window.removeEventListener("load", onLoad);
    };
  }, [writeTime]);

  useEffect(() => {
    if (!leaving) return;
    const t = setTimeout(() => {
      document.body.style.overflow = "";
      setGone(true);
      onDone && onDone(); // start your hero animation here
    }, 900);
    return () => clearTimeout(t);
  }, [leaving, onDone]);

  if (gone) return null;

  return (
    <div className={`sig ${leaving ? "sig--leave" : ""}`}>
      <svg
        className="sig__svg"
        viewBox="0 0 900 260"
        role="img"
        aria-label={name}
      >
        <text className="sig__text" x="450" y="150" textAnchor="middle">
          {letters.map((ch, i) => (
            <tspan
              key={i}
              className="sig__letter"
              style={{ "--d": `${i * LETTER_DELAY}s` }}
            >
              {ch === " " ? "\u00A0" : ch}
            </tspan>
          ))}
        </text>

        {/* pen flourish under the name, drawn after the last letter */}
        <path
          className="sig__line"
          pathLength="1"
          d="M120 200 C 300 225, 560 175, 790 205"
          style={{ "--d": `${letters.length * LETTER_DELAY + 0.3}s` }}
        />
      </svg>
    </div>
  );
}
