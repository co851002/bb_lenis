import Lenis from "lenis";
import "lenis/dist/lenis.css";
import "./style.css";

function readViewportPx() {
  if (typeof window.visualViewport !== "undefined") {
    return {
      vw: window.visualViewport.width,
      vh: window.visualViewport.height,
    };
  }
  return {
    vw: window.innerWidth,
    vh: window.innerHeight,
  };
}

/** Match viewport units used in CSS to Lenis/track math (`inner*` not `100vw` / `100vh`). */
function setViewportCss() {
  const { vw, vh } = readViewportPx();
  const root = document.documentElement;
  root.style.setProperty("--vh", `${vh * 0.01}px`);
  root.style.setProperty("--viewport-h", `${vh}px`);
  root.style.setProperty("--viewport-w", `${vw}px`);
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function viewportSize() {
  return readViewportPx();
}

function refreshStripLayouts() {
  const { vw, vh } = viewportSize();

  document.querySelectorAll(".scroll-strip").forEach((strip) => {
    const panels = parseInt(strip.dataset.panels, 10);
    strip.style.height = `${panels * vh}px`;
  });

  document.querySelectorAll(".scroll-strip-inner").forEach((inner) => {
    inner.style.height = `${vh}px`;
  });

  document.querySelectorAll(".track").forEach((track) => {
    const panels = track.children.length;
    track.style.width = `${panels * vw}px`;
  });

  syncTracksFromLayout();
}

function syncTracksFromLayout() {
  const { vw, vh } = viewportSize();

  document.querySelectorAll(".scroll-strip").forEach((strip) => {
    const track = strip.querySelector(".track");
    if (!track) return;

    const panels = parseInt(strip.dataset.panels, 10);
    const stripRect = strip.getBoundingClientRect();
    const span = panels * vh - vh;

    const scrolledPastStart = clamp(-stripRect.top, 0, span);
    const progress = span <= 0 ? 0 : scrolledPastStart / span;
    const maxShift = (panels - 1) * vw;

    track.style.transform = `translate3d(${-progress * maxShift}px, 0, 0)`;
  });
}

let lenis;

function boot() {
  setViewportCss();

  lenis = new Lenis({
    smoothWheel: true,
    orientation: "vertical",
  });

  lenis.on("scroll", () => {
    syncTracksFromLayout();
  });

  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  refreshStripLayouts();

  window.visualViewport?.addEventListener("resize", () => {
    setViewportCss();
    refreshStripLayouts();
  });

  if (typeof ResizeObserver !== "undefined") {
    const ro = new ResizeObserver(() => {
      setViewportCss();
      refreshStripLayouts();
    });
    ro.observe(document.documentElement);
  }
}

window.addEventListener("resize", () => {
  setViewportCss();
  refreshStripLayouts();
});

boot();
