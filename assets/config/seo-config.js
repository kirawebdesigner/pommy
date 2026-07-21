(function (root, factory) {
  "use strict";

  var config = factory(root || {});
  if (typeof module === "object" && module.exports) module.exports = config;
  if (root) root.POMMY_SEO_CONFIG = config;
})(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
  "use strict";

  var runtime = root.POMMY_PUBLIC_ENV || {};
  var processEnv = typeof process === "object" && process && process.env ? process.env : {};

  function value(name, fallback) {
    var candidate = runtime[name];
    if (candidate === undefined || candidate === null || candidate === "") candidate = processEnv[name];
    return candidate === undefined || candidate === null || candidate === "" ? fallback : candidate;
  }

  function booleanValue(name, fallback) {
    var candidate = value(name, fallback);
    if (typeof candidate === "boolean") return candidate;
    return String(candidate).toLowerCase() !== "false";
  }

  function siteUrl(valueToNormalize) {
    return String(valueToNormalize).replace(/\/+$/, "");
  }

  var baseUrl = siteUrl(value("PUBLIC_SITE_URL", "https://pommydemo.netlify.app"));

  return Object.freeze({
    siteUrl: baseUrl,
    demoMode: booleanValue("PUBLIC_DEMO_MODE", true),
    googleAnalyticsId: String(value("PUBLIC_GA4_ID", "")),
    googleTagManagerId: String(value("PUBLIC_GTM_ID", "")),
    googleSiteVerification: "pY7z6H-NGHLqbbZ_31OKCE-mJV_FNFHOCZg6r6QEU3w",
    business: Object.freeze({
      name: "Pommy Burger and Pizza",
      alternateNames: Object.freeze(["Pommy", "Pommy Burger & Pizzeria"]),
      displayName: "Pommy Burger and Pizza",
      category: "Burger and pizza restaurant",
      description: "Pommy Burger and Pizza serves burgers, pizza, chicken, breakfast, wraps and drinks around CMC in Addis Ababa.",
      phoneDisplay: "095 690 5484",
      phoneInternational: "+251956905484",
      whatsapp: null,
      email: null,
      address: Object.freeze({
        display: "Around CMC, Addis Ababa, Ethiopia",
        plusCode: "XRRH+5Q Addis Ababa",
        locality: "Addis Ababa",
        region: "Addis Ababa",
        countryCode: "ET",
        postalCode: null
      }),
      coordinates: null,
      openingHours: null,
      socialProfiles: Object.freeze([]),
      directionsUrl: "https://www.google.com/maps/search/?api=1&query=XRRH%2B5Q%20Addis%20Ababa",
      logoPath: "/assets/images/pommy-logo.png",
      squareLogoPath: "/favicon-512x512.png",
      faviconPath: "/favicon.png",
      defaultImagePath: "/assets/images/menu/home-hero.jpg",
      menuPath: "/menu/",
      orderPath: "/checkout/",
      contactPath: "/contact/",
      areaServed: Object.freeze(["CMC", "Addis Ababa"]),
      cuisines: Object.freeze(["Burgers", "Pizza", "Fast Food", "Chicken", "Breakfast"]),
      currenciesAccepted: "ETB",
      paymentAccepted: "Cash on Delivery"
    }),
    keywords: Object.freeze([
      "Pommy Burger and Pizza",
      "Pommy CMC",
      "burger around CMC",
      "pizza around CMC",
      "burger restaurant in Addis Ababa",
      "pizza restaurant in Addis Ababa"
    ])
  });
});
