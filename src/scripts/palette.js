// The Ctrl K palette: this page's sections plus actions other scripts add.
import { $, $$, clamp } from "./lib.js";
import { toggleTheme } from "./nav.js";
import { page } from "../lib/url.js";

const extra = [];
/** Adds palette entries; `make` returns an array of { label, kind, run } each time it opens. */
export const addActions = (make) => extra.push(make);

const palette = $("#palette");
const input = $("#palette-input");
const list = $("#palette-list");
let items = [], sel = 0, lastFocus = null;

const onHome = !!$(".hero");
const actions = () => [
  ...$$("[data-section][id]").map((s) => ({ label: s.dataset.section, kind: "Section", run: () => s.scrollIntoView({ behavior: "smooth" }) })),
  ...extra.flatMap((make) => make()),
  onHome
    ? { label: "Download cloudrs", kind: "Page", run: () => (location.href = page("download")) }
    : { label: "Home", kind: "Page", run: () => (location.href = page("")) },
  { label: "Toggle light and dark theme", kind: "Action", run: toggleTheme },
  { label: "Open cloudrs on GitHub", kind: "Link", run: () => window.open("https://github.com/pablozr/cloudrs", "_blank", "noopener") },
];

function render() {
  const q = input.value.trim().toLowerCase();
  items = actions().filter((a) => !q || a.label.toLowerCase().includes(q) || a.kind.toLowerCase().includes(q));
  sel = clamp(sel, 0, Math.max(0, items.length - 1));
  list.replaceChildren();
  if (!items.length) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = `Nothing matches “${q}”`;
    list.append(li);
    return;
  }
  items.forEach((a, i) => {
    const li = document.createElement("li");
    li.setAttribute("role", "option");
    li.setAttribute("aria-selected", i === sel);
    li.className = i === sel ? "sel" : "";
    li.innerHTML = `<span class="bullet"></span><span></span><span class="kind"></span>`;
    li.children[1].textContent = a.label;
    li.children[2].textContent = a.kind;
    li.addEventListener("pointermove", () => { if (sel !== i) { sel = i; render(); } });
    li.addEventListener("click", () => run(i));
    list.append(li);
  });
}
export function openPalette() {
  if (!palette.hidden) return closePalette();
  lastFocus = document.activeElement;
  palette.hidden = false;
  input.value = ""; sel = 0;
  render();
  input.focus();
}
function closePalette() {
  palette.hidden = true;
  if (lastFocus && lastFocus.focus) lastFocus.focus();
}
function run(i) {
  const a = items[i];
  closePalette();
  if (a) a.run();
}

$("#open-palette").addEventListener("click", openPalette);
input.addEventListener("input", () => { sel = 0; render(); });
palette.addEventListener("click", (e) => { if (e.target.hasAttribute("data-close")) closePalette(); });
palette.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { e.preventDefault(); closePalette(); }
  else if (e.key === "ArrowDown") { e.preventDefault(); sel = (sel + 1) % Math.max(1, items.length); render(); }
  else if (e.key === "ArrowUp") { e.preventDefault(); sel = (sel - 1 + items.length) % Math.max(1, items.length); render(); }
  else if (e.key === "Enter") { e.preventDefault(); run(sel); }
  else if (e.key === "Tab") { e.preventDefault(); input.focus(); }
});

const editable = (el) => el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); openPalette(); return; }
  if (e.key === "/" && palette.hidden && !editable(e.target)) { e.preventDefault(); openPalette(); }
});
