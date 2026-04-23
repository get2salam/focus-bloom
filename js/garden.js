// Focus Bloom — garden rendering. Stub for now (commit 4); full SVG plants
// arrive in commit 6 when we wire up the garden tableau.

import { el } from "./ui.js";

export function brandMarkSVG() {
  // Tiny logo: two leaves with a stem.
  return el("svg", { viewBox: "0 0 28 28", width: "28", height: "28" }, [
    el("path", { d: "M14 24c0-6 4-10 10-10-1 6-5 10-10 10z", fill: "var(--leaf-2)" }),
    el("path", { d: "M14 24c0-6-4-10-10-10 1 6 5 10 10 10z", fill: "var(--leaf-1)" }),
    el("path", { d: "M13 24h2v-8h-2z", fill: "var(--soil-2)" }),
  ]);
}

// Compact placeholder until commit 6 brings real plant illustrations.
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
    viewBox: "0 0 64 64", width: size, height: size,
    role: "img", "aria-label": `${goal.title} (${goal.stage})`,
  }, [
    el("circle", { cx: 32, cy: 48, r: 8, fill: "var(--soil-1)", opacity: "0.25" }),
    el("circle", { cx: 32, cy: 32, r: 16, fill: stageColors[goal.stage] || "var(--leaf-2)" }),
  ]);
}

export function renderGardenView(container) {
  container.replaceChildren(
    el("div", { class: "empty card" }, [
      el("div", { class: "leaf", "aria-hidden": "true" }, "🌷"),
      el("h3", {}, "The garden tableau is being prepared"),
      el("p", { class: "muted" }, "Switch to List view for now — the painted garden arrives shortly."),
    ])
  );
}
