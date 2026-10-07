// Roadmap: a waveform with the playhead on the milestone in progress.
import { $, fit, C, watch, visible, waveHeight } from "./lib.js";
import { sp, at } from "./spectrum.js";
import { onFrame, onRelayout, onStatic } from "./loop.js";

// ---------- roadmap wave ----------
const tl = $("#timeline-wave");
const tlctx = tl.getContext("2d");
watch(tl);
let playheadAt = 0.75;
function measureTimeline() {
  const box = $("#timeline").getBoundingClientRect();
  const nr = $(".milestones .now").getBoundingClientRect();
  const cols = getComputedStyle($(".milestones")).gridTemplateColumns.split(" ").length;
  playheadAt = cols === 6 ? (nr.left - box.left + nr.width / 2) / box.width : 4.5 / 6;
}
function drawTimeline(t) {
  const { w, h, d } = fit(tl);
  tlctx.setTransform(1, 0, 0, 1, 0, 0);
  tlctx.clearRect(0, 0, w, h);
  const px = w * playheadAt;
  const bw = 3 * d, gap = 2 * d, n = Math.floor(w / (bw + gap));
  const mid = h * 0.55;
  const grad = tlctx.createLinearGradient(0, 0, px, 0);
  grad.addColorStop(0, "#FF3D00"); grad.addColorStop(1, "#FF9A1F");
  for (let i = 0; i < n; i++) {
    const x = i * (bw + gap);
    let v = waveHeight(i / n * 0.8 + 0.1) * 0.85;
    const dist = Math.abs(x - px) / w;
    if (dist < 0.08) v *= 1 + (1 - dist / 0.08) * at(dist * 6) * 0.9;
    const bh = v * mid * 0.95;
    tlctx.fillStyle = x < px ? grad : C["text-subtle"];
    tlctx.globalAlpha = x < px ? 1 : 0.35;
    tlctx.fillRect(x, mid - bh, bw, bh);
    tlctx.globalAlpha *= 0.4;
    tlctx.fillRect(x, mid + d * 2, bw, bh * 0.42);
  }
  tlctx.globalAlpha = 1;
  // playhead
  tlctx.fillStyle = C.text;
  tlctx.fillRect(px - d, 0, 2 * d, h);
  const pr = (5 + Math.sin(t * 4) * 1.2 + sp.bass * 6) * d;
  tlctx.beginPath(); tlctx.arc(px, mid, pr + 6 * d, 0, Math.PI * 2);
  tlctx.fillStyle = "rgba(255,85,0,.18)"; tlctx.fill();
  tlctx.beginPath(); tlctx.arc(px, mid, pr, 0, Math.PI * 2);
  tlctx.fillStyle = C.accent; tlctx.fill();
  tlctx.font = `600 ${11 * d}px "Geist", sans-serif`;
  tlctx.fillStyle = C.accent;
  tlctx.textAlign = px > w - 120 * d ? "right" : "left";
  tlctx.fillText("NOW PLAYING", px + (tlctx.textAlign === "left" ? 10 : -10) * d, 12 * d);
}

onRelayout(measureTimeline);
onFrame((t) => { if (visible.has(tl)) drawTimeline(t); });
onStatic(() => drawTimeline(0));
