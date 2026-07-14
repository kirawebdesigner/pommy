(function () {
  "use strict";

  var bundledCategories = Array.isArray(window.POMMY_CATEGORIES) ? window.POMMY_CATEGORIES.slice() : [];
  var bundledItems = Array.isArray(window.POMMY_MENU) ? window.POMMY_MENU.slice() : [];
  var preferredFeaturedSlugs = [
    "pommy-special-burger",
    "pommy-chicken-special-burger",
    "pommy-special-pizza",
    "chicken-bbq-pizza",
    "egg-sandwich",
    "chicken-wrap",
    "pommy-special-smoothie",
    "chocolate-milk-shake"
  ];
  var state = {
    categories: normalizeBundledCategories(bundledCategories),
    items: normalizeBundledItems(bundledItems),
    source: "bundled",
    error: null
  };

  function number(value, fallback) {
    var parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function normalizeBundledCategories(rows) {
    return rows.map(function (row, index) {
      return {
        id: String(row.id || row.slug || ""),
        name: String(row.name || ""),
        slug: String(row.slug || row.id || ""),
        description: String(row.description || ""),
        sortOrder: number(row.sortOrder, index),
        active: row.active !== false
      };
    });
  }

  function normalizeBundledItems(rows) {
    return rows.map(function (row, index) {
      return {
        id: String(row.id || row.slug || ""),
        slug: String(row.slug || row.id || ""),
        name: String(row.name || ""),
        category: String(row.category || ""),
        description: String(row.description || ""),
        price: number(row.price, 0),
        image: String(row.image || ""),
        featured: Boolean(row.featured),
        available: row.available !== false,
        sortOrder: number(row.sortOrder, index)
      };
    });
  }

  function normalizeCategory(row, index) {
    return {
      id: String(row.id || ""),
      name: String(row.name || ""),
      slug: String(row.slug || ""),
      description: String(row.description || ""),
      sortOrder: number(row.sort_order, index),
      active: row.is_active !== false
    };
  }

  function categorySlug(row) {
    var category = row.category;
    if (Array.isArray(category)) category = category[0];
    return category && category.slug ? String(category.slug) : "";
  }

  function normalizeItem(row, index) {
    return {
      id: String(row.id || row.slug || ""),
      slug: String(row.slug || ""),
      name: String(row.name || ""),
      category: categorySlug(row),
      description: String(row.description || ""),
      price: number(row.price, 0),
      image: String(row.image_url || ""),
      featured: Boolean(row.is_featured),
      available: row.is_available !== false,
      sortOrder: number(row.sort_order, index)
    };
  }

  function stableSort(left, right) {
    return left.sortOrder - right.sortOrder || left.slug.localeCompare(right.slug);
  }

  function fallback(error) {
    state = {
      categories: normalizeBundledCategories(bundledCategories),
      items: normalizeBundledItems(bundledItems),
      source: "bundled",
      error: error || null
    };
    publish();
    return state;
  }

  function publish() {
    window.POMMY_CATEGORIES = state.categories;
    window.POMMY_MENU = state.items;
  }

  async function load() {
    var api = window.PommySupabase;
    if (!api || !api.configured) return fallback(api && api.error);

    try {
      var client = api.getClient();
      var timeout = new Promise(function (_, reject) {
        window.setTimeout(function () { reject(new Error("The live Pommy menu request timed out.")); }, 1800);
      });
      var results = await Promise.race([Promise.all([
        client.from("categories").select("id,name,slug,description,sort_order,is_active").eq("is_active", true).order("sort_order").order("slug"),
        client.from("menu_items").select("id,name,slug,description,price,image_url,is_available,is_featured,sort_order,category:categories!inner(slug,is_active)").eq("category.is_active", true).order("sort_order").order("slug")
      ]), timeout]);
      if (results[0].error) throw results[0].error;
      if (results[1].error) throw results[1].error;

      var categories = (results[0].data || []).map(normalizeCategory).sort(stableSort);
      var items = (results[1].data || []).map(normalizeItem).filter(function (item) {
        return item.slug && item.name && item.category;
      }).sort(stableSort);
      if (!categories.length || !items.length) throw new Error("The live Pommy menu is empty.");

      state = { categories: categories, items: items, source: "supabase", error: null };
      publish();
      return state;
    } catch (error) {
      return fallback(error);
    }
  }

  function getCategories() {
    return state.categories.slice();
  }

  function getItems() {
    return state.items.slice();
  }

  function getAvailableItems() {
    return state.items.filter(function (item) { return item.available; });
  }

  function getItemBySlug(slug) {
    return state.items.find(function (item) { return item.slug === slug; }) || null;
  }

  function getFeaturedItems(limit) {
    var count = Math.max(0, number(limit, 8));
    var available = getAvailableItems().sort(stableSort);
    var selected = available.filter(function (item) { return item.featured; }).slice(0, count);

    preferredFeaturedSlugs.map(getItemBySlug).filter(function (item) {
      return item && item.available;
    }).forEach(function (item) {
      if (selected.length < count && !selected.some(function (entry) { return entry.id === item.id; })) selected.push(item);
    });

    available.forEach(function (item) {
      if (selected.length < count && !selected.some(function (entry) { return entry.id === item.id; })) selected.push(item);
    });
    return selected.slice(0, count);
  }

  var ready = load();
  window.PommyMenuService = Object.freeze({
    ready: ready,
    getCategories: getCategories,
    getItems: getItems,
    getAvailableItems: getAvailableItems,
    getItemBySlug: getItemBySlug,
    getFeaturedItems: getFeaturedItems,
    getSource: function () { return state.source; },
    getError: function () { return state.error; }
  });
})();
