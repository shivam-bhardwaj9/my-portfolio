import "./SectionHeading.css";

/**
 * A heading block for a section: small label, big title, one short line.
 *
 * Usage:
 *   <SectionHeading
 *     label="Portfolio 2026"
 *     title="Selected Work"
 *     text="A few things I've designed and built. Keep scrolling →"
 *   />
 *
 * For a serif italic word, wrap it in <em>:
 *   <SectionHeading title={<>Skills &amp; <em>Stack</em></>} />
 */
export default function SectionHeading({ label, title, text }) {
  return (
    <header className="pf-head">
      {label && <span className="pf-head__label">{label}</span>}
      <h2>{title}</h2>
      {text && <p>{text}</p>}
    </header>
  );
}
