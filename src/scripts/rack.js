// Architecture: crates as rack modules, patched with cables that wobble when touched.
import { $, $$, watch, visible } from "./lib.js";
import { at } from "./spectrum.js";
import { onFrame, onRelayout } from "./loop.js";

// ---------- rack cables ----------
const rack = $("#rack");
const svg = $("#cables");
watch(rack);
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

onRelayout(measureRack);
onFrame((t, dt) => {
  if (!visible.has(rack)) return;
  animateCables(dt);
  animateRack(t);
});
