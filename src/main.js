import Lenis from "lenis";
import "lenis/dist/lenis.css";
import "./style.css";

function viewportHeight() {
  const vv =
    typeof window.visualViewport !== "undefined"
      ? window.visualViewport
      : null;
  return vv != null && vv.height > 0 ? vv.height : window.innerHeight;
}

function setVH() {
  document.documentElement.style.setProperty(
    "--vh",
    `${viewportHeight() * 0.01}px`
  );
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function horizontalScrollSpanPx(trackEl, viewportW) {
  const w = Math.ceil(trackEl.scrollWidth);
  return Math.max(0, w - viewportW);
}

function refreshStripLayouts() {
  const vh = viewportHeight();
  const vw = window.innerWidth;

  document.querySelectorAll(".scroll-strip-inner").forEach((inner) => {
    inner.style.height = `${vh}px`;
  });

  document.querySelectorAll(".scroll-strip").forEach((strip) => {
    const track = strip.querySelector(".track");
    if (!track) return;
    /** Vertical scroll allocated = horizontal overrun (sticky 1:1 mapping). */
    const span = horizontalScrollSpanPx(track, vw);
    strip.style.height = `${vh + span}px`;
  });

  syncTracksFromLayout();
}

function syncTracksFromLayout() {
  const vw = window.innerWidth;

  document.querySelectorAll(".scroll-strip").forEach((strip) => {
    const track = strip.querySelector(".track");
    if (!track) return;

    const span = horizontalScrollSpanPx(track, vw);
    const stripRect = strip.getBoundingClientRect();

    const scrolledPastStart = clamp(-stripRect.top, 0, span);
    track.style.transform = `translate3d(${-scrolledPastStart}px, 0, 0)`;
  });
}

let lenis;

function boot() {
  setVH();

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

  if (typeof document.fonts !== "undefined") {
    document.fonts.ready.then(() => refreshStripLayouts());
  }

  if (typeof ResizeObserver !== "undefined") {
    const ro = new ResizeObserver(() => {
      refreshStripLayouts();
    });
    document.querySelectorAll(".track").forEach((t) => ro.observe(t));
  }

  refreshStripLayouts();
}

window.addEventListener("load", () => {
  refreshStripLayouts();
});

window.addEventListener("resize", () => {
  setVH();
  refreshStripLayouts();
});

if (typeof window.visualViewport !== "undefined") {
  window.visualViewport.addEventListener("resize", () => {
    setVH();
    refreshStripLayouts();
  });
}

boot();
