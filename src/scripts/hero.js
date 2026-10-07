// Hero: the logo rises like a sun over a landscape of sound, and plays the live mix.
import { $, clamp, lerp, reduceMotion, C, fit, watch, visible } from "./lib.js";
import { sp, at, updateSpectrum } from "./spectrum.js";
import { Mix } from "./audio.js";
import { onFrame, onRelayout, onStatic } from "./loop.js";

// ---------- hero scene: the logo rises like a sun over a landscape of sound ----------
// The 28 strokes of assets/brand/logo.svg (inner and outer points, 256-unit box).
const LOGO = [[128,51.2,128,17.6],[145.1,53.1,153.5,16.4],[161.3,58.8,179.2,21.8],[175.9,68,198.4,39.8],[188,80.1,213.4,59.9],[197.2,94.7,221,83.2],[202.9,110.9,224.7,105.9],[204.8,128,229.2,128],[202.9,145.1,226.3,150.4],[197.2,161.3,220.6,172.6],[188,175.9,205.4,189.7],[175.9,188,187.1,202.1],[161.3,197.2,168.8,212.8],[145.1,202.9,148.9,219.7],[128,204.8,128,222.1],[110.9,202.9,105.7,225.8],[94.7,197.2,81.1,225.3],[80.1,188,57.7,216.1],[68,175.9,41.1,197.3],[58.8,161.3,30.4,175],[53.1,145.1,21.7,152.3],[51.2,128,21.8,128],[53.1,110.9,18.5,103],[58.8,94.7,26.3,79],[68,80.1,40.1,57.9],[80.1,68,60.2,43],[94.7,58.8,83.3,35.2],[110.9,53.1,106,31.8]]
  .map(([x1, y1, x2, y2]) => ({ a: Math.atan2(y2 - 128, x2 - 128), r1: Math.hypot(x1 - 128, y1 - 128), r2: Math.hypot(x2 - 128, y2 - 128) }));

const scene = $("#scene");
const sctx = scene.getContext("2d");
watch(scene);
const hero = $(".hero");
const heroCopy = $(".hero-copy");
const discHit = $("#disc-play");
let rot = 0, rings = [], sparks = [], hover = 0, hoverT = 0, hitKey = "";
const par = { x: 0, y: 0 }, parT = { x: 0, y: 0 };
discHit.addEventListener("pointerenter", () => (hoverT = 1));
discHit.addEventListener("pointerleave", () => (hoverT = 0));
hero.addEventListener("pointermove", (e) => {
  parT.x = e.clientX / innerWidth - 0.5;
  parT.y = (e.clientY + scrollY) / innerHeight - 0.5;
}, { passive: true });
hero.addEventListener("pointerleave", () => { parT.x = 0; parT.y = 0; });
// Where the hero text ends (layout units, transforms ignored); refreshed on relayout.
let heroTextBottom = 0;
const measureHero = () => { heroTextBottom = heroCopy.offsetTop + heroCopy.offsetHeight; };

// Terrain rows: born at the horizon, they glide toward you. Height = a slow landscape
// plus the spectrum's texture, with a valley in the middle where the sun sits.
const ROWS = 30, PTS = 140, ROW_MS = 110;
const history = [];
let rowClock = 0, zRow = 0;
for (let i = 0; i < ROWS; i++) history.push(new Float32Array(PTS));
const jitter = Float32Array.from({ length: PTS }, (_, i) => 0.4 + 0.6 * Math.abs(Math.sin(i * 12.9898) * 43758.5453 % 1));
const prefill = () => { for (let i = 0; i < ROWS; i++) { updateSpectrum(i * 0.11); pushRow(i * 0.11); } };

function pushRow(t) {
  const row = history.pop();
  const z = zRow++ * 0.16;
  const drift = Math.floor(t * 9);
  for (let p = 0; p < PTS; p++) {
    const x = p / (PTS - 1);
    const d = Math.abs(x - 0.5) * 2;
    const valley = 0.06 + 0.94 * Math.pow(d, 1.6);
    const land = 0.55 + 0.25 * Math.sin(x * 6.3 + z * 0.9 + 1.7) * Math.cos(x * 2.9 - z * 0.5) + 0.2 * Math.sin(x * 15.1 - z * 1.3 + 0.4) * Math.sin(z * 0.7 + x * 4);
    const v = at(0.03 + (1 - d) * 0.6) * jitter[(p + drift) % PTS];
    row[p] = valley * (1.0 * land * land + 0.8 * v);
  }
  history.unshift(row);
}

