// The app: screenshot tabs, theme-matched images and a window that tilts up as you scroll.
import { $, $$, clamp, root, reduceMotion, pageTop } from "./lib.js";
import { onRelayout, onScroll } from "./loop.js";
import { asset } from "../lib/url.js";

// ---------- showcase ----------
const shotImgs = $$("#screen img");
function loadShots() {
  const theme = root.dataset.theme === "light" ? "light" : "dark";
  shotImgs.forEach((img) => {
    const src = asset(`assets/shots/${img.dataset.shot}-${theme}.png`);
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
  const p = clamp((innerHeight - (stageTop - scrollY)) / (innerHeight * 0.85), 0, 1);
  const e = 1 - Math.pow(1 - p, 3);
  win.style.setProperty("--rx", (1 - e) * 22 + "deg");
  win.style.setProperty("--sc", 0.9 + e * 0.1);
}

let stageTop = 0;
onRelayout(() => { stageTop = pageTop($(".stage")); movePill(); });
onScroll(tiltWindow);
addEventListener("themechange", loadShots);
