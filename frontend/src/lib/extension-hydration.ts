const KILL_ATTRS = [
  "bis_skin_checked",
  "bis_register",
  "bis_use",
  "data-extension-installed",
  "data-darkreader-inline-color",
  "data-darkreader-inline-bgcolor",
  "data-bis-config",
  "data-dynamic-id",
] as const;

function stripExtensionAttrs(el: Element) {
  if (el.nodeType !== 1) return;
  if (el.tagName === "SCRIPT") {
    const src = el.getAttribute("src") ?? "";
    if (src.startsWith("chrome-extension://")) {
      el.removeAttribute("src");
    }
  }
  for (const name of KILL_ATTRS) {
    if (el.hasAttribute(name)) el.removeAttribute(name);
  }
}

function walk(root: ParentNode) {
  if (root instanceof Element) stripExtensionAttrs(root);
  const selector = KILL_ATTRS.map((a) => `[${a}]`).join(",");
  root.querySelectorAll?.(selector).forEach(stripExtensionAttrs);
  root
    .querySelectorAll?.('script[src^="chrome-extension://"]')
    .forEach(stripExtensionAttrs);
}

/** Strip AV/extension attributes before React hydrates (client bundle load). */
export function stripExtensionAttrsNow() {
  if (typeof document === "undefined") return;
  walk(document.documentElement);
}

export function observeExtensionAttrs() {
  if (typeof document === "undefined") return () => {};

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === "attributes" && m.target instanceof Element) {
        stripExtensionAttrs(m.target);
      }
      for (const node of m.addedNodes) {
        if (node instanceof Element) walk(node);
        else if (node.parentElement) walk(node.parentElement);
      }
    }
  });

  observer.observe(document.documentElement, {
    attributes: true,
    childList: true,
    subtree: true,
    attributeFilter: [...KILL_ATTRS],
  });

  return () => observer.disconnect();
}
