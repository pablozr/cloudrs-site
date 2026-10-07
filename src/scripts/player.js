// The page player: its waveform is the scroll bar, sections are timed comments,
// the transport jumps between sections and the play button runs the live mix.
import { $, $$, clamp, C, fit, sizeOf, pageTop, maxScroll, fmt, waveHeight } from "./lib.js";
import { sp, at } from "./spectrum.js";
import { Mix } from "./audio.js";
import { onFrame, onRelayout, onScroll, onStatic } from "./loop.js";
import { addActions } from "./palette.js";

const player = $("#player");
const wave = $("#wave");
const wctx = wave.getContext("2d");
const waveBox = $("#p-wave");
const sections = $$("[data-section]");
const TOTAL = 260; // 04:20
let progress = 0, hoverX = -1;

let waveKey = "";
function drawWave() {
  // Redraw only when something on it changed (or the mix is moving it).
  const key = `${progress.toFixed(4)}|${hoverX}|${C.light}|${sizeOf(wave)?.width}`;
  if (sp.blend < 0.01 && key === waveKey) return;
  waveKey = key;
  const { w, h, d } = fit(wave);
  wctx.setTransform(1, 0, 0, 1, 0, 0);
  wctx.clearRect(0, 0, w, h);
  const bw = 2 * d, gap = 1 * d, n = Math.floor(w / (bw + gap));
  const top = h * 0.66, bottom = h * 0.3;
  const grad = wctx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, "#FF3D00"); grad.addColorStop(0.5, "#FF5500"); grad.addColorStop(1, "#FF9A1F");
  const playX = progress * w;
  const hx = hoverX * d;
  for (let i = 0; i < n; i++) {
    const x = i * (bw + gap);
    let v = waveHeight(i / n);
    const near = Math.abs(x - playX) / w;
    if (sp.blend > 0.05 && near < 0.05) v = clamp(v * (1 + (1 - near / 0.05) * at(near * 10) * 0.8 * sp.blend), 0, 1.15);
    if (x < playX) wctx.fillStyle = grad;
    else if (hoverX >= 0 && x < hx) wctx.fillStyle = C.light ? "rgba(232,77,0,.45)" : "rgba(255,85,0,.45)";
    else wctx.fillStyle = C["text-subtle"];
    wctx.globalAlpha = x < playX ? 1 : 0.55;
    wctx.fillRect(x, top - v * top, bw, v * top);
    wctx.globalAlpha *= 0.45;
    wctx.fillRect(x, top + d, bw, v * bottom);
  }
  wctx.globalAlpha = 1;
}

// ---------- positions and timed comments ----------
let tops = [], max = 1, pins = [];
function measure() {
  tops = sections.map(pageTop);
  max = maxScroll();
  const box = $("#pins");
  box.replaceChildren();
  sections.forEach((s, i) => {
    const p = clamp(tops[i] / max, 0, 1);
    if (p <= 0.001) return;
    const b = document.createElement("button");
    b.className = "pin";
    b.style.left = p * 100 + "%";
    b._p = p;
    b.dataset.tip = `${fmt(p * TOTAL)} · ${s.dataset.section}`;
    b.setAttribute("aria-label", `Jump to ${s.dataset.section}`);
    b.addEventListener("click", (e) => { e.stopPropagation(); s.scrollIntoView({ behavior: "smooth" }); });
    box.append(b);
  });
  pins = $$(".pin", box);
}
function currentIndex() {
  const mid = scrollY + innerHeight * 0.4;
  let idx = 0;
  tops.forEach((top, i) => { if (top <= mid) idx = i; });
  return idx;
}

const elapsedEl = $("#p-elapsed"), titleEl = $("#p-title");
let lastIdx = -1, lastElapsed = "";
const showPlayer = () => player.classList.toggle("shown", scrollY > innerHeight * 0.55 || Mix.playing);
function update() {
  progress = clamp(scrollY / max, 0, 1);
  const el = fmt(progress * TOTAL);
  if (el !== lastElapsed) {
    lastElapsed = el;
    elapsedEl.textContent = el;
    waveBox.setAttribute("aria-valuenow", Math.round(progress * 100));
  }
  pins.forEach((p) => p.classList.toggle("passed", progress >= p._p - 0.002));
  const idx = currentIndex();
  if (idx !== lastIdx) { lastIdx = idx; titleEl.textContent = sections[idx].dataset.section; }
  showPlayer();
}

// ---------- seeking ----------
const seek = (clientX, smooth) => {
  const r = waveBox.getBoundingClientRect();
  scrollTo({ top: clamp((clientX - r.left) / r.width, 0, 1) * maxScroll(), behavior: smooth ? "smooth" : "auto" });
};
let dragging = false;
waveBox.addEventListener("pointerdown", (e) => { dragging = true; waveBox.setPointerCapture(e.pointerId); seek(e.clientX, true); });
waveBox.addEventListener("pointermove", (e) => {
  hoverX = e.clientX - waveBox.getBoundingClientRect().left;
  if (dragging) seek(e.clientX, false);
});
waveBox.addEventListener("pointerup", () => (dragging = false));
waveBox.addEventListener("pointerleave", () => (hoverX = -1));
waveBox.addEventListener("keydown", (e) => {
  if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
  e.preventDefault();
  scrollBy({ top: (e.key === "ArrowLeft" ? -1 : 1) * maxScroll() * 0.05, behavior: "smooth" });
});

$("#p-prev").addEventListener("click", () => {
  const i = currentIndex();
  const target = scrollY - tops[i] > 40 ? sections[i] : sections[Math.max(0, i - 1)];
  target.scrollIntoView({ behavior: "smooth" });
});
$("#p-next").addEventListener("click", () => sections[Math.min(sections.length - 1, currentIndex() + 1)].scrollIntoView({ behavior: "smooth" }));

// ---------- the live mix ----------
const play = $("#p-play");
play.addEventListener("click", () => Mix.toggle());
Mix.onChange((on) => {
  play.setAttribute("aria-label", on ? "Pause the live mix" : "Play the live mix");
  play.dataset.tip = on ? "Pause (Space)" : "Play (Space)";
  showPlayer();
});
const vol = $("#p-volume");
const setVol = () => { Mix.setVolume(vol.value / 100); vol.style.setProperty("--v", vol.value + "%"); };
vol.addEventListener("input", setVol);
setVol();
$("#p-mute").addEventListener("click", (e) => {
  const m = !Mix.muted;
  Mix.setMuted(m);
  e.currentTarget.classList.toggle("muted-audio", m);
  e.currentTarget.setAttribute("aria-label", m ? "Unmute" : "Mute");
  e.currentTarget.dataset.tip = m ? "Unmute" : "Mute";
});

// Space plays and pauses, unless a control that uses Space has focus.
addEventListener("keydown", (e) => {
  if (e.key !== " " || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON|A|SUMMARY)$/.test(e.target.tagName)) return;
  e.preventDefault();
  Mix.toggle();
});
addActions(() => [{ label: Mix.playing ? "Pause the live mix" : "Play the live mix", kind: "Action", run: () => Mix.toggle() }]);

onRelayout(measure);
onScroll(update);
onFrame(() => { if (player.classList.contains("shown")) drawWave(); });
onStatic(drawWave);
