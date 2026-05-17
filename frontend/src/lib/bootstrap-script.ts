import { THEME_STORAGE_KEY } from "@/lib/theme";

/**
 * Single synchronous body bootstrap: apply saved theme, then strip extension
 * attributes. Kept out of <head> so React hydration is not compared against
 * extension-mutated <script> nodes in head (Bitdefender TrafficLight, etc.).
 */
export const BOOTSTRAP_SCRIPT = `
(function() {
  try {
    var key = ${JSON.stringify(THEME_STORAGE_KEY)};
    var stored = localStorage.getItem(key);
    var dark = stored === 'dark';
    var root = document.documentElement;
    if (dark) root.classList.add('dark');
    else root.classList.remove('dark');
    root.style.colorScheme = dark ? 'dark' : 'light';
  } catch (e) {}
})();
(function() {
  var KILL = [
    'bis_skin_checked','bis_register','bis_use','data-extension-installed',
    'data-darkreader-inline-color','data-darkreader-inline-bgcolor',
    'data-bis-config','data-dynamic-id'
  ];
  function strip(el) {
    if (!el || el.nodeType !== 1) return;
    if (el.tagName === 'SCRIPT') {
      var src = el.getAttribute('src') || '';
      if (src.indexOf('chrome-extension://') === 0) el.removeAttribute('src');
    }
    for (var i = KILL.length - 1; i >= 0; i--) {
      if (el.hasAttribute(KILL[i])) el.removeAttribute(KILL[i]);
    }
  }
  function walk(root) {
    strip(root);
    if (root.querySelectorAll) {
      var els = root.querySelectorAll('[' + KILL.join('],[') + ']');
      for (var i = 0; i < els.length; i++) strip(els[i]);
      var scripts = root.querySelectorAll('script[src^="chrome-extension://"]');
      for (var j = 0; j < scripts.length; j++) strip(scripts[j]);
    }
  }
  try { walk(document.documentElement); } catch(e) {}
  if (typeof MutationObserver !== 'undefined') {
    try {
      new MutationObserver(function(muts) {
        for (var i = 0; i < muts.length; i++) {
          var m = muts[i];
          if (m.type === 'attributes') strip(m.target);
          for (var j = 0; j < m.addedNodes.length; j++) walk(m.addedNodes[j]);
        }
      }).observe(document.documentElement, {
        attributes: true,
        childList: true,
        subtree: true,
        attributeFilter: KILL
      });
    } catch(e) {}
  }
})();
`;
