// The nav: theme toggle, glass once scrolled, and the active section link.
import { $, $$, root, store, readColors, reduceMotion, pageTop } from "./lib.js";
import { onRelayout, onScroll, drawStatic } from "./loop.js";

export function setTheme(t) {
  root.dataset.theme = t;
  store.set("cloudrs-theme", t);
  $('meta[name="theme-color"]').setAttribute("content", t === "light" ? "#F2EDE6" : "#0D0C0B");
  readColors();
  dispatchEvent(new Event("themechange"));
  if (reduceMotion) drawStatic();
}
export const toggleTheme = () => setTheme(root.dataset.theme === "light" ? "dark" : "light");

$("#theme-toggle").addEventListener("click", toggleTheme);

const nav = $("#nav");
// Section links point at "<base>#id"; only those whose section is on this page get tracked.
const links = $$(".nav-links a")
  .map((a) => ({ a, el: document.getElementById(a.hash.slice(1)) }))
  .filter((l) => l.el);
let tops = [];
onRelayout(() => { tops = links.map((l) => pageTop(l.el)); });
onScroll(() => {
  nav.classList.toggle("scrolled", scrollY > 20);
  const mid = scrollY + innerHeight * 0.4;
  let idx = -1;
  tops.forEach((top, i) => { if (top <= mid) idx = i; });
  links.forEach((l, i) => l.a.classList.toggle("active", i === idx));
});
