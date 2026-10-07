// The footer wordmark fills with orange as it scrolls into view.
import { $, clamp, pageTop } from "./lib.js";
import { onRelayout, onScroll } from "./loop.js";

const mark = $(".footer-mark");
let top = 0;
onRelayout(() => { top = pageTop(mark); });
onScroll(() => {
  const p = clamp((innerHeight - (top - scrollY)) / (innerHeight * 0.7), 0, 1);
  mark.style.setProperty("--fill", (p * 100).toFixed(1) + "%");
});
