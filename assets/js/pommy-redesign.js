(function () {
  "use strict";

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var selector = [
    ".pommy-page-intro",
    ".pommy-two-column > *",
    ".pommy-feature-grid > *",
    ".pommy-menu-card",
    ".pommy-post-card",
    ".pommy-product-layout > *",
    ".pommy-checkout-grid > *"
  ].join(",");

  function init() {
    var main = document.querySelector("#main-content:not(.pommy-original-home)");
    if (!main) return;

    var targets = Array.from(main.querySelectorAll(selector));
    if (!targets.length || reducedMotion.matches || !("IntersectionObserver" in window)) {
      targets.forEach(function (target) { target.classList.add("is-redesign-visible"); });
      document.documentElement.classList.add("pommy-redesign-motion-ready");
      return;
    }

    targets.forEach(function (target, index) {
      target.classList.add("pommy-redesign-reveal");
      target.style.setProperty("--pommy-redesign-delay", (index % 4) * 45 + "ms");
    });

    document.documentElement.classList.add("pommy-redesign-motion-ready");

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-redesign-visible");
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8%", threshold: 0.08 });

    targets.forEach(function (target) { observer.observe(target); });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
