// One requestAnimationFrame loop, one scroll handler and one relayout for the whole page.
// Section scripts register callbacks; the loop starts once every script has loaded.
import { Mix } from "./audio.js";
import { updateSpectrum } from "./spectrum.js";
import { reduceMotion } from "./lib.js";

const frames = new Set();
const relayouts = new Set();
const scrolls = new Set();
const statics = new Set();

/** Called every frame with (t seconds, dt seconds). Check `visible` inside. */
export const onFrame = (f) => frames.add(f);
/** Called after load, resize and any change of page height. Measure layout here. */
export const onRelayout = (f) => relayouts.add(f);
/** Called at most once per frame while scrolling. Do not read layout here. */
export const onScroll = (f) => scrolls.add(f);
/** Draws a still frame, for reduced motion and theme changes. */
export const onStatic = (f) => statics.add(f);

let running = false, last = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const t = now / 1000;
  updateSpectrum(t);
  for (const f of frames) f(t, dt);
  // Pages without animation (or with reduced motion) do not keep a loop running.
  if (!frames.size || (reduceMotion && !Mix.playing)) { running = false; return; }
  requestAnimationFrame(frame);
}
export function startLoop() {
  if (running || !frames.size) return;
  running = true;
  last = performance.now();
  requestAnimationFrame(frame);
}

export function drawStatic() {
  updateSpectrum(0);
  for (const f of statics) f();
}

const runScroll = () => { for (const f of scrolls) f(); };
export function relayout() {
  for (const f of relayouts) f();
  runScroll();
  if (reduceMotion) drawStatic();
}

let queued = false;
addEventListener("scroll", () => {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => { queued = false; runScroll(); });
}, { passive: true });

let rT;
const queueRelayout = () => { clearTimeout(rT); rT = setTimeout(relayout, 120); };
addEventListener("resize", queueRelayout);

Mix.onChange((on) => { if (on) startLoop(); });

// Module scripts run before DOMContentLoaded, so every section has registered by then.
function boot() {
  relayout();
  new ResizeObserver(queueRelayout).observe(document.body);
  document.fonts && document.fonts.ready.then(relayout);
  addEventListener("load", relayout);
  if (reduceMotion) drawStatic();
  else startLoop();
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else setTimeout(boot);
