(function () {
  "use strict";

  function init() {
    var app = document.getElementById("pommy-product-page");
    if (!app || !window.Pommy) return;

    var aliases = {
    "classic-burger": "beef-burger",
    "chicken-burger": "pommy-chicken-special-burger",
    "chocolate-milkshake": "chocolate-milk-shake",
    "classic-fries": "french-fries",
    "egg-toast": "toast-bread-with-egg",
    "pancakes": "pan-cake",
    "regular-soda": "soft-drinks"
  };
    var slug = aliases[app.dataset.productSlug] || app.dataset.productSlug;
    var product = window.Pommy.findProduct(slug);

    if (!product) {
      app.innerHTML = '<div class="pommy-page-intro"><h1>Menu item not found</h1><p>This item is not available in the current Pommy menu.</p><a href="/menu/" class="button-primary w-button">View Menu</a></div>';
      return;
    }

    var categoryName = (window.POMMY_CATEGORIES || []).find(function (category) { return (category.slug || category.id) === product.category; });
    var related = (window.POMMY_MENU || []).filter(function (item) { return item.category === product.category && item.id !== product.id && item.available; }).slice(0, 4);
    var description = product.description || "This item is available on the Pommy menu. Call Pommy if you need to confirm ingredients before ordering.";
    var orderAction = product.available === false
      ? '<button type="button" class="button-primary w-button" disabled aria-disabled="true">Currently unavailable</button>'
      : '<button type="button" class="button-primary w-button" data-add-to-cart="' + window.Pommy.escapeHtml(product.id) + '">Add to cart</button>';

    app.innerHTML = '<div class="pommy-product-layout"><img class="pommy-product-image" ' + window.Pommy.imageAttributes(product.image, "(max-width: 767px) 100vw, 50vw", "eager") + ' alt="Food image for the ' + window.Pommy.escapeHtml(product.category.replace(/-/g, " ")) + ' category"><div class="pommy-product-copy"><div class="pommy-eyebrow">' + window.Pommy.escapeHtml(categoryName ? categoryName.name : "Pommy menu") + '</div><h1>' + window.Pommy.escapeHtml(product.name) + '</h1><div class="pommy-product-price">' + window.Pommy.formatEtb(product.price) + '</div><p>' + window.Pommy.escapeHtml(description) + '</p><div class="pommy-quantity-row"><div class="pommy-quantity-field"><label for="pommy-product-quantity">Quantity</label><input id="pommy-product-quantity" data-product-quantity class="input w-input" type="number" min="1" max="99" step="1" value="1" inputmode="numeric"' + (product.available === false ? ' disabled' : '') + '></div>' + orderAction + '</div><p class="pommy-disclosure">Temporary category imagery is used until exact Pommy product photography is available.</p></div></div>' +
      (related.length ? '<div class="pommy-page-intro" style="margin-top:80px"><h2>More from ' + window.Pommy.escapeHtml(categoryName ? categoryName.name : "the menu") + '</h2></div><div class="pommy-menu-grid">' + related.map(window.Pommy.productCard).join("") + '</div>' : "");
  }

  if (!window.Pommy) return;
  Promise.resolve(window.Pommy.ready).then(init);
})();
