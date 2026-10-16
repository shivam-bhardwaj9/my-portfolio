import React, { useEffect, useRef, useState } from "react";
import "./Navbar.css";

export default function Navbar({ name = "Shivam.", logo, logoAlt = "", links, cta }) {
  const items = links || [];
  const [active, setActive] = useState("");
  const [hidden, setHidden] = useState(false);
  const [compact, setCompact] = useState(false);
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const listRef = useRef(null);
  const indicatorRef = useRef(null);
  const linkRefs = useRef({});
  const openRef = useRef(false);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  /* Scroll: shrink after the top, hide when scrolling down, show when
     scrolling up, and work out which section is currently in view. */
  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;
    const update = () => {
      ticking = false;
      const y = window.scrollY;
      setCompact(y > 40);
      if (!openRef.current) {
        if (y > lastY + 6 && y > 240) setHidden(true);
        else if (y < lastY - 6 || y < 120) setHidden(false);
      }
      lastY = y;
      const probe = y + window.innerHeight * 0.35;
      let current = "";
      items.forEach((l) => {
        const el = document.querySelector(l.href);
        if (el && el.getBoundingClientRect().top + y <= probe) current = l.href;
      });
      setActive(current);
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    const first = requestAnimationFrame(update);
    return () => {
      cancelAnimationFrame(first);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [items]);

  /* Sliding highlight behind the active link (DOM only, no extra state) */
  useEffect(() => {
    const ind = indicatorRef.current;
    const list = listRef.current;
    if (!ind || !list) return undefined;
    const place = () => {
      const el = linkRefs.current[active];
      if (!el) {
        ind.style.opacity = "0";
        return;
      }
      ind.style.opacity = "1";
      ind.style.width = el.offsetWidth + "px";
      ind.style.transform = "translateX(" + el.offsetLeft + "px)";
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(list);
    return () => ro.disconnect();
  }, [active]);

  /* Mobile menu: close on Escape or a click outside */
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  const cls = ["fn", hidden && !open ? "fn--hidden" : "", compact ? "fn--compact" : "", open ? "fn--open" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cls} ref={rootRef}>
      <div className="fn__bar">
        <a className="fn__brand" href="#home" onClick={() => setOpen(false)}>
          {logo && <img className="fn__logo" src={logo} alt={logoAlt} />}
          <span className="fn__name">{name}</span>
        </a>

        <nav className="fn__links" aria-label="Main" ref={listRef}>
          <span className="fn__indicator" ref={indicatorRef} aria-hidden="true" />
          {items.map((l) => (
            <a
              key={l.href}
              href={l.href}
              ref={(el) => {
                linkRefs.current[l.href] = el;
              }}
              className={"fn__link" + (active === l.href ? " is-active" : "")}
              aria-current={active === l.href ? "true" : undefined}
            >
              {l.label}
            </a>
          ))}
        </nav>

        
{cta && (
  <a
    className="fn__cta"
    href={cta.href}
    download="Shivam_Bhardwaj_Resume.pdf"
  >
    {cta.label}
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
      <path
        d="M7 17L17 7M9 7h8v8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </a>
)}


        <button
          type="button"
          className="fn__burger"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="fn-menu"
          onClick={() => setOpen((o) => !o)}
        >
          <span />
          <span />
        </button>
      </div>

      <div id="fn-menu" className="fn__menu" onClick={() => setOpen(false)}>
        {items.map((l) => (
          <a key={l.href} href={l.href} className={"fn__menu-link" + (active === l.href ? " is-active" : "")}>
            {l.label}
          </a>
        ))}
        {cta && (
          <a className="fn__cta fn__cta--menu" href={cta.href} target="_blank" rel="noreferrer">
            {cta.label}
          </a>
        )}
      </div>
    </div>
  );
}