function drawScene(t, dt) {
  const { w, h, d } = fit(scene, 1.5);
  const c = sctx;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, w, h);

  par.x = lerp(par.x, parT.x, 0.05); par.y = lerp(par.y, parT.y, 0.05);
  hover = lerp(hover, hoverT, 0.15);
  rot += dt * (0.025 + sp.level * 0.45 * sp.blend);

  // Geometry: the sun sits on the horizon, as big as the room under the text allows.
  const textBottom = heroTextBottom * d;
  const horizon = Math.min(h, innerHeight * d) * (w < h ? 0.85 : 0.76);
  const k = clamp(Math.min((horizon - textBottom - 12 * d) / 176, (w * 0.62) / 300), 0.42 * d, 2.3 * d);
  const cx = w / 2 + par.x * 26 * d;
  const cy = horizon - 38 * k + par.y * 10 * d;

  const key = `${Math.round(cx / d)},${Math.round(cy / d)},${Math.round((132 * k) / d)}`;
  if (key !== hitKey) {
    hitKey = key;
    discHit.style.left = cx / d + "px";
    discHit.style.top = cy / d + "px";
    discHit.style.width = discHit.style.height = (132 * k) / d + "px";
  }

  // Sky: the sun's light, breathing with the bass.
  const glowA = (C.light ? 0.2 : 0.34) * (0.8 + sp.bass * 0.6);
  const sky = c.createRadialGradient(cx, cy, 20 * k, cx, cy, Math.max(w, h) * 0.6);
  sky.addColorStop(0, `rgba(255,85,0,${glowA})`);
  sky.addColorStop(0.35, `rgba(255,85,0,${glowA * 0.3})`);
  sky.addColorStop(1, "rgba(255,85,0,0)");
  c.fillStyle = sky;
  c.fillRect(0, 0, w, horizon + 4 * d);

  // Horizon line, lit in the middle.
  const hl = c.createLinearGradient(0, 0, w, 0);
  hl.addColorStop(0, "rgba(255,85,0,0)"); hl.addColorStop(0.5, "rgba(255,154,31,.9)"); hl.addColorStop(1, "rgba(255,85,0,0)");
  c.fillStyle = hl;
  c.fillRect(0, horizon - d, w, 1.5 * d);

  // The sun, in logo units.
  c.save();
  c.setTransform(k, 0, 0, k, cx - 128 * k, cy - 128 * k);
  const grad = c.createLinearGradient(20, 236, 236, 20);
  grad.addColorStop(0, "#FF3D00"); grad.addColorStop(0.55, "#FF5500"); grad.addColorStop(1, "#FF9A1F");

  if (sp.lv.kick) rings.push({ t0: t });
  if (!sp.lv.playing && !reduceMotion && Math.floor(t / 1.8) !== Math.floor((t - dt) / 1.8)) rings.push({ t0: t, soft: true });
  rings = rings.filter((r) => t - r.t0 < 1.6);
  for (const r of rings) {
    const p = (t - r.t0) / 1.6;
    const e = 1 - Math.pow(1 - p, 3);
    c.beginPath();
    c.arc(128, 128, 66 + e * 150, 0, Math.PI * 2);
    c.strokeStyle = grad;
    c.globalAlpha = (1 - p) * (r.soft ? 0.22 : 0.6);
    c.lineWidth = (r.soft ? 1.4 : 3) * (1 - p) + 0.5;
    c.stroke();
  }
  c.globalAlpha = 1;

  // Oscilloscope halo
  const N = 140;
  c.fillStyle = C.light ? "#8F867C" : "#B3AAA0";
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2 - rot * 0.6;
    let v = 0;
    if (sp.lv.wave && sp.blend > 0.05) v = ((sp.lv.wave[Math.floor((i / N) * sp.lv.wave.length)] - 128) / 128) * sp.blend;
    v += Math.sin(t * 2 + i * 0.4) * 0.03 * (1 - sp.blend);
    const r = 124 + v * 16;
    c.globalAlpha = 0.28 + Math.abs(v) * 0.7;
    c.beginPath();
    c.arc(128 + Math.cos(a) * r, 128 + Math.sin(a) * r, 0.8 + Math.abs(v) * 1.6, 0, Math.PI * 2);
    c.fill();
  }
  c.globalAlpha = 1;

  // Rays: the logo's bars, stretched by the spectrum.
  c.strokeStyle = grad;
  c.lineCap = "round";
  c.lineWidth = 6.9;
  for (let i = 0; i < LOGO.length; i++) {
    const L = LOGO[i];
    const a = L.a + rot;
    const m = i < 14 ? i / 14 : (28 - i) / 14;
    const v = at(m * 0.85);
    const r1 = L.r1 - sp.bass * 4;
    const r2 = L.r2 + v * 40 + hover * 6;
    c.beginPath();
    c.moveTo(128 + Math.cos(a) * r1, 128 + Math.sin(a) * r1);
    c.lineTo(128 + Math.cos(a) * r2, 128 + Math.sin(a) * r2);
    c.stroke();
  }

  // The disc and its play / pause cut-out.
  const R = 64 * (1 + sp.bass * 0.07 * sp.blend + hover * 0.05);
  const halo = c.createRadialGradient(128, 128, R * 0.8, 128, 128, R * (1.7 + sp.bass * 0.9));
  halo.addColorStop(0, "rgba(255,85,0,.5)");
  halo.addColorStop(1, "rgba(255,85,0,0)");
  c.fillStyle = halo;
  c.beginPath(); c.arc(128, 128, R * (1.7 + sp.bass * 0.9), 0, Math.PI * 2); c.fill();
  c.beginPath(); c.arc(128, 128, R, 0, Math.PI * 2);
  c.fillStyle = grad; c.fill();
  c.save();
  c.globalCompositeOperation = "destination-out";
  c.fillStyle = "#000";
  c.translate(128, 128);
  c.scale(R / 64, R / 64);
  if (sp.lv.playing) {
    roundRect(c, -17, -24, 12, 48, 3); c.fill();
    roundRect(c, 5, -24, 12, 48, 3); c.fill();
  } else {
    c.beginPath();
    c.lineJoin = "round"; c.lineWidth = 10; c.strokeStyle = "#000";
    c.moveTo(-12, -27); c.lineTo(-12, 27); c.lineTo(31, 0); c.closePath();
    c.fill(); c.stroke();
  }
  c.restore();
  c.restore();

  // Embers rising from the valley; more of them when the music is loud.
  if (!reduceMotion) {
    const rate = 4 + sp.level * 40 * sp.blend + sp.bass * 6;
    let n = rate * dt;
    while (n > 0 && sparks.length < 180) {
      if (Math.random() < n) {
        sparks.push({
          x: cx + (Math.random() - 0.5) * w * 0.45, y: horizon - Math.random() * 10 * d,
          vx: (Math.random() - 0.5) * 14 * d, vy: -(14 + Math.random() * 46) * d * (1 + sp.blend),
          life: 2 + Math.random() * 2.5, age: 0, s: (0.7 + Math.random() * 1.5) * d,
          col: Math.random() < 0.7 ? "255,122,26" : "255,193,69",
        });
      }
      n -= 1;
    }
  }
  sparks = sparks.filter((s) => (s.age += dt) < s.life);
  for (const s of sparks) {
    s.x += (s.vx + Math.sin(t * 1.3 + s.y * 0.01) * 8 * d) * dt;
    s.y += s.vy * dt;
    const a = Math.sin((s.age / s.life) * Math.PI) * 0.85;
    c.fillStyle = `rgba(${s.col},${a})`;
    c.beginPath(); c.arc(s.x, s.y, s.s, 0, Math.PI * 2); c.fill();
  }

  // The landscape, far to near, each ridge hiding what is behind it.
  rowClock += dt * 1000;
  while (rowClock > ROW_MS) { rowClock -= ROW_MS; pushRow(t); }
  const frac = rowClock / ROW_MS;
  const line = c.createLinearGradient(0, 0, w, 0);
  const neutral = C.light ? "rgba(40,25,10,1)" : "rgba(255,236,220,1)";
  line.addColorStop(0, neutral); line.addColorStop(0.3, neutral);
  line.addColorStop(0.5, "#FF7A1A");
  line.addColorStop(0.7, neutral); line.addColorStop(1, neutral);
  const depthSpan = h - horizon + 60 * d;
  for (let i = 0; i < ROWS; i++) {
    const p = (i + frac) / ROWS; // 0 at the horizon, 1 at your feet
    const persp = Math.pow(p, 1.7);
    const y0 = horizon + depthSpan * persp;
    const spread = w * (1.05 + 1.5 * persp);
    const amp = (h - horizon) * (0.25 + 2.2 * persp);
    const shift = -par.x * 70 * d * persp;
    const row = history[i];
    c.beginPath();
    for (let q = 0; q < PTS; q++) {
      const x = w / 2 + shift + (q / (PTS - 1) - 0.5) * spread;
      const y = y0 - row[q] * amp;
      q === 0 ? c.moveTo(x, y) : c.lineTo(x, y);
    }
    c.lineTo(w / 2 + shift + spread / 2, h + 2);
    c.lineTo(w / 2 + shift - spread / 2, h + 2);
    c.closePath();
    c.fillStyle = C["canvas-deep"];
    c.fill();
    c.strokeStyle = line;
    c.globalAlpha = Math.min(1, p * 6) * ((C.light ? 0.12 : 0.1) + p * (C.light ? 0.34 : 0.3));
    c.lineWidth = (0.8 + p * 1.2) * d;
    c.stroke();
    c.globalAlpha = 1;
  }
}
function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}

onRelayout(measureHero);
onFrame((t, dt) => { if (visible.has(scene)) drawScene(t, dt); });
onStatic(() => drawScene(0, 0));
prefill();

discHit.addEventListener("click", () => Mix.toggle());
Mix.onChange((on) => {
  document.body.classList.toggle("playing", on);
  $("#disc-state").textContent = on ? "now playing" : "paused";
  discHit.setAttribute("aria-label", on ? "Pause the live mix" : "Play the live mix");
  discHit.dataset.tip = on ? "Pause" : "Play the live mix";
});
