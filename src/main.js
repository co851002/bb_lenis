import Lenis from "lenis";
import "lenis/dist/lenis.css";
import "./style.css";

function setVH() {
  document.documentElement.style.setProperty(
    "--vh",
    `${window.innerHeight * 0.01}px`
  );
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function refreshStripLayouts() {
  document.querySelectorAll(".scroll-strip").forEach((strip) => {
    const panels = parseInt(strip.dataset.panels, 10);
    strip.style.height = `${panels * window.innerHeight}px`;
  });

  document.querySelectorAll(".scroll-strip-inner").forEach((inner) => {
    inner.style.height = `${window.innerHeight}px`;
  });

  document.querySelectorAll(".track").forEach((track) => {
    const panels = track.children.length;
    track.style.width = `${panels * window.innerWidth}px`;
  });

  syncTracksFromLayout();
}

function syncTracksFromLayout() {
  const vh = window.innerHeight;
  const vw = window.innerWidth;

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

  refreshStripLayouts();
}

window.addEventListener("resize", () => {
  setVH();
  refreshStripLayouts();
});

boot();
