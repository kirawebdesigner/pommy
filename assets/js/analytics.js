(function () {
  "use strict";

  var config = window.POMMY_SEO_CONFIG || {};
  var ga4Id = String(config.googleAnalyticsId || "");
  var gtmId = String(config.googleTagManagerId || "");
  window.dataLayer = window.dataLayer || [];

  function loadScript(src) {
    var script = document.createElement("script");
    script.async = true;
    script.src = src;
    document.head.appendChild(script);
  }

  if (gtmId) {
    window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
    loadScript("https://www.googletagmanager.com/gtm.js?id=" + encodeURIComponent(gtmId));
  } else if (ga4Id) {
    loadScript("https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(ga4Id));
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", ga4Id, { anonymize_ip: true });
  }

  function track(name, parameters) {
    var payload = Object.assign({ event: name }, parameters || {});
    window.dataLayer.push(payload);
    if (ga4Id && typeof window.gtag === "function") window.gtag("event", name, parameters || {});
  }

  function itemDetails(element) {
    var card = element.closest("[data-product-slug], .pommy-menu-card, .pommy-original-menu-card");
    var productLink = card && card.querySelector('a[href^="/product/"]');
    var slug = productLink ? productLink.getAttribute("href").split("/").filter(Boolean).pop() : "";
    return { item_id: String(element.dataset.addToCart || slug || ""), item_name: String(card && card.querySelector("h1, h2, h3") ? card.querySelector("h1, h2, h3").textContent.trim() : "") };
  }

  document.addEventListener("click", function (event) {
    var link = event.target.closest("a[href]");
    var add = event.target.closest("[data-add-to-cart]");
    if (add) track("add_to_cart", itemDetails(add));
    if (!link) return;

    var href = link.getAttribute("href") || "";
    if (href.indexOf("tel:") === 0) track("click_call", { link_url: href });
    else if (/google\.com\/maps|maps\.app\.goo\.gl/i.test(href)) track("get_directions", { link_url: href });
    else if (/wa\.me|whatsapp/i.test(href)) track("click_whatsapp", { link_url: href });
    else if (href.indexOf("/product/") === 0) track("select_item", itemDetails(link));
  });

  document.addEventListener("pommy:order-submitted", function (event) {
    track("submit_order", event.detail || {});
  });

  var path = window.location.pathname.replace(/index\.html$/, "");
  if (path === "/menu/" || path.indexOf("/category/") === 0 || path.indexOf("/dish-categories/") === 0) track("view_menu");
  if (path === "/checkout/") track("begin_checkout");

  window.PommyAnalytics = Object.freeze({ track: track });
})();
