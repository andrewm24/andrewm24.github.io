import "./style.css";

const root = document.documentElement;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Theme -------------------------------------------------------------------- */

const themeToggle = document.querySelector("[data-theme-toggle]");
const themeLabel = document.querySelector("[data-theme-label]");
const themeMeta = document.querySelector('meta[name="theme-color"]');

const applyTheme = (theme) => {
  const next = theme === "dark" ? "dark" : "light";
  root.dataset.theme = next;
  root.style.colorScheme = next;

  if (themeLabel) {
    themeLabel.textContent = next === "dark" ? "Light" : "Dark";
  }
  if (themeToggle) {
    themeToggle.setAttribute("aria-label", `Switch to ${next === "dark" ? "light" : "dark"} theme`);
  }
  if (themeMeta) {
    const bg = getComputedStyle(root).getPropertyValue("--bg").trim();
    if (bg) themeMeta.setAttribute("content", bg);
  }

  try {
    localStorage.setItem("am-theme", next);
  } catch (error) {
    // Storage can be unavailable in private modes; the theme still applies.
  }
};

themeToggle?.addEventListener("click", () => {
  applyTheme(root.dataset.theme === "dark" ? "light" : "dark");
});

applyTheme(root.dataset.theme);

/* Reveal on scroll --------------------------------------------------------- */

const revealNodes = document.querySelectorAll("[data-reveal]");

if (reducedMotion || !("IntersectionObserver" in window)) {
  revealNodes.forEach((node) => node.classList.add("is-visible"));
} else {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -10% 0px", threshold: 0.1 }
  );

  revealNodes.forEach((node) => observer.observe(node));
}

/* Top bar rule + current section ------------------------------------------- */

const topbar = document.querySelector(".topbar");
const navLinks = Array.from(document.querySelectorAll(".nav a"));
const sections = navLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);

const setCurrent = (id) => {
  navLinks.forEach((link) => {
    if (link.getAttribute("href") === `#${id}`) {
      link.setAttribute("aria-current", "true");
    } else {
      link.removeAttribute("aria-current");
    }
  });
};

if (sections.length && "IntersectionObserver" in window) {
  const sectionObserver = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setCurrent(visible.target.id);
    },
    { rootMargin: "-20% 0px -60% 0px", threshold: [0, 0.25, 0.5] }
  );

  sections.forEach((section) => sectionObserver.observe(section));
}

const onScroll = () => {
  topbar?.setAttribute("data-scrolled", String(window.scrollY > 8));
};

window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

/* PCB viewer --------------------------------------------------------------- */

// model-viewer (and the three.js it bundles) is large, so it is only fetched
// once the viewer is close to scrolling into view.
const pcbViewer = document.querySelector("[data-pcb-viewer]");

if (pcbViewer) {
  const model = pcbViewer.querySelector("model-viewer");
  const status = pcbViewer.querySelector("[data-pcb-status]");

  if (reducedMotion) model.removeAttribute("auto-rotate");

  model.addEventListener("load", () => {
    if (status) status.hidden = true;
  });
  model.addEventListener("error", () => {
    if (status) status.textContent = "The 3D model couldn't load.";
  });

  const loadViewer = () =>
    import("@google/model-viewer").catch(() => {
      if (status) status.textContent = "The 3D viewer couldn't load.";
    });

  if ("IntersectionObserver" in window) {
    const viewerObserver = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        viewerObserver.disconnect();
        loadViewer();
      },
      { rootMargin: "400px 0px" }
    );
    viewerObserver.observe(pcbViewer);
  } else {
    loadViewer();
  }
}

/* Footer year -------------------------------------------------------------- */

const year = document.querySelector("[data-year]");
if (year) {
  year.textContent = String(new Date().getFullYear());
}
