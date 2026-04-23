// Focus Bloom — keyboard shortcuts and help overlay.

import { actions } from "./store.js";
import { exportGarden } from "./io.js";
import { openGoalDialog, el } from "./ui.js";

let mounted = false;
let helpDialog = null;

function isTypingTarget(target) {
  return Boolean(target?.closest?.('input, textarea, select, [contenteditable="true"]'));
}

function buildHelpDialog() {
  if (helpDialog) return helpDialog;
  helpDialog = el("dialog", { class: "goal-dialog", "aria-labelledby": "shortcut-title" });
  const rows = [
    ["N", "Plant a new goal"],
    ["G", "Switch to garden view"],
    ["L", "Switch to list view"],
    ["/", "Focus search"],
    ["E", "Export garden as JSON"],
    ["I", "Open import picker"],
    ["?", "Show this shortcut help"],
    ["Esc", "Close dialogs"],
  ];
  const content = el("div", { class: "goal-form" }, [
    el("h3", { id: "shortcut-title" }, "Keyboard shortcuts"),
    el("div", { class: "shortcut-grid" }, rows.map(([key, desc]) =>
      el("div", { class: "shortcut-row" }, [
        el("kbd", {}, key),
        el("span", {}, desc),
      ])
    )),
    el("div", { class: "dialog-actions" }, [
      el("span", { class: "spacer", style: "flex:1" }),
      el("button", { class: "btn", type: "button", onClick: () => helpDialog.close() }, "Close"),
    ]),
  ]);
  helpDialog.replaceChildren(content);
  helpDialog.addEventListener("click", (event) => {
    if (event.target === helpDialog) helpDialog.close();
  });
  document.body.appendChild(helpDialog);
  return helpDialog;
}

export function showShortcutHelp() {
  buildHelpDialog().showModal();
}

export function mountShortcuts() {
  if (mounted) return;
  mounted = true;

  document.addEventListener("keydown", (event) => {
    if (event.defaultPrevented) return;

    if (event.key === "Escape") {
      document.querySelectorAll("dialog[open]").forEach((dialog) => dialog.close());
      return;
    }

    if (isTypingTarget(event.target)) return;

    const key = event.key.toLowerCase();
    if (key === "n") {
      event.preventDefault();
      openGoalDialog();
    } else if (key === "g") {
      event.preventDefault();
      actions.setUI({ view: "garden" });
    } else if (key === "l") {
      event.preventDefault();
      actions.setUI({ view: "list" });
    } else if (event.key === "/") {
      event.preventDefault();
      document.getElementById("search-input")?.focus();
    } else if (key === "e") {
      event.preventDefault();
      exportGarden();
    } else if (key === "i") {
      event.preventDefault();
      document.getElementById("import-file")?.click();
    } else if (key === "?") {
      event.preventDefault();
      showShortcutHelp();
    }
  });
}
