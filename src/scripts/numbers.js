// Numbers: count up (or down, for zero) when they scroll into view.
import { $$, clamp, lerp, reduceMotion } from "./lib.js";

// ---------- counters ----------
const countIO = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    countIO.unobserve(e.target);
    const el = e.target, to = +el.dataset.to, from = to === 0 ? 100 : 0;
    const t0 = performance.now(), dur = reduceMotion ? 1 : 1600;
    const step = (now) => {
      const k = clamp((now - t0) / dur, 0, 1);
      const v = Math.round(lerp(from, to, 1 - Math.pow(1 - k, 4)));
      el.textContent = v;
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
}, { threshold: 0.6 });
$$(".count").forEach((el) => countIO.observe(el));
