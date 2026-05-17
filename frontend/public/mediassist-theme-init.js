(function () {
  try {
    var key = "mediassist-theme";
    var stored = localStorage.getItem(key);
    var dark = stored === "dark";
    var root = document.documentElement;
    if (dark) root.classList.add("dark");
    else root.classList.remove("dark");
    root.style.colorScheme = dark ? "dark" : "light";
  } catch {}
})();
