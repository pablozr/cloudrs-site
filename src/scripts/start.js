// Get started: copy the commands.
import { $, toast } from "./lib.js";
import { addActions } from "./palette.js";

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

addActions(() => [{ label: "Copy the clone commands", kind: "Action", run: () => $("#copy-cmd").click() }]);
