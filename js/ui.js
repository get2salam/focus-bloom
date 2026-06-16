// Focus Bloom — UI: top bar, filters, list view, and goal dialog.

import { actions, getState, selectVisibleGoals, selectStats } from "./store.js";
import {
  CATEGORIES,
  CATEGORY_LABEL,
  KINDS,
  KIND_META,
  STAGE_META,
  percent,
  progressLabel,
} from "./model.js";
import { renderPlantSVG, brandMarkSVG } from "./garden.js";
import { exportGarden, importGardenFile } from "./io.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const SVG_TAGS = new Set([
  "svg",
  "g",
  "path",
  "rect",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
  "text",
  "defs",
  "linearGradient",
  "radialGradient",
  "stop",
  "filter",
  "feGaussianBlur",
  "feMerge",
  "feMergeNode",
]);

export function el(tag, attrs = {}, children = []) {
  const node = SVG_TAGS.has(tag)
    ? document.createElementNS(SVG_NS, tag)
    : document.createElement(tag);

  for (const [key, value] of Object.entries(attrs)) {
    if (value == null || value === false) continue;
    if (key === "class") node.setAttribute("class", value);
    else if (key.startsWith("on") && typeof value === "function") {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === "dataset") {
      for (const [dataKey, dataValue] of Object.entries(value)) {
        node.dataset[dataKey] = dataValue;
      }
    } else if (["checked", "selected", "autofocus", "required", "disabled"].includes(key)) {
      if (value) node.setAttribute(key, "");
    } else {
      node.setAttribute(key, value === true ? "" : String(value));
    }
  }

  const list = Array.isArray(children) ? children : [children];
  for (const child of list) {
    if (child == null || child === false) continue;
    node.appendChild(
      typeof child === "string" || typeof child === "number"
        ? document.createTextNode(String(child))
        : child
    );
  }

  return node;
}

const fmtRel = (iso) => {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 7 * 86400) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

export function renderTopbar(container) {
  const { ui } = getState();
  container.replaceChildren(
    el("header", { class: "topbar" }, [
      el("div", { class: "brand" }, [
        el("span", { class: "brand-mark", "aria-hidden": "true" }, [brandMarkSVG()]),
        el("span", {}, "Focus Bloom"),
      ]),
      el("div", { class: "view-toggle", role: "tablist", "aria-label": "View" }, [
        el(
          "button",
          {
            type: "button",
            role: "tab",
            "aria-pressed": ui.view === "garden",
            onClick: () => actions.setUI({ view: "garden" }),
          },
          "Garden"
        ),
        el(
          "button",
          {
            type: "button",
            role: "tab",
            "aria-pressed": ui.view === "list",
            onClick: () => actions.setUI({ view: "list" }),
          },
          "List"
        ),
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
          onInput: (event) => actions.setUI({ search: event.target.value }),
        }),
      ]),
      el(
        "button",
        {
          class: "btn",
          type: "button",
          id: "import-btn",
          onClick: () => document.getElementById("import-file")?.click(),
        },
        [el("span", { "aria-hidden": "true" }, "⤓"), el("span", {}, "Import")]
      ),
      el(
        "button",
        {
          class: "btn",
          type: "button",
          id: "export-btn",
          onClick: () => exportGarden(),
        },
        [el("span", { "aria-hidden": "true" }, "⤒"), el("span", {}, "Export")]
      ),
      el(
        "button",
        {
          class: "btn",
          type: "button",
          id: "help-btn",
          onClick: async () => {
            const { showShortcutHelp } = await import("./shortcuts.js");
            showShortcutHelp();
          },
        },
        [el("span", { "aria-hidden": "true" }, "⌘"), el("span", {}, "Shortcuts")]
      ),
      el(
        "button",
        {
          class: "btn btn-primary",
          type: "button",
          id: "new-goal-btn",
          onClick: () => openGoalDialog(),
        },
        [el("span", { "aria-hidden": "true" }, "✚"), el("span", {}, "New goal")]
      ),
      el("input", {
        id: "import-file",
        type: "file",
        accept: ".json,application/json",
        class: "sr-only",
        onChange: async (event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          try {
            await importGardenFile(file);
          } catch (error) {
            window.alert(error instanceof Error ? error.message : "Could not import that file.");
          } finally {
            event.target.value = "";
          }
        },
      }),
    ])
  );
}

