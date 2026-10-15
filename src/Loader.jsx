import { useEffect, useState } from "react";
import "./Loader.css";

const MIN_TIME = 1800; // shortest time the loader stays (ms)

export default function Loader({ onDone }) {
  const [progress, setProgress] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    // lock scrolling while loading
    document.body.style.overflow = "hidden";

    const start = performance.now();
    let pageLoaded = document.readyState === "complete";
    const onLoad = () => (pageLoaded = true);
    window.addEventListener("load", onLoad);

    let raf;
    const tick = (now) => {
      const t = Math.min((now - start) / MIN_TIME, 1);
      // ease out, and hold at 90% until the page has really loaded
      const eased = 1 - Math.pow(1 - t, 3);
      const target = pageLoaded ? 100 : Math.min(eased * 100, 90);
      setProgress((p) => Math.max(p, Math.round(Math.min(target, p + 2))));

      if (pageLoaded && t >= 1) {
        setProgress(100);
        setLeaving(true);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("load", onLoad);
    };
  }, []);

  useEffect(() => {
    if (!leaving) return;
    const t = setTimeout(() => {
      document.body.style.overflow = "";
      setGone(true);
      onDone && onDone(); // start your hero animations here
    }, 900);
    return () => clearTimeout(t);
  }, [leaving, onDone]);

  if (gone) return null;

  return (
    <div className={`loader ${leaving ? "loader--leave" : ""}`}>
      <div className="loader__center">
        <div className="loader__ring" />
        <div className="loader__count">{progress}%</div>
        <div className="loader__text">Loading portfolio</div>
      </div>
      <div className="loader__bar">
        <span style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
