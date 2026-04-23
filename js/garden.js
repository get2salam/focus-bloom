// Focus Bloom — garden rendering. Placeholder for now.

import { el } from "./ui.js";

export function brandMarkSVG() {
  return el("svg", { viewBox: "0 0 28 28", width: "28", height: "28" }, [
    el("path", { d: "M14 24c0-6 4-10 10-10-1 6-5 10-10 10z", fill: "var(--leaf-2)" }),
    el("path", { d: "M14 24c0-6-4-10-10-10 1 6 5 10 10 10z", fill: "var(--leaf-1)" }),
    el("path", { d: "M13 24h2v-8h-2z", fill: "var(--soil-2)" }),
  ]);
}

export function renderPlantSVG(goal, opts = {}) {
  const size = opts.compact ? 56 : 120;
  const stageColors = {
    seed: "var(--soil-2)",
    sprout: "var(--leaf-3)",
    bud: "var(--leaf-2)",
    bloom: "var(--leaf-1)",
    harvest: "var(--accent-warm)",
  };

  return el("svg", {
    viewBox: "0 0 64 64",
    width: size,
    height: size,
    role: "img",
    "aria-label": `${goal.title} (${goal.stage})`,
  }, [
    el("circle", { cx: 32, cy: 48, r: 10, fill: "var(--soil-1)", opacity: "0.18" }),
    el("path", { d: "M28 49c0-12 8-18 8-26h4c0 10-8 16-8 26z", fill: "var(--leaf-2)" }),
    el("circle", { cx: 32, cy: 20, r: 12, fill: stageColors[goal.stage] || "var(--leaf-2)" }),
  ]);
}

export function renderGardenView(container) {
  container.replaceChildren(
    el("div", { class: "empty card" }, [
      el("div", { class: "leaf", "aria-hidden": "true" }, "🌷"),
      el("h3", {}, "The painted garden arrives in the next bloom"),
      el("p", { class: "muted" }, "Your list is already interactive. Switch to List view to plant, edit, and water goals."),
    ])
  );
}