export function renderToolbar(state) {
  const stats = selectStats(state);
  const cats = ["all", ...CATEGORIES];
  const kinds = ["all", ...KINDS];
  const filtersActive = Boolean(
    state.ui.search ||
      state.ui.categoryFilter !== "all" ||
      state.ui.kindFilter !== "all" ||
      state.ui.onlyActive ||
      state.ui.sortBy !== "recent"
  );

  return el("div", { class: "toolbar" }, [
    el("h2", {}, state.ui.view === "garden" ? "Your garden" : "All goals"),
    el(
      "div",
      { class: "chips", role: "group", "aria-label": "Filter by category" },
      cats.map((category) =>
        el(
          "button",
          {
            type: "button",
            class: "chip",
            "aria-pressed": state.ui.categoryFilter === category,
            onClick: () => actions.setUI({ categoryFilter: category }),
          },
          [
            category !== "all"
              ? el("span", {
                  class: "swatch",
                  style: `background:var(--petal-${category})`,
                })
              : null,
            category === "all" ? "All" : CATEGORY_LABEL[category],
          ]
        )
      )
    ),
    el(
      "div",
      { class: "chips", role: "group", "aria-label": "Filter by kind" },
      kinds.map((kind) =>
        el(
          "button",
          {
            type: "button",
            class: "chip",
            "aria-pressed": state.ui.kindFilter === kind,
            onClick: () => actions.setUI({ kindFilter: kind }),
          },
          kind === "all" ? "Any kind" : KIND_META[kind].label
        )
      )
    ),
    el("label", { class: "chip", style: "cursor:pointer" }, [
      el("input", {
        type: "checkbox",
        checked: state.ui.onlyActive,
        onChange: (event) => actions.setUI({ onlyActive: event.target.checked }),
        style: "margin-right:6px",
      }),
      "Hide harvested",
    ]),
    el("label", { class: "toolbar-control" }, [
      el("span", { class: "toolbar-label" }, "Sort"),
      el(
        "select",
        {
          class: "toolbar-select",
          "aria-label": "Sort goals",
          value: state.ui.sortBy,
          onChange: (event) => actions.setUI({ sortBy: event.target.value }),
        },
        [
          el("option", { value: "recent", selected: state.ui.sortBy === "recent" }, "Recent"),
          el("option", { value: "title", selected: state.ui.sortBy === "title" }, "Title"),
          el("option", { value: "stage", selected: state.ui.sortBy === "stage" }, "Stage"),
        ]
      ),
    ]),
    filtersActive
      ? el(
          "button",
          {
            type: "button",
            class: "btn btn-ghost",
            onClick: () => actions.setUI({
              search: "",
              categoryFilter: "all",
              kindFilter: "all",
              onlyActive: false,
              sortBy: "recent",
            }),
          },
          "Clear filters"
        )
      : null,
    el("span", { class: "spacer", style: "flex:1" }),
    el("span", { class: "chip", title: "Total goals in your garden" }, `${stats.total} planted`),
    el("span", { class: "chip", title: "Currently in bloom" }, `${stats.byStage.bloom} blooming`),
    el("span", { class: "chip", title: "Harvested goals" }, `${stats.byStage.harvest} harvested`),
  ]);
}

function renderListRow(goal) {
  const pct = percent(goal);
  const meta = STAGE_META[goal.stage];
  const progressText = progressLabel(goal);

  return el("li", {
    class: "row",
    dataset: { goalId: goal.id },
    tabindex: "0",
    "aria-label": `${goal.title}, ${KIND_META[goal.kind].label}, ${meta.label}, ${progressText}`,
  }, [
    el("div", { class: "row-art", "aria-hidden": "true" }, [
      renderPlantSVG(goal, { compact: true }),
    ]),
    el("div", { class: "row-body" }, [
      el("div", { class: "row-head" }, [
        el("span", { class: `kind-pill kind-${goal.kind}` }, KIND_META[goal.kind].label),
        el("span", {
          class: "category-dot",
          style: `background:var(--petal-${goal.category})`,
        }),
        el("span", { class: "row-title" }, goal.title),
        el("span", { class: "row-stage", title: meta.blurb }, meta.label),
      ]),
      goal.note ? el("p", { class: "row-note" }, goal.note) : null,
      el("div", {
        class: "progress",
        role: "progressbar",
        "aria-label": `${goal.title} progress`,
        "aria-valuemin": "0",
        "aria-valuemax": "100",
        "aria-valuenow": String(pct),
        "aria-valuetext": progressText,
      }, [
        el("div", { class: `progress-bar stage-${goal.stage}`, style: `width:${pct}%` }),
      ]),
      el("div", { class: "row-foot" }, [
        el(
          "span",
          {},
          goal.target > 0
            ? `${goal.progress} / ${goal.target}`
            : `Vitality ${Math.round(goal.vitality ?? 0)}`
        ),
        el("span", { class: "muted" }, `Updated ${fmtRel(goal.updatedAt)}`),
      ]),
    ]),
    el("div", { class: "row-actions" }, [
      el(
        "button",
        {
          class: "btn btn-ghost",
          type: "button",
          "aria-label": `Log progress for ${goal.title}`,
          title: "Log progress (+1)",
          onClick: () => {
            actions.logProgress(goal.id, 1);
            flashRow(goal.id);
          },
        },
        "💧"
      ),
      el(
        "button",
        {
          class: "btn btn-ghost",
          type: "button",
          "aria-label": `Edit ${goal.title}`,
          onClick: () => openGoalDialog(goal),
        },
        "✎"
      ),
      el(
        "button",
        {
          class: "btn btn-ghost btn-danger",
          type: "button",
          "aria-label": `Delete ${goal.title}`,
          onClick: () => confirmRemove(goal),
        },
        "🗑"
      ),
    ]),
  ]);
}

