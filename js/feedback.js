// Focus Bloom — lightweight toast feedback and live status.

let host = null;

function getHost() {
  if (host?.isConnected) return host;
  host = document.createElement("div");
  host.className = "toast-host";
  host.setAttribute("aria-live", "polite");
  host.setAttribute("aria-atomic", "true");
  document.body.appendChild(host);
  return host;
}

export function showToast(message, tone = "info") {
  const root = getHost();
  const toast = document.createElement("div");
  toast.className = `toast toast-${tone}`;
  toast.textContent = message;
  root.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add("is-visible"));

  window.setTimeout(() => {
    toast.classList.remove("is-visible");
    window.setTimeout(() => toast.remove(), 220);
  }, 2400);
}
