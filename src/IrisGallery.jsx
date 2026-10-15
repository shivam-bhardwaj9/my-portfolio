import React, { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import "./index.css";

/* ------------------------------------------------------------------ */
/* Default images                                                      */
/* ------------------------------------------------------------------ */
const DEFAULT_ITEMS = [
  { src: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=700&auto=format&fit=crop", alt: "Portrait", title: "Ethereal", subtitle: "Portrait" },
  { src: "https://images.unsplash.com/photo-1511818966892-d7d671e672a2?w=700&auto=format&fit=crop", alt: "Architecture", title: "Architecture", subtitle: "Structure" },
  { src: "https://images.unsplash.com/photo-1490312278390-ab64016e0aa9?w=700&auto=format&fit=crop", alt: "Still life", title: "Still Life", subtitle: "Objects" },
  { src: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=700&auto=format&fit=crop", alt: "Wild earth", title: "Wild Earth", subtitle: "Nature" },
  { src: "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=700&auto=format&fit=crop", alt: "Blue hour", title: "Blue Hour", subtitle: "Landscape" },
  { src: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=700&auto=format&fit=crop", alt: "Form study", title: "Form Study", subtitle: "Art" },
  { src: "https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=700&auto=format&fit=crop", alt: "The city", title: "The City", subtitle: "Urban" },
  { src: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=700&auto=format&fit=crop", alt: "Soft focus", title: "Soft Focus", subtitle: "Editorial" },
  { src: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=700&auto=format&fit=crop", alt: "Beyond", title: "Beyond", subtitle: "Travel" },
  { src: "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=700&auto=format&fit=crop", alt: "Golden", title: "Golden", subtitle: "Light" },
];

/* ------------------------------------------------------------------ */
/* Small math helpers                                                  */
/* ------------------------------------------------------------------ */
const TAU = Math.PI * 2;
const { lerp, damp, clamp } = THREE.MathUtils;

// Wrap any angle into the range (-PI, PI]
const wrap = (a) => ((((a + Math.PI) % TAU) + TAU) % TAU) - Math.PI;

// Ease in/out for 0..1
const smooth = (x) => x * x * (3 - 2 * x);

// A flat card with rounded corners. ShapeGeometry gives us the outline,
// then we rewrite the UVs so the photo still maps 0..1 across the card.
function createRoundedGeometry(w, h, r) {
  const hw = w / 2;
  const hh = h / 2;
  const rad = Math.min(r, hw, hh);

  const shape = new THREE.Shape();
  shape.moveTo(-hw + rad, -hh);
  shape.lineTo(hw - rad, -hh);
  shape.absarc(hw - rad, -hh + rad, rad, -Math.PI / 2, 0, false);
  shape.lineTo(hw, hh - rad);
  shape.absarc(hw - rad, hh - rad, rad, 0, Math.PI / 2, false);
  shape.lineTo(-hw + rad, hh);
  shape.absarc(-hw + rad, hh - rad, rad, Math.PI / 2, Math.PI, false);
  shape.lineTo(-hw, -hh + rad);
  shape.absarc(-hw + rad, -hh + rad, rad, Math.PI, Math.PI * 1.5, false);

  const geometry = new THREE.ShapeGeometry(shape, 12);
  const pos = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, pos.getX(i) / w + 0.5, pos.getY(i) / h + 0.5);
  }
  uv.needsUpdate = true;
  return geometry;
}

/* ------------------------------------------------------------------ */
/* The 3D ring                                                         */
/* ------------------------------------------------------------------ */
function Ring({
  items,
  count,
  mode,
  interval,
  hold,
  morphDuration,
  stagger,
  speed,
  fin,
  pupil,
  aspect,
  radius,
  depth,
  shade,
  motion,
  selected,
  onSelect,
  focusOnClick,
}) {
  const { viewport } = useThree();

  const cardRefs = useRef([]);
  const matRefs = useRef([]);
  const hoverRef = useRef(-1);
  const lift = useRef(new Float32Array(96)); // hover lift per card
  const focus = useRef(new Float32Array(96)); // "flying into the pupil" per card
  const sim = useRef({
    s: mode === "iris" ? 1 : 0, // 0 = gallery, 1 = iris (global progress)
    target: mode === "iris" ? 1 : 0,
    cycle: 0, // seconds spent in the current state
  });

  /* ---------- Textures (loaded once per image list) ---------- */
  const srcKey = items.map((i) => i.src).join("|");
  const textures = useMemo(() => {
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");

    return items.map((item) => {
      const tex = loader.load(item.src, (t) => {
        // "object-fit: cover" for the texture
        const imgAspect = t.image.width / t.image.height;
        if (imgAspect > aspect) {
          t.repeat.x = aspect / imgAspect;
          t.offset.x = (1 - t.repeat.x) / 2;
        } else {
          t.repeat.y = imgAspect / aspect;
          t.offset.y = (1 - t.repeat.y) / 2;
        }
        t.needsUpdate = true;
      });
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [srcKey, aspect]);

  useEffect(() => {
    return () => textures.forEach((t) => t.dispose());
  }, [textures]);

  useEffect(() => {
    return () => {
      document.body.style.cursor = "";
    };
  }, []);

  /* ---------- Sizes that adapt to the canvas ---------- */
  const unit = Math.min(viewport.width, viewport.height);
  const irisOuter = unit * 0.44; // outer radius of the iris
  const pupilR = irisOuter * pupil; // hole in the middle
  const cardH = irisOuter - pupilR; // blade length = ring thickness
  const cardW = cardH * aspect;

  // Rounded card shape, rebuilt only when the size or radius changes
  const geometry = useMemo(
    () => createRoundedGeometry(cardW, cardH, cardW * radius),
    [cardW, cardH, radius]
  );
  useEffect(() => () => geometry.dispose(), [geometry]);

  const irisR = pupilR + cardH / 2; // radius of blade centres

  const ellipseRy = Math.max(viewport.height * 0.5 - cardH * 0.75, cardH * 0.6);
  const ellipseRx = Math.max(viewport.width * 0.5 - cardW * 0.75, cardW * 0.8);

  const finRad = (fin * Math.PI) / 180;

  // Blades are tilted, so they look thinner. Widen them to keep them overlapping.
  const spacingAtCentre = (TAU * irisR) / count;
  const widen = Math.max(1, (spacingAtCentre * 1.25) / (cardW * Math.cos(finRad)));

  // Opened photo fills the pupil
  const focusScale = (pupilR * 2.1) / cardH;

  /* ---------- Animation loop ---------- */
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const st = sim.current;
    const m = motion.current;
    const focused = selected !== null;
    const hovering = hoverRef.current !== -1;

    // 1) Decide which state we are heading to
    if (mode === "cycle") {
      if (!focused && !hovering) {
        st.cycle += dt;
        if (st.target === 0 && st.cycle > interval) {
          st.target = 1;
          st.cycle = 0;
        } else if (st.target === 1 && st.cycle > hold) {
          st.target = 0;
          st.cycle = 0;
        }
      }
    } else {
      st.target = mode === "iris" ? 1 : 0;
    }
    const goal = focused ? 1 : st.target;

    // 2) Move the global progress toward the goal at a constant rate
    const step = dt / Math.max(morphDuration, 0.01);
    st.s += clamp(goal - st.s, -step, step);

    // 3) Turn the ring (auto-spin + drag/wheel inertia)
    if (!m.dragging) {
      m.speedMul = damp(m.speedMul, focused || hovering ? 0 : 1, 4, dt);
      m.offset += ((speed * Math.PI) / 180) * m.speedMul * dt + m.vel * dt;
      m.vel = damp(m.vel, 0, 2.5, dt);
    }

    // 4) Place every card
    for (let i = 0; i < count; i++) {
      const card = cardRefs.current[i];
      if (!card) continue;

      const a = (i / count) * TAU + m.offset; // angle of this card (0 = top)
      const aw = wrap(a);
      const sinA = Math.sin(a);
      const cosA = Math.cos(a);

      // Per-card morph value. Cards near the top turn first, the wave
      // travels down both sides of the ring.
      const dist = Math.abs(aw) / Math.PI; // 0 at the top, 1 at the bottom
      const local = clamp(st.s * (1 + stagger) - dist * stagger, 0, 1);
      const k = smooth(local);

      // Gallery pose: upright cards on an oval, bottom cards nearer the camera
      const gx = sinA * ellipseRx;
      const gy = cosA * ellipseRy;
      const gz = -cosA * depth * unit * 0.15;

      // Iris pose: cards on a circle
      const ix = sinA * irisR;
      const iy = cosA * irisR;

      let x = lerp(gx, ix, k);
      let y = lerp(gy, iy, k);
      let z = lerp(gz, 0, k) + i * 0.002; // tiny offset avoids z-fighting

      // Rotation: in the iris the card's long axis points away from the centre
      // (rotation Z), then it is tilted around that axis (rotation Y) = blade.
      let rz = -aw * k;
      let ry = finRad * k + -sinA * 0.35 * (1 - k);

      let sx = lerp(1, widen, k);
      let sy = 1;

      // Hover lift (gallery state only)
      const wantLift =
        hoverRef.current === i && selected === null && st.s < 0.5 ? 1 : 0;
      lift.current[i] = damp(lift.current[i], wantLift, 8, dt);
      z += lift.current[i] * unit * 0.12;
      sx *= 1 + lift.current[i] * 0.06;
      sy *= 1 + lift.current[i] * 0.06;

      // Focus: the clicked card flies to the middle of the iris
      focus.current[i] = damp(focus.current[i], selected === i ? 1 : 0, 4, dt);
      const f = focus.current[i];
      if (f > 0.001) {
        x = lerp(x, 0, f);
        y = lerp(y, 0, f);
        z = lerp(z, unit * 0.1, f);
        rz = lerp(rz, 0, f);
        ry = lerp(ry, 0, f);
        sx = lerp(sx, focusScale, f);
        sy = lerp(sy, focusScale, f);
      }

      card.position.set(x, y, z);
      card.rotation.set(0, ry, rz, "ZYX");
      card.scale.set(sx, sy, 1);

      // Light comes from the top-left; blades facing away get darker
      const mat = matRefs.current[i];
      if (mat) {
        let b = 1 - shade * k * (0.5 - 0.5 * Math.cos(aw + Math.PI / 4));
        b = lerp(b, 1, f);
        mat.color.setScalar(b);
      }
    }
  });

  return (
    <group>
      {Array.from({ length: count }, (_, i) => {
        const tex = textures[i % items.length];
        return (
          <group
            key={i}
            ref={(el) => (cardRefs.current[i] = el)}
            onClick={(e) => {
              e.stopPropagation();
              if (!focusOnClick || e.delta > 6) return; // ignore drags
              onSelect(selected === i ? null : i);
            }}
            onPointerOver={(e) => {
              e.stopPropagation();
              hoverRef.current = i;
              document.body.style.cursor = focusOnClick ? "pointer" : "";
            }}
            onPointerOut={() => {
              if (hoverRef.current === i) hoverRef.current = -1;
              document.body.style.cursor = "";
            }}
          >
            <mesh>
              <primitive object={geometry} attach="geometry" />
              <meshBasicMaterial
                ref={(el) => (matRefs.current[i] = el)}
                map={tex}
                side={THREE.DoubleSide}
                toneMapped={false}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Public component                                                    */
/* ------------------------------------------------------------------ */
export default function IrisGallery({
  items = DEFAULT_ITEMS,
  count = 24,
  mode = "cycle", // "cycle" | "gallery" | "iris"
  interval = 6, // seconds as gallery (cycle mode)
  hold = 4, // seconds as iris (cycle mode)
  morphDuration = 1.8,
  stagger = 0.7,
  speed = 6, // degrees per second
  fin = 60, // blade tilt in degrees
  pupil = 0.52, // pupil size as a fraction of the iris
  cardAspect = 0.78, // width / height
  radius = 0.18, // corner rounding as a fraction of card width (0 = square)
  depth = 1,
  shade = 0.6,
  focusOnClick = true,
  captions = true,
  draggable = true,
  wheel = true,
  backgroundColor = "transparent",
  className = "",
  children,
}) {
  const safeCount = clamp(Math.round(count), 3, 96);
  const [selected, setSelected] = useState(null);

  // Rotation state lives in a ref: it changes every frame, no re-renders wanted
  const motion = useRef({ offset: 0, vel: 0, dragging: false, speedMul: 1 });
  const drag = useRef({ x: 0, t: 0 });
  const rootRef = useRef(null);

  // Escape closes the opened photo
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setSelected(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Wheel turns the ring (only while the pointer is over the gallery)
  useEffect(() => {
    const el = rootRef.current;
    if (!el || !wheel) return;
    const onWheel = (e) => {
      motion.current.vel = clamp(motion.current.vel + e.deltaY * 0.004, -6, 6);
    };
    el.addEventListener("wheel", onWheel, { passive: true });
    return () => el.removeEventListener("wheel", onWheel);
  }, [wheel]);

  /* ---------- Drag with inertia ---------- */
  const onPointerDown = (e) => {
    if (!draggable) return;
    motion.current.dragging = true;
    drag.current = { x: e.clientX, t: performance.now() };
  };

  const onPointerMove = (e) => {
    if (!motion.current.dragging) return;
    const now = performance.now();
    const dx = e.clientX - drag.current.x;
    const dtSec = Math.max((now - drag.current.t) / 1000, 0.001);
    const rad = dx * 0.006;
    motion.current.offset -= rad;
    motion.current.vel = clamp(-rad / dtSec, -4, 4);
    drag.current = { x: e.clientX, t: now };
  };

  const endDrag = () => {
    if (!motion.current.dragging) return;
    motion.current.dragging = false;
    // If the pointer rested before release, don't throw the ring
    if (performance.now() - drag.current.t > 80) motion.current.vel = 0;
  };

  const active = selected !== null ? items[selected % items.length] : null;

  return (
    <div
      ref={rootRef}
      className={`iris-gallery ${className}`}
      style={{ background: backgroundColor }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerLeave={endDrag}
    >
      <div className="iris-gallery__canvas">
        <Canvas
          camera={{ position: [0, 0, 10], fov: 40 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: true }}
          onPointerMissed={() => setSelected(null)}
        >
          <Ring
            items={items}
            count={safeCount}
            mode={mode}
            interval={interval}
            hold={hold}
            morphDuration={morphDuration}
            stagger={stagger}
            speed={speed}
            fin={fin}
            pupil={pupil}
            aspect={cardAspect}
            radius={radius}
            depth={depth}
            shade={shade}
            motion={motion}
            selected={selected}
            onSelect={setSelected}
            focusOnClick={focusOnClick}
          />
        </Canvas>
      </div>

      {children && (
        <div className={`iris-gallery__center ${active ? "is-hidden" : ""}`}>
          {children}
        </div>
      )}

      {captions && active && (
        <div className="iris-gallery__caption" aria-live="polite">
          {active.title && <strong>{active.title}</strong>}
          {active.subtitle && <span>{active.subtitle}</span>}
        </div>
      )}
    </div>
  );
}