function flashRow(id) {
  const node = document.querySelector(`[data-goal-id="${id}"]`);
  if (!node) return;
  node.classList.remove("flash");
  void node.offsetWidth;
  node.classList.add("flash");
}

function confirmRemove(goal) {
  if (window.confirm(`Remove "${goal.title}" from your garden?`)) {
    actions.removeGoal(goal.id);
  }
}

export function renderListView(container) {
  const state = getState();
  const goals = selectVisibleGoals(state);

  container.replaceChildren(renderToolbar(state));
  if (goals.length === 0) {
    container.appendChild(emptyState(state));
    return;
  }

  container.appendChild(el("ul", { class: "rows", role: "list" }, goals.map(renderListRow)));
}

function emptyState(state) {
  const hasAny = state.goals.length > 0;
  return el("div", { class: "empty card" }, [
    el("div", { class: "leaf", "aria-hidden": "true" }, hasAny ? "🍃" : "🌱"),
    el("h3", {}, hasAny ? "Nothing matches your filters" : "Your garden is empty"),
    el(
      "p",
      { class: "muted" },
      hasAny ? "Try clearing a filter or the search box." : "Plant your first goal to begin."
    ),
    !hasAny
      ? el("p", { style: "margin-top:1rem" }, [
          el(
            "button",
            { class: "btn btn-primary", onClick: () => openGoalDialog() },
            "Plant a goal"
          ),
        ])
      : null,
  ]);
}

let dialogEl = null;

function buildDialog() {
  if (dialogEl) return dialogEl;
  dialogEl = el("dialog", { class: "goal-dialog", "aria-labelledby": "dlg-title" });
  document.body.appendChild(dialogEl);
  dialogEl.addEventListener("click", (event) => {
    if (event.target === dialogEl) dialogEl.close();
  });
  return dialogEl;
}

export function openGoalDialog(existing = null) {
  const dialog = buildDialog();
  const isEdit = Boolean(existing);
  const goal = existing ?? {
    title: "",
    note: "",
    kind: "habit",
    category: "other",
    target: 0,
    progress: 0,
  };

  const form = el("form", { method: "dialog", class: "goal-form" }, [
    el("h3", { id: "dlg-title" }, isEdit ? "Edit goal" : "Plant a new goal"),
    el("label", {}, [
      el("span", {}, "Title"),
      el("input", {
        name: "title",
        required: true,
        maxlength: "120",
        value: goal.title,
        autofocus: true,
        placeholder: "e.g. Read 20 pages a day",
      }),
    ]),
    el("label", {}, [
      el("span", {}, "Note (optional)"),
      el(
        "textarea",
        {
          name: "note",
          rows: "2",
          maxlength: "400",
          placeholder: "Why this matters to you…",
        },
        goal.note ?? ""
      ),
    ]),
    el("div", { class: "row-2" }, [
      el("label", {}, [
        el("span", {}, "Kind"),
        el(
          "select",
          { name: "kind" },
          KINDS.map((kind) =>
            el(
              "option",
              { value: kind, selected: goal.kind === kind },
              `${KIND_META[kind].label} — ${KIND_META[kind].hint}`
            )
          )
        ),
      ]),
      el("label", {}, [
        el("span", {}, "Category"),
        el(
          "select",
          { name: "category" },
          CATEGORIES.map((category) =>
            el("option", { value: category, selected: goal.category === category }, CATEGORY_LABEL[category])
          )
        ),
      ]),
    ]),
    el("div", { class: "row-2" }, [
      el("label", {}, [
        el("span", {}, "Target (0 = perennial)"),
        el("input", {
          name: "target",
          type: "number",
          min: "0",
          max: "1000",
          step: "1",
          value: String(goal.target ?? 0),
        }),
      ]),
      el("label", {}, [
        el("span", {}, "Progress so far"),
        el("input", {
          name: "progress",
          type: "number",
          min: "0",
          max: "1000",
          step: "1",
          value: String(goal.progress ?? 0),
        }),
      ]),
    ]),
    el(
      "p",
      { class: "muted small" },
      "Habits with target 0 are perennial. They grow when you log progress and gently fade between sessions."
    ),
    el("div", { class: "dialog-actions" }, [
      isEdit
        ? el(
            "button",
            {
              type: "button",
              class: "btn btn-ghost btn-danger",
              onClick: () => {
                confirmRemove(goal);
                dialog.close();
              },
            },
            "Delete"
          )
        : el("span", {}, ""),
      el("span", { class: "spacer", style: "flex:1" }),
      el("button", { type: "button", class: "btn", onClick: () => dialog.close() }, "Cancel"),
      el("button", { type: "submit", class: "btn btn-primary" }, isEdit ? "Save" : "Plant goal"),
    ]),
  ]);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    const patch = {
      title: (data.title || "").toString().trim() || "Untitled",
      note: (data.note || "").toString().trim(),
      kind: data.kind,
      category: data.category,
      target: Number(data.target) || 0,
      progress: Number(data.progress) || 0,
    };

    if (isEdit) actions.updateGoal(goal.id, patch);
    else actions.addGoal(patch);
    dialog.close();
  });

  dialog.replaceChildren(form);
  dialog.showModal();
}
