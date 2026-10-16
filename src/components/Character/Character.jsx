
import { useEffect, useRef } from "react";
import "./Character.css";

const FRAME_COUNT = 240;
const PRELOAD_RADIUS = 8;
const CACHE_RADIUS = 24;

const FRAME_PATH = (index) =>
  `/frames/frame_${String(index + 1).padStart(3, "0")}_no_bg.png`;

export default function Character() {
  const canvasRef = useRef(null);
  const sectionRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const characterSection = sectionRef.current;
    const aboutSection = document.querySelector("#about");
    const ctx = canvas?.getContext("2d");

    if (!canvas || !characterSection || !aboutSection || !ctx) return;

    const images = new Array(FRAME_COUNT);
    let currentFrame = 0;
    let rafId = null;
    let disposed = false;
    let framesStarted = false;

    const render = () => {
      rafId = null;
      if (disposed) return;

      let img = images[currentFrame];

      if (!img?.complete || !img.naturalWidth) {
        img = null;

        for (let distance = 1; distance < FRAME_COUNT; distance++) {
          const before = images[currentFrame - distance];
          const after = images[currentFrame + distance];

          if (before?.complete && before.naturalWidth) {
            img = before;
            break;
          }

          if (after?.complete && after.naturalWidth) {
            img = after;
            break;
          }
        }
      }

      if (!img?.naturalWidth) return;

      const width = canvas.width;
      const height = canvas.height;

      if (!width || !height) return;

      const scale = Math.max(
        width / img.naturalWidth,
        height / img.naturalHeight
      );

      const drawWidth = img.naturalWidth * scale;
      const drawHeight = img.naturalHeight * scale;

      ctx.clearRect(0, 0, width, height);

      ctx.drawImage(
        img,
        (width - drawWidth) / 2,
        (height - drawHeight) / 2,
        drawWidth,
        drawHeight
      );
    };

    const requestRender = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(render);
    };

    const loadFrame = (index) => {
      if (index < 0 || index >= FRAME_COUNT || images[index]) return;

      const img = new Image();
      img.decoding = "async";
      images[index] = img;
      img.onload = () => {
        if (images[index] === img) requestRender();
      };
      img.onerror = () => {
        if (images[index] === img) {
          console.error("Failed to load:", FRAME_PATH(index));
        }
      };
      img.src = FRAME_PATH(index);
    };

    const loadNearbyFrames = (frame) => {
      for (
        let index = Math.max(0, frame - PRELOAD_RADIUS);
        index <= Math.min(FRAME_COUNT - 1, frame + PRELOAD_RADIUS);
        index++
      ) {
        loadFrame(index);
      }

      for (let index = 0; index < FRAME_COUNT; index++) {
        if (Math.abs(index - frame) > CACHE_RADIUS && images[index]?.complete) {
          images[index].onload = null;
          images[index].onerror = null;
          images[index] = null;
        }
      }
    };

    const startLoadingFrames = () => {
      if (framesStarted) return;
      framesStarted = true;
      loadNearbyFrames(currentFrame);
    };

    const resize = () => {
      const rect = characterSection.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));

      requestRender();
    };

    // Map mouse position across the entire About section.
    const handlePointerMove = (event) => {
      const rect = aboutSection.getBoundingClientRect();
      if (!rect.width) return;

      const progress = Math.max(
        0,
        Math.min(1, (event.clientX - rect.left) / rect.width)
      );

      const nextFrame = Math.round(progress * (FRAME_COUNT - 1));

      if (nextFrame !== currentFrame) {
        currentFrame = nextFrame;
        startLoadingFrames();
        loadNearbyFrames(currentFrame);
        requestRender();
      }
    };

    resize();

    const observer = new ResizeObserver(resize);
    observer.observe(characterSection);

    const frameObserver = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        frameObserver.disconnect();
        startLoadingFrames();
      },
      { rootMargin: "300px 0px" }
    );
    frameObserver.observe(aboutSection);

    aboutSection.addEventListener("pointermove", handlePointerMove, {
      passive: true,
    });

    return () => {
      disposed = true;

      if (rafId !== null) cancelAnimationFrame(rafId);

      observer.disconnect();
      frameObserver.disconnect();
      aboutSection.removeEventListener("pointermove", handlePointerMove);

      images.forEach((img) => {
        if (img) {
          img.onload = null;
          img.onerror = null;
        }
      });
    };
  }, []);

  return (
    <div className="character-section" ref={sectionRef}>
      <canvas
        ref={canvasRef}
        className="character-canvas"
        aria-label="Interactive character animation"
        role="img"
      />
    </div>
  );
}
