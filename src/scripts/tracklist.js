// Tracklist: a mini waveform per row that sweeps while you hover it.
import { $, $$, clamp } from "./lib.js";

// ---------- tracklist mini waveforms ----------
$$(".t-wave").forEach((el, k) => {
  let bars = "";
  for (let i = 0; i < 48; i++) {
    const v = clamp(0.2 + Math.abs(Math.sin((i + 1) * (k + 3) * 1.37) * Math.cos(i * 0.31 + k)) * 0.8, 0.12, 1);
    const h = v * 26;
    bars += `<rect x='${i * 3}' y='${(28 - h) / 2}' width='2' height='${h}' rx='1'/>`;
  }
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 144 28' preserveAspectRatio='none'>${bars}</svg>`;
  el.style.setProperty("--wave-mask", `url("data:image/svg+xml,${encodeURIComponent(svg)}")`);
});
// progress sweep on hover
$$(".track summary").forEach((s) => {
  const w = $(".t-wave", s);
  let raf, start;
  const run = (ts) => {
    if (!start) start = ts;
    w.style.setProperty("--p", Math.min(100, (ts - start) / 30) + "%");
    if ((ts - start) / 30 < 100) raf = requestAnimationFrame(run);
  };
  s.addEventListener("pointerenter", () => { start = 0; cancelAnimationFrame(raf); raf = requestAnimationFrame(run); });
  s.addEventListener("pointerleave", () => { cancelAnimationFrame(raf); if (!s.parentElement.open) w.style.setProperty("--p", "0%"); });
});
