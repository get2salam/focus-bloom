// Focus Bloom — garden rendering and plant illustrations.

import { actions, getState, selectStats, selectVisibleGoals } from "./store.js";
import { KIND_META, STAGE_META, percent } from "./model.js";
import { el, openGoalDialog } from "./ui.js";

const CATEGORY_PETAL = {
  health: "var(--petal-health)",
  learning: "var(--petal-learning)",
  creative: "var(--petal-creative)",
  work: "var(--petal-work)",
  relationships: "var(--petal-relationships)",
  mindfulness: "var(--petal-mindfulness)",
  other: "var(--petal-other)",
};

const STAGE_HEIGHT = {
  seed: 28,
  sprout: 44,
  bud: 58,
  bloom: 72,
  harvest: 76,
};

export function brandMarkSVG() {
  return el("svg", { viewBox: "0 0 28 28", width: "28", height: "28" }, [
    el("path", { d: "M14 24c0-6 4-10 10-10-1 6-5 10-10 10z", fill: "var(--leaf-2)" }),
    el("path", { d: "M14 24c0-6-4-10-10-10 1 6 5 10 10 10z", fill: "var(--leaf-1)" }),
    el("path", { d: "M13 24h2v-8h-2z", fill: "var(--soil-2)" }),
  ]);
}

function petal(goal, cx, cy, rx, ry, angle = 0) {
  return el("ellipse", {
    cx,
    cy,
    rx,
    ry,
    fill: CATEGORY_PETAL[goal.category] ?? "var(--petal-other)",
    transform: `rotate(${angle} ${cx} ${cy})`,
  });
}

function flowerHead(goal, stage) {
  if (stage === "seed") {
    return el("ellipse", { cx: 60, cy: 88, rx: 14, ry: 10, fill: "var(--soil-2)" });
  }
  if (stage === "sprout") {
    return el("g", {}, [
      el("path", { d: "M56 60c-8 1-14 8-14 16 8-1 14-8 14-16z", fill: "var(--leaf-3)" }),
      el("path", { d: "M64 60c8 1 14 8 14 16-8-1-14-8-14-16z", fill: "var(--leaf-2)" }),
    ]);
  }
  if (stage === "bud") {
    return el("g", {}, [
      el("ellipse", { cx: 60, cy: 56, rx: 14, ry: 18, fill: "var(--leaf-2)" }),
      petal(goal, 60, 54, 7, 11),
    ]);
  }
  if (stage === "bloom") {
    return el("g", {}, [
      petal(goal, 60, 49, 10, 16, 0),
      petal(goal, 46, 58, 10, 16, -50),
      petal(goal, 74, 58, 10, 16, 50),
      petal(goal, 49, 75, 10, 16, -110),
      petal(goal, 71, 75, 10, 16, 110),
      el("circle", { cx: 60, cy: 63, r: 9, fill: "#f7e3a2" }),
    ]);
  }
  return el("g", {}, [
    petal(goal, 60, 50, 10, 15, 12),
    petal(goal, 46, 60, 10, 15, -46),
    petal(goal, 74, 60, 10, 15, 46),
    el("circle", { cx: 60, cy: 63, r: 9, fill: "#f7e3a2" }),
    el("path", { d: "M46 84c8-10 20-10 28 0", fill: "none", stroke: "var(--accent-warm)", "stroke-width": 4, "stroke-linecap": "round" }),
  ]);
}

function leafPair(goal, width = 22) {
  const left = goal.kind === "milestone" ? "var(--leaf-3)" : "var(--leaf-2)";
  const right = goal.kind === "task" ? "var(--leaf-3)" : "var(--leaf-1)";
  return [
    el("path", { d: `M58 86c-${width / 2} 0-${width} 8-${width} 20 ${width / 2}-1 ${width} -8 ${width}-20z`, fill: left }),
    el("path", { d: `M62 86c${width / 2} 0 ${width} 8 ${width} 20-${width / 2}-1-${width}-8-${width}-20z`, fill: right }),
  ];
}

export function renderPlantSVG(goal, opts = {}) {
  const compact = Boolean(opts.compact);
  const size = compact ? 72 : 168;
  const stage = goal.stage ?? "seed";
  const stemTop = 102 - (STAGE_HEIGHT[stage] ?? 28);

  return el("svg", {
    viewBox: "0 0 120 140",
    width: size,
    height: compact ? size : Math.round(size * 1.04),
    role: "img",
    class: `plant stage-${stage} kind-${goal.kind}`,
    "aria-label": `${goal.title} (${STAGE_META[stage].label})`,
  }, [
    el("ellipse", { cx: 60, cy: 120, rx: compact ? 26 : 34, ry: compact ? 10 : 13, fill: "rgba(74,58,42,0.12)" }),
    el("path", { d: `M60 112 C 58 ${104 - (compact ? 8 : 0)}, 58 ${stemTop + 18}, 60 ${stemTop}`, fill: "none", stroke: "var(--leaf-1)", "stroke-width": compact ? 4 : 5, "stroke-linecap": "round" }),
    ...leafPair(goal, compact ? 16 : 22),
    stage === "harvest" ? el("circle", { cx: 60, cy: 46, r: 5, fill: "var(--accent-warm)" }) : null,
    flowerHead(goal, stage),
  ]);
}

