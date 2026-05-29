import React from "react";

const SPINNER_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation:spin .8s linear infinite"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>`;

function attachSpinner(el: HTMLElement): () => void {
  const prev = el.style.position;
  if (getComputedStyle(el).position === "static") {
    el.style.position = "relative";
  }
  el.style.pointerEvents = "none";
  el.style.opacity = "0.5";

  const overlay = document.createElement("span");
  overlay.innerHTML = SPINNER_SVG;
  overlay.style.cssText =
    "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;border-radius:inherit;color:currentColor;z-index:1;";

  // inject keyframes once
  if (!document.getElementById("pdf-spin")) {
    const style = document.createElement("style");
    style.id = "pdf-spin";
    style.textContent = "@keyframes spin{to{transform:rotate(360deg)}}";
    document.head.appendChild(style);
  }

  el.appendChild(overlay);

  return () => {
    overlay.remove();
    el.style.position = prev;
    el.style.pointerEvents = "";
    el.style.opacity = "";
  };
}

export async function withPdfSpinner<T>(
  fn: () => Promise<T>,
  e?: React.MouseEvent,
): Promise<T> {
  const btn = e?.currentTarget as HTMLElement | undefined;
  const cleanup = btn ? attachSpinner(btn) : undefined;
  try {
    return await fn();
  } finally {
    cleanup?.();
  }
}
