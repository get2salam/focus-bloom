// Focus Bloom — UI: list view, goal dialog, search, toolbar.
// All rendering reads from the store; all writes go through `actions`.

import { actions, getState, selectVisibleGoals, selectStats } from "./store.js";
import {
  CATEGORIES, CATEGORY_LABEL, KINDS, KIND_META, STAGE_META, percent,
} from "./model.js";
import { renderPlantSVG, brandMarkSVG } from "./garden.js";

// --- DOM helpers (no innerHTML; safe by construction) ---
const SVG_NS = "http://www.w3.org/2000/svg";
const SVG_TAGS = new Set(["svg", "g", "path", "rect", "circle", "ellipse", "line", "polyline", "polygon", "text", "defs", "linearGradient", "radialGradient", "stop", "filter", "feGaussianBlur", "feMerge", "feMergeNode"]);

export function el(tag, attrs = {}, children = []) {
  const node = SVG_TAGS.has(tag) ? document.createElementNS(SVG_NS, tag) : document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") node.setAttribute("class", v);
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === "dataset") for (const [dk, dv] of Object.entries(v)) node.dataset[dk] = dv;
    else if (k === "checked" || k === "selected" || k === "autofocus" || k === "required" || k === "disabled") {
      if (v) node.setAttribute(k, "");
    } else node.setAttribute(k, v === true ? "" : String(v));
  }
  const arr = Array.isArray(children) ? children : [children];
  for (const c of arr) {
    if (c == null || c === false) continue;
    node.appendChild(typeof c === "string" || typeof c === "number" ? document.createTextNode(String(c)) : c);
  }
  return node;
}