function renderGardenCard(goal) {
  const pct = percent(goal);
  return el("article", { class: `garden-card stage-${goal.stage}` }, [
    el("div", { class: "garden-art" }, [renderPlantSVG(goal)]),
    el("div", { class: "garden-body" }, [
      el("div", { class: "garden-meta" }, [
        el("span", { class: `kind-pill kind-${goal.kind}` }, KIND_META[goal.kind].label),
        el("span", { class: "garden-stage" }, STAGE_META[goal.stage].label),
      ]),
      el("h3", {}, goal.title),
      goal.note ? el("p", { class: "muted" }, goal.note) : el("p", { class: "muted" }, STAGE_META[goal.stage].blurb),
      el("div", { class: "garden-progress" }, [
        el("div", { class: `progress-bar stage-${goal.stage}`, style: `width:${pct}%` }),
      ]),
      el("div", { class: "garden-foot" }, [
        el("span", {}, goal.target > 0 ? `${goal.progress} / ${goal.target}` : `Vitality ${Math.round(goal.vitality ?? 0)}`),
        el("div", { class: "garden-actions" }, [
          el("button", { class: "btn btn-ghost", type: "button", onClick: () => actions.logProgress(goal.id, 1) }, "Water"),
          el("button", { class: "btn btn-ghost", type: "button", onClick: () => openGoalDialog(goal) }, "Edit"),
        ]),
      ]),
    ]),
  ]);
}

function statCard(label, value, note) {
  return el("div", { class: "garden-stat card" }, [
    el("span", { class: "garden-stat-label" }, label),
    el("strong", { class: "garden-stat-value" }, value),
    el("span", { class: "muted small" }, note),
  ]);
}

export function renderGardenView(container) {
  const state = getState();
  const goals = selectVisibleGoals(state);
  const stats = selectStats(state);
  const needsWater = goals.filter((goal) => goal.stage === "seed" || goal.stage === "sprout").length;

  const shell = el("section", { class: "garden-shell" }, [
    el("div", { class: "garden-hero card" }, [
      el("div", {}, [
        el("h2", {}, "Your living goal garden"),
        el("p", { class: "muted" }, "Plant tasks, habits, and milestones. Water them as progress happens and watch the garden change."),
      ]),
      el("div", { class: "garden-stat-row" }, [
        statCard("Planted", String(stats.total), "Everything currently in your garden"),
        statCard("Blooming", String(stats.byStage.bloom), "Nearly complete and in full color"),
        statCard("Needs water", String(needsWater), "Seeds and sprouts asking for attention"),
      ]),
      el("div", { class: "garden-banner" }, [
        el("strong", {}, needsWater > 0 ? "A few plants need care." : "Your garden looks healthy."),
        el("span", { class: "muted small" }, needsWater > 0 ? "Water a seed or sprout to help the next bloom appear." : "Keep the momentum going with one small logged action."),
      ]),
      el("div", { class: "garden-quick-actions" }, [
        el("button", { class: "btn btn-primary", type: "button", onClick: () => openGoalDialog() }, "Plant goal"),
        el("button", {
          class: "btn",
          type: "button",
          onClick: async () => {
            const { seedGarden } = await import("./seeds.js");
            actions.replaceAll({ goals: seedGarden(), meta: { createdAt: new Date().toISOString() } });
            actions.setUI({ view: "garden" });
          },
        }, "Replant sample"),
        el("button", {
          class: "btn btn-ghost btn-danger",
          type: "button",
          onClick: () => {
            if (window.confirm("Clear every planted goal from this browser?")) actions.clearAll();
          },
        }, "Clear garden"),
      ]),
    ]),
  ]);

  if (!goals.length) {
    shell.appendChild(el("div", { class: "empty card" }, [
      el("div", { class: "leaf", "aria-hidden": "true" }, "🌼"),
      el("h3", {}, "Nothing is planted yet"),
      el("p", { class: "muted" }, "Start with one goal, and the garden will bloom from there."),
      el("div", { style: "margin-top:1rem" }, [
        el("button", { class: "btn btn-primary", type: "button", onClick: () => openGoalDialog() }, "Plant your first goal"),
      ]),
    ]));
  } else {
    shell.appendChild(el("div", { class: "garden-grid" }, goals.map(renderGardenCard)));
  }

  container.replaceChildren(shell);
}
