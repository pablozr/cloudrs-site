// Small helpers shared by every section script.

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
export const root = document.documentElement;

export const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
};

// Theme colours, read from the CSS tokens so canvases follow the theme.
export const C = {};
export function readColors() {
  const cs = getComputedStyle(root);
  for (const k of ["accent", "canvas-deep", "canvas", "surface", "surface-raised", "surface-hover", "text", "text-muted", "text-subtle", "line-strong"]) {
    C[k] = cs.getPropertyValue("--" + k).trim();
  }
  C.light = root.dataset.theme === "light";
}
readColors();

let toastTimer;
export function toast(msg) {
  const el = $("#toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
}

// Elements currently on screen; the frame loop draws only those.
export const visible = new Set();
const visIO = new IntersectionObserver((entries) => {
  for (const e of entries) e.isIntersecting ? visible.add(e.target) : visible.delete(e.target);
});
export const watch = (el) => visIO.observe(el);

// Canvas sizes are cached by a ResizeObserver so drawing never forces a layout.
const sizes = new WeakMap();
const sizeRO = new ResizeObserver((entries) => {
  for (const e of entries) sizes.set(e.target, { width: e.contentRect.width, height: e.contentRect.height });
});
export const sizeOf = (canvas) => sizes.get(canvas);
export function fit(canvas, maxDpr = 2) {
  let r = sizes.get(canvas);
  if (!r) { r = canvas.getBoundingClientRect(); sizes.set(canvas, r); sizeRO.observe(canvas); }
  const d = Math.min(window.devicePixelRatio || 1, maxDpr);
  const w = Math.max(1, Math.round(r.width * d)), h = Math.max(1, Math.round(r.height * d));
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  return { w, h, d };
}

/** Absolute page offset of an element, for scroll maths done without layout reads. */
export const pageTop = (el) => el.getBoundingClientRect().top + scrollY;

export const maxScroll = () => Math.max(1, document.documentElement.scrollHeight - innerHeight);

export const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

// A fixed, hand-shaped "track": quiet intro, drops, a breakdown, a long outro.
export function waveHeight(x) {
  const h = Math.abs(Math.sin(x * 913.7) * 7919.3 % 1);
  const env = x < 0.06 ? 0.3 + x * 6 : x > 0.93 ? 0.35 + (1 - x) * 6 : 0.62 + 0.38 * Math.sin(x * 15 + 1) * Math.sin(x * 4.4);
  return clamp(0.18 + env * (0.45 + 0.55 * h), 0.08, 1);
}
