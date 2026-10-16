import React, { useRef, useState } from "react";

/**
 * HoverPreview - words that show an image preview on hover.
 * Own implementation of the documented props (not the React Bits Pro source).
 *
 * content: "I'm {0}, and I like {1}."   targets: [{ text, imageUrl, linkUrl, altText }, ...]
 */

const POSITION = {
  above: {
    bottom: "100%",
    left: "50%",
    marginBottom: 12,
    base: "translateX(-50%)",
  },
  below: {
    top: "100%",
    left: "50%",
    marginTop: 12,
    base: "translateX(-50%)",
  },
  left: {
    right: "100%",
    top: "50%",
    marginRight: 12,
    base: "translateY(-50%)",
  },
  right: {
    left: "100%",
    top: "50%",
    marginLeft: 12,
    base: "translateY(-50%)",
  },
};

function Target({
  target,
  index,
  imagePosition,
  enterSpeed,
  exitSpeed,
  maxRotation,
  maxOffset,
  imageWidth,
  imageHeight,
  targetClassName,
  targetPadding,
  imageBorderRadius,
  showImageShadow,
  onTargetClick,
}) {
  const [open, setOpen] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0, r: 0 });
  const ref = useRef(null);

  const pos = POSITION[imagePosition] || POSITION.above;
  const { base, ...place } = pos;

  const onMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1; // -1 .. 1
    const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    const c = Math.max(-1, Math.min(1, nx));
    const cy = Math.max(-1, Math.min(1, ny));
    setTilt({ x: c * maxOffset, y: cy * maxOffset * 0.5, r: c * maxRotation });
  };

  const click = () => {
    if (onTargetClick) onTargetClick(target, index);
    else if (target.linkUrl) window.open(target.linkUrl, "_blank", "noopener");
  };

  return (
    <span
      ref={ref}
      className={targetClassName}
      tabIndex={0}
      role={target.linkUrl || onTargetClick ? "link" : undefined}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => {
        setOpen(false);
        setTilt({ x: 0, y: 0, r: 0 });
      }}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onMouseMove={onMove}
      onClick={click}
      style={{
        position: "relative",
        display: "inline-block",
        padding: targetPadding,
        margin: -targetPadding,
        cursor: target.linkUrl || onTargetClick ? "pointer" : "default",
        outline: "none",
      }}
    >
      {target.text}

      <span
        aria-hidden="true"
        style={{
          ...place,
          position: "absolute",
          zIndex: 20,
          width: imageWidth,
          height: imageHeight,
          pointerEvents: "none",
          opacity: open ? 1 : 0,
          transform: `${base} translate(${open ? tilt.x : 0}px, ${
            open ? tilt.y : 8
          }px) rotate(${open ? tilt.r : 0}deg) scale(${open ? 1 : 0.9})`,
          transition: open
            ? `opacity ${enterSpeed}s ease, transform ${enterSpeed}s cubic-bezier(.2,.8,.2,1)`
            : `opacity ${exitSpeed}s ease, transform ${exitSpeed}s ease`,
        }}
      >
        <img
          src={target.imageUrl}
          alt={target.altText || ""}
          draggable={false}
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            objectFit: "cover",
            borderRadius: imageBorderRadius,
            boxShadow: showImageShadow
              ? "0 18px 40px rgba(0,0,0,.55), 0 0 0 1px rgba(255,255,255,.1)"
              : "none",
            background: "#150a0d",
          }}
        />
      </span>
    </span>
  );
}

export default function HoverPreview({
  content = "",
  targets = [],
  onTargetClick,
  imagePosition = "above",
  enterSpeed = 0.2,
  exitSpeed = 0.15,
  maxRotation = 12,
  maxOffset = 15,
  imageWidth = 200,
  imageHeight = 200,
  className = "",
  targetClassName = "",
  targetPadding = 4,
  imageBorderRadius = "0.75rem",
  showImageShadow = true,
}) {
  const parts = String(content).split(/(\{\d+\})/g);

  return (
    <span className={className}>
      {parts.map((part, i) => {
        const m = part.match(/^\{(\d+)\}$/);
        if (!m) return <React.Fragment key={i}>{part}</React.Fragment>;
        const idx = Number(m[1]);
        const target = targets[idx];
        if (!target) return null;
        return (
          <Target
            key={i}
            target={target}
            index={idx}
            imagePosition={imagePosition}
            enterSpeed={enterSpeed}
            exitSpeed={exitSpeed}
            maxRotation={maxRotation}
            maxOffset={maxOffset}
            imageWidth={imageWidth}
            imageHeight={imageHeight}
            targetClassName={targetClassName}
            targetPadding={targetPadding}
            imageBorderRadius={imageBorderRadius}
            showImageShadow={showImageShadow}
            onTargetClick={onTargetClick}
          />
        );
      })}
    </span>
  );
}