const fmtRel = (iso) => {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)        return "just now";
  if (diff < 3600)      return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86_400)    return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 7 * 86400) return `${Math.floor(diff / 86_400)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

// --- Topbar ---
export function renderTopbar(container) {
  const { ui } = getState();
  container.replaceChildren(
    el("header", { class: "topbar" }, [
      el("div", { class: "brand" }, [
        el("span", { class: "brand-mark", "aria-hidden": "true" }, [brandMarkSVG()]),
        el("span", {}, "Focus Bloom"),
      ]),
      el("div", { class: "view-toggle", role: "tablist", "aria-label": "View" }, [
        el("button", {
          type: "button", role: "tab",
          "aria-pressed": ui.view === "garden",
          onClick: () => actions.setUI({ view: "garden" }),
        }, "Garden"),
        el("button", {
          type: "button", role: "tab",
          "aria-pressed": ui.view === "list",
          onClick: () => actions.setUI({ view: "list" }),
        }, "List"),
      ]),
      el("span", { class: "spacer" }),
      el("label", { class: "search" }, [
        el("span", { "aria-hidden": "true" }, "🔍"),
        el("input", {
          id: "search-input",
          type: "search",
          placeholder: "Search your garden…",
          "aria-label": "Search",
          value: ui.search,
          onInput: (e) => actions.setUI({ search: e.target.value }),
        }),
      ]),
      el("button", {
        class: "btn", type: "button", id: "import-btn",
        onClick: () => document.getElementById("import-file")?.click(),
      }, [el("span", { "aria-hidden": "true" }, "⤓"), el("span", {}, "Import")]),
      el("button", {
        class: "btn", type: "button", id: "export-btn",
      }, [el("span", { "aria-hidden": "true" }, "⤒"), el("span", {}, "Export")]),
      el("button", {
        class: "btn btn-primary", type: "button", id: "new-goal-btn",
        onClick: () => openGoalDialog(),
      }, [el("span", { "aria-hidden": "true" }, "✚"), el("span", {}, "New goal")]),
    ])
  );
}

// --- Toolbar (filter chips + stats) ---
function renderToolbar(s) {
  const stats = selectStats(s);
  const cats = ["all", ...CATEGORIES];
  const kinds = ["all", ...KINDS];
  return el("div", { class: "toolbar" }, [
    el("h2", {}, s.ui.view === "garden" ? "Your garden" : "All goals"),
    el("div", { class: "chips", role: "group", "aria-label": "Filter by category" },
      cats.map((c) => el("button", {
        type: "button", class: "chip",
        "aria-pressed": s.ui.categoryFilter === c,
        onClick: () => actions.setUI({ categoryFilter: c }),
      }, [
        c !== "all" ? el("span", { class: "swatch", style: `background:var(--petal-${c})` }) : null,
        c === "all" ? "All" : CATEGORY_LABEL[c],
      ]))
    ),
    el("div", { class: "chips", role: "group", "aria-label": "Filter by kind" },
      kinds.map((k) => el("button", {
        type: "button", class: "chip",
        "aria-pressed": s.ui.kindFilter === k,
        onClick: () => actions.setUI({ kindFilter: k }),
      }, k === "all" ? "Any kind" : KIND_META[k].label))
    ),
    el("label", { class: "chip", style: "cursor:pointer" }, [
      el("input", {
        type: "checkbox",
        checked: s.ui.onlyActive,
        onChange: (e) => actions.setUI({ onlyActive: e.target.checked }),
        style: "margin-right:6px",
      }),
      "Hide harvested",
    ]),
    el("span", { class: "spacer", style: "flex:1" }),
    el("span", { class: "chip", title: "Total goals in your garden" }, `${stats.total} planted`),
    el("span", { class: "chip", title: "Currently in bloom" }, `${stats.byStage.bloom} blooming`),
    el("span", { class: "chip", title: "Harvested goals" }, `${stats.byStage.harvest} harvested`),
  ]);
}

// --- List rows ---
function renderListRow(g) {
  const pct = percent(g);
  const meta = STAGE_META[g.stage];
  return el("li", { class: "row", dataset: { goalId: g.id }, tabindex: "0" }, [
    el("div", { class: "row-art", "aria-hidden": "true" }, [renderPlantSVG(g, { compact: true })]),
    el("div", { class: "row-body" }, [
      el("div", { class: "row-head" }, [
        el("span", { class: `kind-pill kind-${g.kind}` }, KIND_META[g.kind].label),
        el("span", { class: "category-dot", style: `background:var(--petal-${g.category})` }),
        el("span", { class: "row-title" }, g.title),
        el("span", { class: "row-stage", title: meta.blurb }, meta.label),
      ]),
      g.note ? el("p", { class: "row-note" }, g.note) : null,
      el("div", { class: "progress" }, [
        el("div", { class: `progress-bar stage-${g.stage}`, style: `width:${pct}%` }),
      ]),
      el("div", { class: "row-foot" }, [
        el("span", {}, g.target > 0 ? `${g.progress} / ${g.target}` : `Vitality ${Math.round(g.vitality ?? 0)}`),
        el("span", { class: "muted" }, `Updated ${fmtRel(g.updatedAt)}`),
      ]),
    ]),
    el("div", { class: "row-actions" }, [
      el("button", {
        class: "btn btn-ghost", type: "button", "aria-label": "Log progress",
        title: "Log progress (+1)",
        onClick: () => { actions.logProgress(g.id, 1); flashRow(g.id); },
      }, "💧"),
      el("button", {
        class: "btn btn-ghost", type: "button", "aria-label": "Edit goal",
        onClick: () => openGoalDialog(g),
      }, "✎"),
      el("button", {
        class: "btn btn-ghost btn-danger", type: "button", "aria-label": "Delete goal",
        onClick: () => confirmRemove(g),
      }, "🗑"),
    ]),
  ]);
}

function flashRow(id) {
  const node = document.querySelector(`[data-goal-id="${id}"]`);
  if (!node) return;
  node.classList.remove("flash");
  void node.offsetWidth; // restart animation
  node.classList.add("flash");
}

function confirmRemove(g) {
  if (window.confirm(`Remove "${g.title}" from your garden?`)) actions.removeGoal(g.id);
}

// --- List view ---
export function renderListView(container) {
  const s = getState();
  const goals = selectVisibleGoals(s);
  container.replaceChildren(renderToolbar(s));
  if (goals.length === 0) {
    container.appendChild(emptyState(s));
    return;
  }
  container.appendChild(el("ul", { class: "rows", role: "list" }, goals.map(renderListRow)));
}

function emptyState(s) {
  const hasAny = s.goals.length > 0;
  return el("div", { class: "empty card" }, [
    el("div", { class: "leaf", "aria-hidden": "true" }, hasAny ? "🍃" : "🌱"),
    el("h3", {}, hasAny ? "Nothing matches your filters" : "Your garden is empty"),
    el("p", { class: "muted" }, hasAny
      ? "Try clearing a filter or the search box."
      : "Plant your first goal to begin."),
    !hasAny ? el("p", { style: "margin-top:1rem" }, [
      el("button", { class: "btn btn-primary", onClick: () => openGoalDialog() }, "Plant a goal"),
    ]) : null,
  ]);
}

// --- Goal dialog (create/edit) ---
let dialogEl = null;

function buildDialog() {
  if (dialogEl) return dialogEl;
  dialogEl = el("dialog", { class: "goal-dialog", "aria-labelledby": "dlg-title" });
  document.body.appendChild(dialogEl);
  dialogEl.addEventListener("click", (e) => {
    if (e.target === dialogEl) dialogEl.close();
  });
  return dialogEl;
}

export function openGoalDialog(existing = null) {
  const dlg = buildDialog();
  const isEdit = Boolean(existing);
  const g = existing ?? { title: "", note: "", kind: "habit", category: "other", target: 0, progress: 0 };

  const form = el("form", { method: "dialog", class: "goal-form" }, [
    el("h3", { id: "dlg-title" }, isEdit ? "Edit goal" : "Plant a new goal"),
    el("label", {}, [
      el("span", {}, "Title"),
      el("input", { name: "title", required: true, maxlength: "120", value: g.title, autofocus: true, placeholder: "e.g. Read 20 pages a day" }),
    ]),
    el("label", {}, [
      el("span", {}, "Note (optional)"),
      el("textarea", { name: "note", rows: "2", maxlength: "400", placeholder: "Why this matters to you…" }, g.note ?? ""),
    ]),
    el("div", { class: "row-2" }, [
      el("label", {}, [
        el("span", {}, "Kind"),
        el("select", { name: "kind" },
          KINDS.map((k) => el("option", { value: k, selected: g.kind === k }, `${KIND_META[k].label} — ${KIND_META[k].hint}`))
        ),
      ]),
      el("label", {}, [
        el("span", {}, "Category"),
        el("select", { name: "category" },
          CATEGORIES.map((c) => el("option", { value: c, selected: g.category === c }, CATEGORY_LABEL[c]))
        ),
      ]),
    ]),
    el("div", { class: "row-2" }, [
      el("label", {}, [
        el("span", {}, "Target (0 = perennial)"),
        el("input", { name: "target", type: "number", min: "0", max: "1000", step: "1", value: String(g.target ?? 0) }),
      ]),
      el("label", {}, [
        el("span", {}, "Progress so far"),
        el("input", { name: "progress", type: "number", min: "0", max: "1000", step: "1", value: String(g.progress ?? 0) }),
      ]),
    ]),
    el("p", { class: "muted small" }, "Habits with target 0 are perennial — they grow when you log progress and gently fade between sessions."),
    el("div", { class: "dialog-actions" }, [
      isEdit
        ? el("button", { type: "button", class: "btn btn-ghost btn-danger", onClick: () => { confirmRemove(g); dlg.close(); } }, "Delete")
        : el("span", {}, ""),
      el("span", { class: "spacer", style: "flex:1" }),
      el("button", { type: "button", class: "btn", onClick: () => dlg.close() }, "Cancel"),
      el("button", { type: "submit", class: "btn btn-primary" }, isEdit ? "Save" : "Plant goal"),
    ]),
  ]);

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    const patch = {
      title: (data.title || "").toString().trim() || "Untitled",
      note: (data.note || "").toString().trim(),
      kind: data.kind,
      category: data.category,
      target: Number(data.target) || 0,
      progress: Number(data.progress) || 0,
    };
    if (isEdit) actions.updateGoal(g.id, patch);
    else actions.addGoal(patch);
    dlg.close();
  });

  dlg.replaceChildren(form);
  dlg.showModal();
}
