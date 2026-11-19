import nipplejs from "nipplejs";
import "./style.css";

/* —— Tuning —— */
/** Page travel speed (px/s) at full joystick deflection. */
const MAX_SPEED = 1400;
/** How quickly velocity chases the input (higher = snappier, lower = floatier). */
const RESPONSE = 8;
/** Ignore tiny deflections so the stick resting slightly off-centre doesn't drift. */
const DEADZONE = 0.08;

function setVH() {
  document.documentElement.style.setProperty(
    "--vh",
    `${window.innerHeight * 0.01}px`
  );
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function horizontalScrollSpanPx(trackEl, viewportW) {
  const w = Math.ceil(trackEl.scrollWidth);
  return Math.max(0, w - viewportW);
}

function maxScrollPx() {
  const el = document.scrollingElement || document.documentElement;
  return Math.max(0, el.scrollHeight - window.innerHeight);
}

function refreshStripLayouts() {
  const vh = window.innerHeight;
  const vw = window.innerWidth;

  document.querySelectorAll(".scroll-strip-inner").forEach((inner) => {
    inner.style.height = `${vh}px`;
  });

  document.querySelectorAll(".scroll-strip").forEach((strip) => {
    const track = strip.querySelector(".track");
    if (!track) return;
    /** Vertical travel allocated = horizontal overrun (sticky 1:1 mapping). */
    const span = horizontalScrollSpanPx(track, vw);
    strip.style.height = `${vh + span}px`;
  });

  // Layout height may have shrunk; keep position in range.
  pos = clamp(pos, 0, maxScrollPx());
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

/* —— Input: joystick + keyboard fallback, both reduced to one "forward" axis —— */

/**
 * Right or down = forward through the story, left or up = back.
 * Accepting both axes everywhere means the user never gets stuck at the
 * hand-off between a horizontal strip and the vertical section.
 * nipplejs vector: x right-positive, y UP-positive, each in [-1, 1].
 */
function forwardFromVector(vx, vy) {
  const f = clamp(vx - vy, -1, 1);
  const mag = Math.abs(f);
  if (mag < DEADZONE) return 0;
  // Rescale past the deadzone, then ease so small pushes give fine control.
  const t = (mag - DEADZONE) / (1 - DEADZONE);
  return Math.sign(f) * t ** 1.5;
}

let manager = null;
let joystickInput = 0;
let keyInput = 0;
let pos = 0;
let velocity = 0;
let rafId = 0;
let lastTime = 0;

function currentInput() {
  return joystickInput !== 0 ? joystickInput : keyInput;
}

function tick(time) {
  const dt = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 1 / 60;
  lastTime = time;

  // If something else moved the page (focus, find-in-page), adopt it.
  if (Math.abs(window.scrollY - pos) > 2) pos = window.scrollY;

  const target = currentInput() * MAX_SPEED;
  velocity += (target - velocity) * (1 - Math.exp(-RESPONSE * dt));

  const max = maxScrollPx();
  pos = clamp(pos + velocity * dt, 0, max);
  // Pinned against an end: don't bank speed that would delay a reversal.
  if ((pos === 0 && velocity < 0) || (pos === max && velocity > 0)) {
    velocity = 0;
  }

  window.scrollTo(0, pos);
  syncTracksFromLayout();
  // nipplejs stores the static stick's centre in page coordinates; our zone is
  // position: fixed, so re-anchor it every time the page moves underneath.
  if (manager && typeof manager.reposition === "function") manager.reposition();

  if (target === 0 && Math.abs(velocity) < 1) {
    velocity = 0;
    rafId = 0;
    lastTime = 0;
    return;
  }
  rafId = requestAnimationFrame(tick);
}

function wake() {
  if (!rafId) rafId = requestAnimationFrame(tick);
}

function initJoystick() {
  const zone = document.querySelector(".joystick-zone");
  if (!zone) return;

  manager = nipplejs.create({
    zone,
    mode: "static",
    position: { left: "50%", top: "50%" },
    size: 100,
    color: { front: "rgba(27, 27, 27, 0.85)", back: "rgba(27, 27, 27, 0.12)" },
    restOpacity: 0.6,
    lockX: true, 
  });

  manager.on("move", (evt) => {
    const v = evt.data && evt.data.vector;
    if (!v) return;
    joystickInput = forwardFromVector(v.x, v.y);
    wake();
  });

  manager.on("end", () => {
    joystickInput = 0;
    wake();
  });
}

const KEY_DIRECTION = {
  ArrowRight: 1,
  ArrowDown: 1,
  ArrowLeft: -1,
  ArrowUp: -1,
};

function initKeyboard() {
  const held = new Set();

  function update() {
    let sum = 0;
    held.forEach((k) => (sum += KEY_DIRECTION[k]));
    keyInput = clamp(sum, -1, 1);
    wake();
  }

  window.addEventListener("keydown", (e) => {
    if (!(e.key in KEY_DIRECTION)) return;
    // Leave arrow keys alone on media/form controls (e.g. video seek).
    if (e.target instanceof HTMLElement && e.target.closest("video, input, select, textarea")) return;
    e.preventDefault();
    held.add(e.key);
    update();
  });

  window.addEventListener("keyup", (e) => {
    if (!held.delete(e.key)) return;
    update();
  });

  window.addEventListener("blur", () => {
    held.clear();
    update();
  });
}

function boot() {
  setVH();

  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  window.scrollTo(0, 0);

  initJoystick();
  initKeyboard();

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

boot();
