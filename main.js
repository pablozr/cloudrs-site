// cloudrs landing page: visuals, player, palette. No dependencies.
"use strict";

(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const DPR = () => Math.min(window.devicePixelRatio || 1, 2);
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const root = document.documentElement;

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  };

  // ---------- theme ----------
  const C = {};
  function readColors() {
    const cs = getComputedStyle(root);
    for (const k of ["accent", "canvas-deep", "canvas", "surface", "surface-raised", "surface-hover", "text", "text-muted", "text-subtle", "line-strong"]) {
      C[k] = cs.getPropertyValue("--" + k).trim();
    }
    C.light = root.dataset.theme === "light";
  }
  readColors();

  function setTheme(t) {
    root.dataset.theme = t;
    store.set("cloudrs-theme", t);
    $('meta[name="theme-color"]').setAttribute("content", t === "light" ? "#F2EDE6" : "#0D0C0B");
    readColors();
    loadShots();
    if (reduceMotion) drawStatic();
  }
  $("#theme-toggle").addEventListener("click", () => setTheme(root.dataset.theme === "light" ? "dark" : "light"));

  // ---------- toast ----------
  let toastTimer;
  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
  }

  // ---------- reveal ----------
  const revealIO = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add("in"); revealIO.unobserve(e.target); }
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
  $$(".reveal").forEach((el) => revealIO.observe(el));

  // ---------- canvas helpers ----------
  const visible = new Set();
  const visIO = new IntersectionObserver((entries) => {
    for (const e of entries) e.isIntersecting ? visible.add(e.target) : visible.delete(e.target);
  });
  // Sizes are cached by a ResizeObserver so drawing never forces a layout.
  const sizes = new WeakMap();
  const sizeRO = new ResizeObserver((entries) => {
    for (const e of entries) sizes.set(e.target, { width: e.contentRect.width, height: e.contentRect.height });
  });
  function fit(canvas, maxDpr = 2) {
    let r = sizes.get(canvas);
    if (!r) { r = canvas.getBoundingClientRect(); sizes.set(canvas, r); sizeRO.observe(canvas); }
    const d = Math.min(DPR(), maxDpr);
    const w = Math.max(1, Math.round(r.width * d)), h = Math.max(1, Math.round(r.height * d));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    return { w, h, d };
  }

  // ---------- spectrum: real when playing, a calm breathing one when not ----------
  const BINS = 128;
  const spec = new Float32Array(BINS);
  let blend = 0; // 0 = idle, 1 = live
  let lv = { playing: false, bass: 0, mid: 0, high: 0, level: 0, kick: 0, wave: null };
  let bassS = 0, levelS = 0;

  function updateSpectrum(t) {
    lv = Mix.levels();
    blend = lerp(blend, lv.playing ? 1 : 0, 0.06);
    for (let i = 0; i < BINS; i++) {
      const x = i / BINS;
      const idle = clamp(0.2 + 0.13 * Math.sin(t * 1.1 + x * 9) * Math.sin(t * 0.63 + x * 21) + 0.07 * Math.sin(t * 2.7 + x * 47), 0, 1) * (1 - x * 0.55);
      let live = 0;
      if (lv.freq) {
        const b = Math.floor(2 + Math.pow(x, 1.7) * 330);
        live = lv.freq[b] / 255;
      }
      spec[i] = lerp(idle, live, blend);
    }
    const idleBass = 0.15 + 0.1 * Math.sin(t * 1.9);
    bassS = lerp(bassS, lerp(idleBass, lv.bass, blend), 0.3);
    levelS = lerp(levelS, lerp(0.2, lv.level, blend), 0.2);
  }
  const at = (x) => spec[clamp(Math.floor(x * BINS), 0, BINS - 1)];

  // ---------- hero scene: the logo rises like a sun over a landscape of sound ----------
  // The 28 strokes of assets/brand/logo.svg (inner and outer points, 256-unit box).
  const LOGO = [[128,51.2,128,17.6],[145.1,53.1,153.5,16.4],[161.3,58.8,179.2,21.8],[175.9,68,198.4,39.8],[188,80.1,213.4,59.9],[197.2,94.7,221,83.2],[202.9,110.9,224.7,105.9],[204.8,128,229.2,128],[202.9,145.1,226.3,150.4],[197.2,161.3,220.6,172.6],[188,175.9,205.4,189.7],[175.9,188,187.1,202.1],[161.3,197.2,168.8,212.8],[145.1,202.9,148.9,219.7],[128,204.8,128,222.1],[110.9,202.9,105.7,225.8],[94.7,197.2,81.1,225.3],[80.1,188,57.7,216.1],[68,175.9,41.1,197.3],[58.8,161.3,30.4,175],[53.1,145.1,21.7,152.3],[51.2,128,21.8,128],[53.1,110.9,18.5,103],[58.8,94.7,26.3,79],[68,80.1,40.1,57.9],[80.1,68,60.2,43],[94.7,58.8,83.3,35.2],[110.9,53.1,106,31.8]]
    .map(([x1, y1, x2, y2]) => ({ a: Math.atan2(y2 - 128, x2 - 128), r1: Math.hypot(x1 - 128, y1 - 128), r2: Math.hypot(x2 - 128, y2 - 128) }));

  const scene = $("#scene");
  const sctx = scene.getContext("2d");
  visIO.observe(scene);
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
    rot += dt * (0.025 + levelS * 0.45 * blend);

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
    const glowA = (C.light ? 0.2 : 0.34) * (0.8 + bassS * 0.6);
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

    if (lv.kick) rings.push({ t0: t });
    if (!lv.playing && !reduceMotion && Math.floor(t / 1.8) !== Math.floor((t - dt) / 1.8)) rings.push({ t0: t, soft: true });
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
      if (lv.wave && blend > 0.05) v = ((lv.wave[Math.floor((i / N) * lv.wave.length)] - 128) / 128) * blend;
      v += Math.sin(t * 2 + i * 0.4) * 0.03 * (1 - blend);
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
      const r1 = L.r1 - bassS * 4;
      const r2 = L.r2 + v * 40 + hover * 6;
      c.beginPath();
      c.moveTo(128 + Math.cos(a) * r1, 128 + Math.sin(a) * r1);
      c.lineTo(128 + Math.cos(a) * r2, 128 + Math.sin(a) * r2);
      c.stroke();
    }

    // The disc and its play / pause cut-out.
    const R = 64 * (1 + bassS * 0.07 * blend + hover * 0.05);
    const halo = c.createRadialGradient(128, 128, R * 0.8, 128, 128, R * (1.7 + bassS * 0.9));
    halo.addColorStop(0, "rgba(255,85,0,.5)");
    halo.addColorStop(1, "rgba(255,85,0,0)");
    c.fillStyle = halo;
    c.beginPath(); c.arc(128, 128, R * (1.7 + bassS * 0.9), 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(128, 128, R, 0, Math.PI * 2);
    c.fillStyle = grad; c.fill();
    c.save();
    c.globalCompositeOperation = "destination-out";
    c.fillStyle = "#000";
    c.translate(128, 128);
    c.scale(R / 64, R / 64);
    if (lv.playing) {
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
      const rate = 4 + levelS * 40 * blend + bassS * 6;
      let n = rate * dt;
      while (n > 0 && sparks.length < 180) {
        if (Math.random() < n) {
          sparks.push({
            x: cx + (Math.random() - 0.5) * w * 0.45, y: horizon - Math.random() * 10 * d,
            vx: (Math.random() - 0.5) * 14 * d, vy: -(14 + Math.random() * 46) * d * (1 + blend),
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

  // ---------- jam constellation ----------
  const jam = $("#jam-canvas");
  const jctx = jam.getContext("2d");
  visIO.observe(jam);
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

    const beat = lv.playing ? lv.kick : (Math.floor(t / BEAT) !== lastBeat ? 1 : 0);
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
    const hr = S * 0.09 * (1 + bassS * 0.12);
    const hg = jctx.createLinearGradient(cx - hr, cy + hr, cx + hr, cy - hr);
    hg.addColorStop(0, "#FF3D00"); hg.addColorStop(0.55, "#FF5500"); hg.addColorStop(1, "#FF9A1F");
    const hgr = hr * (1.8 + bassS * 0.6);
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

  // ---------- page player ----------
  const player = $("#player");
  const wave = $("#wave");
  const wctx = wave.getContext("2d");
  const waveBox = $("#p-wave");
  const sections = $$("[data-section]");
  const TOTAL = 260; // 04:20
  let progress = 0, hoverX = -1;

  // A fixed, hand-shaped "track": quiet intro, drops, a breakdown, a long outro.
  function waveHeight(x) {
    const h = Math.abs(Math.sin(x * 913.7) * 7919.3 % 1);
    const env = x < 0.06 ? 0.3 + x * 6 : x > 0.93 ? 0.35 + (1 - x) * 6 : 0.62 + 0.38 * Math.sin(x * 15 + 1) * Math.sin(x * 4.4);
    return clamp(0.18 + env * (0.45 + 0.55 * h), 0.08, 1);
  }

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  const maxScroll = () => Math.max(1, document.documentElement.scrollHeight - innerHeight);

  let waveKey = "";
  function drawWave(t) {
    const key = `${progress.toFixed(4)}|${hoverX}|${C.light}|${sizes.get(wave)?.width}`;
    if (blend < 0.01 && key === waveKey) return;
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
      if (blend > 0.05 && near < 0.05) v = clamp(v * (1 + (1 - near / 0.05) * at(near * 10) * 0.8 * blend), 0, 1.15);
      let style;
      if (x < playX) style = grad;
      else if (hoverX >= 0 && x < hx) style = C.light ? "rgba(232,77,0,.45)" : "rgba(255,85,0,.45)";
      else style = C["text-subtle"];
      wctx.fillStyle = style;
      wctx.globalAlpha = x < playX ? 1 : 0.55;
      wctx.fillRect(x, top - v * top, bw, v * top);
      wctx.globalAlpha *= 0.45;
      wctx.fillRect(x, top + d, bw, v * bottom);
    }
    wctx.globalAlpha = 1;
  }

  function buildPins() {
    const box = $("#pins");
    box.innerHTML = "";
    sections.forEach((s, i) => {
      const p = clamp(tops.sections[i] / tops.max, 0, 1);
      if (p <= 0.001) return;
      const b = document.createElement("button");
      b.className = "pin";
      b.style.left = p * 100 + "%";
      b.dataset.p = p;
      b._p = p;
      b.dataset.tip = `${fmt(p * TOTAL)} · ${s.dataset.section}`;
      b.setAttribute("aria-label", `Jump to ${s.dataset.section}`);
      b.addEventListener("click", (e) => { e.stopPropagation(); s.scrollIntoView({ behavior: "smooth" }); });
      box.appendChild(b);
    });
    pinEls = $$(".pin", box);
  }

  // Page positions, measured on relayout so scrolling never reads layout.
  const tops = { sections: [], stage: 0, foot: 0, max: 1 };
  function measureScroll() {
    const y = scrollY;
    tops.sections = sections.map((s) => s.getBoundingClientRect().top + y);
    tops.stage = $(".stage").getBoundingClientRect().top + y;
    tops.foot = $(".footer-mark").getBoundingClientRect().top + y;
    tops.max = maxScroll();
  }
  function currentSectionIndex() {
    const mid = scrollY + innerHeight * 0.4;
    let idx = 0;
    tops.sections.forEach((top, i) => { if (top <= mid) idx = i; });
    return idx;
  }
  const elapsedEl = $("#p-elapsed"), titleEl = $("#p-title"), navEl = $("#nav"), navLinks = $$(".nav-links a");
  let pinEls = [], lastIdx = -1, lastElapsed = "";

  function onScroll() {
    progress = clamp(scrollY / tops.max, 0, 1);
    const el = fmt(progress * TOTAL);
    if (el !== lastElapsed) {
      lastElapsed = el;
      elapsedEl.textContent = el;
      waveBox.setAttribute("aria-valuenow", Math.round(progress * 100));
    }
    pinEls.forEach((p) => p.classList.toggle("passed", progress >= p._p - 0.002));
    const idx = currentSectionIndex();
    if (idx !== lastIdx) {
      lastIdx = idx;
      titleEl.textContent = sections[idx].dataset.section;
      const id = sections[idx].id;
      navLinks.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + id));
    }
    navEl.classList.toggle("scrolled", scrollY > 20);
    player.classList.toggle("shown", scrollY > innerHeight * 0.55 || Mix.playing);
    tiltWindow();
    footerFill();
    if (reduceMotion) drawWave(0);
  }
  let scrollQueued = false;
  addEventListener("scroll", () => {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(() => { scrollQueued = false; onScroll(); });
  }, { passive: true });

  function seekTo(clientX) {
    const r = waveBox.getBoundingClientRect();
    const p = clamp((clientX - r.left) / r.width, 0, 1);
    scrollTo({ top: p * maxScroll(), behavior: "smooth" });
  }
  let dragging = false;
  waveBox.addEventListener("pointerdown", (e) => { dragging = true; waveBox.setPointerCapture(e.pointerId); seekTo(e.clientX); });
  waveBox.addEventListener("pointermove", (e) => {
    const r = waveBox.getBoundingClientRect();
    hoverX = e.clientX - r.left;
    if (dragging) scrollTo({ top: clamp(hoverX / r.width, 0, 1) * maxScroll() });
  });
  waveBox.addEventListener("pointerup", () => (dragging = false));
  waveBox.addEventListener("pointerleave", () => (hoverX = -1));
  waveBox.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      scrollBy({ top: (e.key === "ArrowLeft" ? -1 : 1) * maxScroll() * 0.05, behavior: "smooth" });
    }
  });

  $("#p-prev").addEventListener("click", () => {
    const i = currentSectionIndex();
    const s = sections[i];
    const target = s.getBoundingClientRect().top < -40 ? s : sections[Math.max(0, i - 1)];
    target.scrollIntoView({ behavior: "smooth" });
  });
  $("#p-next").addEventListener("click", () => sections[Math.min(sections.length - 1, currentSectionIndex() + 1)].scrollIntoView({ behavior: "smooth" }));

  // ---------- play / volume ----------
  const togglePlay = () => Mix.toggle();
  $("#p-play").addEventListener("click", togglePlay);
  discHit.addEventListener("click", togglePlay);
  Mix.onChange((on) => {
    document.body.classList.toggle("playing", on);
    $("#disc-state").textContent = on ? "now playing" : "paused";
    const label = on ? "Pause the live mix" : "Play the live mix";
    $("#p-play").setAttribute("aria-label", label);
    discHit.setAttribute("aria-label", label);
    $("#p-play").dataset.tip = on ? "Pause (Space)" : "Play (Space)";
    discHit.dataset.tip = on ? "Pause" : "Play the live mix";
    player.classList.toggle("shown", scrollY > innerHeight * 0.55 || on);
    if (on && !loopRunning) startLoop();
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

  // ---------- showcase ----------
  const shotImgs = $$("#screen img");
  function loadShots() {
    const theme = root.dataset.theme === "light" ? "light" : "dark";
    shotImgs.forEach((img) => {
      const src = `assets/shots/${img.dataset.shot}-${theme}.png`;
      if (img.classList.contains("on") || img.dataset.loaded) { img.src = src; img.dataset.loaded = "1"; }
      else img.dataset.pending = src;
    });
  }
  loadShots();
  // Fetch the other screens once the page is idle.
  (window.requestIdleCallback || setTimeout)(() => shotImgs.forEach((img) => { if (img.dataset.pending) { img.src = img.dataset.pending; img.dataset.loaded = "1"; } }), { timeout: 2500 });

  const tabs = $$(".shot-tabs [role=tab]");
  const pill = $(".tab-pill");
  function movePill() {
    const sel = tabs.find((t) => t.getAttribute("aria-selected") === "true");
    pill.style.width = sel.offsetWidth + "px";
    pill.style.transform = `translateX(${sel.offsetLeft}px)`;
  }
  tabs.forEach((tab) => tab.addEventListener("click", () => {
    tabs.forEach((t) => t.setAttribute("aria-selected", t === tab));
    shotImgs.forEach((img) => {
      const on = img.dataset.shot === tab.dataset.shot;
      if (on && !img.dataset.loaded) { img.src = img.dataset.pending; img.dataset.loaded = "1"; }
      img.classList.toggle("on", on);
    });
    movePill();
  }));
  $(".shot-tabs").addEventListener("keydown", (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    const i = tabs.findIndex((t) => t.getAttribute("aria-selected") === "true");
    const n = tabs[(i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length];
    n.click(); n.focus();
  });

  const win = $("#window");
  function tiltWindow() {
    if (reduceMotion) return;
    const p = clamp((innerHeight - (tops.stage - scrollY)) / (innerHeight * 0.85), 0, 1);
    const e = 1 - Math.pow(1 - p, 3);
    win.style.setProperty("--rx", (1 - e) * 22 + "deg");
    win.style.setProperty("--sc", 0.9 + e * 0.1);
  }

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

  // ---------- rack cables ----------
  const rack = $("#rack");
  const svg = $("#cables");
  visIO.observe(rack);
  const PATCH = [
    ["app", "ui", "#FF9A1F"], ["app", "core", "#FF5500"], ["app", "platform", "#FFC145"],
    ["core-out", "api", "#FF3D00"], ["core-out", "audio", "#FF8A52"], ["core-out", "session", "#E84D00"],
  ];
  const cables = PATCH.map(([a, b, color]) => ({ a, b, color, sag: 0, vel: 0 }));
  const NS = "http://www.w3.org/2000/svg";
  cables.forEach((c) => {
    c.path = document.createElementNS(NS, "path"); c.path.setAttribute("class", "cable"); c.path.setAttribute("stroke", c.color);
    c.sig = document.createElementNS(NS, "path"); c.sig.setAttribute("class", "signal");
    c.p1 = document.createElementNS(NS, "circle"); c.p2 = document.createElementNS(NS, "circle");
    [c.p1, c.p2].forEach((p) => { p.setAttribute("r", 6); p.setAttribute("fill", c.color); p.setAttribute("class", "plug"); });
    svg.append(c.path, c.sig, c.p1, c.p2);
  });
  let jacks = {};
  function measureRack() {
    const rr = rack.getBoundingClientRect();
    svg.setAttribute("viewBox", `0 0 ${rr.width} ${rr.height}`);
    jacks = {};
    $$(".jack", rack).forEach((j) => {
      const r = j.getBoundingClientRect();
      jacks[j.dataset.jack] = { x: r.left - rr.left + r.width / 2, y: r.top - rr.top + r.height / 2 };
    });
    layoutCables();
  }
  function layoutCables() {
    cables.forEach((c) => {
      const A = jacks[c.a], B = jacks[c.b];
      if (!A || !B) return;
      const dy = Math.abs(B.y - A.y), dx = B.x - A.x;
      const k = Math.max(40, dy * 0.55);
      const sag = Math.min(70, Math.abs(dx) * 0.12) + c.sag;
      const d = `M${A.x},${A.y} C${A.x + dx * 0.08},${A.y + k + sag} ${B.x - dx * 0.08},${B.y - k * 0.6 + sag * 0.4} ${B.x},${B.y}`;
      c.path.setAttribute("d", d); c.sig.setAttribute("d", d);
      c.p1.setAttribute("cx", A.x); c.p1.setAttribute("cy", A.y);
      c.p2.setAttribute("cx", B.x); c.p2.setAttribute("cy", B.y);
    });
  }
  // Touch a module and its cables wobble on a spring.
  $$(".module", rack).forEach((m) => m.addEventListener("pointerenter", () => {
    const id = m.dataset.id;
    cables.forEach((c) => {
      if (c.a.startsWith(id) || c.b === id) c.vel += 260 + Math.random() * 120;
    });
  }));
  function animateCables(dt) {
    let moving = false;
    cables.forEach((c) => {
      const acc = -120 * c.sag - 7 * c.vel;
      c.vel += acc * dt; c.sag += c.vel * dt;
      if (Math.abs(c.sag) > 0.05 || Math.abs(c.vel) > 0.05) moving = true;
    });
    if (moving) layoutCables();
  }
  const modules = $$(".module", rack);
  let rackFrame = 0;
  function animateRack(t) {
    if (rackFrame++ % 2) return;
    modules.forEach((m, i) => {
      const v = at((i * 0.13 + 0.02) % 1);
      m.style.setProperty("--led", (0.25 + v * 0.95).toFixed(2));
      $$(".knob", m).forEach((kn, j) => kn.style.setProperty("--k", (-60 + at(((i + j) * 0.09) % 1) * 240).toFixed(1) + "deg"));
    });
  }

  // ---------- roadmap wave ----------
  const tl = $("#timeline-wave");
  const tlctx = tl.getContext("2d");
  visIO.observe(tl);
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
    const pr = (5 + Math.sin(t * 4) * 1.2 + bassS * 6) * d;
    tlctx.beginPath(); tlctx.arc(px, mid, pr + 6 * d, 0, Math.PI * 2);
    tlctx.fillStyle = "rgba(255,85,0,.18)"; tlctx.fill();
    tlctx.beginPath(); tlctx.arc(px, mid, pr, 0, Math.PI * 2);
    tlctx.fillStyle = C.accent; tlctx.fill();
    tlctx.font = `600 ${11 * d}px "Geist", sans-serif`;
    tlctx.fillStyle = C.accent;
    tlctx.textAlign = px > w - 120 * d ? "right" : "left";
    tlctx.fillText("NOW PLAYING", px + (tlctx.textAlign === "left" ? 10 : -10) * d, 12 * d);
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
  visIO.observe(ticket);
  if (reduceMotion) ticket.textContent = ticketText;

  // ---------- footer ----------
  const footMark = $(".footer-mark");
  function footerFill() {
    const p = clamp((innerHeight - (tops.foot - scrollY)) / (innerHeight * 0.7), 0, 1);
    footMark.style.setProperty("--fill", (p * 100).toFixed(1) + "%");
  }

  // ---------- copy ----------
  $("#copy-cmd").addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    try {
      await navigator.clipboard.writeText("git clone https://github.com/pablozr/cloudrs\ncd cloudrs\ncargo run -p cloudrs");
      btn.classList.add("copied");
      toast("Commands copied");
      setTimeout(() => btn.classList.remove("copied"), 1800);
    } catch (err) { toast("Couldn't copy, select the text instead"); }
  });

  // ---------- keys ----------
  const capsFor = (key) => $$(".cap").filter((c) => c.dataset.key.toLowerCase() === key.toLowerCase());
  const editable = (el) => el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
  addEventListener("keydown", (e) => {
    capsFor(e.key).forEach((c) => c.classList.add("down"));
    if (e.ctrlKey || e.metaKey) capsFor("Control").forEach((c) => c.classList.add("down"));
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); openPalette(); return; }
    if (editable(e.target)) return;
    if (e.key === "/" && palette.hidden) { e.preventDefault(); openPalette(); return; }
    if (e.key === " " && !/^(BUTTON|A|SUMMARY)$/.test(e.target.tagName)) { e.preventDefault(); togglePlay(); }
  });
  addEventListener("keyup", (e) => {
    capsFor(e.key).forEach((c) => c.classList.remove("down"));
    if (!e.ctrlKey && !e.metaKey) capsFor("Control").forEach((c) => c.classList.remove("down"));
  });
  addEventListener("blur", () => $$(".cap.down").forEach((c) => c.classList.remove("down")));
  $$(".cap").forEach((c) => {
    c.addEventListener("pointerdown", () => c.classList.add("down"));
    c.addEventListener("pointerup", () => { c.classList.remove("down"); if (c.dataset.key === " ") togglePlay(); });
    c.addEventListener("pointerleave", () => c.classList.remove("down"));
  });

  // ---------- command palette ----------
  const palette = $("#palette");
  const pInput = $("#palette-input");
  const pList = $("#palette-list");
  let pItems = [], pSel = 0, lastFocus = null;
  const actions = () => [
    ...sections.filter((s) => s.id).map((s) => ({ label: s.dataset.section, kind: "Section", run: () => s.scrollIntoView({ behavior: "smooth" }) })),
    { label: Mix.playing ? "Pause the live mix" : "Play the live mix", kind: "Action", run: togglePlay },
    { label: "Toggle light and dark theme", kind: "Action", run: () => $("#theme-toggle").click() },
    { label: "Copy the clone commands", kind: "Action", run: () => $("#copy-cmd").click() },
    { label: "Open cloudrs on GitHub", kind: "Link", run: () => window.open("https://github.com/pablozr/cloudrs", "_blank", "noopener") },
  ];
  function renderPalette() {
    const q = pInput.value.trim().toLowerCase();
    pItems = actions().filter((a) => !q || a.label.toLowerCase().includes(q) || a.kind.toLowerCase().includes(q));
    pSel = clamp(pSel, 0, Math.max(0, pItems.length - 1));
    pList.innerHTML = "";
    if (!pItems.length) { pList.innerHTML = `<li class="empty">Nothing matches “${q.replace(/[<>&"]/g, "")}”</li>`; return; }
    pItems.forEach((a, i) => {
      const li = document.createElement("li");
      li.setAttribute("role", "option");
      li.setAttribute("aria-selected", i === pSel);
      li.className = i === pSel ? "sel" : "";
      li.innerHTML = `<span class="bullet"></span><span></span><span class="kind">${a.kind}</span>`;
      li.children[1].textContent = a.label;
      li.addEventListener("pointermove", () => { if (pSel !== i) { pSel = i; renderPalette(); } });
      li.addEventListener("click", () => runPalette(i));
      pList.appendChild(li);
    });
  }
  function openPalette() {
    if (!palette.hidden) return closePalette();
    lastFocus = document.activeElement;
    palette.hidden = false;
    pInput.value = ""; pSel = 0;
    renderPalette();
    pInput.focus();
  }
  function closePalette() {
    palette.hidden = true;
    $$(".cap.down").forEach((c) => c.classList.remove("down"));
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function runPalette(i) {
    const a = pItems[i];
    closePalette();
    if (a) a.run();
  }
  $("#open-palette").addEventListener("click", openPalette);
  pInput.addEventListener("input", () => { pSel = 0; renderPalette(); });
  palette.addEventListener("click", (e) => { if (e.target.hasAttribute("data-close")) closePalette(); });
  palette.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { e.preventDefault(); closePalette(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); pSel = (pSel + 1) % Math.max(1, pItems.length); renderPalette(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); pSel = (pSel - 1 + pItems.length) % Math.max(1, pItems.length); renderPalette(); }
    else if (e.key === "Enter") { e.preventDefault(); runPalette(pSel); }
    else if (e.key === "Tab") { e.preventDefault(); pInput.focus(); }
  });

  // ---------- cursor glow + magnetic buttons ----------
  const glow = $(".cursor-glow");
  if (matchMedia("(pointer: fine)").matches && !reduceMotion) {
    let gx = innerWidth / 2, gy = innerHeight / 2, tx = gx, ty = gy;
    let following = false;
    const follow = () => {
      gx = lerp(gx, tx, 0.12); gy = lerp(gy, ty, 0.12);
      glow.style.transform = `translate(${gx}px, ${gy}px)`;
      following = Math.abs(tx - gx) + Math.abs(ty - gy) > 0.5;
      if (following) requestAnimationFrame(follow);
    };
    addEventListener("pointermove", (e) => {
      tx = e.clientX; ty = e.clientY;
      document.body.classList.add("has-pointer");
      if (!following) { following = true; requestAnimationFrame(follow); }
    }, { passive: true });
    document.addEventListener("pointerleave", () => document.body.classList.remove("has-pointer"));
    $$(".magnetic").forEach((b) => {
      b.addEventListener("pointermove", (e) => {
        const r = b.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * 0.22, y = (e.clientY - r.top - r.height / 2) * 0.3;
        b.style.transform = `translate(${x}px, ${y}px)`;
      });
      b.addEventListener("pointerleave", () => (b.style.transform = ""));
    });
  }

  // ---------- main loop ----------
  let last = performance.now(), loopRunning = false;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = now / 1000;
    updateSpectrum(t);
    if (visible.has(scene)) drawScene(t, dt);
    if (visible.has(jam)) drawJam(t, dt);
    if (visible.has(tl)) drawTimeline(t);
    if (visible.has(rack)) { animateCables(dt); animateRack(t); }
    if (visible.has(ticket)) typeTicket(dt);
    if (player.classList.contains("shown")) drawWave(t);
    if (reduceMotion && !Mix.playing) { loopRunning = false; return; }
    requestAnimationFrame(frame);
  }
  function startLoop() { loopRunning = true; last = performance.now(); requestAnimationFrame(frame); }

  // Draw one still frame of everything (used on load, resize and theme change).
  function drawStatic() {
    updateSpectrum(0);
    drawScene(0, 0); drawJam(0, 0); drawTimeline(0); drawWave(0);
  }

  function relayout() {
    measureScroll();
    measureHero();
    measureTimeline();
    measureRack();
    buildPins();
    movePill();
    onScroll();
    if (reduceMotion) drawStatic();
  }
  let rT;
  const queueRelayout = () => { clearTimeout(rT); rT = setTimeout(relayout, 120); };
  addEventListener("resize", queueRelayout);
  new ResizeObserver(queueRelayout).observe(document.body);
  document.fonts && document.fonts.ready.then(relayout);
  addEventListener("load", relayout);
  relayout();
  prefill();
  if (reduceMotion) drawStatic();
  else startLoop();
})();
