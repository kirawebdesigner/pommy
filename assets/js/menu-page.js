(function () {
  "use strict";

  var menuState = {
    query: "",
    selected: null
  };

  function init(useLiveData) {
    var app = document.getElementById("pommy-menu-app");
    if (!app || !window.Pommy) return;

    var service = useLiveData ? window.PommyMenuService : null;
    var categories = service ? service.getCategories() : (window.POMMY_CATEGORIES || []);
    var products = (service ? service.getItems() : (window.POMMY_MENU || [])).filter(function (item) { return item.available; });
    var params = new URLSearchParams(window.location.search);
    var routeCategory = window.location.pathname.split("/")[2] || "";
    var legacyMap = { breakfast: "breakfast", "main-dishes": "burger", drinks: "juice", desserts: "" };
    var selected = menuState.selected || params.get("category") || legacyMap[routeCategory] || "all";
    if (!categories.some(function (category) { return category.id === selected || category.slug === selected; })) selected = "all";
    var query = menuState.query;
    menuState.selected = selected;

    app.innerHTML = '<div class="pommy-menu-tools"><div><label class="pommy-search-label" for="pommy-menu-search">Search the menu</label><input id="pommy-menu-search" class="input pommy-search-input w-input" type="search" placeholder="Search products or ingredients" autocomplete="off"></div><div class="pommy-category-tabs" role="group" aria-label="Filter menu by category"></div><p class="pommy-results-count" data-results-count aria-live="polite"></p></div><div class="pommy-menu-grid" data-menu-grid></div>';

    var tabs = app.querySelector(".pommy-category-tabs");
    var tabData = [{ id: "all", name: "All" }].concat(categories.map(function (category) {
      return { id: category.slug || category.id, name: category.name };
    }));
    tabs.textContent = "";
    tabData.forEach(function (category) {
      var button = document.createElement("button");
      button.className = "pommy-category-tab";
      button.type = "button";
      button.dataset.categoryFilter = String(category.id);
      button.setAttribute("aria-pressed", String(category.id === selected));
      button.textContent = String(category.name);
      tabs.appendChild(button);
    });

    function render() {
      var normalized = query.trim().toLowerCase();
      var visible = products.filter(function (item) {
        var categoryMatch = selected === "all" || item.category === selected;
        var searchMatch = !normalized || (item.name + " " + item.description).toLowerCase().indexOf(normalized) !== -1;
        return categoryMatch && searchMatch;
      });
      var grid = app.querySelector("[data-menu-grid]");
      grid.innerHTML = visible.length ? visible.map(window.Pommy.productCard).join("") : '<div class="pommy-empty-state"><h2>No menu items found</h2><p>Try another search term or category.</p></div>';
      app.querySelector("[data-results-count]").textContent = visible.length + (visible.length === 1 ? " menu item" : " menu items");
      tabs.querySelectorAll("[data-category-filter]").forEach(function (button) { button.setAttribute("aria-pressed", String(button.dataset.categoryFilter === selected)); });
    }

    var search = app.querySelector("#pommy-menu-search");
    search.value = query;
    search.addEventListener("input", function (event) {
      query = event.target.value;
      menuState.query = query;
      render();
    });
    tabs.addEventListener("click", function (event) {
      var button = event.target.closest("[data-category-filter]");
      if (!button) return;
      selected = button.dataset.categoryFilter;
      menuState.selected = selected;
      render();
    });
    render();
  }

  if (!window.Pommy) return;
  Promise.resolve(window.Pommy.motionReady).then(function () { init(false); });
  Promise.resolve(window.Pommy.ready).then(function () { init(true); });
})();
