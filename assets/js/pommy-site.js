(function () {
  "use strict";

  var CART_KEY = "pommy_cart_v1";
  var config = window.POMMY_ORDER_CONFIG || {};
  var menu = window.POMMY_MENU || [];
  var posts = window.POMMY_POSTS || [];

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatEtb(value) {
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value) + " ETB";
  }

  function currentPath() {
    var path = window.location.pathname.replace(/index\.html$/, "");
    return path.endsWith("/") ? path : path + "/";
  }

  function findProduct(slug) {
    return menu.find(function (item) { return item.slug === slug; });
  }

  function productCard(item) {
    var description = item.description || "View this item on the Pommy menu.";
    return '<article data-w-id="770cf311-3a76-a0f9-0c48-8b6b85d6c484" class="pommy-menu-card w-dyn-item" data-category="' + escapeHtml(item.category) + '" data-search="' + escapeHtml((item.name + " " + description).toLowerCase()) + '">' +
      '<a class="pommy-menu-card-image" href="/product/' + escapeHtml(item.slug) + '/">' +
        '<img src="' + escapeHtml(item.image) + '" alt="Food image for the ' + escapeHtml(item.category.replace(/-/g, " ")) + ' category" loading="lazy">' +
      '</a>' +
      '<div class="pommy-menu-card-body">' +
        '<div class="pommy-menu-card-top"><h3><a href="/product/' + escapeHtml(item.slug) + '/">' + escapeHtml(item.name) + '</a></h3><span class="pommy-price">' + formatEtb(item.price) + '</span></div>' +
        '<p>' + escapeHtml(description) + '</p>' +
        '<div class="pommy-menu-card-actions"><a class="button-secondary small" href="/product/' + escapeHtml(item.slug) + '/">View</a><button class="button-primary small" type="button" data-add-to-cart="' + escapeHtml(item.id) + '">Add to cart</button></div>' +
      '</div>' +
    '</article>';
  }

  function postCard(post) {
    return '<article class="pommy-post-card">' +
      '<a href="/blog-posts/' + escapeHtml(post.slug) + '/"><img src="' + escapeHtml(post.image) + '" alt="Food from the Pommy menu" loading="lazy"></a>' +
      '<div class="pommy-post-card-body"><time datetime="' + escapeHtml(post.date) + '">' + new Date(post.date + "T00:00:00").toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) + '</time>' +
      '<h3><a href="/blog-posts/' + escapeHtml(post.slug) + '/">' + escapeHtml(post.title) + '</a></h3><p>' + escapeHtml(post.description) + '</p></div></article>';
  }

  function originalMenuCard(item) {
    var description = item.description || "View this item on the Pommy menu.";
    return '<article data-w-id="07b23b0f-b430-385d-b89d-4525f6d1d0be" role="listitem" class="w-dyn-item">' +
      '<div class="card menu-card pommy-original-menu-card">' +
        '<a href="/product/' + escapeHtml(item.slug) + '/" class="image-wrapper menu-card mg-bottom-24px w-inline-block"><img src="' + escapeHtml(item.image) + '" alt="' + escapeHtml(item.name) + ' from the Pommy menu" class="image" loading="lazy"><span class="badge dish">' + formatEtb(item.price) + '</span></a>' +
        '<div><h3 class="title mg-bottom-8px"><a href="/product/' + escapeHtml(item.slug) + '/">' + escapeHtml(item.name) + '</a></h3><p class="mg-bottom-16px">' + escapeHtml(description) + '</p><button class="pommy-original-add" type="button" data-add-to-cart="' + escapeHtml(item.id) + '">Add to cart</button></div>' +
      '</div>' +
    '</article>';
  }

  function originalBlogCard(post, isFeatured) {
    var date = new Date(post.date + "T00:00:00").toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    var cardClass = isFeatured ? "card blog-card featured-blog w-inline-block" : "card blog-card w-inline-block";
    var contentClass = isFeatured ? "card-content blog-card featured" : "card-content blog-card side";
    var heading = isFeatured ? "h2" : "h3";
    var headingClass = isFeatured ? "title blog-post-title" : "title h5-size mg-bottom-0px";
    return '<a href="/blog-posts/' + escapeHtml(post.slug) + '/" class="' + cardClass + '"><div class="mask"><img src="' + escapeHtml(post.image) + '" alt="Food from the Pommy menu" class="image full-image" loading="lazy"></div><div class="' + contentClass + '"><div><div class="' + (isFeatured ? "mg-bottom-16px" : "text-100 mg-bottom-8px") + '"><time datetime="' + escapeHtml(post.date) + '">' + date + '</time></div><' + heading + ' class="' + headingClass + '">' + escapeHtml(post.title) + '</' + heading + '>' + (isFeatured ? '<p class="mg-bottom-0px">' + escapeHtml(post.description) + '</p>' : '') + '</div></div></a>';
  }

  function trustSlide(title, body, details) {
    return '<div class="slide mg-right-24px w-slide"><article class="card testimonial-card pommy-trust-card"><div class="pommy-trust-mark" aria-hidden="true">P</div><h3>' + escapeHtml(title) + '</h3><p class="mg-bottom-24px">' + escapeHtml(body) + '</p><div class="pommy-trust-detail">' + escapeHtml(details) + '</div></article></div>';
  }

  function ensureSkipLink() {
    if (document.querySelector(".pommy-skip-link")) return;
    var link = document.createElement("a");
    link.className = "pommy-skip-link";
    link.href = "#main-content";
    link.textContent = "Skip to main content";
    document.body.prepend(link);
  }

  function navMarkup() {
    var links = [["Home", "/"], ["Menu", "/menu/"], ["About", "/about/"], ["Blog", "/blog/"], ["Contact", "/contact/"]];
    var path = currentPath();
    return '<ul role="list" class="header-navigation">' + links.map(function (link, index) {
      var active = path === link[1] || (link[1] !== "/" && path.indexOf(link[1]) === 0);
      return '<li class="nav-item-wrapper' + (index === links.length - 1 ? " last" : "") + '"><a href="' + link[1] + '" class="nav-link' + (active ? " w--current" : "") + '"' + (active ? ' aria-current="page"' : "") + '>' + link[0] + '</a></li>';
    }).join("") + '</ul>';
  }

  function headerMarkup() {
    return '<div data-collapse="medium" data-animation="default" data-duration="400" data-w-id="58db7844-5919-d71b-dd74-2323ed8dffe9" data-easing="ease" data-easing2="ease" role="banner" class="header w-nav">' +
      '<div class="container-default w-container"><div class="header-wrapper">' +
        '<div class="split-content header-right"><a href="/" class="brand w-nav-brand" aria-label="Pommy Burger and Pizza home"><img src="/assets/images/pommy-logo.png" alt="Pommy Burger and Pizzeria logo" class="header-logo pommy-logo"></a><nav role="navigation" class="nav-menu w-nav-menu">' + navMarkup() + '</nav></div>' +
        '<div class="split-content header-left"><div class="header-buttons-wrapper"><button class="button-secondary small mg-right-24px pommy-cart-open" type="button" aria-haspopup="dialog">Cart (<span data-cart-count>0</span>)</button><a href="/menu/" class="button-primary small w-button">Order Now</a></div>' +
        '<div class="menu-button w-nav-button" aria-label="Open navigation" role="button" tabindex="0"><div data-is-ix2-target="1" class="lottie-animation" data-animation-type="lottie" data-src="/assets/animations/menu-toggle.json" data-loop="0" data-direction="1" data-autoplay="0" data-renderer="svg" data-default-duration="2.0208333333333335" data-duration="0" data-loading="eager"></div><div class="w-icon-nav-menu pommy-fallback-menu-icon"></div></div></div>' +
      '</div></div></div>';
  }

  function ensureHeader() {
    var wrapper = document.querySelector(".page-wrapper") || document.body;
    var header = wrapper.querySelector(":scope > .header");
    if (!header) {
      wrapper.insertAdjacentHTML("afterbegin", headerMarkup());
      header = wrapper.querySelector(":scope > .header");
    }

    var brand = header.querySelector(".brand");
    if (brand) {
      brand.href = "/";
      brand.setAttribute("aria-label", "Pommy Burger and Pizza home");
      brand.innerHTML = '<img src="/assets/images/pommy-logo.png" alt="Pommy Burger and Pizzeria logo" class="header-logo pommy-logo">';
    }

    var nav = header.querySelector(".nav-menu");
    if (nav) nav.innerHTML = navMarkup();

    var buttons = header.querySelector(".header-buttons-wrapper");
    if (!buttons) {
      var headerLeft = header.querySelector(".split-content.header-left");
      if (headerLeft) {
        buttons = document.createElement("div");
        buttons.className = "header-buttons-wrapper";
        headerLeft.prepend(buttons);
      }
    }
    if (buttons) {
      buttons.innerHTML = '<button class="button-secondary small mg-right-24px pommy-cart-open" type="button" aria-haspopup="dialog">Cart (<span data-cart-count>0</span>)</button><a href="/menu/" class="button-primary small w-button">Order Now</a>';
    }
  }

  function footerMarkup() {
    var footerImages = ["gallery-1.jpg", "gallery-2.jpg", "burger.jpg", "hot-drink.jpg"];
    return '<div class="container-default"><div class="w-layout-grid footer-grid">' +
      '<div class="footer-column"><a href="/" class="footer-logo-container mg-bottom-16px w-inline-block"><img src="/assets/images/pommy-logo.png" alt="Pommy Burger and Pizzeria logo" class="footer-logo pommy-logo"></a><p class="mg-bottom-24px">Burgers, pizza, chicken, breakfast and fresh drinks served in Addis Ababa.</p><div class="pommy-contact-list"><div><strong>Location</strong>Addis Ababa, Ethiopia</div><div><strong>Plus code</strong>' + escapeHtml(config.plusCode) + '</div><div><strong>Phone</strong><a href="tel:' + escapeHtml(config.phoneInternational) + '">' + escapeHtml(config.phoneDisplay) + '</a></div></div></div>' +
      '<div class="footer-column middle"><div class="footer-nav-main-wrapper"><div class="footer-nav-column"><div class="footer-nav-title mg-bottom-32px">Explore</div><ul role="list" class="footer-nav"><li class="footer-nav-item"><a href="/" class="footer-link">Home</a></li><li class="footer-nav-item"><a href="/menu/" class="footer-link">Menu</a></li><li class="footer-nav-item"><a href="/about/" class="footer-link">About</a></li><li class="footer-nav-item"><a href="/blog/" class="footer-link">Blog</a></li><li class="footer-nav-item last"><a href="/contact/" class="footer-link">Contact</a></li></ul></div><div class="footer-nav-column last"><div class="footer-nav-title mg-bottom-32px">Customer actions</div><div class="pommy-footer-actions"><a href="/menu/" class="footer-link">Order Now</a><a href="tel:' + escapeHtml(config.phoneInternational) + '" class="footer-link">Call Pommy</a><a href="' + escapeHtml(config.directionsUrl) + '" class="footer-link" target="_blank" rel="noopener">Get Directions</a></div></div></div></div>' +
      '<div class="footer-column"><div class="footer-nav-title mg-bottom-32px">From the Pommy menu</div><div class="_2-column-grid instagram-footer-grid">' + footerImages.map(function (image) { return '<div class="mask instagram-image"><img src="/assets/images/menu/' + image + '" alt="Food from the Pommy menu" class="image instagram" loading="lazy"></div>'; }).join("") + '</div></div>' +
    '</div><div class="divider"></div><div data-w-id="eea6b3e0-d9ff-e6b5-76a4-5c0b4254248e" class="footer-bottom-content"><div>© Pommy Burger and Pizza</div><div>Addis Ababa, Ethiopia</div></div></div>';
  }

  function ensureFooter() {
    var wrapper = document.querySelector(".page-wrapper") || document.body;
    var footer = wrapper.querySelector(":scope > footer.footer");
    if (!footer) {
      footer = document.createElement("footer");
      footer.className = "footer";
      wrapper.appendChild(footer);
    }
    footer.innerHTML = footerMarkup();
  }

  function readCart() {
    try {
      var value = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
      return Array.isArray(value) ? value : [];
    } catch (error) {
      return [];
    }
  }

  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    renderCart();
    document.dispatchEvent(new CustomEvent("pommy:cart-changed", { detail: cart }));
  }

  function cartSubtotal(cart) {
    return cart.reduce(function (sum, item) { return sum + item.unitPrice * item.quantity; }, 0);
  }

  function cartCount(cart) {
    return cart.reduce(function (sum, item) { return sum + item.quantity; }, 0);
  }

  function addToCart(productId, quantity) {
    var item = menu.find(function (entry) { return entry.id === productId; });
    if (!item) return;
    var amount = Math.max(1, Number(quantity) || 1);
    var cart = readCart();
    var existing = cart.find(function (entry) { return entry.productId === item.id; });
    if (existing) existing.quantity += amount;
    else cart.push({ productId: item.id, slug: item.slug, name: item.name, unitPrice: item.price, quantity: amount, image: item.image });
    saveCart(cart);
    openCart();
  }

  function setQuantity(productId, quantity) {
    var cart = readCart();
    var item = cart.find(function (entry) { return entry.productId === productId; });
    if (!item) return;
    item.quantity = Number(quantity);
    if (item.quantity <= 0) cart = cart.filter(function (entry) { return entry.productId !== productId; });
    saveCart(cart);
  }

  function removeFromCart(productId) {
    saveCart(readCart().filter(function (entry) { return entry.productId !== productId; }));
  }

  function ensureCart() {
    if (document.querySelector(".pommy-cart-drawer")) return;
    document.body.insertAdjacentHTML("beforeend", '<div class="pommy-cart-overlay" data-cart-close></div><aside class="pommy-cart-drawer" role="dialog" aria-modal="true" aria-labelledby="pommy-cart-title" tabindex="-1"><div class="pommy-cart-header"><h2 id="pommy-cart-title">Your cart</h2><button type="button" class="pommy-icon-button" data-cart-close aria-label="Close cart">×</button></div><div class="pommy-cart-items" data-cart-items></div><div class="pommy-cart-footer"><div class="pommy-cart-total"><span>Subtotal</span><span data-cart-subtotal>0 ETB</span></div><a href="/checkout/" class="button-primary">Proceed to Checkout</a><button type="button" class="pommy-clear-cart" data-cart-clear>Clear cart</button></div></aside>');
    renderCart();
  }

  function renderCart() {
    var cart = readCart();
    document.querySelectorAll("[data-cart-count]").forEach(function (element) { element.textContent = String(cartCount(cart)); });
    var items = document.querySelector("[data-cart-items]");
    if (!items) return;
    if (!cart.length) {
      items.innerHTML = '<div class="pommy-cart-empty"><p>Your cart is empty.</p><a href="/menu/" class="button-secondary small">Browse the menu</a></div>';
    } else {
      items.innerHTML = cart.map(function (item) {
        return '<div class="pommy-cart-item"><a href="/product/' + escapeHtml(item.slug) + '/"><img src="' + escapeHtml(item.image) + '" alt="Food image for ' + escapeHtml(item.name) + '"></a><div><h3><a href="/product/' + escapeHtml(item.slug) + '/">' + escapeHtml(item.name) + '</a></h3><div class="pommy-cart-item-meta">' + formatEtb(item.unitPrice) + ' each</div><div class="pommy-cart-item-controls"><button type="button" class="pommy-quantity-button" data-cart-decrease="' + escapeHtml(item.productId) + '" aria-label="Decrease ' + escapeHtml(item.name) + ' quantity">−</button><strong aria-label="Quantity">' + item.quantity + '</strong><button type="button" class="pommy-quantity-button" data-cart-increase="' + escapeHtml(item.productId) + '" aria-label="Increase ' + escapeHtml(item.name) + ' quantity">+</button><button type="button" class="pommy-remove-button" data-cart-remove="' + escapeHtml(item.productId) + '" aria-label="Remove ' + escapeHtml(item.name) + ' from cart">Remove</button></div></div></div>';
      }).join("");
    }
    var subtotal = document.querySelector("[data-cart-subtotal]");
    if (subtotal) subtotal.textContent = formatEtb(cartSubtotal(cart));
    var clear = document.querySelector("[data-cart-clear]");
    if (clear) clear.hidden = !cart.length;
  }

  function openCart() {
    var overlay = document.querySelector(".pommy-cart-overlay");
    var drawer = document.querySelector(".pommy-cart-drawer");
    if (!overlay || !drawer) return;
    overlay.classList.add("is-open");
    drawer.classList.add("is-open");
    document.body.classList.add("pommy-cart-locked");
    drawer.focus();
  }

  function closeCart() {
    document.querySelector(".pommy-cart-overlay")?.classList.remove("is-open");
    document.querySelector(".pommy-cart-drawer")?.classList.remove("is-open");
    document.body.classList.remove("pommy-cart-locked");
  }

  function bindGlobalActions() {
    document.addEventListener("click", function (event) {
      var add = event.target.closest("[data-add-to-cart]");
      if (add) {
        event.preventDefault();
        var quantityInput = document.querySelector("[data-product-quantity]");
        addToCart(add.dataset.addToCart, quantityInput ? quantityInput.value : 1);
        return;
      }
      if (event.target.closest(".pommy-cart-open")) { event.preventDefault(); openCart(); return; }
      if (event.target.closest("[data-cart-close]")) { event.preventDefault(); closeCart(); return; }
      var increase = event.target.closest("[data-cart-increase]");
      if (increase) { var up = readCart().find(function (item) { return item.productId === increase.dataset.cartIncrease; }); if (up) setQuantity(up.productId, up.quantity + 1); return; }
      var decrease = event.target.closest("[data-cart-decrease]");
      if (decrease) { var down = readCart().find(function (item) { return item.productId === decrease.dataset.cartDecrease; }); if (down) setQuantity(down.productId, down.quantity - 1); return; }
      var remove = event.target.closest("[data-cart-remove]");
      if (remove) { removeFromCart(remove.dataset.cartRemove); return; }
      if (event.target.closest("[data-cart-clear]")) { saveCart([]); return; }
    });
    document.addEventListener("keydown", function (event) { if (event.key === "Escape") closeCart(); });
  }

  function enableNavigationFallback() {
    window.addEventListener("load", function () {
      if (window.Webflow) return;
      var button = document.querySelector(".w-nav-button");
      var nav = document.querySelector(".w-nav-menu");
      if (!button || !nav) return;
      function toggle() {
        var open = button.getAttribute("aria-expanded") === "true";
        button.setAttribute("aria-expanded", String(!open));
        nav.style.display = open ? "none" : "block";
      }
      button.setAttribute("aria-expanded", "false");
      button.addEventListener("click", toggle);
      button.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); toggle(); }
      });
    }, { once: true });
  }

  function enableOriginalMotionFallback() {
    if (!document.querySelector(".pommy-original-home")) return;
    var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var element = entry.target;
        window.setTimeout(function () {
          if (Number.parseFloat(getComputedStyle(element).opacity || "1") >= .85) {
            observer.unobserve(element);
            return;
          }
          if (!reducedMotion) element.style.transition = "opacity 300ms ease, transform 300ms ease";
          element.style.opacity = "1";
          element.style.removeProperty("transform");
          observer.unobserve(element);
        }, reducedMotion ? 0 : 700);
      });
    }, { rootMargin: "0px 0px -20% 0px", threshold: .01 });
    document.querySelectorAll(".pommy-original-home [data-w-id]").forEach(function (element) { observer.observe(element); });
  }

  function section(inner, className) {
    return '<section class="section pommy-standard-section ' + (className || "") + '"><div class="pommy-section-inner">' + inner + '</div></section>';
  }

  function replaceMain(html) {
    var wrapper = document.querySelector(".page-wrapper") || document.body;
    Array.from(wrapper.children).forEach(function (child) {
      if (!child.classList.contains("header") && !(child.tagName === "FOOTER" && child.classList.contains("footer"))) child.remove();
    });
    var footer = wrapper.querySelector(":scope > footer.footer");
    if (footer) footer.insertAdjacentHTML("beforebegin", html);
    else wrapper.insertAdjacentHTML("beforeend", html);
    var main = wrapper.querySelector("#main-content");
    if (main) main.setAttribute("tabindex", "-1");
  }

  function renderHome() {
    var selectedSlugs = ["pommy-special-burger", "pommy-chicken-special-burger", "pommy-special-pizza", "chicken-bbq-pizza", "egg-sandwich", "chicken-wrap", "pommy-special-smoothie", "chocolate-milk-shake"];
    var featured = selectedSlugs.map(findProduct).filter(Boolean);
    if (featured.length < 8) {
      menu.forEach(function (item) { if (featured.length < 8 && !featured.includes(item)) featured.push(item); });
    }
    var categories = [
      ["Burger", "burger", "Beef, cheese, fasting and chicken burger choices.", "burger.svg"],
      ["Pizza", "pizza", "Pommy specials, chicken, tuna, vegetable and more.", "pizza.svg"],
      ["Chicken", "chicken", "Grilled, crispy, wings, rice dishes and roast chicken.", "chicken.svg"],
      ["Wrap", "wrap", "Chicken, tuna and vegetable wraps with fries available.", "wrap.svg"]
    ];
    var trust = [
      ["Dine-in with table service", "Enjoy Pommy in a casual atmosphere with table service available.", "Dine-in · Casual atmosphere"],
      ["Takeaway made straightforward", "Browse clear ETB prices, prepare your choices and call Pommy to confirm.", "Takeaway · Easy menu browsing"],
      ["A menu for groups and kids", "Burgers, pizza, chicken, breakfast and drinks give groups plenty of choice.", "Good for groups · Good for kids"],
      ["Quick bites and late-night food", "Choose from a broad fast-food menu when you want something quick and satisfying.", "Quick bite · Late-night food"]
    ];
    var gallery = ["gallery-1.jpg", "gallery-2.jpg", "hot-drink.jpg", "chicken.jpg", "breakfast.jpg", "shake.jpg"];
    var html = '<main id="main-content" class="pommy-original-home">' +
      '<section class="section home-hero"><div class="container-default w-container pommy-home-hero-container"><div><div class="_2-column-grid home-hero-wrapper pommy-home-hero-grid"><div class="inner-container-550px position-relative pommy-home-hero-copy"><h1 data-w-id="687ff863-1ec1-bccd-92f7-679c7a34b916">Big flavor. Made the <span class="color-primary-1">Pommy way.</span></h1><p data-w-id="18c931e0-7b9a-fa72-69e7-9fdbea918735" class="mg-bottom-40px">Burgers, pizza, chicken, breakfast and fresh drinks served in Addis Ababa.</p><div data-w-id="0033c4c7-ca33-c906-19f5-5015d1f8896f" class="_2-button-wrap home"><a href="/menu/" class="button-primary _2-buttons home w-button">Order Now</a><a href="/menu/" class="button-secondary w-button">Explore Menu</a></div><a href="#browse-menu" data-w-id="28c47774-79ae-0b4b-8d12-8d6c1aa58847" class="down-arrow home w-inline-block" aria-label="Browse the Pommy menu"><div><span></span></div></a></div><div class="pommy-home-hero-media"><img src="/assets/images/menu/home-hero.jpg" alt="Burger from the Pommy menu" class="image home-hero-image" data-w-id="90122aae-60ae-33c5-c958-d7fe44f86361"></div></div></div></div><div data-w-id="8f4f0a46-93b7-ccd5-4397-7dc1c2e7a540" class="bg home-hero"></div></section>' +
      '<section class="narrow-section"><div class="container-default w-container"><div data-w-id="f165e2fc-bb69-d1fb-98a5-2f1d13a72f7d" class="text-center"><div class="text-single-18px bold-text mg-bottom-32px">Choose how you enjoy Pommy today</div><div class="pommy-service-apps"><span>Dine-in</span><span>Takeaway</span><span>Quick bite</span><span>Table service</span></div></div></div></section>' +
      '<section id="browse-menu" class="section"><div class="container-default w-container"><div><div class="text-center align-center mg-bottom-40px"><h2 data-w-id="e4c3bb7f-ac95-699e-bd63-e013c6263f86">Browse our menu</h2></div><div class="w-dyn-list"><div role="list" class="_4-column-grid w-dyn-items">' + categories.map(function (item) { return '<div data-w-id="7ee8d58f-3281-8591-7277-504ae59adede" role="listitem" class="w-dyn-item"><a data-w-id="42ea016a-dd17-69a0-5966-e8a73e8c3b0c" href="/menu/?category=' + item[1] + '" class="card menu-category-card w-inline-block"><img src="/assets/icons/' + item[3] + '" alt="' + item[0] + ' menu category illustration"><div class="mg-top-24px"><h3>' + item[0] + '</h3><p class="mg-bottom-40px">' + item[2] + '</p><div class="color-primary-1 bold-text">Explore menu <span class="link-arrow"></span></div></div></a></div>'; }).join("") + '</div></div><div data-w-id="48311069-e710-231d-32e5-b287b94cc281" class="_2-button-wrap center-content mg-top-48px"><a href="/menu/" class="button-primary _2-buttons w-button">Order Now</a><a href="/menu/" class="button-secondary w-button">Full Menu</a></div></div></div></section>' +
      '<section class="section bg-secondary-1"><div class="container-default w-container"><div class="_2-column-grid larger-left-column pommy-home-about-grid"><div data-w-id="08e9f933-a2c4-be53-bba8-efe485bf9535" class="inner-container-500px _100-in-mobile pommy-home-about-copy"><div class="pommy-eyebrow">About Pommy</div><h2>A casual fast-food restaurant in Addis Ababa</h2><p class="mg-bottom-48px">Pommy Burger and Pizza serves a broad menu for dine-in and takeaway, including burgers, pizza, chicken, breakfast, wraps, juices, shakes and hot drinks.<br><br>Clear menu prices and practical ordering tools make it easy to choose before you visit or call.</p><div data-w-id="3b4e42bb-d5ac-a62b-e3e5-bd8c33afabcf" class="_2-button-wrap"><a href="/about/" class="button-primary _2-buttons w-button">About Pommy</a><a href="/contact/" class="button-secondary w-button">Contact</a></div></div><div class="composition pommy-home-about-composition"><img src="/assets/images/menu/hot-drink.jpg" alt="Food from the Pommy menu" class="image full-image-w-radius about-home" data-w-id="1dcc2e1a-7dd1-91f8-614c-ac4ea06931bd"><div data-w-id="01c90352-be98-8fb5-9058-533f2aa55a3e" class="card home-about-card"><h3 class="mg-bottom-24px">Come and visit us</h3><div class="pommy-original-detail mg-bottom-16px"><img src="/assets/icons/location.svg" alt="Location" class="icon about-home-bullet"><div><strong>Pommy Burger and Pizza</strong><br>Addis Ababa, Ethiopia<br>' + escapeHtml(config.plusCode) + '</div></div><a href="tel:' + escapeHtml(config.phoneInternational) + '" class="text-decoration-none block w-inline-block"><div class="pommy-original-detail mg-bottom-16px"><img src="/assets/icons/phone.svg" alt="Phone" class="icon about-home-bullet"><div>' + escapeHtml(config.phoneDisplay) + '</div></div></a><div class="_2-button-wrap pommy-about-actions"><a href="' + escapeHtml(config.directionsUrl) + '" target="_blank" rel="noopener" class="button-primary small w-button">Get Directions</a><a href="tel:' + escapeHtml(config.phoneInternational) + '" class="button-secondary small w-button">Call Pommy</a></div></div></div></div></div></section>' +
      '<section class="section"><div class="container-default w-container"><div><div class="section-title-wrapper max-w-550px mg-bottom-48px"><h2 data-w-id="ed55ef11-3a76-882b-a053-9be0ff301d14">Browse our menu</h2><p data-w-id="fc0b4889-20e8-72d7-52b6-5bfcdc205667">Signature Pommy burgers, pizzas, breakfast, wraps and drinks with real ETB prices.</p></div><div class="w-dyn-list"><div role="list" class="_4-column-grid menu-grid w-dyn-items">' + featured.slice(0, 8).map(originalMenuCard).join("") + '</div></div><div data-w-id="b2e57d27-1cfb-e671-8cbf-bdf107b3da15" class="_2-button-wrap center-content mg-top-48px"><a href="/menu/" class="button-primary _2-buttons w-button">Order Now</a><a href="/menu/" class="button-secondary w-button">View Full Menu</a></div></div></div></section>' +
      '<section data-w-id="4c600c81-cae4-74aa-84a0-de68746e12d8" class="section cta-v1"><div class="container-default"><div><div class="_2-column-grid"><div class="inner-container-550px"><div data-w-id="4c600c81-cae4-74aa-84a0-de68746e12dd" class="dash-small---90px mg-bottom-48px"></div><h2 data-w-id="4c600c81-cae4-74aa-84a0-de68746e12de" class="color-white">Ready for your next meal?</h2><p data-w-id="4c600c81-cae4-74aa-84a0-de68746e12e0" class="mg-bottom-40px">Browse the full menu, add your choices to the cart and prepare a delivery or pickup order summary.</p><div data-w-id="4c600c81-cae4-74aa-84a0-de68746e12e2" class="_2-button-wrap"><a href="/menu/" class="button-primary button-white _2-buttons w-button">Order Now</a><a href="/menu/" class="button-secondary v2 w-button">View Menu</a></div></div></div></div></div><div data-w-id="4c600c81-cae4-74aa-84a0-de68746e12e7" class="image-wrapper cta-v1-image"><img src="/assets/images/menu/chicken.jpg" alt="Chicken burger from the Pommy menu" class="image cta-v1-image"></div></section>' +
      '<section class="section mask"><div class="container-default w-container"><div><div class="section-title-wrapper max-w-550px mg-bottom-48px"><div class="pommy-eyebrow">Why visit Pommy</div><h2 data-w-id="e826389b-52a5-f15b-300b-8ecb0cacc41c">Simple, casual and convenient</h2><p data-w-id="b7d475eb-fa18-02e4-91a2-2f974d57821e" class="mg-bottom-0px">Verified service information presented with the substantial slider experience of the original restaurant template.</p></div><div data-delay="5000" data-animation="slide" class="slider w-slider" data-autoplay="true" data-easing="ease" data-hide-arrows="false" data-disable-swipe="false" data-w-id="13ae4adb-993f-1830-95d5-5dde326abd83" data-autoplay-limit="0" data-nav-spacing="3" data-duration="500" data-infinite="true" role="region" aria-label="Pommy service information"><div class="false-mask testimonials w-slider-mask">' + trust.map(function (item) { return trustSlide(item[0], item[1], item[2]); }).join("") + '</div><div data-w-id="13ae4adb-993f-1830-95d5-5dde326abd87" class="slider-arrow-v1 left w-slider-arrow-left" role="button" tabindex="0" aria-label="Previous service"><div></div></div><div data-w-id="13ae4adb-993f-1830-95d5-5dde326abd89" class="slider-arrow-v1 right w-slider-arrow-right" role="button" tabindex="0" aria-label="Next service"><div></div></div><div class="slide-nav w-slider-nav w-round"></div></div><div class="_2-button-wrap center-content mg-top-48px"><a href="/about/" class="button-primary _2-buttons w-button">About Pommy</a><a href="/contact/" class="button-secondary w-button">Visit Pommy</a></div></div></div></section>' +
      '<section class="section bg-secondary-1"><div class="container-default w-container"><div><div class="_2-column-grid header-button"><h2 class="mg-bottom-0px">Our articles</h2><div><a href="/blog/" class="button-secondary w-button">Browse our articles</a></div></div><div data-w-id="c566be7d-bfce-fa09-ba5c-0292f02c3210" class="_2-column-grid blog-grid"><div class="w-dyn-list"><div role="list" class="w-dyn-items"><div role="listitem" class="w-dyn-item">' + originalBlogCard(posts[0], true) + '</div></div></div><div class="w-dyn-list"><div role="list" class="_2-column-grid w-dyn-items">' + posts.slice(1, 5).map(function (post) { return '<div data-w-id="a93067cb-0928-afca-d824-13b4116694e6" role="listitem" class="w-dyn-item">' + originalBlogCard(post, false) + '</div>'; }).join("") + '</div></div></div></div></div></section>' +
      '<section id="visit-pommy" class="section mask"><div class="container-default w-container"><div><div class="_2-column-grid contact"><div class="contact-left-column"><div class="pommy-eyebrow">Find Pommy</div><h2 data-w-id="5f58b64f-8a57-4a45-7318-4897091c7bd9">Visit us in Addis Ababa</h2><p data-w-id="6b896708-10c0-e763-6ea7-d5ad48bc595d" class="mg-bottom-40px">Use the confirmed plus code for directions or call Pommy before you visit.</p><div class="contact-links-wrapper"><a data-w-id="ec8292a9-0a3c-2c2f-6748-e90050991f67" href="' + escapeHtml(config.directionsUrl) + '" target="_blank" rel="noopener" class="contact-link mg-bottom-24px w-inline-block"><img src="/assets/icons/location.svg" alt="Location" class="icon contact-link-icon"><div>Addis Ababa, Ethiopia<br>' + escapeHtml(config.plusCode) + '</div></a><a data-w-id="7d04e0ff-35fc-d327-6ef1-3531b9dbae80" href="tel:' + escapeHtml(config.phoneInternational) + '" class="contact-link mg-bottom-24px w-inline-block"><img src="/assets/icons/phone.svg" alt="Phone" class="icon contact-link-icon"><div>' + escapeHtml(config.phoneDisplay) + '</div></a><a data-w-id="18819023-8cb5-d558-4969-6971cd3710e4" href="/menu/" class="contact-link w-inline-block"><img src="/assets/icons/menu.svg" alt="Menu" class="icon contact-link-icon"><div>Browse the full Pommy menu</div></a></div></div><div><div data-w-id="baeee943-8869-8b06-2e94-48674f0d6d94" class="card contact-form-card book-a-table pommy-visit-card"><div class="pommy-eyebrow">Visit Pommy</div><h3>Pommy Burger and Pizza</h3><div class="pommy-visit-facts"><div><strong>Location</strong><span>Addis Ababa, Ethiopia</span></div><div><strong>Service</strong><span>Dine-in and takeaway</span></div><div><strong>Good for</strong><span>Groups, kids and quick bites</span></div><div><strong>Parking</strong><span>Free street parking and parking lot</span></div></div><div class="_2-button-wrap"><a href="' + escapeHtml(config.directionsUrl) + '" target="_blank" rel="noopener" class="button-primary _2-buttons w-button">Get Directions</a><a href="tel:' + escapeHtml(config.phoneInternational) + '" class="button-secondary w-button">Call Pommy</a><a href="/menu/" class="button-secondary w-button">View Menu</a></div></div></div></div></div></div><div data-w-id="08227222-e73e-68fe-2cb5-569054c87cc7" class="bg home-contact-bg"></div></section>' +
      '<section class="section bg-secondary-1 pommy-gallery-section"><div class="container-default w-container"><div><div class="_2-column-grid header-button"><div><div class="pommy-eyebrow">From the Pommy menu</div><h2 class="mg-bottom-0px">See what\'s cooking</h2></div><div><a href="/menu/" class="button-primary w-button">View Menu</a></div></div><div class="_3-column-grid instagram-grid"><div class="mask instagram-image"><img src="/assets/images/menu/' + gallery[0] + '" alt="Burgers and fries from the Pommy menu" class="image instagram" loading="lazy"></div><div class="mask instagram-image"><img src="/assets/images/menu/' + gallery[1] + '" alt="French fries from the Pommy menu" class="image instagram" loading="lazy"></div><div class="_2-column-grid instagram-grid">' + gallery.slice(2).map(function (image, index) { return '<div class="mask instagram-image' + (index > 1 ? ' hide-in-mobile' : '') + '"><img src="/assets/images/menu/' + image + '" alt="Food and drinks from the Pommy menu" class="image instagram" loading="lazy"></div>'; }).join("") + '</div></div></div></div></section>' +
      '</main>';
    replaceMain(html);
  }

  function renderAbout() {
    replaceMain('<main id="main-content">' +
      section('<div class="pommy-page-intro"><div class="pommy-eyebrow">About Pommy</div><h1>Casual food, broad choice and clear prices</h1><p>Pommy Burger and Pizza is a fast-food restaurant in Addis Ababa serving burgers, pizza, chicken, breakfast, wraps, juices, shakes, hot drinks and more.</p></div>', "about") +
      section('<div class="pommy-two-column"><div><h2>A menu built for different appetites</h2><p>Choose a burger or pizza, explore chicken and wrap options, start with breakfast, or add a fresh juice, shake or hot drink. The website keeps the current menu and ETB prices easy to browse.</p><a href="/menu/" class="button-primary w-button">View Menu & Prices</a></div><div class="pommy-info-card"><h3>Service options</h3><div class="pommy-chip-row"><span class="pommy-chip">Dine-in</span><span class="pommy-chip">Takeaway</span><span class="pommy-chip">Quick bite</span><span class="pommy-chip">Late-night food</span><span class="pommy-chip">Table service</span></div></div></div>', "bg-secondary-1") +
      section('<div class="pommy-page-intro"><h2>What you can expect</h2></div><div class="pommy-feature-grid"><div class="pommy-info-card"><h3>Casual atmosphere</h3><p>A straightforward place to enjoy fast food in Addis Ababa.</p></div><div class="pommy-info-card"><h3>Groups and families</h3><p>The broad menu is suitable for groups and includes choices that are good for kids.</p></div><div class="pommy-info-card"><h3>Parking options</h3><p>Free street parking and a free parking lot are listed among the restaurant\'s available attributes.</p></div><div class="pommy-info-card"><h3>Accessible facilities</h3><p>A wheelchair-accessible toilet is listed among the restaurant\'s available facilities.</p></div></div>', "") +
      section('<div class="pommy-two-column"><div><h2>Visit Pommy in Addis Ababa</h2><div class="pommy-contact-list"><div><strong>Location</strong>Addis Ababa, Ethiopia</div><div><strong>Plus code</strong>' + escapeHtml(config.plusCode) + '</div><div><strong>Phone</strong>' + escapeHtml(config.phoneDisplay) + '</div></div></div><div class="pommy-actions"><a href="' + escapeHtml(config.directionsUrl) + '" target="_blank" rel="noopener" class="button-primary w-button">Get Directions</a><a href="tel:' + escapeHtml(config.phoneInternational) + '" class="button-secondary w-button">Call Pommy</a></div></div>', "bg-secondary-1") + '</main>');
  }

  function renderContact() {
    replaceMain('<main id="main-content">' +
      section('<div class="pommy-two-column"><div><div class="pommy-eyebrow">Contact and directions</div><h1>Visit or call Pommy</h1><p>Find the restaurant in Addis Ababa, call to confirm details, or browse the full menu before your visit.</p><div class="pommy-actions"><a href="tel:' + escapeHtml(config.phoneInternational) + '" class="button-primary w-button">Call Pommy</a><a href="' + escapeHtml(config.directionsUrl) + '" target="_blank" rel="noopener" class="button-secondary w-button">Get Directions</a><a href="/menu/" class="button-secondary w-button">View Menu</a></div></div><div class="pommy-info-card"><h2>Pommy Burger and Pizza</h2><div class="pommy-contact-list"><div><strong>Location</strong>Addis Ababa, Ethiopia</div><div><strong>Plus code</strong>' + escapeHtml(config.plusCode) + '</div><div><strong>Phone</strong><a href="tel:' + escapeHtml(config.phoneInternational) + '">' + escapeHtml(config.phoneDisplay) + '</a></div></div><p class="pommy-disclosure">No email address or opening hours have been published because they were not confirmed.</p></div></div>', "contact") +
      section('<div class="pommy-page-intro"><h2>Service information</h2></div><div class="pommy-feature-grid"><div class="pommy-info-card"><h3>Can I dine in?</h3><p>Yes. Dine-in and table service are listed as available.</p></div><div class="pommy-info-card"><h3>Can I order takeaway?</h3><p>Yes. Takeaway is listed as an available service option.</p></div><div class="pommy-info-card"><h3>How do I confirm an order?</h3><p>Prepare the order on this website, then call Pommy using the restaurant phone number.</p></div><div class="pommy-info-card"><h3>Where is Pommy?</h3><p>Pommy is in Addis Ababa. Use the confirmed plus code XRRH+5Q Addis Ababa for directions.</p></div></div>', "bg-secondary-1") + '</main>');
  }

  function renderMenuPage() {
    replaceMain('<main id="main-content"><section class="narrow-section menu"><div class="pommy-section-inner"><div class="pommy-page-intro"><div class="pommy-eyebrow">Pommy menu</div><h1>Menu and prices</h1><p>Search Pommy\'s real menu, filter by category and add your choices to the cart. All prices are shown in ETB.</p></div><h2 class="pommy-visually-hidden">Menu items</h2><div id="pommy-menu-app"></div></div></section>' +
      section('<div class="pommy-two-column"><div><h2>Prepare your order</h2><p>Add items to the cart, change quantities and review your subtotal. At checkout, choose delivery or takeaway / pickup and prepare an order summary for confirmation.</p></div><a href="/checkout/" class="button-primary w-button">Go to Checkout</a></div>', "bg-secondary-1") + '</main>');
  }

  function renderBlogPage() {
    replaceMain('<main id="main-content">' + section('<div class="pommy-page-intro"><div class="pommy-eyebrow">Pommy blog</div><h1>Burgers, pizza and food in Addis Ababa</h1><p>Useful guides to Pommy\'s menu, food choices and quick meals.</p></div><h2 class="pommy-visually-hidden">Pommy articles</h2><div class="pommy-post-grid">' + posts.map(postCard).join("") + '</div>', "") + '</main>');
  }

  function renderBlogPost(slug) {
    var post = posts.find(function (item) { return item.slug === slug; });
    if (!post) { renderNotFound(); return; }
    replaceMain('<main id="main-content">' + section('<article class="pommy-article"><div class="pommy-eyebrow">Pommy Burger and Pizza</div><h1>' + escapeHtml(post.title) + '</h1><div class="pommy-article-meta"><time datetime="' + escapeHtml(post.date) + '">' + new Date(post.date + "T00:00:00").toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) + '</time> · Pommy Burger and Pizza</div><img class="pommy-hero-image" src="' + escapeHtml(post.image) + '" alt="Food from the Pommy menu" loading="eager">' + post.sections.map(function (part) { return '<h2>' + escapeHtml(part.heading) + '</h2><p>' + escapeHtml(part.body) + '</p>'; }).join("") + '<div class="pommy-article-cta"><h2>Explore Pommy</h2><p>Browse the full menu and prices, learn more about the restaurant, or get contact and direction details.</p><div class="pommy-actions"><a href="/menu/" class="button-primary w-button">View Menu</a><a href="/about/" class="button-secondary w-button">About Pommy</a><a href="/contact/" class="button-secondary w-button">Contact</a></div></div></article>', "") + '</main>');
  }

  function renderProductPage(slug) {
    replaceMain('<main id="main-content"><section class="section"><div class="pommy-section-inner"><div id="pommy-product-page" data-product-slug="' + escapeHtml(slug) + '"></div></div></section></main>');
  }

  function renderCheckoutPage() {
    replaceMain('<main id="main-content">' + section('<div class="pommy-page-intro"><div class="pommy-eyebrow">Checkout</div><h1>Prepare your Pommy order</h1><p>Choose delivery or takeaway / pickup, review your items and prepare the order details. Payment is cash on delivery.</p></div><div id="pommy-checkout-app"></div>', "checkout") + '</main>');
  }

  function renderDelivery() {
    replaceMain('<main id="main-content">' + section('<div class="pommy-page-intro"><div class="pommy-eyebrow">Ordering</div><h1>Delivery and takeaway</h1><p>Browse the menu, add items to the cart and prepare a delivery or takeaway / pickup order summary. Call Pommy to confirm the order because no live order receiver is configured.</p><div class="pommy-actions" style="justify-content:center"><a href="/menu/" class="button-primary w-button">View Menu</a><a href="tel:' + escapeHtml(config.phoneInternational) + '" class="button-secondary w-button">Call Pommy</a></div></div>', "") + '</main>');
  }

  function renderNotFound() {
    replaceMain('<main id="main-content">' + section('<div class="pommy-page-intro"><div class="pommy-eyebrow">404</div><h1>Page not found</h1><p>The page you requested is not available. Return home or browse the Pommy menu.</p><div class="pommy-actions" style="justify-content:center"><a href="/" class="button-primary w-button">Home</a><a href="/menu/" class="button-secondary w-button">View Menu</a></div></div>', "") + '</main>');
  }

  function addRestaurantSchema() {
    if (document.querySelector('script[data-pommy-schema]')) return;
    var schema = document.createElement("script");
    schema.type = "application/ld+json";
    schema.dataset.pommySchema = "restaurant";
    schema.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FastFoodRestaurant",
      name: "Pommy Burger and Pizza",
      telephone: "+251956905484",
      address: { "@type": "PostalAddress", addressLocality: "Addis Ababa", addressCountry: "ET" },
      servesCuisine: ["Burgers", "Pizza", "Fast Food", "Chicken"],
      priceRange: "ETB",
      hasMap: config.directionsUrl
    });
    document.head.appendChild(schema);
  }

  function routePage() {
    var path = currentPath();
    if (path === "/") renderHome();
    else if (path === "/about/") renderAbout();
    else if (path === "/contact/") renderContact();
    else if (path === "/menu/") renderMenuPage();
    else if (path === "/blog/") renderBlogPage();
    else if (path === "/checkout/") renderCheckoutPage();
    else if (path === "/delivery/") renderDelivery();
    else if (path === "/404/" || path === "/401/") renderNotFound();
    else if (path.indexOf("/product/") === 0) renderProductPage(path.split("/")[2]);
    else if (path.indexOf("/blog-posts/") === 0) renderBlogPost(path.split("/")[2]);
    else if (path.indexOf("/category/") === 0 || path.indexOf("/dish-categories/") === 0) renderMenuPage();
    else if (path.indexOf("/team-members/") === 0) renderAbout();
    else if (path.indexOf("/blog-posts-category/") === 0) renderBlogPage();
    else renderNotFound();
  }

  function init() {
    document.documentElement.lang = "en";
    ensureSkipLink();
    ensureHeader();
    ensureFooter();
    routePage();
    ensureCart();
    bindGlobalActions();
    enableNavigationFallback();
    enableOriginalMotionFallback();
    addRestaurantSchema();
    renderCart();
  }

  window.Pommy = {
    escapeHtml: escapeHtml,
    formatEtb: formatEtb,
    findProduct: findProduct,
    productCard: productCard,
    readCart: readCart,
    saveCart: saveCart,
    cartSubtotal: cartSubtotal,
    addToCart: addToCart,
    openCart: openCart
  };

  init();
})();
