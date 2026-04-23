// Focus Bloom — bootstrap. Wires the store to the DOM.

import { init, getState, subscribe } from "./store.js";
import { renderTopbar, renderListView } from "./ui.js";
import { renderGardenView } from "./garden.js";
import { seedGarden } from "./seeds.js";
import { mountShortcuts } from "./shortcuts.js";

function bootstrap() {
  init({ seed: seedGarden });
  mountShortcuts();
  const app = document.getElementById("app");
  if (!app) return;

  app.replaceChildren();
  const header = document.createElement("div");
  const content = document.createElement("section");
  content.className = "content";
  const footer = document.createElement("footer");
  footer.className = "footer";
  footer.textContent = "Local-first. Your garden lives only in this browser.";
  app.append(header, content, footer);

  const render = () => {
    const { ui } = getState();
    renderTopbar(header);
    if (ui.view === "garden") renderGardenView(content);
    else renderListView(content);
  };

  subscribe(render);
  render();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap);
} else {
  bootstrap();
}
