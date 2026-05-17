// src/runtime/navigation.js
function getCurrentIndex(filename, manifest) {
  return manifest.slides.indexOf(filename);
}
function getPrevUrl(filename, manifest) {
  const i = getCurrentIndex(filename, manifest);
  return i > 0 ? manifest.slides[i - 1] : null;
}
function getNextUrl(filename, manifest) {
  const i = getCurrentIndex(filename, manifest);
  return i !== -1 && i < manifest.slides.length - 1 ? manifest.slides[i + 1] : null;
}
async function fetchManifest() {
  const res = await fetch("./manifest.json");
  if (!res.ok) throw new Error(`Failed to fetch manifest: ${res.status}`);
  return res.json();
}
async function initNavigation(currentFilename) {
  const manifest = await fetchManifest();
  const total = manifest.slides.length;
  const current = getCurrentIndex(currentFilename, manifest) + 1;
  const nav = document.querySelector('slide-navigation, [is="slide-navigation"]');
  const progress = document.querySelector("slide-progress");
  const organism = document.querySelector("[current]");
  if (organism) {
    organism.setAttribute("current", current);
    organism.setAttribute("total", total);
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") {
      e.preventDefault();
      const next = getNextUrl(currentFilename, manifest);
      if (next) navigate(next, "forward");
    }
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      const prev = getPrevUrl(currentFilename, manifest);
      if (prev) navigate(prev, "backward");
    }
  });
  document.addEventListener("slide-next", () => {
    const next = getNextUrl(currentFilename, manifest);
    if (next) navigate(next, "forward");
  });
  document.addEventListener("slide-prev", () => {
    const prev = getPrevUrl(currentFilename, manifest);
    if (prev) navigate(prev, "backward");
  });
}
function navigate(url, direction = "forward") {
  sessionStorage.setItem("slide-nav-direction", direction);
  window.location.href = url;
}

// src/runtime/fullscreen.js
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {
    });
  } else {
    document.exitFullscreen().catch(() => {
    });
  }
}
function initFullscreen() {
  document.addEventListener("keydown", (e) => {
    if (e.key === "f" || e.key === "F") {
      if (e.target.tagName !== "INPUT" && e.target.tagName !== "TEXTAREA") {
        toggleFullscreen();
      }
    }
    if (e.key === "Escape" && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {
      });
    }
  });
  document.querySelectorAll("[data-fullscreen]").forEach((btn) => {
    btn.addEventListener("click", toggleFullscreen);
  });
}

// src/runtime/transitions.js
function fadeCSS() {
  return `
    @keyframes fade-in  { from { opacity: 0 } }
    @keyframes fade-out { to   { opacity: 0 } }

    ::view-transition-old(root) {
      animation: 300ms ease-out fade-out;
    }
    ::view-transition-new(root) {
      animation: 300ms ease-in  fade-in;
    }
  `;
}
function slideCSS(direction) {
  const inFrom = direction === "backward" ? "-100%" : "100%";
  const outTo = direction === "backward" ? "100%" : "-100%";
  return `
    @keyframes slide-in  { from { transform: translateX(${inFrom}) } }
    @keyframes slide-out { to   { transform: translateX(${outTo})  } }

    ::view-transition-old(root) {
      animation: 350ms ease-in-out slide-out;
    }
    ::view-transition-new(root) {
      animation: 350ms ease-in-out slide-in;
    }
  `;
}
function initTransitions() {
  const type = document.body.dataset.transition ?? "fade";
  const direction = sessionStorage.getItem("slide-nav-direction") ?? "forward";
  sessionStorage.removeItem("slide-nav-direction");
  const css = type === "slide" ? slideCSS(direction) : fadeCSS();
  const style = document.createElement("style");
  style.textContent = `
    @view-transition {
      navigation: auto;
    }
    ${css}
  `;
  document.head.appendChild(style);
}

// src/runtime/index.js
async function init() {
  const raw = window.location.pathname.split("/").pop() || "001.html";
  const filename = raw.endsWith(".html") ? raw : `${raw}.html`;
  initTransitions();
  initFullscreen();
  await initNavigation(filename);
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(console.warn);
  }
}
init();
