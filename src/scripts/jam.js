// Jam: a host sends sync pulses to its guests; an invite link types itself out.
import { $, clamp, lerp, reduceMotion, C, fit, watch, visible } from "./lib.js";
import { sp, at } from "./spectrum.js";
import { onFrame, onStatic } from "./loop.js";

// ---------- jam constellation ----------
const jam = $("#jam-canvas");
const jctx = jam.getContext("2d");
watch(jam);
const GUESTS = [
  { n: "ana", c: "#FF9A1F" }, { n: "kenji", c: "#FFC145" }, { n: "lu", c: "#FF4D5E" },
  { n: "marco", c: "#FF8A52" }, { n: "sam", c: "#E84D00" },
];
let pulses = [], requests = [], lastBeat = 0, jamRot = 0;
const BEAT = 60 / 112;

function drawJam(t, dt) {
  const { w, d } = fit(jam);
  const S = w, cx = S / 2, cy = S / 2;
  jctx.setTransform(1, 0, 0, 1, 0, 0);
  jctx.clearRect(0, 0, S, S);
  jamRot += dt * 0.06;
  const R = S * 0.36;

  const beat = sp.lv.playing ? sp.lv.kick : (Math.floor(t / BEAT) !== lastBeat ? 1 : 0);
  lastBeat = Math.floor(t / BEAT);
  if (beat && !reduceMotion) GUESTS.forEach((_, i) => pulses.push({ i, t0: t }));
  if (Math.random() < dt * 0.35 && !reduceMotion) requests.push({ i: Math.floor(Math.random() * GUESTS.length), t0: t });

  // orbit
  jctx.beginPath();
  jctx.arc(cx, cy, R, 0, Math.PI * 2);
  jctx.setLineDash([2 * d, 7 * d]);
  jctx.strokeStyle = C["line-strong"];
  jctx.lineWidth = 1 * d;
  jctx.stroke();
  jctx.setLineDash([]);

  const pos = GUESTS.map((g, i) => {
    const a = (i / GUESTS.length) * Math.PI * 2 - Math.PI / 2 + jamRot;
    const wob = Math.sin(t * 0.8 + i * 2) * S * 0.012;
    return { x: cx + Math.cos(a) * (R + wob), y: cy + Math.sin(a) * (R + wob) };
  });

  // links
  pos.forEach((p) => {
    const g = jctx.createLinearGradient(cx, cy, p.x, p.y);
    g.addColorStop(0, "rgba(255,85,0,.55)"); g.addColorStop(1, "rgba(255,85,0,.08)");
    jctx.beginPath(); jctx.moveTo(cx, cy); jctx.lineTo(p.x, p.y);
    jctx.strokeStyle = g; jctx.lineWidth = 1.5 * d; jctx.stroke();
  });

  // pulses host -> guests (state, never audio)
  const flight = 0.5;
  const arrived = new Set();
  pulses = pulses.filter((p) => {
    const k = (t - p.t0) / flight;
    if (k >= 1) { arrived.add(p.i); GUESTS[p.i].hit = t; return false; }
    const q = pos[p.i];
    const e = k * k * (3 - 2 * k);
    const px = lerp(cx, q.x, e), py = lerp(cy, q.y, e);
    jctx.fillStyle = C.accent;
    jctx.globalAlpha = 0.22;
    jctx.beginPath(); jctx.arc(px, py, 8 * d, 0, Math.PI * 2); jctx.fill();
    jctx.globalAlpha = 1;
    jctx.beginPath(); jctx.arc(px, py, 3.2 * d, 0, Math.PI * 2); jctx.fill();
    return true;
  });
  // requests guests -> host (add a track)
  requests = requests.filter((r) => {
    const k = (t - r.t0) / 1.1;
    if (k >= 1) return false;
    const q = pos[r.i];
    jctx.beginPath();
    jctx.arc(lerp(q.x, cx, k), lerp(q.y, cy, k), 2.4 * d, 0, Math.PI * 2);
    jctx.fillStyle = "#FFC145"; jctx.globalAlpha = 1 - k * 0.6; jctx.fill(); jctx.globalAlpha = 1;
    return true;
  });

  // guests
  jctx.textAlign = "center";
  pos.forEach((p, i) => {
    const g = GUESTS[i];
    const hit = g.hit ? clamp(1 - (t - g.hit) / 0.45, 0, 1) : 0;
    const r = S * 0.052 * (1 + hit * 0.12);
    if (hit > 0) {
      jctx.beginPath(); jctx.arc(p.x, p.y, r + (1 - hit) * 16 * d, 0, Math.PI * 2);
      jctx.strokeStyle = g.c; jctx.globalAlpha = hit * 0.7; jctx.lineWidth = 2 * d; jctx.stroke(); jctx.globalAlpha = 1;
    }
    jctx.beginPath(); jctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    jctx.fillStyle = C["surface-raised"]; jctx.fill();
    jctx.lineWidth = 2 * d; jctx.strokeStyle = g.c; jctx.stroke();
    // the same equalizer on every peer: same song, same second
    for (let b = 0; b < 4; b++) {
      const v = 0.25 + at(0.05 + b * 0.18) * 0.9;
      const bh = r * 0.9 * clamp(v, 0.15, 1);
      jctx.fillStyle = g.c;
      jctx.fillRect(p.x - r * 0.42 + b * r * 0.24, p.y + r * 0.42 - bh, r * 0.14, bh);
    }
    jctx.font = `500 ${12 * d}px "Geist Mono", monospace`;
    jctx.fillStyle = C["text-muted"];
    jctx.fillText("@" + g.n, p.x, p.y + r + 18 * d);
  });

  // host
  const hr = S * 0.09 * (1 + sp.bass * 0.12);
  const hg = jctx.createLinearGradient(cx - hr, cy + hr, cx + hr, cy - hr);
  hg.addColorStop(0, "#FF3D00"); hg.addColorStop(0.55, "#FF5500"); hg.addColorStop(1, "#FF9A1F");
  const hgr = hr * (1.8 + sp.bass * 0.6);
  const halo = jctx.createRadialGradient(cx, cy, hr * 0.8, cx, cy, hgr);
  halo.addColorStop(0, "rgba(255,85,0,.45)"); halo.addColorStop(1, "rgba(255,85,0,0)");
  jctx.fillStyle = halo;
  jctx.beginPath(); jctx.arc(cx, cy, hgr, 0, Math.PI * 2); jctx.fill();
  jctx.beginPath(); jctx.arc(cx, cy, hr, 0, Math.PI * 2); jctx.fillStyle = hg; jctx.fill();
  jctx.beginPath();
  jctx.moveTo(cx - hr * 0.22, cy - hr * 0.34); jctx.lineTo(cx - hr * 0.22, cy + hr * 0.34); jctx.lineTo(cx + hr * 0.38, cy);
  jctx.closePath(); jctx.fillStyle = "#fff"; jctx.fill();
  jctx.font = `600 ${11 * d}px "Geist", sans-serif`;
  jctx.fillStyle = C.accent;
  jctx.fillText("HOST · YOU", cx, cy + hr + 22 * d);
}
// ---------- jam ticket ----------
const ticket = $("#ticket");
const B32 = "abcdefghijklmnopqrstuvwxyz234567";
let ticketText = "", ticketI = 0, ticketDir = 1, ticketWait = 0;
const newTicket = () => {
  let s = "cloudrs://jam/";
  for (let i = 0; i < 64; i++) s += B32[Math.floor(Math.random() * 32)];
  return s;
};
ticketText = newTicket();
function typeTicket(dt) {
  if (ticketWait > 0) { ticketWait -= dt; return; }
  if (ticketDir > 0) {
    ticketI = Math.min(ticketText.length, ticketI + (ticketI < 14 ? 1 : 3));
    if (ticketI === ticketText.length) { ticketDir = -1; ticketWait = 3.5; }
  } else {
    ticketI = Math.max(14, ticketI - 6);
    if (ticketI === 14) { ticketDir = 1; ticketText = newTicket(); ticketWait = 0.4; }
  }
  ticket.textContent = ticketText.slice(0, ticketI);
}
watch(ticket);
if (reduceMotion) ticket.textContent = ticketText;

onFrame((t, dt) => {
  if (visible.has(jam)) drawJam(t, dt);
  if (visible.has(ticket)) typeTicket(dt);
});
onStatic(() => drawJam(0, 0));
