(function () {
  var KILL_ATTRS = [
    "bis_skin_checked",
    "bis_register",
    "bis_use",
    "data-extension-installed",
    "data-darkreader-inline-color",
    "data-darkreader-inline-bgcolor",
    "data-bis-config",
    "data-dynamic-id",
  ];

  function strip(el) {
    if (!el || el.nodeType !== 1) return;
    if (el.tagName === "SCRIPT") {
      var src = el.getAttribute("src") || "";
      if (src.indexOf("chrome-extension://") === 0) el.removeAttribute("src");
    }
    for (var i = 0; i < KILL_ATTRS.length; i++) {
      if (el.hasAttribute(KILL_ATTRS[i])) el.removeAttribute(KILL_ATTRS[i]);
    }
  }

  function walk(root) {
    if (!root) return;
    if (root.nodeType === 1) strip(root);
    var selector = KILL_ATTRS
      .map(function (a) {
        return "[" + a + "]";
      })
      .join(",");
    var marked = root.querySelectorAll ? root.querySelectorAll(selector) : [];
    for (var j = 0; j < marked.length; j++) strip(marked[j]);
    var scripts = root.querySelectorAll
      ? root.querySelectorAll('script[src^="chrome-extension://"]')
      : [];
    for (var k = 0; k < scripts.length; k++) strip(scripts[k]);
  }

  function run() {
    walk(document.documentElement);
  }

  run();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  }

  var observer = new MutationObserver(function (mutations) {
    for (var i = 0; i < mutations.length; i++) {
      var m = mutations[i];
      if (m.type === "attributes" && m.target) strip(m.target);
      for (var n = 0; n < m.addedNodes.length; n++) {
        var node = m.addedNodes[n];
        if (node.nodeType === 1) walk(node);
        else if (node.parentElement) walk(node.parentElement);
      }
    }
  });

  observer.observe(document.documentElement, {
    attributes: true,
    childList: true,
    subtree: true,
    attributeFilter: KILL_ATTRS,
  });

  window.__mediassistHydrationGuard = observer;
})();
