(function () {
  "use strict";
  var A = window.PommyAdmin;
  var state = { access: null, items: [], categories: [] };
  var filters = document.querySelector("[data-menu-filters]");
  var list = document.querySelector("[data-menu-list]");

  function populateCategories() {
    var select = filters.elements.category;
    state.categories.forEach(function (category) {
      var option = A.el("option", "", category.name);
      option.value = category.id;
      select.appendChild(option);
    });
  }

  function fieldControl(labelText, name, type, value) {
    var label = A.el("label", "menu-field");
    label.appendChild(A.el("span", "", labelText));
    var input = A.el("input");
    input.name = name;
    input.type = type;
    if (type === "number") { input.min = "0"; input.step = "0.01"; }
    input.value = value === undefined || value === null ? "" : value;
    label.appendChild(input);
    return label;
  }

  function toggleControl(labelText, name, checked) {
    var label = A.el("label", "admin-toggle");
    var input = A.el("input");
    input.type = "checkbox";
    input.name = name;
    input.checked = Boolean(checked);
    label.appendChild(input);
    label.appendChild(A.el("span", "", labelText));
    return label;
  }

  function menuEditor(item) {
    var form = A.el("form", "menu-editor");
    form.dataset.id = item.id;
    var header = A.el("div", "menu-editor-header");
    var image = A.el("img", "menu-thumb");
    image.src = item.image_url || "/assets/images/pommy-logo.png";
    image.alt = "";
    image.addEventListener("error", function () { image.src = "/assets/images/pommy-logo.png"; });
    var title = A.el("div");
    title.appendChild(A.el("h2", "", item.name || item.slug));
    title.appendChild(A.el("code", "menu-slug", "/product/" + item.slug + "/"));
    header.appendChild(image);
    header.appendChild(title);
    form.appendChild(header);

    var grid = A.el("div", "menu-editor-grid");
    grid.appendChild(fieldControl("Price (ETB)", "price", "number", item.price));
    var categoryLabel = A.el("label", "menu-field");
    categoryLabel.appendChild(A.el("span", "", "Category"));
    var category = A.el("select");
    category.name = "category";
    state.categories.forEach(function (value) {
      var option = A.el("option", "", value.name);
      option.value = value.id;
      option.selected = value.id === item.category_id;
      category.appendChild(option);
    });
    categoryLabel.appendChild(category);
    grid.appendChild(categoryLabel);
    form.appendChild(grid);

    var description = A.el("label", "menu-field menu-field-wide");
    description.appendChild(A.el("span", "", "Description"));
    var textarea = A.el("textarea");
    textarea.name = "description";
    textarea.rows = 3;
    textarea.maxLength = 500;
    textarea.value = item.description || "";
    description.appendChild(textarea);
    form.appendChild(description);
    var imageField = fieldControl("Image path or URL", "image_url", "text", item.image_url || "");
    imageField.classList.add("menu-field-wide");
    form.appendChild(imageField);

    var footer = A.el("div", "menu-editor-footer");
    var toggles = A.el("div", "menu-toggles");
    toggles.appendChild(toggleControl("Available", "is_available", item.is_available));
    toggles.appendChild(toggleControl("Featured", "is_featured", item.is_featured));
    footer.appendChild(toggles);
    var save = A.el("button", "admin-button admin-button-small", "Save changes");
    save.type = "submit";
    footer.appendChild(save);
    form.appendChild(footer);

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      A.setBusy(save, true, "Saving...");
      var data = new FormData(form);
      var changes = {
        price: Number(data.get("price")),
        is_available: data.has("is_available"),
        is_featured: data.has("is_featured"),
        category_id: String(data.get("category")),
        description: String(data.get("description") || "").trim(),
        image_url: String(data.get("image_url") || "").trim()
      };
      if (!Number.isFinite(changes.price) || changes.price < 0) {
        A.setBusy(save, false);
        return A.setNotice("Enter a valid non-negative price.", "error");
      }
      var result = await state.access.supabase.rpc("admin_update_menu_item", { p_menu_item_id: item.id, p_patch: changes });
      A.setBusy(save, false);
      if (result.error) return A.setNotice(A.message(result.error, "Menu item was not saved."), "error");
      Object.assign(item, result.data);
      image.src = changes.image_url || "/assets/images/pommy-logo.png";
      A.setNotice(item.name + " saved. Its slug was preserved.", "success");
    });
    return form;
  }

  function render() {
    var data = new FormData(filters);
    var search = String(data.get("search") || "").trim().toLowerCase();
    var category = String(data.get("category") || "");
    var availability = String(data.get("availability") || "");
    var visible = state.items.filter(function (item) {
      var matchesText = !search || String(item.name || "").toLowerCase().includes(search) || String(item.slug || "").toLowerCase().includes(search);
      var matchesCategory = !category || item.category_id === category;
      var matchesAvailability = !availability || String(Boolean(item.is_available)) === availability;
      return matchesText && matchesCategory && matchesAvailability;
    });
    list.textContent = "";
    document.querySelector("[data-menu-count]").textContent = visible.length + " of " + state.items.length + " items";
    if (!visible.length) list.appendChild(A.el("div", "admin-empty", "No menu items match these filters."));
    visible.forEach(function (item) { list.appendChild(menuEditor(item)); });
  }

  async function load() {
    var results = await Promise.all([
      state.access.supabase.rpc("admin_list_menu_items"),
      state.access.supabase.rpc("admin_list_categories")
    ]);
    var failed = results.find(function (result) { return result.error; });
    if (failed) throw failed.error;
    state.items = results[0].data || [];
    state.categories = results[1].data || [];
    populateCategories();
    render();
  }

  filters.addEventListener("input", render);
  filters.addEventListener("change", render);
  filters.addEventListener("reset", function () { setTimeout(render, 0); });
  A.requireAdmin().then(function (access) {
    if (!access) return;
    state.access = access;
    load().catch(function (error) { list.textContent = ""; A.setNotice(A.message(error, "Menu data could not be loaded."), "error"); });
  });
})();
