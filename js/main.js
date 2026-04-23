// Focus Bloom — bootstrap. Wires the store to the DOM.
//
// For now this just initializes the store and confirms persistence works.
// Subsequent commits add the UI, garden, shortcuts, and import/export.

import { init, getState, subscribe } from "./store.js";

function bootstrap() {
  init();
  const app = document.getElementById("app");
  if (!app) return;

  const render = () => {
    const s = getState();
    const status = document.getElementById("boot-status");
    if (status) {
      const n = s.goals.length;
      status.textContent = n
        ? `Loaded ${n} goal${n === 1 ? "" : "s"} from local storage.`
        : "Storage ready. Plant your first seed in the next commit.";
    }
  };

  subscribe(render);
  render();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap);
} else {
  bootstrap();
}
